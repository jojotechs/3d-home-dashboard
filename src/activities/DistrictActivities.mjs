const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

/** A district supplies a walkable graph and bookable places, in Blender metres.
 * The graph is authored with the model, so visitors never take shortcuts through buildings.
 * Reservations belong to this mounted district instance, not a global service locator.
 */
export class DistrictActivities {
  constructor({id,origin,routeIndex,nodes,edges,entrance,places}) {
    this.id=id;this.routeIndex=routeIndex;this.entrance=entrance;
    this.nodes=new Map(Object.entries(nodes).map(([id,p])=>[id,p.map((v,i)=>v+origin[i])]));
    this.links=new Map([...this.nodes.keys()].map(id=>[id,[]]));
    for(const [a,b] of edges){this.links.get(a).push(b);this.links.get(b).push(a);}
    this.places=places;this.occupied=new Set();
  }
  get entry(){return this.nodes.get(this.entrance);}
  reserve(random,excluded=new Set()) {
    const choices=this.places.filter(p=>!this.occupied.has(p.id)&&!excluded.has(p.id));
    if(!choices.length)return null;
    const place=choices[Math.floor(random()*choices.length)];this.occupied.add(place.id);return place;
  }
  release(place){if(place)this.occupied.delete(place.id);}
  path(from,to) {
    const costs=new Map([[from,0]]),previous=new Map(),pending=new Set(this.nodes.keys());
    while(pending.size){
      const current=[...pending].reduce((a,b)=>(costs.get(a)??Infinity)<(costs.get(b)??Infinity)?a:b);
      if(!costs.has(current))throw Error(`No walkable route in ${this.id}: ${from} → ${to}`);
      if(current===to)break;pending.delete(current);
      for(const next of this.links.get(current)){
        const cost=costs.get(current)+distance(this.nodes.get(current),this.nodes.get(next));
        if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,current);}
      }
    }
    const ids=[to];while(ids[0]!==from)ids.unshift(previous.get(ids[0]));
    return ids.map(id=>this.nodes.get(id));
  }
}
