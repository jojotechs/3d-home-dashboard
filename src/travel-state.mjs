export const TRAVEL_KEY='family-city-travel-v1';
export const TRAVEL_ZONE='Asia/Shanghai';
const HOUR=3600000;
const trim=v=>typeof v==='string'?v.trim():'';
export function toTimeInput(iso){
 const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';
 return new Intl.DateTimeFormat('sv-SE',{timeZone:TRAVEL_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d).replace(' ','T');
}
export function fromTimeInput(value){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const d=new Date(`${value}:00+08:00`);if(!Number.isFinite(d.getTime())||toTimeInput(d)!==value)return null;
 return d.toISOString();
}
export function validateTrip(trip){
 if(!trip||typeof trip!=='object')return '行程数据无效。';
 if(!['air','rail'].includes(trip.mode))return '请选择飞机或高铁。';
 if(!trim(trip.members)||trip.members.length>80)return '请填写家庭成员，最多 80 个字。';
 if(!trim(trip.origin)||!trim(trip.destination))return '请填写出发地和目的地。';
 if(trip.origin.length>60||trip.destination.length>60)return '地点名称请控制在 60 个字以内。';
 if(!['business','holiday','visit','other'].includes(trip.purpose))return '请选择出行目的。';
 if(typeof trip.departAt!=='string'||typeof trip.endAt!=='string'||!Number.isFinite(Date.parse(trip.departAt))||!Number.isFinite(Date.parse(trip.endAt)))return '请填写有效的出发和结束时间。';
 if(Date.parse(trip.endAt)<=Date.parse(trip.departAt))return '行程结束时间须晚于出发时间。';
 if((trip.service!=null&&typeof trip.service!=='string')||(trip.note!=null&&typeof trip.note!=='string'))return '班次与备注须为文字。';
 if((trip.service||'').length>30||(trip.note||'').length>240)return '班次最多 30 字，备注最多 240 字。';
 return '';
}
export function tripPhase(trip,now=Date.now()){
 const departure=Date.parse(trip.departAt),end=Date.parse(trip.endAt);
 if(now<departure)return 'upcoming';
 if(now<end)return 'away';
 return 'ended';
}
export function durationLabel(ms){
 const minutes=Math.floor(Math.max(0,ms)/60000);
 if(minutes<1)return '不到 1 分钟';
 const days=Math.floor(minutes/1440),hours=Math.floor(minutes%1440/60),mins=minutes%60;
 if(days)return `${days} 天${hours?` ${hours} 小时`:''}`;
 if(hours)return `${hours} 小时${mins?` ${mins} 分钟`:''}`;
 return `${mins} 分钟`;
}
export function tripStatus(trip,now=Date.now()){
 const phase=tripPhase(trip,now);
 return {phase,label:phase==='upcoming'?'待出发':phase==='away'?'旅途中':'已结束',
  clock:phase==='upcoming'?`距离出发 ${durationLabel(Date.parse(trip.departAt)-now)}`:phase==='away'?`已出发 ${durationLabel(now-Date.parse(trip.departAt))}`:`已结束 ${durationLabel(now-Date.parse(trip.endAt))}`};
}
export function formatTripTime(iso){return new Intl.DateTimeFormat('zh-CN',{timeZone:TRAVEL_ZONE,month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}
export function initialTravel(now=Date.now()){
 const rounded=Math.floor(now/60000)*60000;
 const sample=(id,mode,members,origin,destination,purpose,start,end,service)=>({id,mode,members,origin,destination,purpose,departAt:new Date(rounded+start*HOUR).toISOString(),endAt:new Date(rounded+end*HOUR).toISOString(),service,note:'可编辑的示例行程',demo:true});
 return {version:1,trips:[
  sample('demo-air-business','air','家人 A','上海','深圳','business',5,53,'示例航班'),
  sample('demo-air-holiday','air','全家','上海','成都','holiday',-30,48,'示例航班'),
  sample('demo-rail-business','rail','家人 B','上海虹桥','杭州东','business',-2,9,'示例车次'),
  sample('demo-rail-visit','rail','全家','上海虹桥','苏州北','visit',-72,-48,'示例车次'),
 ]};
}
export function isTravelState(s){return s?.version===1&&Array.isArray(s.trips)&&s.trips.every(t=>t&&typeof t.id==='string'&&t.id.length>0&&!validateTrip(t))&&new Set(s.trips.map(t=>t.id)).size===s.trips.length;}
export function reduceTravel(state,action){
 if(action.type==='save'){
  if(!action.trip?.id||validateTrip(action.trip))return state;
  const trip={...action.trip,members:trim(action.trip.members),origin:trim(action.trip.origin),destination:trim(action.trip.destination),service:trim(action.trip.service),note:trim(action.trip.note)};
  const found=state.trips.some(t=>t.id===trip.id);
  return {...state,trips:found?state.trips.map(t=>t.id===trip.id?trip:t):[...state.trips,trip]};
 }
 if(action.type==='delete')return {...state,trips:state.trips.filter(t=>t.id!==action.id)};
 return state;
}
export function sortedTrips(trips,mode,filter,now){
 const rank={away:0,upcoming:1,ended:2};
 return trips.filter(t=>t.mode===mode&&(filter==='all'||tripPhase(t,now)===filter)).sort((a,b)=>{
  const pa=tripPhase(a,now),pb=tripPhase(b,now);return rank[pa]-rank[pb]||(pa==='ended'?Date.parse(b.endAt)-Date.parse(a.endAt):Date.parse(a.departAt)-Date.parse(b.departAt));
 });
}
