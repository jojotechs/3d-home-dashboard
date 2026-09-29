import * as THREE from 'three';

const point=([x,y,z])=>new THREE.Vector3(x,z,-y);
const up=new THREE.Vector3(0,1,0);

function flight(node) {
  const points=node.userData.route.map(point),lengths=points.map((p,i)=>p.distanceTo(points[(i+1)%points.length]));
  const total=lengths.reduce((a,b)=>a+b,0);
  return seconds=>{
    let distance=(seconds*node.userData.speed+(node.userData.offset??0))%total,index=0;
    while(distance>lengths[index])distance-=lengths[index++];
    const a=points[index],b=points[(index+1)%points.length];
    node.position.copy(a).lerp(b,distance/lengths[index]);
    node.rotation.y=Math.atan2(-(b.z-a.z),b.x-a.x);
  };
}

function beam(root,spec,index) {
  const geometry=new THREE.CylinderGeometry(1,0,1,18,1,true);geometry.translate(0,.5,0);
  const material=new THREE.MeshBasicMaterial({color:spec.color,transparent:true,opacity:0,
    depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=`finance_beam_${index}`;
  mesh.position.copy(point(spec.from));root.add(mesh);
  const target=new THREE.Object3D(),base=point(spec.to),sweep=point(spec.sweep??[0,0,0]);root.add(target);
  const light=new THREE.SpotLight(spec.color,0,base.distanceTo(mesh.position)+12,.2,.65,2);
  light.position.copy(mesh.position);light.target=target;root.add(light);
  const direction=new THREE.Vector3();
  return (seconds,night)=>{
    target.position.copy(base).addScaledVector(sweep,Math.sin(seconds*Math.PI*2/(spec.period??16)+(spec.phase??0)));
    direction.copy(target.position).sub(mesh.position);const length=direction.length();
    mesh.quaternion.setFromUnitVectors(up,direction.normalize());mesh.scale.set(spec.radius,length,spec.radius);
    mesh.visible=night>.005;material.opacity=night*.055;
    light.angle=Math.atan2(spec.radius,length)*1.7;light.intensity=night*220;
  };
}

/** Each effect consumes the same owned visual clock; no business clock or background ticker. */
export function createFinanceAtmosphere(root) {
  const beams=(root.userData.financeEffects?.beams??[]).map((spec,i)=>beam(root,spec,i));
  const flights=[],holograms=[];
  root.traverse(node=>{
    if(node.userData.financeMotion==='fly')flights.push(flight(node));
    if(node.userData.financeHologram){
      const materials=new Set();
      node.traverse(o=>{if(o.isMesh){
        o.castShadow=false;
        (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{
          // Effect meshes are exported with their own materials; never touch warm window materials.
          materials.add(m);m.transparent=true;m.depthWrite=false;m.side=THREE.DoubleSide;
        });
      }});
      const base=node.rotation.y,phase=node.userData.phase??0;
      holograms.push((seconds,night)=>{
        node.rotation.y=base+Math.sin(seconds*.3+phase)*.22;
        materials.forEach(m=>{m.opacity=.36+night*.26;m.emissive.copy(m.color);m.emissiveIntensity=.25+night*1.65;});
      });
    }
  });
  let lit=false;
  return {
    update(seconds,night){lit=night>.005;beams.forEach(update=>update(seconds,night));flights.forEach(update=>update(seconds));holograms.forEach(update=>update(seconds,night));},
    snapshot:()=>({beams:beams.length,flights:flights.length,holograms:holograms.length,lit}),
  };
}
