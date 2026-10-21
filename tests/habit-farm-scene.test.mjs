import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FarmDistrict} from '../src/habits/FarmDistrict.mjs';

// Decode the delivered Blender asset. Only the network delivery boundary is controlled.
async function deliveredAsset() {
  const bytes=await readFile(new URL('../public/models/habits/daisy.glb',import.meta.url));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
}
function visible(root,name) {
  const node=root.getObjectByName(name);assert.ok(node,`Missing delivered asset node ${name}`);
  for(let current=node;current;current=current.parent)if(!current.visible)return false;
  return true;
}

test('selected current round and old ready harvest remain separate; clearing identity leaves only neutral farm',async()=>{
  const parent=new THREE.Group();
  const farm=new FarmDistrict({parent,loader:{loadAsync:deliveredAsset},onError:assert.fail});
  await farm.setProjection(null);
  assert.equal(visible(parent,'habit_neutral_signs'),true);
  assert.equal(visible(parent,'habit_daisy_stage_0'),false);
  await farm.setProjection({identity:'household:alice',habitId:'reading',planted:true,progress:0,ready:0});
  assert.equal(visible(parent,'habit_daisy_stage_0'),true);
  assert.equal(visible(parent,'habit_daisy_stage_1'),false);
  await farm.setProjection({identity:'household:alice',habitId:'reading',planted:true,progress:1,ready:0});
  assert.equal(visible(parent,'habit_daisy_stage_0'),false);
  assert.equal(visible(parent,'habit_daisy_stage_1'),true);
  await farm.setProjection({identity:'household:alice',habitId:'reading',planted:true,progress:2,ready:3});
  assert.equal(visible(parent,'habit_daisy_stage_2'),true);
  assert.equal(visible(parent,'habit_daisy_ready'),true);
  const count=(()=>{let n=0;parent.traverse(()=>n++);return n;})();
  await farm.setProjection({identity:'household:alice',habitId:'reading',planted:true,progress:0,ready:9000});
  assert.equal(visible(parent,'habit_daisy_stage_0'),true);
  assert.equal(visible(parent,'habit_daisy_ready'),true);
  let after=0;parent.traverse(()=>after++);assert.equal(after,count,'Warehouse quantity must not create unbounded scene instances');
  await farm.setProjection(null);
  assert.equal(visible(parent,'habit_daisy_ready'),false);
  assert.equal(visible(parent,'habit_daisy_stage_0'),false);
  assert.equal(farm.snapshot().habitId,null);
  assert.equal(visible(parent,'habit_neutral_signs'),true);
  farm.dispose();assert.equal(parent.children.length,0);
});

test('late delivery shows only the latest identity and closing releases every delivered resource',async()=>{
  const parent=new THREE.Group(),gltf=await deliveredAsset();let deliver,geometryDisposals=0,materialDisposals=0;
  const geometries=new Set(),materials=new Set();
  gltf.scene.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    for(const m of node.material?(Array.isArray(node.material)?node.material:[node.material]):[])materials.add(m);
  });
  geometries.forEach(g=>g.addEventListener('dispose',()=>geometryDisposals++));
  materials.forEach(m=>m.addEventListener('dispose',()=>materialDisposals++));
  const farm=new FarmDistrict({parent,loader:{loadAsync:()=>new Promise(resolve=>{deliver=resolve;})},onError:assert.fail});
  const older=farm.setProjection({identity:'household:alice',habitId:'reading',planted:true,progress:2,ready:5});
  const latest=farm.setProjection({identity:'household:bob',habitId:'exercise',planted:true,progress:0,ready:0});
  deliver(gltf);await Promise.all([older,latest]);
  assert.equal(farm.snapshot().habitId,'exercise');
  assert.equal(visible(parent,'habit_daisy_stage_0'),true);
  assert.equal(visible(parent,'habit_daisy_stage_2'),false);
  assert.equal(visible(parent,'habit_daisy_ready'),false);
  farm.dispose();farm.dispose();
  assert.equal(parent.children.length,0);
  assert.equal(geometryDisposals,geometries.size);
  assert.equal(materialDisposals,materials.size);
});

test('closing while a download is pending never attaches, retains or republishes its model',async()=>{
  const parent=new THREE.Group(),gltf=await deliveredAsset();let deliver,disposed=0,changes=0;
  gltf.scene.traverse(node=>{node.geometry?.addEventListener('dispose',()=>disposed++);});
  const farm=new FarmDistrict({parent,loader:{loadAsync:()=>new Promise(resolve=>{deliver=resolve;})},onError:assert.fail,onChange:()=>changes++});
  const loading=farm.setProjection({identity:'household:alice',habitId:'reading',planted:true,progress:1,ready:0});
  farm.dispose();deliver(gltf);await loading;
  assert.equal(parent.children.length,0);assert.ok(disposed>0);
  assert.equal(changes,0,'A closed scene must not receive a late load notification');
  assert.equal(farm.snapshot().habitId,null);
  await farm.setProjection({identity:'household:bob',habitId:'exercise',planted:true,progress:1,ready:0});
  assert.equal(parent.children.length,0);
});

test('failed delivery can retry and visual time never changes confirmed production',async()=>{
  const parent=new THREE.Group(),errors=[];let failed=true;
  const farm=new FarmDistrict({parent,loader:{loadAsync:async()=>{if(failed)throw Error('offline');return deliveredAsset();}},onError:error=>errors.push(error)});
  const p={identity:'household:alice',habitId:'reading',planted:true,progress:1,ready:2};
  await farm.setProjection(p);assert.equal(parent.children.length,0);assert.deepEqual(errors,['offline']);
  failed=false;await farm.setProjection(p);assert.equal(visible(parent,'habit_daisy_stage_1'),true);
  const before=farm.snapshot();farm.update(86400,1,false);farm.update(86400,0,true);
  assert.deepEqual(farm.snapshot(),before);
  await farm.setProjection({identity:'household:alice',habitId:'reading',planted:false,progress:0,ready:2});
  assert.equal(visible(parent,'habit_daisy_stage_1'),false);
  assert.equal(visible(parent,'habit_daisy_ready'),true);
  farm.dispose();
});
