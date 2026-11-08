// Map model boxes from the video pixels into the centered object-fit:cover viewfinder.
export function coverBox(box,sw,sh,vw,vh){
 if(!box||![sw,sh,vw,vh].every(n=>Number.isFinite(n)&&n>0))return null;
 const scale=Math.max(vw/sw,vh/sh),offX=(vw-sw*scale)/2,offY=(vh-sh*scale)/2;
 const l=Math.max(0,box.originX*scale+offX),t=Math.max(0,box.originY*scale+offY);
 const r=Math.min(vw,(box.originX+box.width)*scale+offX),b=Math.min(vh,(box.originY+box.height)*scale+offY);
 if(r<=l||b<=t)return null;
 return {x:l/vw,y:t/vh,width:(r-l)/vw,height:(b-t)/vh};
}
export function chooseDetection(detections,sw,sh,vw,vh,preset='landscape'){
 const items=detections.map(d=>{const label=d.categories?.[0]?.categoryName||'subject',score=d.categories?.[0]?.score||0,box=coverBox(d.boundingBox,sw,sh,vw,vh);return {label,score,box};}).filter(d=>d.box&&d.score>=.35);
 items.sort((a,b)=>{const rank=d=>(preset==='portrait'&&d.label==='person'?1:0)+(d.box.width*d.box.height)*.4+d.score*.2;return rank(b)-rank(a)});
 return items[0]||null;
}
export function aiAdvice(item,target){
 if(!item)return {title:'Looking for a subject…',detail:'Point your camera at a person, pet, or common object. Detection can miss or misidentify subjects.'};
 const {box,label}=item;const point={x:box.x+box.width/2,y:box.y+box.height/2};const dx=point.x-target.x,dy=point.y-target.y;
 if(Math.hypot(dx,dy)<.09)return {title:`${label} is well placed`,detail:'Hold steady and check your background before shooting.'};
 const direction=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
 return {title:`Pan ${direction} slightly`,detail:`Move the camera to guide the ${label} toward the green target. Advice updates as you reframe.`};
}
