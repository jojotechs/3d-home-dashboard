// Absolute departure times are independent of daylight and ambient traffic clocks.
export const transportDuration={air:84,rail:39};
export const fleet={air:[{x:-36,y:-14},{x:0,y:-14},{x:36,y:-14}],rail:[{x:0,y:11.2},{x:0,y:4.8}]};
export const transportLabels={waiting:'候班中',pushback:'推出机位',taxi:'滑向跑道',lineup:'准备起飞',takeoff:'加速起飞',climb:'飞向目的地',clear:'等待下一班',approach:'新飞机进场',landing:'着陆滑跑',parking:'滑向停机位',leaving:'列车出站',entering:'新列车进站'};
export function departureVariant(mode,key){
 let n=2166136261;for(const c of String(key))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 return {slot:n%fleet[mode].length,direction:(n>>>5)&1?1:-1};
}
export function buildTransportSchedule(trips=[]){
 const schedules={air:[],rail:[]};
 for(const mode of ['air','rail']){
  const groups=new Map();
  for(const trip of trips){const time=Date.parse(trip.departAt),end=Date.parse(trip.endAt);
   if(trip.mode!==mode||!Number.isFinite(time)||!Number.isFinite(end)||end<=time)continue;
   if(!groups.has(time))groups.set(time,[]);groups.get(time).push(trip);
  }
  let available=-Infinity;
  for(const [departAt,members] of [...groups].sort((a,b)=>a[0]-b[0])){
   const startAt=Math.max(departAt,available),endAt=startAt+transportDuration[mode]*1000,key=`${mode}:${departAt}`;
   schedules[mode].push({key,mode,departAt,startAt,endAt,variant:departureVariant(mode,key),tripIds:members.map(t=>t.id).sort(),members:[...new Set(members.map(t=>t.members))].join('、'),destination:[...new Set(members.map(t=>t.destination))].join(' / ')});available=endAt;
  }
 }
 return schedules;
}
export function transportAt(schedule,mode,now){
 const jobs=schedule[mode]??[],active=jobs.find(j=>j.startAt<=now&&now<j.endAt)??null;
 return {active,elapsed:active?(now-active.startAt)/1000:0,queued:jobs.filter(j=>j.departAt<=now&&j.startAt>now).length};
}
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function curve(points,t){
 const u=1-t,[a,b,c,d]=points;
 const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
 const dx=3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),dy=3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
 return {x,y,heading:Math.atan2(dy,dx)};
}
export function transportPose(mode,elapsed=null,{slot=0,direction=1}={}){
 const t=elapsed??-1,d=direction,gate=fleet[mode][slot];
 const base={x:gate.x,y:gate.y,z:0,heading:mode==='air'?Math.PI/2:0,pitch:0,opacity:1,visible:true,phase:'waiting'};
 if(t<0||t>=transportDuration[mode])return base;
 if(mode==='rail'){
  const exit=d===1?158:-198,entrance=d===1?-198:158;
  if(t<16)return {...base,x:exit*(t/16)**1.7,phase:'leaving'};
  if(t<21)return {...base,visible:false,phase:'clear'};
  return {...base,x:entrance*(1-smooth((t-21)/18)),phase:'entering'};
 }
 const gx=gate.x,branch=gx+12*d,forward=d===1?0:Math.PI,backward=d===1?Math.PI:0;
 if(t<5)return {...base,y:mix(-14,-28,smooth(t/5)),phase:'pushback'};
 if(t<9){const p=curve([[gx,-28],[gx,-38],[gx+6*d,-46],[branch,-46]],smooth((t-5)/4));return {...base,...p,heading:p.heading+Math.PI,phase:'pushback'};}
 if(t<10)return {...base,x:branch,y:-46,heading:backward,phase:'taxi'};
 if(t<17)return {...base,x:mix(branch,-48*d,smooth((t-10)/7)),y:-46,heading:backward,phase:'taxi'};
 if(t<23){const a=(t-17)/6*Math.PI;return {...base,x:-d*(48+10*Math.sin(a)),y:-56+10*Math.cos(a),heading:Math.atan2(-Math.sin(a),-d*Math.cos(a)),phase:'taxi'};}
 if(t<25)return {...base,x:-48*d,y:-66,heading:forward,phase:'lineup'};
 if(t<35){const u=(t-25)/10,x=-48+114*u*u,lift=clamp((x-25)/41);return {...base,x:x*d,y:-66,z:8*lift*lift,heading:forward,pitch:.17*smooth(lift),phase:'takeoff'};}
 if(t<42){const u=(t-35)/7;return {...base,x:d*(66+144*u),y:-66,z:8+72*u,heading:forward,pitch:.17,opacity:1-smooth((u-.8)/.2),phase:'climb'};}
 if(t<46)return {...base,visible:false,phase:'clear'};
 if(t<55){const u=(t-46)/9;return {...base,x:d*mix(-190,-48,u),y:-66,z:45*(1-u)**2,heading:forward,pitch:-.16*(1-u),opacity:smooth(u/.15),phase:'approach'};}
 if(t<62)return {...base,x:d*mix(-48,48,1-(1-(t-55)/7)**1.4),y:-66,heading:forward,phase:'landing'};
 if(t<68){const a=(t-62)/6*Math.PI;return {...base,x:d*(48+10*Math.sin(a)),y:-56-10*Math.cos(a),heading:Math.atan2(Math.sin(a),d*Math.cos(a)),phase:'parking'};}
 if(t<75)return {...base,x:mix(48*d,branch,smooth((t-68)/7)),y:-46,heading:backward,phase:'parking'};
 if(t<80)return {...base,...curve([[branch,-46],[gx+4*d,-46],[gx,-38],[gx,-28]],smooth((t-75)/5)),phase:'parking'};
 return {...base,y:mix(-28,-14,smooth((t-80)/4)),phase:'parking'};
}
