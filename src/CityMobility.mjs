import * as THREE from 'three';
import {createLightPoolMaterial} from './CityLighting.mjs';
import {createMobility} from './mobility-sim.mjs';
const palette=['#f6e5cb','#77abd1','#cc927d','#8eb79d','#dddaca','#d3b46a'];
export function mountMobility(scene,gltf){
 const simulation=createMobility(),parts=[],dummy=new THREE.Object3D(),actor=new THREE.Matrix4(),local=new THREE.Matrix4(),rotation=new THREE.Quaternion(),axis=new THREE.Vector3(1,0,0),unit=new THREE.Vector3(1,1,1),position=new THREE.Vector3();
 gltf.scene.updateMatrixWorld(true);
 const definitions=[['motion_car',[0,0,0]],['walker_body',[0,0,0]],['walker_head',[0,0,0]],['walker_leg_left',[-.105,.86,0]],['walker_leg_right',[.105,.86,0]],['walker_arm_left',[-.255,1.34,0]],['walker_arm_right',[.255,1.34,0]]];
 for(const [name,pivot] of definitions){
  const root=gltf.scene.getObjectByName(name);if(!root)throw new Error(`缺少动态模型 ${name}`);
  root.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(-pivot[0],-pivot[1],-pivot[2]);
   const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7});const cars=name==='motion_car';
   const instances=new THREE.InstancedMesh(geometry,material,cars?simulation.cars.length:simulation.people.length);instances.name=name+'_instances';instances.frustumCulled=false;instances.castShadow=false;instances.receiveShadow=true;instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   const list=cars?simulation.cars:simulation.people;list.forEach((p,i)=>instances.setColorAt(i,new THREE.Color(name==='walker_head'?'#fff9f0':palette[p.color])));scene.add(instances);parts.push({name,pivot,instances,cars});
  });
 }
 // Cheap contact shadows move with the actors without invalidating city shadow maps.
 const shadowGeometry=new THREE.CircleGeometry(1,12);shadowGeometry.rotateX(-Math.PI/2);
 const shadowMaterial=new THREE.MeshBasicMaterial({color:'#263e3c',transparent:true,opacity:.16,depthWrite:false});
 const shadows=new THREE.InstancedMesh(shadowGeometry,shadowMaterial,simulation.cars.length+simulation.people.length);shadows.frustumCulled=false;scene.add(shadows);
 const bulbGeometry=new THREE.SphereGeometry(1,8,5),headMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(3.5,2.5,1.4)}),tailMaterial=new THREE.MeshBasicMaterial({color:new THREE.Color(2.6,.10,.025)});
 const heads=new THREE.InstancedMesh(bulbGeometry,headMaterial,simulation.cars.length*2),tails=new THREE.InstancedMesh(bulbGeometry,tailMaterial,simulation.cars.length*2);
 const beamGeometry=new THREE.PlaneGeometry(2,2);beamGeometry.rotateX(-Math.PI/2);const beamMaterial=createLightPoolMaterial('#ffe6ab',0),beams=new THREE.InstancedMesh(beamGeometry,beamMaterial,simulation.cars.length);
 for(const mesh of [heads,tails,beams]){mesh.frustumCulled=false;mesh.visible=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
 const bulbPos=new THREE.Vector3();const upAxis=new THREE.Vector3(0,1,0);
 function draw(){
  for(const part of parts){const list=part.cars?simulation.cars:simulation.people;
   list.forEach((p,i)=>{
    const heading=Math.atan2(p.pose.dx*(p.direction??1),-p.pose.dy*(p.direction??1));
    dummy.position.set(p.pose.x,part.cars ? .84 : p.routeIndex===7 ? .8 : p.routeIndex===8 ? .55 : .72,-p.pose.y);dummy.rotation.set(0,heading,0);dummy.scale.set(1,1,1);dummy.updateMatrix();actor.copy(dummy.matrix);
    const isLimb=part.name.includes('leg')||part.name.includes('arm'),isLeft=part.name.endsWith('left');
    const gait=p.pause>0?0:Math.sin(p.phase??0)*.43;
    rotation.setFromAxisAngle(axis,isLimb?gait*(isLeft?1:-1)*(part.name.includes('arm')?-1:1):0);
    position.set(...part.pivot);local.compose(position,rotation,unit);actor.multiply(local);part.instances.setMatrixAt(i,actor);
   });part.instances.instanceMatrix.needsUpdate=true;
  }
  [...simulation.cars,...simulation.people].forEach((p,i)=>{const car=i<simulation.cars.length;dummy.position.set(p.pose.x,car ? .84 : p.routeIndex===7 ? .79 : p.routeIndex===8 ? .55 : .71,-p.pose.y);dummy.rotation.set(0,Math.atan2(p.pose.dx,-p.pose.dy),0);dummy.scale.set(car ? .92 : .22,1,car?2.05:.26);dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);});shadows.instanceMatrix.needsUpdate=true;
  simulation.cars.forEach((p,i)=>{
   const angle=Math.atan2(p.pose.dx,-p.pose.dy);rotation.setFromAxisAngle(upAxis,angle);
   for(let side=0;side<2;side++)for(const [mesh,z] of [[heads,2.075],[tails,-2.03]]){
    bulbPos.set(side===0?-.65:.65,.64,z).applyQuaternion(rotation);dummy.position.set(p.pose.x+bulbPos.x,.84+bulbPos.y,-p.pose.y+bulbPos.z);dummy.rotation.set(0,angle,0);dummy.scale.set(.16,.08,.065);dummy.updateMatrix();mesh.setMatrixAt(i*2+side,dummy.matrix);
   }
   dummy.position.set(p.pose.x+p.pose.dx*4.8,.948,-p.pose.y-p.pose.dy*4.8);dummy.rotation.set(0,angle,0);dummy.scale.set(1.45,1,3.3);dummy.updateMatrix();beams.setMatrixAt(i,dummy.matrix);
  });for(const mesh of [heads,tails,beams])mesh.instanceMatrix.needsUpdate=true;
 }
 draw();
 return {setNightLights(value){for(const mesh of [heads,tails,beams])mesh.visible=value>.03;beamMaterial.uniforms.opacity.value=value*.52;},update(dt){simulation.step(dt);draw();},snapshot(){return {cars:simulation.cars.length,pedestrians:simulation.people.length,elapsed:Number(simulation.elapsed.toFixed(2)),car:simulation.cars.slice(0,3).map(c=>[+c.pose.x.toFixed(2),+c.pose.y.toFixed(2)]),walkers:simulation.people.slice(0,3).map(p=>[+p.pose.x.toFixed(2),+p.pose.y.toFixed(2)])};},dispose(){for(const mesh of [heads,tails,beams]){scene.remove(mesh);mesh.dispose();}bulbGeometry.dispose();headMaterial.dispose();tailMaterial.dispose();beamGeometry.dispose();beamMaterial.dispose();for(const p of parts){scene.remove(p.instances);p.instances.geometry.dispose();p.instances.material.dispose();p.instances.dispose();}scene.remove(shadows);shadowGeometry.dispose();shadowMaterial.dispose();shadows.dispose();const materials=new Set();gltf.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());}};
}
