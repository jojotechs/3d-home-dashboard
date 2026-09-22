import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mountFinanceDistrict} from '../src/finance/FinanceDistrict.mjs';

// Asset loading is the external boundary. Real Three objects exercise scene ownership.
function asset(level) {
  const scene=new THREE.Group(), root=new THREE.Group();root.name=`finance_level_${level}`;
  root.userData={financeLevel:level,lightAnchors:[{x:0,y:0,z:3,power:40,range:8}]};scene.add(root);
  const material=new THREE.MeshStandardMaterial();material.name='finance_lamp';
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);root.add(mesh);
  const actor=new THREE.Group();actor.name=`customer_${level}`;
  actor.userData={financeMotion:'walk',route:[[0,0],[5,0],[5,5],[0,5]],speed:1};root.add(actor);
  let geometryDisposals=0,materialDisposals=0;
  mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);
  material.addEventListener('dispose',()=>materialDisposals++);
  return {gltf:{scene},root,material,actor,disposed:()=>[geometryDisposals,materialDisposals]};
}

test('changing finance level removes the entire old atmosphere; pause retains static light and stops customers',async()=>{
  const parent=new THREE.Group(),first=asset(1),second=asset(2);
  const district=mountFinanceDistrict(parent,{loadAsync:async url=>url.endsWith('1.glb')?first.gltf:second.gltf},{onReady(){},onChange(){},onError:assert.fail});
  await district.setLevel(1);district.update(2,1,false);
  assert.equal(parent.children.length,1);assert.ok(first.material.emissiveIntensity>0);
  const position=first.actor.position.clone();district.update(20,1,true);
  assert.deepEqual(first.actor.position,position);assert.equal(district.snapshot().seconds,2);
  district.update(1,0,true);assert.equal(first.material.emissiveIntensity,0);
  await district.setLevel(2);
  assert.equal(parent.getObjectByName('finance_level_1'),undefined);
  assert.equal(parent.getObjectByName('customer_1'),undefined);
  assert.deepEqual(first.disposed(),[1,1]);
  let lights=0;parent.traverse(o=>{if(o.isLight)lights++;});assert.equal(lights,1);
  district.update(1,1,false);assert.equal(district.snapshot().level,2);
  district.dispose();assert.equal(parent.children.length,0);assert.deepEqual(second.disposed(),[1,1]);
});

test('late model downloads cannot revive an obsolete level or attach after the scene has closed',async()=>{
  const parent=new THREE.Group(),pending=new Map(),errors=[];
  const loader={loadAsync:url=>new Promise(resolve=>pending.set(url,resolve))};
  const district=mountFinanceDistrict(parent,loader,{onReady(){},onChange(){},onError:e=>errors.push(e)});
  const first=asset(1),second=asset(2);
  const old=district.setLevel(2),current=district.setLevel(1);
  pending.get('/models/finance/level-1.glb')(first.gltf);await current;
  pending.get('/models/finance/level-2.glb')(second.gltf);await old;
  assert.equal(district.snapshot().level,1);assert.equal(parent.children.length,1);
  assert.deepEqual(second.disposed(),[1,1]);
  const final=asset(2),closing=district.setLevel(2);district.dispose();
  pending.get('/models/finance/level-2.glb')(final.gltf);await closing;
  assert.equal(parent.children.length,0);assert.deepEqual(final.disposed(),[1,1]);assert.deepEqual(errors,[]);
});
