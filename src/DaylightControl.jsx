import {useEffect,useRef,useState} from 'react';
import {SunHorizon,Sun,MoonStars,Play,Clock,X,Lightbulb,Pause} from '@phosphor-icons/react';
import {dayPresets,DAYLIGHT_KEY,defaultDaylight,isDaylightState,resolveCityHour,displayCityTime,phaseLabel} from './daylight-state.mjs';
function load(){try{const value=JSON.parse(localStorage.getItem(DAYLIGHT_KEY));return isDaylightState(value)?{...value,mode:value.mode==='cycle'?'auto':value.mode}:defaultDaylight;}catch{return defaultDaylight;}}
export function useCityDaylight(){
 const [settings,setSettings]=useState(load),[tick,setTick]=useState(()=>({wall:Date.now(),elapsed:0}));
 const elapsed=useRef(0);
 useEffect(()=>{let previous=performance.now();const timer=setInterval(()=>{const current=performance.now();if(!document.hidden)elapsed.current+=Math.min(1,(current-previous)/1000);previous=current;setTick({wall:Date.now(),elapsed:elapsed.current});},settings.mode==='cycle'?250:1000);return()=>clearInterval(timer);},[settings.mode]);
 const hour=resolveCityHour(settings,tick.wall,tick.elapsed);
 function change(next){elapsed.current=0;setTick({wall:Date.now(),elapsed:0});setSettings(next);try{localStorage.setItem(DAYLIGHT_KEY,JSON.stringify(next));}catch{/* The preview remains usable when storage is unavailable. */}}
 return {settings,hour,change};
}
export function DaylightControl({settings,hour,change}){
 const [open,setOpen]=useState(false),panel=useRef(null),button=useRef(null);
 const night=hour<5.8||hour>=19,Icon=night?MoonStars:hour>7.3&&hour<16?Sun:SunHorizon;
 useEffect(()=>{if(!open)return;const close=e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);button.current?.focus();}};const outside=e=>{if(!panel.current?.contains(e.target)&&!button.current?.contains(e.target))setOpen(false);};document.addEventListener('keydown',close,true);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',close,true);document.removeEventListener('pointerdown',outside);};},[open]);
 const preset=h=>change({...settings,mode:'manual',hour:h});
 return <div className="daylight-control">
  <button ref={button} className="daylight-pill" aria-label="调整小城昼夜" aria-expanded={open} aria-controls="daylight-panel" onClick={()=>setOpen(v=>!v)}><Icon size={21} weight="duotone"/><strong>{displayCityTime(hour)}</strong><span>{phaseLabel(hour)}</span><small>{settings.mode==='auto'?'自动':settings.mode==='cycle'?'漫游':'定格'}</small></button>
  {open&&<section ref={panel} id="daylight-panel" className="daylight-panel" aria-label="小城昼夜设置">
   <div className="daylight-heading"><div><span>小城的光影</span><strong>{phaseLabel(hour)} <em>{displayCityTime(hour)}</em></strong></div><button className="icon-button" aria-label="关闭昼夜设置" onClick={()=>{setOpen(false);button.current?.focus();}}><X size={18}/></button></div>
   <div className="clock-modes"><button aria-pressed={settings.mode==='auto'} onClick={()=>change({...settings,mode:'auto'})}><Clock size={15}/>跟随北京时间</button><button aria-pressed={settings.mode==='cycle'} onClick={()=>settings.mode==='cycle'?preset(hour):change({...settings,mode:'cycle',hour})}>{settings.mode==='cycle'?<Pause size={15}/>:<Play size={15}/>}一日漫游</button></div>
   <div className="day-presets">{dayPresets.map(p=><button key={p.id} aria-label={`预览${p.label}`} aria-pressed={settings.mode==='manual'&&Math.abs(hour-p.hour)<.01} onClick={()=>preset(p.hour)}><span className={`phase-swatch ${p.id}`}/>{p.label}</button>)}</div>
   <label className="day-slider-label" htmlFor="city-hour">定格在这一刻 <span>{displayCityTime(hour)}</span></label><input id="city-hour" type="range" min="0" max="23.99" step="0.01" value={hour} aria-label="小城预览时间" aria-valuetext={`${phaseLabel(hour)} ${displayCityTime(hour)}`} onChange={e=>preset(Number(e.target.value))}/>
   <div className="day-ruler"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>
   <label className="night-switch"><Lightbulb size={17}/><span>入夜亮灯</span><input type="checkbox" checked={settings.lights} onChange={e=>change({...settings,hour,lights:e.target.checked})}/></label>
   <p>{settings.mode==='cycle'?'两分钟走过一天；再点一次可暂停。':'滑动时间或选择时段，看看不同的城市光影。'}<br/>行程与打卡始终使用真实时间。</p>
  </section>}
 </div>;
}
