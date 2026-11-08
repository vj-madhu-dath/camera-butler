// Classic worker is required: MediaPipe's WASM loader uses importScripts.
let detector=null;
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   const {FilesetResolver,ObjectDetector}=await import('./vendor/mediapipe/vision_bundle.mjs');
   const files=await FilesetResolver.forVisionTasks('./vendor/mediapipe/wasm');
   detector=await ObjectDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'./models/efficientdet_lite0.tflite',delegate:'CPU'},runningMode:'IMAGE',scoreThreshold:.35,maxResults:8});
   self.postMessage({type:'ready'});
  }catch(error){self.postMessage({type:'error',message:error?.message||String(error)});}
 }
 if(data.type==='detect'){
  const bitmap=data.bitmap;
  try{if(!detector)throw Error('Detector is not ready');const result=detector.detect(bitmap);self.postMessage({type:'result',id:data.id,detections:result.detections,width:bitmap.width,height:bitmap.height});}
  catch(error){self.postMessage({type:'error',id:data.id,message:error?.message||String(error)});}
  finally{bitmap?.close();}
 }
};
