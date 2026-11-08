import {presets,framingAdvice,exposureAdvice,horizonRoll} from './guidance.js';
import {chooseDetection,aiAdvice} from './vision-geometry.js';
const $=id=>document.getElementById(id);
let preset='landscape',subject=null,stream=null,facing='environment',sensor=false,photoUrl=null,startBusy=false;
let aiWorker=null,aiMode='off',aiLoading=false,aiEpoch=0,aiTimer=null,aiItem=null,aiRequest=0,aiBusy=false,aiWatchdog=null,aiFrames=0,aiLastResult=null;
const video=$('video'),view=$('viewfinder');
let toastTimer;
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').style.display='none',4500);}
function update(){const p=presets[preset];$('angleTitle').textContent=p.angle;$('angleTip').textContent=p.tip;$('target').style.left=p.target.x*100+'%';$('target').style.top=p.target.y*100+'%';$('sceneLabel').textContent=p.label.toUpperCase()+' / COMPOSITION GUIDE';const a=aiMode!=='off'?aiAdvice(aiItem,p.target):framingAdvice(subject,p.target);$('framingTitle').textContent=a.title;$('framingDetail').textContent=a.detail;$('target').style.borderColor=a.aligned?'#fff':'var(--accent)';document.querySelectorAll('[data-preset]').forEach(b=>{b.classList.toggle('active',b.dataset.preset===preset);b.setAttribute('aria-pressed',String(b.dataset.preset===preset));});}
document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{preset=b.dataset.preset;if(aiLastResult&&aiMode!=='off')showDetection(aiLastResult);else update();}));
view.addEventListener('click',e=>{if(aiMode!=='off')disableAI('Manual framing selected.',true);const r=view.getBoundingClientRect();subject={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};$('subject').hidden=false;$('subject').style.left=subject.x*100+'%';$('subject').style.top=subject.y*100+'%';update();});
$('gridButton').onclick=()=>{const hidden=!$('grid').hidden;$('grid').hidden=hidden;$('gridButton').setAttribute('aria-pressed',String(!hidden));$('gridButton').innerHTML=`<span>▦</span> Grid ${hidden?'off':'on'}`;};
function stop(){if(aiMode!=='off')disableAI('Camera stopped.');if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;$('demoImage').hidden=false;$('modeBadge').innerHTML='<i></i> DEMO VIEW';$('startCamera').innerHTML='Enable camera <span>↗</span>';$('cameraNote').textContent='Try the demo, or enable your camera. Nothing is uploaded.';$('lightTip').textContent='Enable the camera for a simple, on-device brightness check.';}
async function start(){if(startBusy)return;if(aiMode!=='off')disableAI();startBusy=true;$('startCamera').disabled=true;try{if(!window.isSecureContext)throw new Error('Open the app over HTTPS or localhost to enable the camera.');if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access is not supported here. Try Safari or Chrome over HTTPS.');if(stream)stop();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1920},height:{ideal:1080}},audio:false});video.srcObject=stream;let playTimeout;try{await Promise.race([video.play(),new Promise((_,reject)=>{playTimeout=setTimeout(()=>reject(new Error('Camera did not start in time. Close other camera apps and try again.')),12000);})]);}finally{clearTimeout(playTimeout);}video.hidden=false;$('demoImage').hidden=true;$('modeBadge').innerHTML='<i></i> LIVE CAMERA';$('startCamera').innerHTML='Stop camera <span>■</span>';$('cameraNote').textContent='Camera is live. Tap your subject to start framing.';subject=null;$('subject').hidden=true;update();}catch(e){stop();const message=e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser settings, or use the demo.':e.name==='NotFoundError'?'No camera found. You can still explore with the demo.':e.name==='NotReadableError'?'Camera is busy. Close other camera apps and try again.':e.message;toast(message);$('cameraNote').textContent=message;}finally{startBusy=false;$('startCamera').disabled=false;}}

