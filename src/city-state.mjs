export const STORAGE_KEY = 'family-city-demo-v1';
export const districts = [
  {id:'finance',name:'财务市区',short:'财务',color:'#347fd2',desc:'把日子的积累，建成看得见的未来',center:[-76,56],height:60},
  {id:'habits',name:'习惯农场',short:'习惯',color:'#398568',desc:'每一件小事，都会在这里生长',center:[-76,-24],height:16},
  {id:'home',name:'中央住宅',short:'家园',color:'#319b90',desc:'一起照顾的小城，就是我们的家',center:[0,0],height:14},
  {id:'health',name:'健康公园',short:'健康',color:'#de7c83',desc:'给身体一点活动，给生活一点空间',center:[38,56],height:9},
  {id:'learning',name:'学习街区',short:'学习',color:'#8c78b5',desc:'读过的书，走过的路，都留下痕迹',center:[76,0],height:22},
  {id:'cars',name:'双车车厂',short:'车辆',color:'#5c93c7',desc:'两辆车，各自照顾',center:[0,-56],height:9},
  {id:'chores',name:'家务清理',short:'家务',color:'#c29d4f',desc:'做完一件，家就轻松一点',center:[76,-56],height:10},
  {id:'airport',name:'海岛机场',short:'机场',color:'#4c96b4',desc:'每一次出发，都有人记挂',center:[237,-103],height:22,footprint:[152,176],viewFootprint:[152,140],viewOffset:[0,-18],travelMode:'air'},
  {id:'rail',name:'滨海高铁站',short:'高铁',color:'#578f87',desc:'沿着海岸线，去下一段旅途',center:[28,103],height:10,footprint:[78,28],travelMode:'rail'},
];
export const tasks = [
  {id:'read',district:'habits',title:'阅读 10 分钟',detail:'雏菊花圃 · 今日微习惯',plot:0,done:false},
  {id:'water',district:'habits',title:'认真喝一杯水',detail:'番茄菜地 · 今日微习惯',plot:2,done:true},
  {id:'stretch',district:'habits',title:'拉伸 5 分钟',detail:'小鸡围栏 · 今日微习惯',plot:4,done:true},
  {id:'kitchen',district:'chores',title:'清理厨房',detail:'收拾台面，让明天轻松一点',done:false},
  {id:'bathroom',district:'chores',title:'清洁浴室',detail:'每周家务',done:true},
  {id:'tire-a',district:'cars',car:'car_a',title:'检查胎压',detail:'蓝色小车 · 例行照顾',done:false},
  {id:'clean-b',district:'cars',car:'car_b',title:'清洁车内',detail:'珊瑚小车 · 周末整理',done:false},
  {id:'walk',district:'health',title:'散步 20 分钟',detail:'给自己一段放松的时间',done:true},
  {id:'book',district:'learning',title:'读完本周章节',detail:'本周阅读计划',done:true},
];
export const levelDescriptions={
 health:[['基础公园','步道与休息亭'],['运动公园','新增球场与健身区'],['活力公园','游乐区、瑜伽平台与服务亭']],
 home:[['基础花园','三栋住宅与共享花园'],['聚餐庭院','廊架、餐桌与烧烤角'],['家庭活动中心','凉亭、活动草坪与儿童角']],
 finance:[['街角初成','小店、储蓄所与街角花园'],['稳步积累','旧楼翻新，办公与商业混合'],['繁荣街区','地标天际线与成熟金融街']],
 learning:[['安静书房','图书馆与阅读庭院'],['阅读社区','书架与户外阅读亭'],['知识街区','扩建侧翼与学习花园']],
};
export function localDay(date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function initialState(day=localDay()){return {version:1,day,events:[],netWorth:328600,highestNetWorth:620000,baseGrowth:[7,9,8,10,5,6],baseHealth:15,baseHome:100,baseLearning:6};}
export function isValidState(s){return s?.version===1 && typeof s.day==='string' && Number.isFinite(s.netWorth) && Number.isFinite(s.highestNetWorth) && Array.isArray(s.baseGrowth) && s.baseGrowth.length===6 && s.baseGrowth.every(n=>Number.isInteger(n)&&n>=0)&&['baseHealth','baseHome','baseLearning'].every(k=>Number.isFinite(s[k])&&s[k]>=0)&&Array.isArray(s.events)&&s.events.every(e=>typeof e.id==='string' && typeof e.day==='string' && tasks.some(t=>t.id===e.task));}
export function taskDone(state,task,day=localDay()){return (day===state.day&&task.done)||state.events.some(e=>e.task===task.id&&e.day===day);}
export function reduceState(state,action){
 if(action.type==='complete'){
  const task=tasks.find(t=>t.id===action.task);const day=action.day??localDay();
  if(!task||taskDone(state,task,day))return state;
  return {...state,events:[...state.events,{id:`${day}:${task.id}`,task:task.id,day}]};
 }
 if(action.type==='undo')return {...state,events:state.events.filter(e=>e.id!==action.id)};
 if(action.type==='finance'){
  if(!Number.isFinite(action.value))return state;
  return {...state,netWorth:action.value,highestNetWorth:Math.max(state.highestNetWorth,action.value)};
 }
 if(action.type==='reset')return initialState();
 return state;
}
export function derived(state,day=localDay()){
 const count=state.events.length;
 const growth=state.baseGrowth.map((v,i)=>v+state.events.filter(e=>tasks.find(t=>t.id===e.task)?.plot===i).length);
 const hp=state.baseHealth+state.events.filter(e=>tasks.find(t=>t.id===e.task)?.district==='health').length;
 const lp=state.baseLearning+state.events.filter(e=>tasks.find(t=>t.id===e.task)?.district==='learning').length;
 return {growth,levels:{health:hp>=15?3:hp>=5?2:1,home:state.baseHome+count>=100?3:state.baseHome+count>=30?2:1,finance:state.highestNetWorth>=600000?3:state.highestNetWorth>=300000?2:1,learning:lp>=6?3:lp>=3?2:1},pending:tasks.filter(t=>!taskDone(state,t,day)),completed:tasks.filter(t=>taskDone(state,t,day)).length};
}
export function visibleForNode(data,state,previews={}){
 const d=derived(state);
 if(data.kind==='level'){
  const level=previews[data.district]??d.levels[data.district]??1;
  return level>=Number(data.minLevel)&&(data.maxLevel==null||level<=Number(data.maxLevel));
 }
 if(data.kind==='growth')return Number(data.slot)<Math.min(12,d.growth[data.plot]||0);
 if(data.kind==='rubbish')return Number(data.slot)<d.pending.filter(t=>t.district==='chores').length;
 if(data.kind==='carWork'||data.kind==='carPacked')return d.pending.filter(t=>t.car===data.carId).length>=(data.kind==='carPacked'?3:1);
 return true;
}
