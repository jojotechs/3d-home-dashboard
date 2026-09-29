import * as THREE from 'three';

const point=([x,y,z])=>new THREE.Vector3(x,z,-y);

/** Visual-only effects owned and disposed with the displayed district root. */
export function createFinanceAtmosphere(root) {
  const specs=root.userData.financeEffects??{};
  const beams=(specs.beams??[]).map((spec,index)=>{
    // A low-cost open light volume, not a shadow-casting moving lamp.
    const geometry=new THREE.CylinderGeometry(1,0,1,18,1,true);geometry.translate(0,.5,0);
    const material=new THREE.MeshBasicMaterial({color:spec.color,transparent:true,opacity:0,
      depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`finance_beam_${index}`;
    mesh.position.copy(point(spec.from));const direction=point(spec.to).sub(mesh.position);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
    mesh.scale.set(spec.radius,direction.length(),spec.radius);root.add(mesh);return mesh;
  });
  let lit=false;
  return {
    update(seconds,night){lit=night>.005;beams.forEach(mesh=>{mesh.visible=lit;mesh.material.opacity=night*.055;});},
    snapshot:()=>({beams:beams.length,lit}),
  };
}
