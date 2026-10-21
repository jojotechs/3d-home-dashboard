import assets from '../../modeling/habit-farm.json' with {type:'json'};

function release(root) {
  root.removeFromParent();
  const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(node=>{
    if(node.geometry)geometries.add(node.geometry);
    for(const material of node.material?(Array.isArray(node.material)?node.material:[node.material]):[]){
      materials.add(material);
      for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
    }
  });
  geometries.forEach(value=>value.dispose());materials.forEach(value=>value.dispose());textures.forEach(value=>value.dispose());
}

/** Owns one generic asset; only the latest authorized projection decides visibility.
 * parent is district_habits in farm-local metres, not the whole world scene.
 * No clocks, visual callbacks or loading completion grant business growth.
 */
export class FarmDistrict {
  constructor({parent,loader,onChange=()=>{},onError=()=>{}}) {
    this.parent=parent;this.loader=loader;this.onChange=onChange;this.onError=onError;
    this.asset=null;this.nodes=null;this.pending=null;this.disposed=false;this.projection=null;
  }
  setProjection(projection) {
    if(this.disposed)return Promise.resolve();
    this.projection=projection?.identity&&projection?.habitId?{
      identity:projection.identity,habitId:projection.habitId,planted:projection.planted===true,
      progress:Math.min(2,Math.max(0,Math.floor(Number(projection.progress)||0))),
      ready:Math.max(0,Math.floor(Number(projection.ready)||0)),
    }:null;
    this.apply();
    if(this.asset)return Promise.resolve();
    if(!this.pending)this.pending=this.load().finally(()=>{this.pending=null;if(!this.disposed)this.onChange();});
    return this.pending;
  }
  async load() {
    let gltf;
    try {
      gltf=await this.loader.loadAsync(assets.asset);
      if(this.disposed){release(gltf.scene);return;}
      const root=gltf.scene.getObjectByName(assets.root),neutral=gltf.scene.getObjectByName(assets.neutral);
      const plot=gltf.scene.getObjectByName(assets.plot),stages=assets.stages.map(name=>gltf.scene.getObjectByName(name));
      const ready=gltf.scene.getObjectByName(assets.ready);
      if(!root||!neutral||!plot||stages.some(node=>!node)||!ready)throw Error('雏菊场景资源不完整，请重试。');
      this.nodes={root,neutral,plot,stages,ready};this.asset=gltf.scene;
      this.asset.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}});
      this.apply();this.parent.add(this.asset);this.onChange();
    }catch(error){
      if(gltf?.scene)release(gltf.scene);this.asset=null;this.nodes=null;
      if(!this.disposed)this.onError(error.message||'雏菊场景加载失败，请重试。');
    }
  }
  apply() {
    if(!this.nodes)return;
    const p=this.projection,{plot,stages,ready}=this.nodes;
    plot.visible=Boolean(p);plot.userData.habitId=p?.habitId??null;
    stages.forEach((node,index)=>{node.visible=Boolean(p?.planted&&p.progress===index);});
    ready.visible=Boolean(p&&p.ready>0);
    this.onChange();
  }
  update() { /* Static geometry uses existing city light and has no business clock. */ }
  snapshot() {
    const p=this.projection;
    return {loaded:Boolean(this.asset),loading:Boolean(this.pending),habitId:p?.habitId??null,
      planted:p?.planted??false,progress:p?.progress??0,ready:p?.ready??0,
      visibleStage:this.asset&&p?.planted?p.progress:null,readyBaskets:this.asset&&p&&p.ready>0?1:0};
  }
  dispose() {
    if(this.disposed)return;
    this.disposed=true;this.projection=null;
    if(this.asset)release(this.asset);
    this.asset=null;this.nodes=null;
  }
}
