const point=p=>[p.pose.x,p.pose.y,p.pose.z??.72];
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

class Visit {
  constructor(person,district,place,random) {
    this.person=person;this.district=district;this.random=random;this.place=place;
    this.returnPose={...person.pose};this.visited=new Set([place.id]);this.remainingStops=1+Math.floor(random()*2);
    this.node=district.entrance;this.state='entering';this.wait=0;
    this.waypoints=district.path(this.node,place.node);this.index=0;
    person.pause=0;person.visible=true;
  }
  next() {
    this.district.release(this.place);
    const place=--this.remainingStops>0?this.district.reserve(this.random,this.visited):null;
    this.place=place;this.index=1;
    if(place){this.visited.add(place.id);this.waypoints=this.district.path(this.node,place.node);this.state='walking';}
    else {
      this.waypoints=this.district.path(this.node,this.district.entrance);
      this.waypoints.push([this.returnPose.x,this.returnPose.y,this.returnPose.z??.72]);this.state='leaving';
    }
  }
  update(dt) {
    const p=this.person;p.moving=false;
    if(this.wait>0){
      this.wait=Math.max(0,this.wait-dt);
      if(this.wait===0){p.visible=true;if(this.place.purchase)p.carrying=true;this.next();}
      return false;
    }
    let budget=p.speed*dt;
    while(this.index<this.waypoints.length){
      const target=this.waypoints[this.index],start=point(p),length=distance(start,target);
      if(length<.00001){this.index++;continue;}
      const step=Math.min(length,budget),ratio=step/length;
      const dx=target[0]-start[0],dy=target[1]-start[1],horizontal=Math.hypot(dx,dy)||1;
      p.pose={x:start[0]+dx*ratio,y:start[1]+dy*ratio,z:start[2]+(target[2]-start[2])*ratio,dx:dx/horizontal,dy:dy/horizontal};
      p.phase+=step*5.1;p.moving=step>0;budget-=step;
      if(step<length)return false;this.index++;
    }
    if(!this.place)return true;
    this.node=this.place.node;this.state=this.place.indoor?'inside':this.place.action;
    p.visible=!this.place.indoor;p.moving=false;
    [p.pose.dx,p.pose.dy]=this.place.facing;
    this.wait=this.place.dwell[0]+this.random()*(this.place.dwell[1]-this.place.dwell[0]);
    return false;
  }
  finish() {
    this.district.release(this.place);
    const p=this.person;p.pose=this.returnPose;p.visible=true;p.moving=false;p.pause=0;
    p.visitCooldown=35+this.random()*30;p.nextPause=10+this.random()*20;
  }
  snapshot(){return {id:this.person.id,district:this.district.id,state:this.state,place:this.place?.id??null,visible:this.person.visible,carrying:!!this.person.carrying,position:point(this.person).map(v=>+v.toFixed(3))};}
}

/** Scene-owned IoC registry: inject district providers; inject this into mobility.
 * Mobility supplies the clock and existing pedestrians. No renderer, finance data,
 * timers, DOM or persistent state is required by the activity lifecycle.
 */
export class PedestrianActivities {
  constructor({random=Math.random}={}){this.random=random;this.districts=new Map();this.visits=new Map();this.completed=0;}
  register(district) {
    this.remove(district.id);this.districts.set(district.id,district);
    return ()=>{if(this.districts.get(district.id)===district)this.remove(district.id);};
  }
  remove(id) {
    for(const [person,visit] of this.visits)if(visit.district.id===id){visit.finish();this.visits.delete(person);}
    this.districts.delete(id);
  }
  update(person,dt) {
    const visit=this.visits.get(person);if(!visit)return false;
    if(dt<=0)return true;
    if(visit.update(dt)){visit.finish();this.visits.delete(person);this.completed++;}
    return true;
  }
  tryEnter(person) {
    if(person.visitCooldown>0||this.visits.has(person))return false;
    for(const district of this.districts.values()){
      if(person.routeIndex!==district.routeIndex||Math.hypot(person.pose.x-district.entry[0],person.pose.y-district.entry[1])>.35)continue;
      const place=district.reserve(this.random);if(!place)continue;
      person.carrying=false;this.visits.set(person,new Visit(person,district,place,this.random));return true;
    }
    return false;
  }
  snapshot(){return {districts:[...this.districts.keys()],completed:this.completed,visitors:[...this.visits.values()].map(v=>v.snapshot())};}
  dispose(){for(const id of [...this.districts.keys()])this.remove(id);}
}
