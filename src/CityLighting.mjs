import * as THREE from 'three';
import {daylightFrame} from './daylight-state.mjs';

export function createLightPoolMaterial(color='#ffcb78',opacity=.22){
 return new THREE.ShaderMaterial({uniforms:{tint:{value:new THREE.Color(color)},opacity:{value:opacity}},
  vertexShader:'varying vec2 vPool; void main(){vPool=uv*2.0-1.0; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vPool; uniform vec3 tint; uniform float opacity; void main(){float r=length(vPool); float a=pow(max(0.0,1.0-r),2.3)*opacity; gl_FragColor=vec4(tint,a);}',
  transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,
 });
}
const worldVaryings='varying vec3 vCityPosition; varying vec3 vCityNormal;';
function windowMaterial(original,finance,night){
 const mat=original.clone();mat.customProgramCacheKey=()=>`city-window-v06-${finance}`;
 mat.onBeforeCompile=shader=>{
  shader.uniforms.cityNight=night;
  shader.vertexShader=worldVaryings+'\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityPosition=(modelMatrix*vec4(transformed,1.0)).xyz; vCityNormal=normalize(mat3(modelMatrix)*normal);');
  shader.fragmentShader=worldVaryings+'\nuniform float cityNight;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   vec3 wn=normalize(vCityNormal); float upright=1.0-smoothstep(.32,.70,abs(wn.y));
   float along=abs(wn.x)>abs(wn.z)?vCityPosition.z:vCityPosition.x;
   vec2 room=vec2(along*.38,vCityPosition.y*.32); vec2 cell=floor(room);
   float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
   float occupied=step(.24,seed); float gradual=smoothstep(seed*.35,seed*.35+.50,cityNight);
   vec2 tile=fract(room); float pane=smoothstep(.12,.20,tile.x)*(1.0-smoothstep(.78,.86,tile.x))*smoothstep(.17,.23,tile.y)*(1.0-smoothstep(.72,.79,tile.y));
   float facade=${finance?'mix(1.0,pane,smoothstep(7.0,10.0,vCityPosition.y))':'1.0'};
   vec3 warm=mix(vec3(1.0,.48,.16),vec3(1.0,.80,.43),seed);
   totalEmissiveRadiance+=warm*upright*facade*(occupied*gradual*1.45+cityNight*.055);
  `);
 };
 return mat;
}

export function mountCityLighting(scene,renderer,sun,hemisphere,bloom){
 const moon=new THREE.DirectionalLight('#b1c9ff',.7);moon.position.set(60,250,-140);scene.add(moon);
 const night={value:0},colored=new THREE.Color(),blended=new THREE.Color();
 const fixtures=[],windowMats=[],waterMats=[],pointLights=[];let rig=null,pools=null,poolMat=null;
 let targetHour=13,targetLights=true,currentNight=0,lastShadow=0,lastSunPosition=sun.position.clone(),beacon=null;
 for(const [x,z,h,range] of [[0,0,5,27],[55,-52,5,35],[76,0,6,28],[242,85,6,36],[28,-91,5,30]]){
  const light=new THREE.PointLight('#ffc88a',0,range,2);light.position.set(x,h,z);scene.add(light);pointLights.push(light);
 }
 function attachCity(model){
  const cache=new Map();model.traverse(o=>{if(!o.isMesh)return;
   let parent=o,finance=false,sea=false;while(parent){finance||=parent.name==='district_finance';sea||=parent.name==='ocean';parent=parent.parent;}
   sea||=o.name.startsWith('ocean');
   const mapMaterial=original=>{
    if(sea){const mat=original.clone();waterMats.push(mat);return mat;}
    if(!original.name.includes('glass'))return original;
    const key=`${original.uuid}:${finance}`;if(!cache.has(key)){const mat=windowMaterial(original,finance,night);cache.set(key,mat);windowMats.push(mat);}return cache.get(key);
   };
   o.material=Array.isArray(o.material)?o.material.map(mapMaterial):mapMaterial(o.material);
  });
 }
 function attachRig(gltf){
  rig=gltf.scene;scene.add(rig);const root=rig.getObjectByName('city_lighting_rig');
  if(!root?.userData.lightAnchors?.length)throw new Error('灯光模型缺少路灯位置');
  rig.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   for(const mat of Array.isArray(o.material)?o.material:[o.material]){
    if(mat.name.includes('night_')){if(!fixtures.includes(mat))fixtures.push(mat);if(mat.name.includes('night_red'))beacon=mat;mat.emissiveIntensity=0;}
   }
  });
  const anchors=root.userData.lightAnchors;
  const geometry=new THREE.PlaneGeometry(2,2);geometry.rotateX(-Math.PI/2);poolMat=createLightPoolMaterial();
  pools=new THREE.InstancedMesh(geometry,poolMat,anchors.length);pools.name='street_light_pools';pools.frustumCulled=false;
  const dummy=new THREE.Object3D();anchors.forEach((p,i)=>{dummy.position.set(p.x,p.ground+.018,-p.y);dummy.scale.set(p.radius,1,p.radius);dummy.updateMatrix();pools.setMatrixAt(i,dummy.matrix);});scene.add(pools);
  renderer.shadowMap.needsUpdate=true;
 }
 function setTime(hour,lights=true){targetHour=hour;targetLights=lights;}
 function update(dt,seconds){
  const frame=daylightFrame(targetHour),ease=1-Math.exp(-Math.min(.1,dt)*3.0);
  function tint(target,key){const [a,b]=frame.colors[key];colored.set(a);blended.set(b);colored.lerp(blended,frame.mix);target.lerp(colored,ease);}
  tint(scene.background,'sky');tint(hemisphere.color,'hemi');tint(hemisphere.groundColor,'ground');tint(sun.color,'sun');
  for(const m of waterMats)tint(m.color,'water');
  sun.intensity=THREE.MathUtils.lerp(sun.intensity,frame.sunIntensity,ease);
  hemisphere.intensity=THREE.MathUtils.lerp(hemisphere.intensity,frame.ambient,ease);moon.intensity=THREE.MathUtils.lerp(moon.intensity,frame.moon,ease);
  renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,frame.exposure,ease);
  const [x,y,z]=frame.sunPosition;sun.position.lerp(new THREE.Vector3(x+78,y,z),ease);
  // Static geometry casts moving sunlight; refresh at most 8 Hz during transitions.
  if(seconds-lastShadow>.125&&sun.position.distanceToSquared(lastSunPosition)>.0025){renderer.shadowMap.needsUpdate=true;lastSunPosition.copy(sun.position);lastShadow=seconds;}
  currentNight=THREE.MathUtils.lerp(currentNight,frame.night,ease);night.value=currentNight*(targetLights?1:0);
  for(const m of fixtures)m.emissiveIntensity=night.value*(m===beacon?1.8+Math.pow(Math.max(0,Math.sin(seconds*2.2)),5)*2.3:2.8);
  if(poolMat)poolMat.uniforms.opacity.value=night.value*.40;
  if(pools)pools.visible=night.value>.005;
  pointLights.forEach(l=>{l.intensity=night.value*64;});
  const darkBloom=1-Math.min(1,frame.sunIntensity/.8);bloom.enabled=night.value>.02&&darkBloom>.025;bloom.strength=night.value*.24*darkBloom;
  return {night:night.value,phase:frame.phase,hour:targetHour};
 }
 return {attachCity,attachRig,setTime,update,snapshot:()=>({hour:targetHour,phase:daylightFrame(targetHour).phase,lights:targetLights,night:+night.value.toFixed(3),sun:sun.position.toArray().map(v=>+v.toFixed(2)),sunIntensity:+sun.intensity.toFixed(3),sky:scene.background.getHexString(),windowMaterials:windowMats.length,lanterns:pools?.count??0}),dispose(){
  scene.remove(moon);pointLights.forEach(l=>scene.remove(l));
  if(pools){scene.remove(pools);pools.geometry.dispose();poolMat.dispose();pools.dispose();}
  if(rig){scene.remove(rig);const mats=new Set();rig.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));}});mats.forEach(m=>m.dispose());}
  // Model materials are disposed by CityScene, after their last render.
 }};
}
