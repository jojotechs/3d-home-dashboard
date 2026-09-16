import * as THREE from 'three';
import {buildTransportSchedule,transportAt,transportPose,transportLabels,transportDuration,fleet} from './transport-state.mjs';

// Cabin lighting uses an explicit material channel, so cloning never loses a shader callback.
export function transportMaterial(original,mode,slot){
 const m=original.clone();m.transparent=mode==='air';
 if(m.name.includes('cabin')){m.emissive.set(slot%2?'#ffdeb0':'#ffce8a');m.emissiveIntensity=0;m.userData.transportCabin=true;}
 if(mode==='rail'){m.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),141.2),new THREE.Plane(new THREE.Vector3(-1,0,0),157.2)];m.clipShadows=true;}
 return m;
}
export function updateCabinLight(material,night){if(material.userData.transportCabin)material.emissiveIntensity=Math.max(0,night)*1.55;}
export function mountCityTransport(model,renderer,onStatus){
 const actors={air:[],rail:[]},previews={},materials=new Set(),lamps=[];
 const previewCounts={air:Math.floor(Math.random()*6),rail:Math.floor(Math.random()*4)};
 let schedules={air:[],rail:[]},travelSource=null,lastReport='',lastShadow=0,reportAt=0;
 renderer.localClippingEnabled=true;
 for(const mode of ['air','rail'])for(let slot=0;slot<fleet[mode].length;slot++){
  const name=(mode==='air'?'transport_aircraft':'transport_train')+(slot?`_${slot+1}`:'');
  const root=model.getObjectByName(name);if(!root)throw new Error('新版候班模型未载入，请刷新小城。');
  const cache=new Map();root.traverse(o=>{if(!o.isMesh)return;
   const copy=original=>{if(!cache.has(original)){const m=transportMaterial(original,mode,slot);cache.set(original,m);materials.add(m);}return cache.get(original);};
   o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  });
  const lightGroup=new THREE.Group();lightGroup.name=`${mode}_${slot}_navigation_lights`;root.add(lightGroup);
  const spots=mode==='air'?[[-4,3.2,12.8,'#ec534d'],[-4,3.2,-12.8,'#62cfa4'],[0,4.2,0,'#fff0c5']]:[[26.0,2.2,-.78,'#ffe6a1'],[26.0,2.2,.78,'#ffe6a1'],[-26.0,2.2,-.78,'#f6685c'],[-26.0,2.2,.78,'#f6685c']];
  const ownLights=[];
  for(const [i,[x,y,z,color]] of spots.entries()){
   const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0,roughness:.5});materials.add(mat);
   if(mode==='rail'){mat.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),141.2),new THREE.Plane(new THREE.Vector3(-1,0,0),157.2)];}
   const mesh=new THREE.Mesh(new THREE.SphereGeometry(mode==='air'?.16:.14,8,5),mat);mesh.position.set(x,y,z);lightGroup.add(mesh);
   const item={mesh,mode,slot,index:i};lamps.push(item);ownLights.push(item);
  }
  actors[mode].push({root,mats:[...cache.values()],lamps:ownLights,direction:slot%2?-1:1,pose:transportPose(mode,null,{slot})});
 }
 function update(travel,now,night){
  if(travel!==travelSource){travelSource=travel;schedules=buildTransportSchedule(travel?.trips);}
  const status={};let moving=false;
  for(const mode of ['air','rail']){
   const live=transportAt(schedules,mode,now);
   if(live.active)delete previews[mode];
   if(previews[mode]&&now-previews[mode].start>=transportDuration[mode]*1000)delete previews[mode];
   const preview=!!previews[mode],elapsed=live.active?live.elapsed:preview?(now-previews[mode].start)/1000:null;
   const variant=live.active?.variant??previews[mode]?.variant??{slot:0,direction:1};
   const movingPose=transportPose(mode,elapsed,variant);
   for(const [slot,actor] of actors[mode].entries()){
    const active=elapsed!=null&&slot===variant.slot,pose=active?movingPose:transportPose(mode,null,{slot});actor.pose=pose;
    if(active)actor.direction=variant.direction;
    actor.root.position.set(pose.x,pose.z,-pose.y);actor.root.quaternion.identity();actor.root.rotateY(pose.heading);actor.root.rotateZ(pose.pitch);actor.root.visible=pose.visible;
    actor.mats.forEach(m=>{m.opacity=pose.opacity;updateCabinLight(m,night);});
    actor.lamps.forEach(({mesh,index})=>{
     if(mode==='rail'){const front=actor.direction===1?index<2:index>=2;mesh.material.color.set(front?'#ffe6a1':'#f6685c');mesh.material.emissive.copy(mesh.material.color);}
     mesh.material.emissiveIntensity=(.15+night*2.5)*(mode==='air'&&index===2?.3+.7*Math.max(0,Math.sin(now/250+slot)):1);
    });
   }
   moving||=elapsed!=null;
   const detail=elapsed==null?'':mode==='air'?`${String(variant.slot+1).padStart(2,'0')}号机位 · ${variant.direction===1?'东向':'西向'}跑道`:`${variant.slot+1}号站台 · ${variant.direction===1?'东行':'西行'}`;
   status[mode]={phase:movingPose.phase,label:transportLabels[movingPose.phase],active:elapsed!=null,preview,queued:live.queued,parked:fleet[mode].length-(elapsed!=null?1:0),total:fleet[mode].length,detail,variant:elapsed==null?null:variant,eventKey:live.active?.key??null,tripIds:live.active?.tripIds??[],members:live.active?.members??'',destination:live.active?.destination??''};
  }
  if(moving&&now-lastShadow>100){renderer.shadowMap.needsUpdate=true;lastShadow=now;}
  if(now-reportAt>200){reportAt=now;const text=JSON.stringify(status);if(text!==lastReport){lastReport=text;onStatus(status);}}
  return status;
 }
 return {update,preview(mode,now=Date.now()){
  if(actors[mode]&&!transportAt(schedules,mode,now).active){const n=previewCounts[mode]++;previews[mode]={start:now,variant:{slot:(mode==='rail'?Math.floor(n/2):n)%fleet[mode].length,direction:n%2?1:-1}};return true;}return false;
 },stopPreview(mode){delete previews[mode];},snapshot:()=>Object.fromEntries(Object.entries(actors).map(([mode,list])=>[mode,list.map((a,slot)=>({slot,position:a.root.position.toArray(),visible:a.root.visible,heading:a.pose.heading,cabinMaterials:a.mats.filter(m=>m.userData.transportCabin).length,cabinLight:a.mats.find(m=>m.userData.transportCabin)?.emissiveIntensity??0}))])),dispose(){materials.forEach(m=>m.dispose());lamps.forEach(({mesh})=>mesh.geometry.dispose());}};
}
