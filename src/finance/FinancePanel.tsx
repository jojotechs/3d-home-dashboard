import {useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import {appClient, isAccessError} from '../auth/client';
import {financeError} from './client';
import type {FinanceBook, FinanceDraftRow, FinanceRequest, FinanceSnapshot} from './client';
import {createDraft, draftChanges, draftTotals, refreshDraft, rowChanged} from './draft.mjs';
import {formatRmb} from './money.mjs';
import {FinanceList} from './FinanceList';
import {FinanceHistory} from './FinanceHistory';
import {FinanceGrowth} from './FinanceGrowth';
import {financeLevel, levelFeedback} from './growth.mjs';
import './finance.css';

type ExitGuard = RefObject<((leave: () => void) => void) | null>;
const time = (value: string) => new Date(value).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'});

export function FinancePanel({onAccessDenied, exitGuard, onBookRead}: {onAccessDenied: () => void; exitGuard: ExitGuard; onBookRead: (book: FinanceBook) => void}) {
  const [book, setBook] = useState<FinanceBook | null>(null);
  const [feedback, setFeedback] = useState('');
  const [view, setView] = useState<'current' | 'history'>('current');
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [rows, setRows] = useState<FinanceDraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [review, setReview] = useState(false);
  const [retry, setRetry] = useState<FinanceRequest | null>(null);
  const [needsCurrent, setNeedsCurrent] = useState(false);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewNotice = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const operation = useRef(0);
  const working = useRef(false);
  const pendingLevelFeedback = useRef<number | null>(null);
  const dirty = rows.some(rowChanged);
  const unresolved = rows.filter(row => rowChanged(row) && (row.needsReview || row.missing)).length;
  let totals = null;
  try {totals = draftTotals(rows);} catch { /* Partial inputs have no valid draft total. */ }

  useEffect(() => {
    alive.current = true;
    void read(false);
    return () => {alive.current = false; operation.current++;};
  }, []);

  useEffect(() => {
    exitGuard.current = leave => {
      if (dirty || retry || working.current) setLeaving(() => leave);
      else leave();
    };
    return () => {exitGuard.current = null;};
  }, [dirty, retry, exitGuard]);
  useEffect(() => {
    if (leaving) dialog.current?.showModal();
    else dialog.current?.close();
  }, [leaving]);
  useEffect(() => {
    if (!loading) reviewNotice.current?.focus();
  }, [conflict, loading]);
  useEffect(() => {
    // An exit requested while saving can proceed once confirmation has removed
    // all pending edits. A failed save keeps the dialog and draft intact.
    if (leaving && !saving && !loading && !dirty && !retry) {
      setLeaving(null);
      leaving();
    }
  }, [leaving, saving, loading, dirty, retry]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || retry || working.current) {event.preventDefault(); event.returnValue = '';}
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, retry]);

  async function read(keepInput: boolean) {
    if (!appClient) return;
    const generation = ++operation.current;
    setLoading(true); setError('');
    try {
      const {data, error: failure} = await appClient.rpc('get_finance_book');
      if (!alive.current || generation !== operation.current) return;
      if (failure) throw failure;
      const nextBook = data as FinanceBook;
      const current = nextBook.current;
      setBook(nextBook); onBookRead(nextBook);
      if (pendingLevelFeedback.current !== null) {
        setFeedback(levelFeedback(pendingLevelFeedback.current,financeLevel(current.net_savings_minor)));
        pendingLevelFeedback.current = null;
      }
      setSnapshot(current);
      setRows(previous => keepInput ? refreshDraft(previous, current.entries) : createDraft(current.entries));
      setNeedsCurrent(false); setConflict(false); setReview(keepInput);
      if (keepInput) setNotice('已读取最新记录，你的修改仍保留。请核对标记的项目，再确认保存。');
    } catch (failure) {
      if (alive.current && generation === operation.current) {
        if (isAccessError(failure)) {setSnapshot(null); setBook(null); onAccessDenied();}
        setError(isAccessError(failure) ? financeError(failure) : '暂时无法读取最新记录，请检查连接后重试。');
      }
    } finally {
      if (alive.current && generation === operation.current) setLoading(false);
    }
  }

  async function save() {
    if (!appClient || !snapshot || working.current || loading || conflict || needsCurrent || unresolved) return;
    let request = retry;
    if (!request) {
      try {
        const changes = draftChanges(rows);
        if (!changes.length) {setNotice('没有需要保存的修改。'); return;}
        request = {p_household_id:snapshot.household_id,p_changes:changes,p_request_id:crypto.randomUUID()};
      } catch (failure) {setError((failure as Error).message); return;}
    }
    working.current = true;
    setSaving(true); setRetry(request); setError(''); setNotice(''); setFeedback('');
    const generation = ++operation.current;
    try {
      const {data, error: failure} = await appClient.rpc('save_finances', request);
      if (!alive.current || generation !== operation.current) return;
      if (failure) throw failure;
      const confirmed = data as FinanceSnapshot;
      setSnapshot(confirmed); setRows(createDraft(confirmed.entries));
      setRetry(null); setReview(false); setNeedsCurrent(true);
      setNotice('已保存到云端');
      // A retry may acknowledge an older commit. Read the current book before
      // permitting another edit; never resubmit the already confirmed patch.
      pendingLevelFeedback.current = financeLevel(snapshot.net_savings_minor);
      await read(false);
    } catch (failure) {
      if (alive.current && generation === operation.current) {
        setError(financeError(failure));
        const code = (failure as {code?:string})?.code;
        if (code === 'PT409') {setRetry(null); setConflict(true);}
        if (code === '22023' || code === '22003') setRetry(null);
        if (isAccessError(failure)) {setSnapshot(null); setBook(null); onAccessDenied();}
      }
    } finally {
      working.current = false;
      if (alive.current) setSaving(false);
    }
  }

  function change(id: string, patch: Partial<FinanceDraftRow>) {
    setRows(previous => previous.map(row => row.id === id ? {...row,...patch} : row));
    setNotice(''); setError('');
  }
  function add(kind: FinanceDraftRow['kind']) {
    setRows(previous => [...previous,{id:crypto.randomUUID(),kind,name:'',amount:'',base:null,removed:false}]);
    setNotice(''); setError('');
  }
  function remove(id: string) {
    setRows(previous => previous.flatMap(row => row.id !== id ? [row] : row.base && !row.missing ? [{...row,removed:true}] : []));
    setNotice(''); setError('');
  }
  function useCloud(id: string) {
    setRows(previous => previous.flatMap(row => row.id !== id ? [row] : row.missing || !row.base ? [] : createDraft([row.base])));
    setError(''); setNotice('已采用该项云端记录，其他草稿仍保留。');
  }
  const locked = saving || loading || !!retry || needsCurrent;
  return <div className="finance-book">
    {loading && <p role="status">正在读取云端记录…</p>}
    {error && <p className="finance-error" role="alert">{error}</p>}
    {!loading && !snapshot && <button className="primary" onClick={() => void read(false)}>重新读取</button>}
    {snapshot && <>
      <div className="finance-summary"><span className="eyebrow">{needsCurrent ? '上次已确认的储蓄净额' : '已保存的储蓄净额'}</span><strong className="net-worth">¥ {formatRmb(snapshot.net_savings_minor)}</strong>
        <small>{snapshot.saved_at ? `云端更新于 ${time(snapshot.saved_at)}（北京时间）` : '还没有财务记录，添加余额或负债开始记账。'}</small>
      </div>
      {book && !needsCurrent && <FinanceGrowth book={book}/>}
      {feedback && !needsCurrent && <p className="finance-success" role="status">{feedback}</p>}
      <nav className="finance-tabs" aria-label="财务视图"><button aria-pressed={view === 'current'} onClick={() => setView('current')}>当前账本{dirty ? ' · 有草稿' : ''}</button><button aria-pressed={view === 'history'} onClick={() => setView('history')}>历史与趋势</button></nav>
      {view === 'history' && book && <FinanceHistory history={book.history} refreshing={saving || loading || !!retry} onRefresh={() => void read(dirty)}/>}
      <form hidden={view !== 'current'} className="finance-editor" onSubmit={event => {event.preventDefault(); void save();}}>
        {(conflict || unresolved > 0) && <div ref={reviewNotice} tabIndex={-1} className="finance-review" role="status">{conflict ? <><strong>有成员先更新了记录</strong><p>本次修改均未保存，输入仍保留。请读取最新记录，核对后再提交。</p></> : <p>还有 {unresolved} 项需要核对。选择采用云端记录，或保留你的修改后再保存。</p>}</div>}
        <FinanceList kind="balance" rows={rows.filter(row => row.kind === 'balance')} disabled={locked} onChange={change} onAdd={() => add('balance')} onRemove={remove} onUseCloud={useCloud}/>
        <FinanceList kind="debt" rows={rows.filter(row => row.kind === 'debt')} disabled={locked} onChange={change} onAdd={() => add('debt')} onRemove={remove} onUseCloud={useCloud}/>
        <div className={`finance-draft-summary ${dirty ? 'is-dirty' : ''}`} aria-label="草稿合计">
          <div><span>{dirty ? '草稿储蓄净额 · 未保存' : '当前列表合计'}</span><strong>{totals ? `¥ ${formatRmb(totals.net)}` : '待填写有效金额'}</strong></div>
          <small>{totals ? `余额 ¥ ${formatRmb(totals.balance)} − 负债 ¥ ${formatRmb(totals.debt)}` : '请填写金额，最多保留两位小数。'}</small>
          {dirty && <small>点击保存后才会更新云端记录。</small>}
        </div>
        <div className="finance-actions"><button className="primary" disabled={saving || loading || conflict || needsCurrent || unresolved > 0 || (!dirty && !retry)}>{saving ? '正在保存…' : retry ? '重试保存' : review ? '确认并保存修改' : '保存修改'}</button>
          <button type="button" className="text-button" disabled={saving || loading || !!retry} onClick={() => void read(dirty)}>读取最新记录</button></div>
        {retry && !saving && <p className="finance-review" role="status">本次提交的结果尚未确认，输入已保留。请先重试确认同一次提交，避免重复记账；确认后即可继续编辑。</p>}
        {needsCurrent && !loading && <p className="finance-review" role="status">本次提交已保存，但暂时无法读取最新记录。请重新读取后继续编辑，无需再次保存。</p>}
      </form>
    </>}
    {notice && <p className="finance-success" role="status">{notice}</p>}
    <p className="finance-muted">储蓄净额为所记录余额减负债，不代表完整家庭净资产。其他地区仍使用本机示例数据。</p>
    <dialog ref={dialog} className="finance-exit-dialog" aria-labelledby="finance-exit-title" onCancel={event => {event.preventDefault(); event.stopPropagation(); setLeaving(null);}}>
      <h2 id="finance-exit-title">{saving ? '正在等待云端确认' : '还有未保存的修改'}</h2>
      <p>{saving ? '请等待保存结果，再离开财务面板。' : retry ? '这次提交尚未确认。放弃不会撤销可能已到达云端的更新，下次打开会重新读取。' : '离开后将丢弃当前草稿，已保存的云端记录不受影响。'}</p>
      <div className="finance-actions"><button type="button" className="primary" autoFocus onClick={() => setLeaving(null)}>{saving ? '继续等待' : '继续编辑'}</button>
        {!saving && <button type="button" className="text-button" onClick={() => {const leave = leaving; setLeaving(null); leave?.();}}>放弃并离开</button>}</div>
    </dialog>
  </div>;
}
