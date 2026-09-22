import {useEffect, useRef, useState} from 'react';
import {appClient, isAccessError} from '../auth/client';
import {financeError} from './client';
import type {FinanceBook, FinanceCorrectionRequest, FinanceCorrectionRow} from './client';
import {correctionDraft, correctionChanges, refreshCorrection} from './correction.mjs';
import {beijingTime, historyTotals} from './history.mjs';
import {formatRmb, parseRmb} from './money.mjs';

type Status = 'editing' | 'saving' | 'uncertain' | 'conflict' | 'reading' | 'review' | 'confirmed';
export function FinanceCorrection({initialBook, updateId, onClose, onCommitted, onAccessDenied}: {
  initialBook: FinanceBook; updateId: string; onClose: (needsRefresh?: boolean) => void; onCommitted: (book: FinanceBook) => void; onAccessDenied: () => void;
}) {
  const [book, setBook] = useState(initialBook);
  const update = book.history.find(item=>item.id===updateId)!;
  const [rows, setRows] = useState<FinanceCorrectionRow[]>(()=>correctionDraft(update.snapshot.entries));
  const [status, setStatus] = useState<Status>('editing');
  const [retry, setRetry] = useState<FinanceCorrectionRequest | null>(null);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true), busy = useRef(false), confirmed = useRef(false);
  const latest = update.id === book.history.at(-1)?.id;
  let changes: {id:string; amount_minor:string}[] | null = null;
  let net: string | null = null;
  try {changes = correctionChanges(rows); net = historyTotals(rows.map(row=>({...row,amount_minor:parseRmb(row.amount)}))).net;} catch { /* Partial amounts remain editable. */ }
  const dirty = changes === null || changes.length > 0;
  const locked = ['saving','uncertain','reading','confirmed'].includes(status);
  useEffect(()=>{alive.current=true; dialog.current?.showModal(); return ()=>{alive.current=false;};},[]);
  useEffect(()=>{
    const warn=(event: BeforeUnloadEvent)=>{if(dirty || retry || busy.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty,retry]);
  function close() {
    if (busy.current) return;
    if (confirmed.current) {onClose(true);return;}
    if (dirty || retry) setLeaving(true); else onClose();
  }
  async function read() {
    if (!appClient || busy.current) return;
    busy.current=true; setStatus('reading');setError('');
    try {
      const {data,error:failure}=await appClient.rpc('get_finance_book',{p_household_id:book.current.household_id});
      if (!alive.current) return;
      if (failure) throw failure;
      const fresh=data as FinanceBook;
      if (confirmed.current) {onCommitted(fresh);return;}
      const current=fresh.history.find(item=>item.id===updateId);
      if (!current) throw Error('History unavailable');
      setBook(fresh);setRows(previous=>refreshCorrection(previous,current.snapshot.entries));setStatus('review');
    } catch(failure) {
      if (!alive.current) return;
      if (isAccessError(failure)) {onAccessDenied();return;}
      setError(confirmed.current?'修订已保存，但暂时无法读取最新账本。请重新读取，无需再次保存。':'暂时无法读取最新历史，你的输入仍保留。');
      setStatus(confirmed.current?'confirmed':'conflict');
    } finally {busy.current=false;}
  }
  async function save() {
    if (!appClient || busy.current || !['editing','uncertain'].includes(status)) return;
    let request=retry;
    if (!request) {
      try {
        const patch=correctionChanges(rows);
        if (!patch.length) return;
        request={p_household_id:book.current.household_id,p_update_id:update.id,p_expected_revision:update.revision,
          p_expected_book_version:book.current.version,p_changes:patch,p_request_id:crypto.randomUUID()};
      } catch(failure) {setError((failure as Error).message);return;}
    }
    busy.current=true;setStatus('saving');setRetry(request);setError('');
    try {
      const {error:failure}=await appClient.rpc('correct_finance_history',request);
      if (!alive.current) return;
      if (failure) throw failure;
      confirmed.current=true;setRetry(null);setStatus('confirmed');busy.current=false;
      await read();
    } catch(failure) {
      if (!alive.current) return;
      if (isAccessError(failure)) {onAccessDenied();return;}
      const code=(failure as {code?:string})?.code;
      if (code==='PT409') {setRetry(null);setStatus('conflict');setError('历史或当前账本已变化，本次修订未保存。输入已保留，请读取最新记录并核对影响范围。');}
      else if (code==='22023' || code==='22003') {setRetry(null);setStatus('editing');setError(financeError(failure));}
      else {setStatus('uncertain');setError('未收到修订确认。输入已保留，请重试同一次提交。');}
    } finally {busy.current=false;}
  }
  return <dialog ref={dialog} className="finance-correction-dialog" aria-labelledby="finance-correction-title" onCancel={event=>{event.preventDefault();event.stopPropagation();close();}}>
    <div className="finance-list-heading"><h2 id="finance-correction-title">纠正历史金额</h2><button className="text-button" disabled={status==='saving'||status==='reading'} onClick={close}>关闭纠错</button></div>
    <p>{beijingTime(update.saved_at)}（北京时间）· 原操作人 {update.actor_name}</p>
    <p className="finance-review">{latest?'这是最近一次更新。保存修订会同步纠正当前账本、储蓄净额和财务等级。':'这是旧记录。保存修订只改变这条历史、趋势和历史成果，后来的当前账本不会被覆盖。'}</p>
    {error && <p className="finance-error" role="alert">{error}</p>}
    {leaving ? <div className="finance-review"><p>{retry?'本次提交尚未确认，放弃不会撤销可能已经保存的修订。':'还有未保存的修订，离开会丢弃当前输入。'}</p><div className="finance-actions"><button className="primary" onClick={()=>setLeaving(false)}>继续纠错</button><button className="text-button" onClick={()=>onClose(!!retry)}>放弃并关闭</button></div></div> : <form onSubmit={event=>{event.preventDefault();void save();}}>
      <div className="finance-correction-rows">{rows.map(row=><label key={row.id}>{row.name} · {row.kind==='debt'?'负债':'余额'}
        <input aria-label={`${row.name}的修正金额（元）`} inputMode="decimal" value={row.amount} disabled={locked} onChange={event=>{setRows(previous=>previous.map(item=>item.id===row.id?{...item,amount:event.target.value}:item));setError('');}}/>
        <small>云端有效金额 ¥ {formatRmb(row.baseMinor)} · 原创建者 {row.creator_name}</small>
      </label>)}</div>
      <p className="finance-draft-summary">修订后储蓄净额：{net===null?'待填写有效金额':`¥ ${formatRmb(net)}`} · 未确认前不改变已保存状态</p>
      {status==='review' && <div className="finance-review"><p>已读取最新历史，保留了你的修改。请核对各项云端金额和上方影响范围。</p><button type="button" className="text-button" onClick={()=>setStatus('editing')}>已核对，保留我的修改</button></div>}
      <div className="finance-actions">
        <button className="primary" disabled={!['editing','uncertain'].includes(status)||!dirty}>{status==='saving'?'正在保存修订…':status==='uncertain'?'重试同次修订':'确认保存修订'}</button>
        {['conflict','review','confirmed','reading'].includes(status) && <button type="button" className="text-button" disabled={status==='reading'} onClick={()=>void read()}>{status==='reading'?'正在读取…':'读取最新记录'}</button>}
      </div>
      {status==='uncertain' && <p className="finance-muted">提交结果尚未确认，先重试确认同一次修订，再继续编辑。</p>}
    </form>}
  </dialog>;
}