function updateAIButtons(){
 $('aiToggle').textContent=aiMode==='live'?'Stop AI guidance':'Enable AI guidance';
 $('aiToggle').setAttribute('aria-pressed',String(aiMode==='live'));
 $('aiDemo').textContent=aiMode==='sample'?'Stop AI sample':'Try AI sample';
 $('aiToggle').disabled=aiLoading;$('aiDemo').disabled=aiLoading;
}
function resetAIDisplay(){aiItem=null;aiLastResult=null;$('aiBox').hidden=true;update();}
function disableAI(note='AI is off. Tap a subject for manual guidance.',keepSample=false){
 aiEpoch++;clearTimeout(aiTimer);clearTimeout(aiWatchdog);aiTimer=null;aiBusy=false;aiLoading=false;
 if(aiWorker){aiWorker.terminate();aiWorker=null;}
 const wasSample=aiMode==='sample';aiMode='off';
 if(wasSample&&!stream&&!keepSample){$('demoImage').src='./scene.svg';$('demoImage').alt='Illustrated coastal landscape for trying the framing guides';$('modeBadge').innerHTML='<i></i> DEMO VIEW';$('cameraNote').textContent='Try the demo, or enable your camera. Nothing is uploaded.';}
 $('aiStatus').textContent='OFF';$('aiInfo').textContent=note;resetAIDisplay();updateAIButtons();
}
function aiFailure(message){disableAI('AI unavailable. Manual framing still works.');$('aiStatus').textContent='UNAVAILABLE';toast(message||'Could not start on-device AI. Please try again.');}
async function scanFrame(epoch){
 if(epoch!==aiEpoch||aiMode==='off'||!aiWorker||aiBusy)return;
 if(document.hidden){aiTimer=setTimeout(()=>scanFrame(epoch),800);return;}
 const source=aiMode==='live'?video:$('demoImage');
 if(aiMode==='live'&&(!stream||video.readyState<2)){aiTimer=setTimeout(()=>scanFrame(epoch),300);return;}
 aiBusy=true;
 try{
  const bitmap=await createImageBitmap(source);
  if(epoch!==aiEpoch||!aiWorker){bitmap.close();return;}
  aiWatchdog=setTimeout(()=>{if(epoch===aiEpoch)aiFailure('AI processing timed out. Try again or use manual framing.');},15000);
  aiWorker.postMessage({type:'detect',id:++aiRequest,bitmap},[bitmap]);
 }catch(e){aiBusy=false;if(epoch===aiEpoch)aiFailure('AI could not read this camera frame. Try again or use manual framing.');}
}
function showDetection(message){
 aiLastResult=message;
 const r=view.getBoundingClientRect();aiItem=chooseDetection(message.detections,message.width,message.height,r.width,r.height,preset);
 const box=$('aiBox');box.hidden=!aiItem;
 if(aiItem){const b=aiItem.box;box.style.left=(100*b.x)+'%';box.style.top=(100*b.y)+'%';box.style.width=(100*b.width)+'%';box.style.height=(100*b.height)+'%';box.classList.toggle('edge',b.y<.08);$('aiLabel').textContent=`${aiItem.label} · ${Math.round(aiItem.score*100)}%`;}
 $('aiInfo').textContent=aiItem?`Detected ${aiItem.label}. ${aiMode==='sample'?'Sample analyzed locally.':'Box and framing update locally.'}`:'No supported subject detected. Try a person, pet, or common object.';
 update();
}
async function enableAI(mode){
 if(aiLoading)return;
 if(mode==='live'&&!stream){toast('Enable the camera first, or try the AI sample.');return;}
 if(typeof Worker==='undefined'||typeof createImageBitmap==='undefined'){aiFailure('This browser does not support the on-device AI features.');return;}
 if(aiMode!=='off')disableAI();
 if(mode==='sample'&&stream)stop();
 const epoch=++aiEpoch;aiFrames=0;aiMode=mode;aiLoading=true;subject=null;$('subject').hidden=true;
 if(mode==='sample'){
  $('demoImage').src='./samples/cats_and_dogs.jpg';$('demoImage').alt='Sample photograph of cats and dogs for testing AI detection';$('cameraNote').textContent='AI sample — no camera access or image upload.';$('modeBadge').innerHTML='<i></i> AI SAMPLE';
 }
 $('aiStatus').textContent='LOADING';$('aiInfo').textContent='Loading the local model; this can take a moment.';resetAIDisplay();updateAIButtons();
 try{
  if(mode==='sample')await $('demoImage').decode();
  if(epoch!==aiEpoch)return;
  const worker=new Worker('./detector-worker.js');aiWorker=worker;
  worker.onmessage=({data})=>{
   if(epoch!==aiEpoch)return;
   if(data.type==='error'){console.warn('Local detector:',data.message);aiFailure('On-device AI could not start or process a frame. Try manual framing.');return;}
   if(data.type==='ready'){clearTimeout(aiWatchdog);aiLoading=false;$('aiStatus').textContent=mode==='live'?'LIVE':'SAMPLE';updateAIButtons();scanFrame(epoch);return;}
   if(data.type==='result'){clearTimeout(aiWatchdog);aiBusy=false;aiFrames++;$('aiStatus').textContent=aiMode==='live'?`LIVE · ${aiFrames} FRAMES`:'SAMPLE';showDetection(data);if(aiMode==='live')aiTimer=setTimeout(()=>scanFrame(epoch),350);}
  };
  worker.onerror=()=>{if(epoch===aiEpoch)aiFailure('On-device AI could not load in this browser.');};
  aiWatchdog=setTimeout(()=>{if(epoch===aiEpoch)aiFailure('Model loading timed out. Please try again.');},30000);
  worker.postMessage({type:'init'});
 }catch(e){if(epoch===aiEpoch)aiFailure('Could not load on-device AI. Try manual framing.');}
}
$('aiToggle').onclick=()=>aiMode==='live'?disableAI():enableAI('live');
$('aiDemo').onclick=()=>aiMode==='sample'?disableAI():enableAI('sample');
window.addEventListener('resize',()=>{if(aiLastResult&&aiMode!=='off')showDetection(aiLastResult);});

