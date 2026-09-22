import * as THREE from 'three';
import assets from '../../modeling/finance-levels.json' with {type:'json'};
import {createLightPoolMaterial} from '../CityLighting.mjs';

function disposeTree(root) {
  root.removeFromParent();
  const geometries=new Set(), materials=new Set();
  root.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));
    if(o.isInstancedMesh)o.dispose();
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

/** One level owns all its geometry, lights, materials and visual updates. */
function activate(gltf,level) {
  const root=gltf.scene;
  const district=root.getObjectByName(`finance_level_${level}`);
  if(!district || district.userData.financeLevel!==level)throw Error('财务街景资源不完整，请重新载入。');
  const lamps=[], actors=[];
  root.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(m.name.startsWith('finance_window')||m.name.startsWith('finance_lamp')){
          if(!lamps.includes(m))lamps.push(m);
          // glTF omits zero-strength emission, so restore it explicitly for this owned material.
          m.emissive.set('#ffbf73');m.emissiveIntensity=0;
        }
      }
    }
    if(o.userData.financeMotion==='walk'){
      const route=o.userData.route.map(([x,y])=>new THREE.Vector3(x,0,-y));
      const lengths=route.map((p,i)=>p.distanceTo(route[(i+1)%route.length]));
      actors.push({object:o,route,lengths,length:lengths.reduce((a,b)=>a+b,0),speed:o.userData.speed});
    }
  });
  // Moving customers do not leave frozen shadows in the city's cached sunlight map.
  actors.forEach(({object})=>object.traverse(o=>{if(o.isMesh)o.castShadow=false;}));
  const anchors=district.userData.lightAnchors;
  const lights=anchors.map(a=>{
    const l=new THREE.PointLight('#ffc786',0,a.range,2);l.position.set(a.x,a.z,-a.y);district.add(l);return l;
  });
  const poolMat=createLightPoolMaterial('#ffd393',0);
  const geometry=new THREE.PlaneGeometry(2,2);geometry.rotateX(-Math.PI/2);
  const pools=new THREE.InstancedMesh(geometry,poolMat,anchors.length);pools.frustumCulled=false;pools.name='finance_light_pools';
  const dummy=new THREE.Object3D();anchors.forEach((a,i)=>{dummy.position.set(a.x,.53,-a.y);dummy.scale.set(3.4,1,3.4);dummy.updateMatrix();pools.setMatrixAt(i,dummy.matrix);});district.add(pools);
  let seconds=0, night=0, paused=true;
  function update(dt,lighting,isPaused) {
    night=lighting;paused=isPaused;
    if(!paused)seconds+=dt;
    lamps.forEach(m=>{m.emissiveIntensity=night*(m.name.startsWith('finance_lamp')?2.4:.9);});
    lights.forEach((l,i)=>{l.intensity=night*anchors[i].power;});
    pools.visible=night>.005;poolMat.uniforms.opacity.value=night*.22;
    if(paused)return;
    actors.forEach(({object,route,lengths,length,speed})=>{
      let distance=seconds*speed%length,index=0;
      while(distance>lengths[index])distance-=lengths[index++];
      const a=route[index],b=route[(index+1)%route.length];
      object.position.lerpVectors(a,b,distance/lengths[index]);
      object.rotation.y=Math.atan2(-(b.x-a.x),-(b.z-a.z));
    });
  }
  return {root,update,dispose:()=>disposeTree(root),snapshot:()=>({level,seconds:+seconds.toFixed(3),paused,night:+night.toFixed(3),lights:lights.length,actors:actors.map(a=>({name:a.object.name,position:a.object.position.toArray().map(v=>+v.toFixed(3))}))})};
}

/** Load only the requested level. Late responses never reattach an obsolete level. */
export function mountFinanceDistrict(parent,loader,{onReady,onError,onChange}) {
  let active=null,requested=null,generation=0,disposed=false,ready=false;
  async function setLevel(level) {
    if(disposed||level===requested)return;
    requested=level;const revision=++generation;
    active?.dispose();active=null;onChange();
    let gltf;
    try {
      const asset=assets.levels[level];if(!asset)throw Error('财务街景等级尚未提供。');
      gltf=await loader.loadAsync(asset.url);
      if(disposed||revision!==generation){disposeTree(gltf.scene);return;}
      active=activate(gltf,level);parent.add(active.root);onChange();
      if(!ready){ready=true;onReady();}
    }catch(error){
      if(gltf&&!active)disposeTree(gltf.scene);
      if(!disposed&&revision===generation)onError(error.message||'财务街景加载失败，请重新载入。');
    }
  }
  return {setLevel,update:(dt,night,paused)=>active?.update(dt,night,paused),
    snapshot:()=>({requested,loading:!active,...active?.snapshot()}),
    dispose(){disposed=true;generation++;active?.dispose();active=null;}};
}
