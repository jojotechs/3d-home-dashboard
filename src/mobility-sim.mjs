// Coordinates are Blender XY metres; rendering converts them to Three.js X,-Z.
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const unit=(a,b)=>{const l=dist(a,b)||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l];};
export function randomGenerator(seed=1729){let n=seed>>>0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
export function makeRoute(vertices,{lane=1.5,radius=3.2}={}){
 const points=[];const n=vertices.length;
 for(let i=0;i<n;i++){
  const previous=vertices[(i+n-1)%n],v=vertices[i],next=vertices[(i+1)%n],incoming=unit(previous,v),outgoing=unit(v,next);
  const cut=Math.min(radius,dist(previous,v)*.24,dist(v,next)*.24);
  const start=[v[0]-incoming[0]*cut,v[1]-incoming[1]*cut],end=[v[0]+outgoing[0]*cut,v[1]+outgoing[1]*cut];
  for(let j=0;j<=10;j++){
   const t=j/10,u=1-t,tx=incoming[0]*u+outgoing[0]*t,ty=incoming[1]*u+outgoing[1]*t,tl=Math.hypot(tx,ty)||1;
   points.push([u*u*start[0]+2*u*t*v[0]+t*t*end[0]+lane*ty/tl,u*u*start[1]+2*u*t*v[1]+t*t*end[1]-lane*tx/tl]);
  }
 }
 const lengths=[],starts=[];let length=0;
 for(let i=0;i<points.length;i++){starts.push(length);const d=dist(points[i],points[(i+1)%points.length]);lengths.push(d);length+=d;}
 return {points,lengths,starts,length,vertices};
}
export function sampleRoute(route,distance){
 const s=((distance%route.length)+route.length)%route.length;
 let low=0,high=route.starts.length-1;
 while(low<high){const mid=Math.ceil((low+high)/2);if(route.starts[mid]<=s)low=mid;else high=mid-1;}
 const a=route.points[low],b=route.points[(low+1)%route.points.length],t=route.lengths[low]?Math.min(1,(s-route.starts[low])/route.lengths[low]):0,direction=unit(a,b);
 return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,dx:direction[0],dy:direction[1]};
}
const loops=[
 [[-114,-86],[114,-86],[114,86],[-114,86]],
 [[-114,-86],[-38,-86],[-38,28],[-114,28]],
 [[-114,28],[-38,28],[-38,86],[-114,86]],
 [[-38,-28],[38,-28],[38,28],[-38,28]],
 [[-38,28],[114,28],[114,86],[-38,86]],
 [[-38,-86],[38,-86],[38,-28],[-38,-28]],
 [[38,-86],[114,-86],[114,28],[38,28]],
 [[179,-74],[185,-68],[289,-68],[295,-74],[289,-80],[185,-80]],
 [[114,-28],[173,-72.25],[179,-74],[185,-68],[289,-68],[295,-74],[289,-80],[185,-80],[179,-74],[173,-72.25],[114,-28],[114,-86],[38,-86],[38,-28]],
];
export const carRoutes=loops.flatMap((p,i)=>i===8?[makeRoute(p)]:[makeRoute(p),makeRoute([...p].reverse())]);
const rectangle=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
export const walkingRoutes=[
 rectangle(-110.4,31.6,-41.6,82.4),rectangle(-110.4,-82.4,-41.6,24.4),
 rectangle(-34.4,-24.4,34.4,24.4),rectangle(-34.4,31.6,110.4,82.4),
 rectangle(41.6,-24.4,110.4,24.4),rectangle(-34.4,-82.4,34.4,-31.6),
 rectangle(41.6,-82.4,110.4,-31.6),rectangle(207,-85.6,268,-84.4),rectangle(-2,90,58,91.5),
].map(p=>makeRoute(p,{lane:0,radius:.55}));
export const intersections=[[-114,-86],[-38,-86],[38,-86],[114,-86],[-114,28],[-38,28],[38,28],[114,28],[-114,86],[-38,86],[114,86],[-38,-28],[38,-28],[114,-28],[179,-74]];
export function createMobility(seed=Math.floor(Math.random()*4294967296),carCount=24,peopleCount=40){
 const random=randomGenerator(seed),cars=[],people=[],reservations=new Map();let elapsed=0;
 for(let i=0;i<carCount;i++){
  const routeIndex=i%carRoutes.length,route=carRoutes[routeIndex];let s=0,pose;
  for(let tries=0;tries<200;tries++){s=random()*route.length;pose=sampleRoute(route,s);if(cars.every(c=>Math.hypot(c.pose.x-pose.x,c.pose.y-pose.y)>9))break;}
  cars.push({id:i,routeIndex,s,pose,speed:0,cruise:4.7+random()*2.0,color:Math.floor(random()*6)});
 }
 for(let i=0;i<peopleCount;i++){
  const routeIndex=i%walkingRoutes.length,s=random()*walkingRoutes[routeIndex].length;
  people.push({id:i,routeIndex,s,pose:sampleRoute(walkingRoutes[routeIndex],s),speed:.9+random()*.42,direction:random()>.5?1:-1,phase:random()*Math.PI*2,color:Math.floor(random()*6),pause:0,nextPause:8+random()*35});
 }
 return {cars,people,get elapsed(){return elapsed;},step(seconds){
  const dt=Math.min(.05,Math.max(0,seconds));if(!dt)return;elapsed+=dt;
  for(const [j,entry] of reservations){const c=cars[entry.id],p=intersections[j];if((entry.entered&&Math.hypot(c.pose.x-p[0],c.pose.y-p[1])>10)||elapsed-entry.since>12)reservations.delete(j);else if(Math.hypot(c.pose.x-p[0],c.pose.y-p[1])<7)entry.entered=true;}
  // Nearest approach gets the junction first; all other approaches yield.
  for(let j=0;j<intersections.length;j++){
   if(reservations.has(j))continue;const p=intersections[j];
   const candidates=cars.map(c=>({c,d:Math.hypot(c.pose.x-p[0],c.pose.y-p[1]),ahead:(p[0]-c.pose.x)*c.pose.dx+(p[1]-c.pose.y)*c.pose.dy})).filter(v=>v.d<15&&v.ahead>0).sort((a,b)=>a.d-b.d);
   if(candidates.length)reservations.set(j,{id:candidates[0].c.id,since:elapsed,entered:false});
  }
  const speeds=cars.map(c=>{
   let desired=c.cruise;
   for(const other of cars){if(c===other)continue;const dx=other.pose.x-c.pose.x,dy=other.pose.y-c.pose.y,ahead=dx*c.pose.dx+dy*c.pose.dy,lateral=Math.abs(dx*c.pose.dy-dy*c.pose.dx);
    if(ahead>0&&ahead<15&&lateral<1.55)desired=Math.min(desired,Math.max(0,(ahead-5.6)/1.6));}
   intersections.forEach((p,j)=>{const dx=p[0]-c.pose.x,dy=p[1]-c.pose.y,ahead=dx*c.pose.dx+dy*c.pose.dy,d=Math.hypot(dx,dy);if(d<16&&ahead>0&&reservations.get(j)?.id!==c.id)desired=Math.min(desired,Math.max(0,(d-8)/1.2));});
   return c.speed+Math.max(-5*dt,Math.min(2.4*dt,desired-c.speed));
  });
  cars.forEach((c,i)=>{c.speed=speeds[i];c.s=(c.s+c.speed*dt)%carRoutes[c.routeIndex].length;c.pose=sampleRoute(carRoutes[c.routeIndex],c.s);});
  people.forEach(p=>{
   if(p.pause>0){p.pause-=dt;return;}
   p.nextPause-=dt;if(p.nextPause<=0){p.pause=1.5+random()*3;p.nextPause=14+random()*40;return;}
   p.s+=p.speed*p.direction*dt;p.phase+=p.speed*dt*5.1;p.pose=sampleRoute(walkingRoutes[p.routeIndex],p.s);
  });
 }};
}
