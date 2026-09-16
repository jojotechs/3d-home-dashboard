import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {mountCityLighting} from './CityLighting.mjs';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {districts,visibleForNode,derived} from './city-state.mjs';
import {mountMobility} from './CityMobility.mjs';
import {mountCityTransport} from './CityTransport.mjs';
import {tripPhase} from './travel-state.mjs';

export function CityScene({realDay,state,previews,selected,mode,layoutKey,watchDeparture,travel,now,motionPaused,cityHour,cityLights,onTransport,onSelect,onReady,onError,apiRef}){
 const host=useRef(null),context=useRef(null),latest=useRef({state,previews,onSelect,onReady,onError});
 latest.current={state,previews,onSelect,onReady,onError,onTransport,selected,mode,watchDeparture,travel,now,motionPaused,cityHour,cityLights};
 useEffect(()=>{
  let disposed=false,raf;const el=host.current;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){latest.current.onError('当前环境暂时无法启动三维画面，请确认浏览器已启用图形加速。');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.setClearColor('#83cdd0');
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','可旋转的家庭城市三维地图');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#83cdd0');
  const camera=new THREE.OrthographicCamera(-170,170,105,-105,1,10000);camera.position.set(90,255,285);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minZoom=.16;controls.maxZoom=5.5;
  controls.minPolarAngle=THREE.MathUtils.degToRad(20);controls.maxPolarAngle=THREE.MathUtils.degToRad(65);controls.maxTargetRadius=440;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.target.set(0,0,0);controls.update();
  const hemisphere=new THREE.HemisphereLight('#fff8e7','#74999d',2.2);scene.add(hemisphere);
  const sun=new THREE.DirectionalLight('#fff6df',3.0);sun.position.set(-120,300,100);sun.target.position.set(70,0,15);sun.castShadow=true;
  sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-300,right:300,top:240,bottom:-240,near:1,far:850});sun.shadow.bias=-.00005;sun.shadow.normalBias=.045;scene.add(sun,sun.target);
  const renderTarget=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  const composer=new EffectComposer(renderer,renderTarget);composer.addPass(new RenderPass(scene,camera));
  const ao=new GTAOPass(scene,camera,1,1,undefined,{radius:1.2,thickness:.6,distanceFallOff:1,samples:16});ao.blendIntensity=.75;composer.addPass(ao);const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.24,.45,1.05);bloom.enabled=false;composer.addPass(bloom);composer.addPass(new OutputPass());
  const lighting=mountCityLighting(scene,renderer,sun,hemisphere,bloom);
  renderer.info.autoReset=false;
  const rays=new THREE.Raycaster(),pointer=new THREE.Vector2(),dynamic=[];const labelEls=new Map(),overviewPoints=[];let model,mobility,transport,tween=null,down=null,drag=false,loaded=0;
  const outline=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#e9fff6',transparent:true,opacity:.65,depthTest:true}));outline.visible=false;outline.renderOrder=5;scene.add(outline);
  const temp=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3();const rect=()=>el.getBoundingClientRect();
  function resize(){const {width,height}=rect();renderer.setSize(width,height);composer.setSize(width,height);const half=118;camera.left=-half*width/height;camera.right=half*width/height;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();if(model)focus(latest.current.selected,latest.current.mode);}
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  function focus(id,layout='region'){
   const d=districts.find(d=>d.id===id),center=d?[d.center[0]+(d.viewOffset?.[0]??0),d.center[1]+(d.viewOffset?.[1]??0)]:null;const toTarget=d?new THREE.Vector3(center[0],d.height*.23,-center[1]):new THREE.Vector3(78,8,10);
   const railwayView=d?.id==='rail'&&latest.current.watchDeparture;
   if(railwayView)toTarget.set(8,6,-111);
   const footprint=railwayView?[340,52]:d?.viewFootprint??d?.footprint??[d?.id==='health'?136:60,d?.id==='habits'?92:d?.id==='finance'||d?.id==='health'?44:40];
   outline.visible=!!d;if(d){const [width,depth]=footprint;outline.geometry.dispose();outline.geometry=new THREE.BufferGeometry().setFromPoints([[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([x,y])=>new THREE.Vector3(center[0]+x,.6,-center[1]-y)));}
   const view=rect(),overviewDirection=view.width<view.height?new THREE.Vector3(285,255,90):new THREE.Vector3(90,255,285);
   let zoom=d?(d.id==='health'||d.id==='airport'?1.75:d.id==='home'?3.1:2.55):1;
   if(!d){
    // Both islands and the railway mountains fit at the default overview angle.
    const direction=overviewDirection.clone().normalize(),r=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),u=new THREE.Vector3().crossVectors(direction,r).normalize();
    const points=overviewPoints.length?overviewPoints:[new THREE.Vector3(-150,0,-130),new THREE.Vector3(310,30,155)];
    const horizontal=points.map(p=>p.dot(r)),vertical=points.map(p=>p.dot(u));
    const minR=Math.min(...horizontal),maxR=Math.max(...horizontal),minU=Math.min(...vertical),maxU=Math.max(...vertical);
    const w=maxR-minR+16,h=maxU-minU+16;
    toTarget.addScaledVector(r,(maxR+minR)/2-toTarget.dot(r));toTarget.addScaledVector(u,(maxU+minU)/2-toTarget.dot(u));
    zoom=Math.min(1,(camera.right-camera.left)*(view.width-32)/view.width/w,(camera.top-camera.bottom)*Math.max(.42,(view.height-210)/view.height)/h);
   }
   if(d){camera.updateMatrixWorld();right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
    const {width,height}=rect();const drawerWidth=el.parentElement.querySelector('.today-drawer')?.getBoundingClientRect().width??320;
    const panelHeight=el.parentElement.querySelector('.region-panel')?.getBoundingClientRect().height??180;
    const [worldWidth,worldDepth]=footprint;
    const parcelWidth=Math.abs(right.x)*worldWidth+Math.abs(right.z)*worldDepth+10;
    const parcelHeight=Math.abs(up.x)*worldWidth+Math.abs(up.z)*worldDepth+Math.abs(up.y)*(railwayView?26:d.height)+8;
    zoom=Math.min(zoom,(camera.right-camera.left)*Math.max(.3,(width-(layout==='today'?drawerWidth:0)-48)/width)/parcelWidth);
    zoom=Math.min(zoom,(camera.top-camera.bottom)*Math.max(.3,(height-(layout==='region'?panelHeight:0)-180)/height)/parcelHeight);
    if(railwayView)zoom*=.91;
    toTarget.addScaledVector(right,layout==='today'?-(camera.right-camera.left)/zoom*(drawerWidth/2)/width:0);
    toTarget.addScaledVector(up,layout==='region'?-(camera.top-camera.bottom)/zoom*((panelHeight+110-90)/2)/height:0);
   }
   const direction=d?camera.position.clone().sub(controls.target):overviewDirection;
   tween={start:performance.now(),fromTarget:controls.target.clone(),toTarget,fromPosition:camera.position.clone(),toPosition:toTarget.clone().add(direction),fromZoom:camera.zoom,toZoom:zoom};
  }
  const api={focus,reset:()=>focus(null),zoom:(delta)=>{camera.zoom=THREE.MathUtils.clamp(camera.zoom+delta,.16,5.5);camera.updateProjectionMatrix();},rotate:()=>{const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);camera.position.copy(controls.target).add(offset);controls.update();if(latest.current.selected)focus(latest.current.selected,latest.current.mode);},stats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,meshes:model?dynamic.length:0})};
  api.previewTransport=(mode)=>transport?.preview(mode);api.stopTransportPreview=(mode)=>transport?.stopPreview(mode);
  apiRef.current=api;context.current={dynamic,model:null,focus,renderer};
  function selectPointer(e){if(!model||drag||e.button!==0)return;const r=rect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);rays.setFromCamera(pointer,camera);
   const hit=rays.intersectObject(model,true).find(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});
   let o=hit?.object;while(o&&!o.userData.districtId)o=o.parent;if(o?.userData.districtId)latest.current.onSelect(o.userData.districtId);
  }
  function onDown(e){down=[e.clientX,e.clientY];drag=false;tween=null;}
  function onMove(e){if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)drag=true;}
  function onUp(e){selectPointer(e);down=null;}
  renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointermove',onMove);renderer.domElement.addEventListener('pointerup',onUp);
  controls.addEventListener('start',()=>{tween=null;});
  const draco=new DRACOLoader().setDecoderPath('/draco/');
  const assetReady=()=>{loaded++;if(loaded===3)latest.current.onReady();};
  new GLTFLoader().setDRACOLoader(draco).load('/models/city-lighting.glb',gltf=>{if(disposed)return;try{lighting.attachRig(gltf);assetReady();}catch(error){latest.current.onError(error.message);}},undefined,error=>latest.current.onError(error.message||'灯光模型加载失败'));
  new GLTFLoader().setDRACOLoader(draco).load('/models/mobility.glb',gltf=>{if(disposed)return;try{mobility=mountMobility(scene,gltf);el.dataset.mobility=JSON.stringify(mobility.snapshot());assetReady();}catch(error){latest.current.onError(error.message);}},undefined,error=>latest.current.onError(error.message||'行人与车辆加载失败'));
  new GLTFLoader().setDRACOLoader(draco).load('/models/family-city.glb',gltf=>{
   if(disposed)return;model=gltf.scene;scene.add(model);context.current.model=model;
   model.traverse(o=>{if(o.isMesh){o.castShadow=!o.name.startsWith('ocean');o.receiveShadow=true;}if(o.userData.kind){dynamic.push(o);o.visible=visibleForNode(o.userData,latest.current.state,latest.current.previews);}});
   lighting.attachCity(model);
   try{transport=mountCityTransport(model,renderer,s=>latest.current.onTransport?.(s));}catch(error){latest.current.onError(error.message);return;}
   model.updateMatrixWorld(true);
   for(const name of ['static_city_base',...districts.map(d=>'district_'+d.id)]){
    const root=model.getObjectByName(name);if(!root)continue;const box=new THREE.Box3().setFromObject(root);
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])overviewPoints.push(new THREE.Vector3(x,y,z));
   }
   for(const d of districts){
    const button=document.createElement('button');button.className='map-label';button.dataset.district=d.id;button.style.setProperty('--district-color',d.color);
    const dot=document.createElement('span');dot.className='label-dot';const title=document.createElement('span');title.textContent=d.name;const count=document.createElement('span');count.className='label-count';button.append(dot,title,count);
    button.onclick=()=>latest.current.onSelect(d.id);button.setAttribute('aria-label',`打开${d.name}`);el.appendChild(button);labelEls.set(d.id,{button,count});
   }
   renderer.shadowMap.needsUpdate=true;
   focus(latest.current.selected,latest.current.mode);
   assetReady();
  },undefined,error=>latest.current.onError(error.message||'模型加载失败'));
  let frame=0,metricStart=performance.now(),lastFrame=0;
  function render(t){
   if(disposed)return;raf=requestAnimationFrame(render);
   if(tween){const ratio=Math.min((t-tween.start)/(matchMedia('(prefers-reduced-motion: reduce)').matches?1:450),1);const q=ratio*ratio*(3-2*ratio);controls.target.lerpVectors(tween.fromTarget,tween.toTarget,q);camera.position.lerpVectors(tween.fromPosition,tween.toPosition,q);camera.zoom=THREE.MathUtils.lerp(tween.fromZoom,tween.toZoom,q);camera.updateProjectionMatrix();if(ratio===1)tween=null;}
   controls.target.x=THREE.MathUtils.clamp(controls.target.x,-160,325);controls.target.z=THREE.MathUtils.clamp(controls.target.z,-155,180);controls.update();
   const dt=lastFrame?Math.min(.05,(t-lastFrame)/1000):0;lastFrame=t;
   lighting.setTime(latest.current.cityHour??13,latest.current.cityLights!==false);const lightFrame=lighting.update(dt,t/1000);mobility?.setNightLights(lightFrame.night);
   if(transport){const status=transport.update(latest.current.travel,Date.now(),lightFrame.night);if(frame%15===0)el.dataset.transport=JSON.stringify({status,actors:transport.snapshot()});}
   if(frame%30===0)el.dataset.daylight=JSON.stringify(lighting.snapshot());
   if(mobility&&!latest.current.motionPaused&&!document.hidden)mobility.update(dt);
   renderer.info.reset();composer.render();
   if(frame>0&&frame%120===0){el.dataset.cameraZoom=camera.zoom.toFixed(3);el.dataset.viewportWidth=String(rect().width);if(mobility)el.dataset.mobility=JSON.stringify({...mobility.snapshot(),paused:latest.current.motionPaused});el.dataset.visibleGroups=JSON.stringify(dynamic.filter(o=>o.visible).map(o=>o.name));el.dataset.renderCalls=String(renderer.info.render.calls);el.dataset.renderTriangles=String(renderer.info.render.triangles);el.dataset.averageFps=(120000/(performance.now()-metricStart)).toFixed(1);metricStart=performance.now();}
   if(frame++%3===0&&model){const {width,height}=rect();const used=[];const pending=derived(latest.current.state).pending;
    const ordered=[...districts].sort((a,b)=>Number(b.id===latest.current.selected)-Number(a.id===latest.current.selected));
    for(const d of ordered){const item=labelEls.get(d.id);if(!item)continue;const anchor=model.getObjectByName('anchor_label_'+d.id);if(anchor)anchor.getWorldPosition(temp);else temp.set(d.center[0],d.height+2,-d.center[1]);temp.project(camera);
     const x=(temp.x*.5+.5)*width,y=(-temp.y*.5+.5)*height;const overlap=used.some(a=>Math.abs(a[0]-x)<125&&Math.abs(a[1]-y)<46);const hidden=latest.current.mode==='region'||overlap||temp.z>1||x<55||x>width-55||y<100||y>height-70;
     item.button.style.visibility=hidden?'hidden':'visible';item.button.style.transform=`translate(${x}px, ${y}px) translate(-50%,-50%)`;if(!hidden)used.push([x,y]);
     const trips=(latest.current.travel?.trips??[]).filter(t=>t.mode===d.travelMode),away=trips.filter(t=>tripPhase(t,latest.current.now)==='away').length,upcoming=trips.filter(t=>tripPhase(t,latest.current.now)==='upcoming').length;
     const n=d.travelMode?away||upcoming:pending.filter(t=>t.district===d.id).length;item.count.textContent=n?d.travelMode?`${n} ${away?'在途':'待出发'}`:`${n} 项`:'';item.count.hidden=!n;
    }
   }
  }raf=requestAnimationFrame(render);
  return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();mobility?.dispose();transport?.dispose();lighting.dispose();draco.dispose();ao.dispose();bloom.dispose();composer.dispose();renderer.dispose();const materials=new Set();model?.traverse(o=>{if(o.isMesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());outline.geometry.dispose();outline.material.dispose();el.replaceChildren();apiRef.current=null;context.current=null;};
 },[]);
 useEffect(()=>{const c=context.current;if(c){c.dynamic.forEach(o=>{o.visible=visibleForNode(o.userData,state,previews);});if(host.current)host.current.dataset.visibleGroups=JSON.stringify(c.dynamic.filter(o=>o.visible).map(o=>o.name));if(c.renderer)c.renderer.shadowMap.needsUpdate=true;}},[state,previews,realDay]);
 useEffect(()=>{if(selected)context.current?.focus(selected,mode);else context.current?.focus(null);},[selected,mode,layoutKey]);
 return <div ref={host} className="city-canvas" data-testid="city-canvas"/>;
}
