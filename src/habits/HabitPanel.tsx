import {useEffect, useRef, useState} from 'react';
import {ArrowClockwise, ArrowCounterClockwise, Check, Flower, LockKey, Package, Plant, Plus, X} from '@phosphor-icons/react';
import {habitError} from './client';
import type {HabitAction} from './client';
import type {PersonalFarmState} from './usePersonalFarm';
import './habits.css';

const actionNames: Record<HabitAction['type'],string> = {create:'创建习惯',claim_seeds:'领取种子',plant:'播种',record:'记录完成',undo:'撤销记录',collect:'收取成果'};
const number = (value: number) => value.toLocaleString('zh-CN');
const date = (value: string) => value.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日');

export function HabitPanel({farmState: state,onClose,onLayout}: {
  farmState: PersonalFarmState; onClose: () => void; onLayout?: () => void;
}) {
  const {farm,selectedHabit: habit,status,canWrite} = state;
  const [confirmPlant, setConfirmPlant] = useState(false);
  const layout = useRef(onLayout); layout.current = onLayout;
  useEffect(() => {setConfirmPlant(false);layout.current?.();},[habit?.id]);
  useEffect(() => {if (habit?.plot.status !== 'unplanted') setConfirmPlant(false);},[habit?.plot.status]);
  const quantity = Number(state.seedQuantity);
  const validQuantity = /^\d+$/.test(state.seedQuantity) && Number.isSafeInteger(quantity) && quantity > 0;
  const pending = state.pendingRequest;
  const receipt = state.lastReceipt;
  const activeEntries = habit?.entries.filter(entry => !entry.undone_at && !entry.growth_granted) ?? [];
  const waiting = farm?.habits.filter(item => item.plot.status === 'waiting').sort((a,b) =>
    (a.plot.waiting_since ?? '').localeCompare(b.plot.waiting_since ?? '') || a.created_order-b.created_order) ?? [];
  const resolveFailure = () => {state.acknowledgeFailure();void state.refresh();};

  return <aside className="habit-panel" aria-label="个人习惯农场">
    <header className="habit-header">
      <span className="habit-header-icon"><Plant size={27} weight="duotone"/></span>
      <div><span className="habit-eyebrow">把日常，种成小小的风景</span><h1>我的习惯农场</h1></div>
      <button type="button" className="habit-icon-button" onClick={onClose} aria-label="关闭习惯农场"><X size={20}/></button>
    </header>
    <div className="habit-body">
      <div className="habit-cloud-row"><span><LockKey size={14}/>仅自己 · 真实云端记录</span><button type="button" className="habit-text-button" onClick={() => {void state.refresh();}} disabled={state.busy} aria-label="刷新个人农场"><ArrowClockwise size={15}/>刷新</button></div>
      {status === 'loading' && <p className="habit-message" role="status">正在读取你的个人农场…</p>}
      {status === 'saving' && <p className="habit-message" role="status">正在{pending ? actionNames[pending.p_action.type] : '保存'}，等待云端确认…</p>}
      {status === 'unknown' && <div className="habit-message habit-warning" role="alert">
        <strong>结果还未确认</strong><p>{habitError(state.error)}新操作会在确认后恢复。</p>
        {pending && <p className="habit-request-detail">原操作：{actionNames[pending.p_action.type]}{'habit_day' in pending.p_action ? ` · ${date(pending.p_action.habit_day)}` : ''}</p>}
        <button type="button" className="habit-secondary" disabled={state.busy} onClick={() => {void state.retryPending();}}>确认原请求 / 安全重试</button>
      </div>}
      {status === 'confirmed' && <div className="habit-message habit-warning" role="status"><strong>云端已确认，正在核对当前农场</strong><p>{receipt ? `${date(receipt.habit_day)}的${actionNames[receipt.type]}已成功。` : ''}读取完成后可继续操作，原记录的撤销期限不会延长。</p>{!!state.error && <button type="button" className="habit-secondary" disabled={state.busy && !state.error} onClick={() => {void state.refresh();}}>重新读取当前农场</button>}</div>}
      {(status === 'failed' || status === 'expired') && <div className="habit-message habit-warning" role="alert"><strong>{status === 'expired' ? '原请求已过期，未改记今天' : '这次操作没有保存'}</strong><p>{habitError(status === 'expired' ? {message:'HABIT_REQUEST_EXPIRED'} : state.error)}</p>{pending?.p_action.type === 'create' && <p>保留的名称：{pending.p_action.name}</p>}<button type="button" className="habit-secondary" disabled={state.busy} onClick={resolveFailure}>保留输入，刷新后继续</button></div>}
      {status === 'error' && <div className="habit-message habit-warning" role="alert"><strong>暂时无法读取当前农场</strong><p>输入已保留。恢复连接后刷新，再继续记录。</p><button type="button" className="habit-secondary" disabled={state.busy} onClick={() => {void state.refresh();}}>重新读取</button></div>}
      {status === 'denied' && <p className="habit-message habit-warning" role="alert">{habitError(state.error)}</p>}
      {status === 'ready' && receipt && <p className="habit-message habit-success" role="status"><Check size={15}/>{actionNames[receipt.type]}已由云端确认{receipt.habit_day !== farm?.habit_day ? `（原归属日 ${receipt.habit_day}）` : ''}。</p>}

      {farm && <>
        <div className="habit-day"><div><span>当前习惯日</span><strong>{date(farm.habit_day)}</strong></div><span className="habit-day-note">北京时间 04:00 换日<br/>只记录当前习惯日</span></div>
        <div className="habit-overview" aria-label="个人农场概况"><div><strong>{state.summary.completed}<small> / {state.summary.total}</small></strong><span>今日完成</span></div><div><strong>{number(state.summary.ready)}</strong><span>待收花束</span></div><div><strong>{number(farm.coins)}</strong><span>农场币</span></div></div>

        <details className="habit-create" open={!farm.habits.length || undefined}>
          <summary><Plus size={16}/>新建每日习惯</summary>
          <form onSubmit={event => {event.preventDefault();if(canWrite && state.draftName.trim())void state.createHabit();}}>
            <label htmlFor="habit-name">习惯名称<input id="habit-name" name="habit-name" value={state.draftName} maxLength={100} placeholder="例如：每天阅读" autoComplete="off" onChange={event => state.setDraftName(event.target.value)} disabled={!!pending || status === 'denied'}/></label>
            <p className="habit-muted">每天 · 本人确认完成 · 仅自己可见。今天开始，名字相同的习惯也独立记录。</p>
            <button className="habit-primary" type="submit" disabled={!canWrite || !state.draftName.trim()}><Plus size={16}/>创建习惯</button>
          </form>
        </details>

        {!farm.habits.length && <div className="habit-empty"><Flower size={36} weight="duotone"/><strong>第一块小花田，从你开始</strong><p>创建一个想坚持的小习惯。可以先记录，让成长留存；准备好后再领取种子、明确播种。</p></div>}
        {!!farm.habits.length && <section className="habit-list-section" aria-label="选择个人习惯"><div className="habit-section-heading"><h2>我的习惯</h2><span>{farm.habits.length} 条 · 选择一块种养位</span></div><div className="habit-list" role="group" aria-label="习惯列表">{farm.habits.map(item => <button type="button" key={item.id} className={`habit-list-item ${habit?.id === item.id ? 'selected' : ''}`} aria-pressed={habit?.id === item.id} onClick={() => state.selectHabit(item.id)}><span className={item.today.completed ? 'habit-list-done' : 'habit-list-circle'}>{item.today.completed && <Check size={13}/>}</span><span>{item.name}</span>{item.plot.ready > 0 && <small>{number(item.plot.ready)} 待收</small>}</button>)}</div></section>}

        {habit && <section className="habit-detail" aria-label={`${habit.name}的种养位`}>
          <div className="habit-detail-heading"><div><span className="habit-eyebrow">当前选中 · 仅自己</span><h2>{habit.name}</h2></div><Plant size={28} weight="duotone"/></div>
          <div className="habit-checkin"><div><strong>{habit.today.completed ? '当前习惯日已完成' : '完成后，为自己记一笔'}</strong><p>记入 {date(farm.habit_day)}。睡眠等目标由你确认，点击时间不代表实际完成时间。</p></div>{habit.today.can_record ? <button className="habit-primary" type="button" disabled={!canWrite} onClick={() => {void state.record(habit.id);}}><Check size={17}/>确认完成并保存</button> : <span className="habit-saved"><Check size={16}/>已保存</span>}</div>
          {activeEntries.map(entry => {const seconds=state.undoSeconds(entry);return <div className="habit-undo" key={entry.id}><div><strong>{seconds > 0 ? '成长预览 +1 格' : '等待云端确认成长'}</strong><span>{entry.habit_day !== farm.habit_day ? `${entry.habit_day} · ` : ''}{seconds > 0 ? `剩余 ${seconds} 秒可撤销，之后记录锁定` : '撤销期已结束，刷新后显示已结算进度'}</span></div>{seconds > 0 ? <button type="button" className="habit-secondary" disabled={!canWrite} onClick={() => {void state.undo(entry.id);}}><ArrowCounterClockwise size={14}/>撤销</button> : <button type="button" className="habit-text-button" disabled={state.busy} onClick={() => {void state.refresh();}}>刷新成长</button>}</div>;})}
          <div className="habit-plot"><div className="habit-section-heading"><h3>{habit.plot.species_id ? '雏菊花田' : '尚未播种'}</h3><span>{habit.plot.status === 'growing' ? '当前一轮' : habit.plot.status === 'waiting' ? '等待种子续种' : '首次播种需确认'}</span></div>
            {habit.plot.status === 'growing' ? <><div className="habit-growth" aria-label={`当前一轮 ${habit.plot.growth}/3 格`}>{[0,1,2].map(index => <span key={index} className={index < habit.plot.growth ? 'filled' : ''}><Plant size={18} weight={index < habit.plot.growth ? 'fill' : 'regular'}/></span>)}<strong>{habit.plot.growth} / 3 格</strong></div><p className="habit-muted">三个已确认成长格，成熟一份雏菊花束。撤销期内的预览尚未投入生产。</p></> : <p className="habit-muted">{habit.plot.status === 'waiting' ? '缺货时成长继续保留。补充种子后，按进入等待的先后自动续种。' : '每轮消耗 1 包雏菊种子。播种后，已有成长会投入这块花田。'}</p>}
            <div className="habit-stored-growth"><span>未分配成长</span><strong>{number(habit.plot.unallocated_growth)} 格</strong></div>
            {habit.plot.status === 'unplanted' && (confirmPlant ? <div className="habit-plant-confirm"><strong>为「{habit.name}」播种雏菊？</strong><p>开始一轮需要 1 包种子。已有的 {number(habit.plot.unallocated_growth)} 格成长会立即投入生产；每次成熟后，库存还有种子就继续消耗 1 包续种，因此本次可能用掉多包种子。</p><div className="habit-actions"><button type="button" className="habit-primary" disabled={!canWrite || !farm.inventory.daisy_seeds} onClick={() => {void state.plant(habit.id);}}>确认播种并自动续种</button><button type="button" className="habit-text-button" disabled={!!pending} onClick={() => setConfirmPlant(false)}>取消</button></div></div> : <button type="button" className="habit-secondary" disabled={!canWrite || !farm.inventory.daisy_seeds} onClick={() => setConfirmPlant(true)}><Plant size={16}/>{farm.inventory.daisy_seeds ? '播种雏菊' : '先在下方领取雏菊种子'}</button>)}
          </div>
          <div className="habit-harvest"><span className="habit-harvest-icon"><Flower size={25} weight="duotone"/></span><div><strong>待收篮 · {number(habit.plot.ready)} 份</strong><p>成熟花束保留在这里，不阻碍下一轮。</p></div><button className="habit-secondary" type="button" disabled={!canWrite || !habit.plot.ready} onClick={() => {void state.collect(habit.id);}}>收取入仓</button></div>
        </section>}

        <section className="habit-inventory" aria-label="个人农场仓库"><div className="habit-section-heading"><h2><Package size={18}/>我的仓库</h2><span>仅本人使用</span></div><div className="habit-stock"><div><span>雏菊种子</span><strong>{number(farm.inventory.daisy_seeds)}<small> 包</small></strong></div><div><span>雏菊花束</span><strong>{number(farm.inventory.daisy_bouquets)}<small> 份</small></strong></div></div>
          <form className="habit-seed-form" onSubmit={event => {event.preventDefault();if(canWrite && validQuantity)void state.claimSeeds(quantity);}}><label htmlFor="habit-seed-quantity">免费种子数量<input id="habit-seed-quantity" type="number" inputMode="numeric" min="1" step="1" max="9007199254740991" value={state.seedQuantity} onChange={event => state.setSeedQuantity(event.target.value)} disabled={!!pending}/></label><button type="submit" className="habit-secondary" disabled={!canWrite || !validQuantity}>领取雏菊种子</button></form>
          <p className="habit-muted">按你选择的数量领取；每轮会消耗，不自动补货。收取花束只入仓，不增加农场币。</p>
          {!!waiting.length && <p className="habit-waiting">补货后依次续种：{waiting.map((item,index) => `${index+1}. ${item.name}`).join(' → ')}</p>}
        </section>
      </>}
    </div>
  </aside>;
}