$('startCamera').onclick=()=>stream?stop():start();$('flip').onclick=async()=>{if(!stream)return toast('Enable your camera first to switch lenses.');facing=facing==='environment'?'user':'environment';await start();};
function orientation(e){if(e.gamma===null||e.beta===null)return;const angle=screen.orientation?.angle??window.orientation??0;let roll=horizonRoll(e.beta,e.gamma,angle);roll=Math.max(-45,Math.min(45,roll));$('level').style.transform=`translate(-50%,-50%) rotate(${-roll}deg)`;$('levelText').textContent=Math.abs(roll)<3?'HORIZON LEVEL':`${Math.round(Math.abs(roll))}° · ${roll>0?'TILT LEFT':'TILT RIGHT'}`;$('levelText').style.color=Math.abs(roll)<3?'var(--accent)':'white';$('motion').textContent='Horizon sensor enabled';}
$('motion').onclick=async()=>{if(sensor)return toast('Horizon sensor is already enabled. Hold your phone upright for best results.');try{if(!window.DeviceOrientationEvent)throw new Error('Motion sensors are unavailable on this device. Use the grid as a visual level.');if(typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted')throw new Error('Motion permission was not granted.');}window.addEventListener('deviceorientation',orientation);sensor=true;$('motion').textContent='Waiting for sensor…';toast('Hold your phone upright. Sensor availability varies by browser.');setTimeout(()=>{if($('motion').textContent==='Waiting for sensor…'){$('motion').textContent='No sensor data — use the grid';}},4000);}catch(e){toast(e.message);}};
const analysis=document.createElement('canvas');analysis.width=32;analysis.height=32;const ctx=analysis.getContext('2d',{willReadFrequently:true});setInterval(()=>{if(!stream||video.readyState<2)return;ctx.drawImage(video,0,0,32,32);const {data}=ctx.getImageData(0,0,32,32);let sum=0;for(let i=0;i<data.length;i+=4)sum+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];$('lightTip').textContent=exposureAdvice(sum/1024);},1500);
function cropDraw(ctx,source,sw,sh,w,h){const scale=Math.max(w/sw,h/sh);const cw=w/scale,ch=h/scale;ctx.drawImage(source,(sw-cw)/2,(sh-ch)/2,cw,ch,0,0,w,h);}
$('capture').onclick=async()=>{try{const canvas=document.createElement('canvas');const r=view.getBoundingClientRect();canvas.width=1200;canvas.height=Math.round(1200*r.height/r.width);const c=canvas.getContext('2d');if(stream&&video.readyState>=2)cropDraw(c,video,video.videoWidth,video.videoHeight,canvas.width,canvas.height);else{await $('demoImage').decode();cropDraw(c,$('demoImage'),$('demoImage').naturalWidth,$('demoImage').naturalHeight,canvas.width,canvas.height);toast('Demo image captured — enable your camera to take a real photo.');}const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.93));if(!blob)throw new Error('Could not create photo. Please try again.');if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(blob);$('photo').src=photoUrl;$('download').href=photoUrl;$('download').download=stream?'camera-butler.jpg':'camera-butler-demo.jpg';$('flash').classList.remove('animate');void $('flash').offsetWidth;$('flash').classList.add('animate');$('photoDialog').showModal();}catch(e){toast(e.message);}};
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('closePhoto').onclick=()=>$('photoDialog').close();window.addEventListener('pagehide',stop);update();
