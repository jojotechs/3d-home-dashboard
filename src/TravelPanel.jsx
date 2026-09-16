import {useEffect,useRef,useState} from 'react';
import {AirplaneTakeoff,TrainSimple,Plus,ArrowRight,Clock,Users,CheckCircle,PencilSimple,Trash,FloppyDisk,X,Play,Stop,Eye} from '@phosphor-icons/react';
import {tripStatus,tripPhase,formatTripTime,toTimeInput,fromTimeInput,validateTrip,sortedTrips} from './travel-state.mjs';
const purposes={business:'出差',holiday:'旅行',visit:'探亲',other:'其他'};
function draftFor(mode,now){return {mode,members:'',origin:'',destination:'',purpose:'holiday',service:'',note:'',departAt:toTimeInput(now+86400000),endAt:toTimeInput(now+3*86400000)};}
export function TravelPanel({mode,trips,now,station,watching,onWatch,onPreview,onCommit,onLayout}){
 const [filter,setFilter]=useState('all'),[draft,setDraft]=useState(null),[error,setError]=useState(''),[deleted,setDeleted]=useState(null),firstInput=useRef(null);
 const Icon=mode==='air'?AirplaneTakeoff:TrainSimple;
 const rows=sortedTrips(trips,mode,filter,now),away=trips.filter(t=>t.mode===mode&&tripPhase(t,now)==='away').length;
 useEffect(()=>{setDraft(null);setFilter('all');setError('');setDeleted(null);},[mode]);
 useEffect(()=>{onLayout?.();if(draft)firstInput.current?.focus();},[!!draft,filter,rows.length]);
 function edit(t){setError('');setDraft({...t,departAt:toTimeInput(t.departAt),endAt:toTimeInput(t.endAt)});}
 function save(e){
  e.preventDefault();const departure=fromTimeInput(draft.departAt),end=fromTimeInput(draft.endAt);
  const next={...draft,id:draft.id||crypto.randomUUID(),departAt:departure,endAt:end,demo:false};
  const message=validateTrip(next);if(message){setError(message);return;}
  if(onCommit({type:'save',trip:next})){setDraft(null);setError('');setDeleted(null);}
 }
 if(draft)return <form className="trip-form" onSubmit={save} aria-label={draft.id?'编辑行程':'新增行程'}>
  <div className="trip-form-heading"><strong>{draft.id?'编辑这段旅途':'安排下一段旅途'}</strong><span>北京时间 UTC+8</span><button type="button" className="icon-button" aria-label="取消编辑行程" onClick={()=>setDraft(null)}><X size={18}/></button></div>
  <div className="trip-fields">
   <label>家庭成员<input ref={firstInput} name="members" required maxLength={80} placeholder="例如：我、爱人、全家" value={draft.members} onChange={e=>setDraft({...draft,members:e.target.value})}/></label>
   <label>出行目的<select name="purpose" value={draft.purpose} onChange={e=>setDraft({...draft,purpose:e.target.value})}>{Object.entries(purposes).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
   <label>出发地<input name="origin" required maxLength={60} placeholder={mode==='air'?'出发城市 / 机场':'出发城市 / 车站'} value={draft.origin} onChange={e=>setDraft({...draft,origin:e.target.value})}/></label>
   <label>目的地<input name="destination" required maxLength={60} placeholder={mode==='air'?'目的城市 / 机场':'目的城市 / 车站'} value={draft.destination} onChange={e=>setDraft({...draft,destination:e.target.value})}/></label>
   <label>出发时间<input name="departAt" type="datetime-local" required value={draft.departAt} onChange={e=>setDraft({...draft,departAt:e.target.value})}/></label>
   <label>行程结束时间<input name="endAt" type="datetime-local" required value={draft.endAt} onChange={e=>setDraft({...draft,endAt:e.target.value})}/></label>
   <label>{mode==='air'?'航班号（选填）':'车次（选填）'}<input name="service" maxLength={30} placeholder={mode==='air'?'例如：MU5101':'例如：G123'} value={draft.service} onChange={e=>setDraft({...draft,service:e.target.value})}/></label>
   <label>备注（选填）<input name="note" maxLength={240} placeholder="这次出行需要记住的事" value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>
  </div>
  <p className="trip-time-help">结束时间指整段出差或旅行结束，用于自动切换“已结束”。</p>
  {error&&<p className="trip-error" role="alert">{error}</p>}
  <div className="trip-form-actions"><button type="button" className="text-button" onClick={()=>setDraft(null)}>取消</button><button className="primary" type="submit"><FloppyDisk size={17}/>保存行程</button></div>
 </form>;
 return <div className="travel-content" data-testid="travel-content">
  <div className={`station-live ${station?.active?'active':''}`} data-testid="station-live"><Icon size={22} weight="duotone"/><div><strong>{station?.preview?'动画预览 · ':''}{station?.label||'候班中'}{station?.detail?` · ${station.detail}`:''}</strong><span>{station?.active&&!station.preview?`${station.members} → ${station.destination}${station.queued?` · ${station.queued} 班等候`:''}`:station?.preview?'只预览动画，不改变行程时间':mode==='air'?`${station?.parked??3} 架飞机候班 · 不同机位、双向起飞`:`${station?.parked??2} 列高铁候班 · 双站台、双向出站`}</span></div><div className="station-actions"><button className="text-button" onClick={onWatch}>{watching?'展开行程':<><Eye size={14}/>看场站</>}</button><button className="text-button" disabled={station?.active&&!station.preview} onClick={onPreview}>{station?.preview?<><Stop size={14}/>结束预览</>:<><Play size={14}/>预览出发</>}</button></div></div>
  {!watching&&<>
  <div className="travel-toolbar"><div><span className="travel-subtitle">{mode==='air'?'飞行旅途':'高铁旅途'}</span><span className="travel-summary">{away?`${away} 段行程正在进行`:'把下一次出发，放进小城'}</span></div><button className="primary" onClick={()=>{setDraft(draftFor(mode,now));setError('');}}><Plus size={17}/>新增行程</button></div>
  <div className="trip-filters" aria-label="行程状态筛选">{[['all','全部'],['upcoming','待出发'],['away','旅途中'],['ended','已结束']].map(([id,label])=><button key={id} aria-pressed={filter===id} className={filter===id?'selected':''} onClick={()=>setFilter(id)}>{label}<small>{trips.filter(t=>t.mode===mode&&(id==='all'||tripPhase(t,now)===id)).length}</small></button>)}</div>
  <div className="trip-list">{rows.map(t=>{const status=tripStatus(t,now);return <article key={t.id} className={`trip-card ${status.phase}`} data-trip-id={t.id} data-trip-status={status.phase}>
   <div className="trip-top"><span className={`trip-status ${status.phase}`}>{status.phase==='ended'?<CheckCircle size={13}/>:<Clock size={13}/>} {status.label}</span><span className="trip-purpose">{purposes[t.purpose]}</span>{t.demo&&<span className="demo-badge">示例</span>}<div className="trip-card-actions"><button className="icon-button" aria-label={`编辑${t.members}前往${t.destination}的行程`} onClick={()=>edit(t)}><PencilSimple size={16}/></button><button className="icon-button" aria-label={`删除${t.members}前往${t.destination}的行程`} onClick={()=>{if(onCommit({type:'delete',id:t.id}))setDeleted(t);}}><Trash size={16}/></button></div></div>
   <div className="trip-route"><Icon size={23} weight="duotone"/><strong>{t.origin}</strong><ArrowRight size={17}/><strong>{t.destination}</strong></div>
   <div className="trip-meta"><span><Users size={14}/>{t.members}</span>{t.service&&<span>{t.service}</span>}</div>
   <div className="trip-timeline"><span>出发 {formatTripTime(t.departAt)}</span><span>结束 {formatTripTime(t.endAt)}</span></div>
   <div className="trip-clock">{status.clock}</div>{t.note&&<p className="trip-note">{t.note}</p>}
  </article>;})}{!rows.length&&<div className="trip-empty"><Icon size={32} weight="duotone"/><strong>{filter==='all'?'这里还没有旅途':'这个状态下还没有行程'}</strong><span>{filter==='all'?'记录目的地与时间，小城会记住每次出发。':'可以切换筛选，或安排下一次出发。'}</span></div>}</div>
  {deleted&&<div className="trip-undo" role="status"><span>已移除 {deleted.destination} 行程</span><button className="text-button" onClick={()=>{if(onCommit({type:'save',trip:deleted}))setDeleted(null);}}>撤销删除</button></div>}
  <footer className="travel-footer">北京时间 · 到点自动出发 · 记录保存在本机{trips.some(t=>t.mode===mode&&t.demo)?' · 带“示例”的行程可编辑':''}</footer>
 </>}
 </div>;
}
