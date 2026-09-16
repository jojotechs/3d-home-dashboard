// An art-directed city day, deliberately independent of trip and task clocks.
export const DAYLIGHT_KEY='family-city-daylight-v1';
export const dayPresets=[
 {id:'sunrise',label:'日出',hour:6.25},{id:'morning',label:'早上',hour:9},
 {id:'noon',label:'午后',hour:13},{id:'evening',label:'傍晚',hour:17},
 {id:'sunset',label:'日落',hour:18.35},{id:'night',label:'夜晚',hour:22},
];
export const wrapHour=h=>((h%24)+24)%24;
export const defaultDaylight={version:1,mode:'auto',hour:13,lights:true};
export function isDaylightState(v){return v?.version===1&&['auto','manual','cycle'].includes(v.mode)&&Number.isFinite(v.hour)&&v.hour>=0&&v.hour<24&&typeof v.lights==='boolean';}
export function beijingHour(ms=Date.now()){const d=new Date(ms+8*3600000);return d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;}
export function displayCityTime(hour){const minutes=Math.floor(wrapHour(hour)*60+1e-7);return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
export function resolveCityHour(settings,wallMs,elapsedSeconds=0){return settings.mode==='auto'?beijingHour(wallMs):settings.mode==='cycle'?wrapHour(settings.hour+elapsedSeconds*.2):settings.hour;}
const clamp=v=>Math.min(1,Math.max(0,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function lightLevel(hour){hour=wrapHour(hour);return hour<12?1-smooth((hour-5.2)/1.7):smooth((hour-17.05)/2.0);}
export function phaseLabel(hour){hour=wrapHour(hour);return hour<5?'深夜':hour<6?'黎明':hour<7.3?'日出':hour<11?'早上':hour<16?'午后':hour<17.8?'傍晚':hour<19?'日落':'夜晚';}
// Linear values are interpolated smoothly; colour interpolation is performed in Three.js.
const frames=[
 [0,'#152d4a','#6689c1','#1b3146','#becfff',.13,.49,.80,1.0,[-170,260,-140],'#527b9c'],
 [4.7,'#162d4b','#718fc3','#263744','#b4c6ef',.12,.50,.80,1.0,[-140,250,-130],'#587c9c'],
 [5.7,'#9a839c','#c6aec9','#777079','#ffaf89',.40,1.0,.30,1.05,[330,75,90],'#bccbd2'],
 [6.25,'#e4b295','#ffd1a3','#958374','#ffb677',1.35,1.55,.08,1.10,[330,98,95],'#e3cdc0'],
 [8,'#a1cfd0','#fff0d1','#819f9b','#ffe1ad',2.6,2.05,0,1.12,[220,250,110],'#ffffff'],
 [12,'#83cdd0','#fff8e7','#74999d','#fff6df',3.0,2.2,0,1.12,[-40,380,130],'#ffffff'],
 [15.5,'#91c9c7','#ffedcd','#88998d','#ffdfae',2.7,2.0,0,1.12,[-250,265,110],'#fff5e5'],
 [17,'#c6b69e','#f8c894','#887b83','#ffbb79',1.95,1.60,.03,1.10,[-340,120,100],'#eccac0'],
 [18.35,'#ad7e91','#d9acb7','#615d7b','#ff956c',.72,1.08,.23,1.05,[-360,65,80],'#b2a2b9'],
 [19.5,'#233b59','#829bc4','#2e425b','#b8ccf2',.16,.56,.76,1.0,[-230,190,-100],'#6888a4'],
 [24,'#152d4a','#6689c1','#1b3146','#becfff',.13,.49,.80,1.0,[-170,260,-140],'#527b9c'],
];
export function daylightFrame(hour){
 hour=wrapHour(hour);let index=0;while(index<frames.length-2&&frames[index+1][0]<hour)index++;
 const a=frames[index],b=frames[index+1],mix=smooth((hour-a[0])/(b[0]-a[0]));
 const lerp=(x,y)=>x+(y-x)*mix;
 return {hour,phase:phaseLabel(hour),night:lightLevel(hour),mix,
  colors:{sky:[a[1],b[1]],hemi:[a[2],b[2]],ground:[a[3],b[3]],sun:[a[4],b[4]],water:[a[10],b[10]]},
  sunIntensity:lerp(a[5],b[5]),ambient:lerp(a[6],b[6]),moon:lerp(a[7],b[7]),exposure:lerp(a[8],b[8]),
  sunPosition:a[9].map((v,i)=>lerp(v,b[9][i])),
 };
}
