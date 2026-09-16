import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {Session, SupabaseClient} from '@supabase/supabase-js';
import {financeClient, financeError, getFinanceAuth, subscribeFinanceAuth, signOutFinance} from './client';
import type {BalanceRequest, FinanceSnapshot} from './client';
import {formatRmb, inputRmb, parseRmb} from './money.mjs';
import './finance.css';

export function FinancePanel() {
  const auth = useSyncExternalStore(subscribeFinanceAuth, getFinanceAuth);
  const session = auth.session;
  if (!financeClient) return <div className="finance-book"><h2>家庭财务账尚未连接</h2><p>云服务配置完成后，即可登录并保存余额。</p><p className="finance-muted">财务暂以基础街区展示。其他地区仍为本机示例。</p></div>;
  if (auth.status === 'signingOut') return <div className="finance-book" role="status">正在退出登录…</div>;
  if (auth.status === 'checking') return <div className="finance-book" role="status">正在确认登录状态…</div>;
  if (!session) return <Login client={financeClient}/>;
  return <BalanceBook key={session.user.id} client={financeClient} session={session}/>;
}

function Login({client}: {client: SupabaseClient}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <form className="finance-book finance-login" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await client.auth.signInWithPassword({email: email.trim(), password});
      if (result.error) setError('登录失败，请检查邮箱、密码和网络连接。');
      else setPassword('');
    } catch { setError('暂时无法登录，请检查网络后重试。'); }
    finally { setBusy(false); }
  }}>
    <div><span className="eyebrow">家庭共同记录</span><h2>登录家庭财务账</h2><p>使用管理员已开通的账号，查看与保存真实余额。</p></div>
    <label>邮箱<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy}/></label>
    <label>密码<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={busy}/></label>
    {error && <p role="alert">{error}</p>}
    <button className="primary" disabled={busy}>{busy ? '正在登录…' : '登录'}</button>
    <p className="finance-muted">仅限已开通账号。财务记录保存在云端，其他地区仍为本机示例。</p>
  </form>;
}

function BalanceBook({client, session}: {client: SupabaseClient; session: Session}) {
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [retry, setRetry] = useState<BalanceRequest | null>(null);
  const [entryId, setEntryId] = useState<string>(() => crypto.randomUUID());
  const alive = useRef(true);
  const operation = useRef(0);
  const working = useRef(false);
  const entry = snapshot?.entries.find(item => item.kind === 'balance');

  useEffect(() => {
    alive.current = true;
    void read(false);
    return () => { alive.current = false; operation.current++; };
  }, []);

  async function read(keepInput: boolean) {
    const generation = ++operation.current;
    setLoading(true); setError('');
    try {
      const {data, error: failure} = await client.rpc('get_finances');
      if (!alive.current || generation !== operation.current) return;
      if (failure) throw failure;
      const current = data as FinanceSnapshot;
      const balance = current.entries.find(item => item.kind === 'balance');
      setSnapshot(current);
      setEntryId(balance?.id ?? crypto.randomUUID());
      setRetry(null); setConflict(false);
      if (!keepInput) {
        setName(balance?.name ?? ''); setAmount(balance ? inputRmb(balance.amount_minor) : ''); setDirty(false);
      } else setNotice('已读取最新记录。你的输入仍保留，请核对下方云端余额后再保存。');
    } catch (failure) {
      if (alive.current && generation === operation.current) {
        if ((failure as {code?: string})?.code === '42501') setSnapshot(null);
        setError((failure as {code?: string})?.code === '42501' ? financeError(failure) : '暂时无法读取最新记录，请检查连接后重试。');
      }
    } finally {
      if (alive.current && generation === operation.current) setLoading(false);
    }
  }

  async function save() {
    if (!snapshot || working.current || conflict) return;
    let request = retry;
    if (!request) {
      try {
        request = {p_household_id: snapshot.household_id, p_entry_id: entry?.id ?? entryId,
          p_expected_version: entry?.version ?? '0', p_name: name.trim(),
          p_amount_minor: parseRmb(amount), p_request_id: crypto.randomUUID()};
      } catch (failure) { setError((failure as Error).message); return; }
    }
    working.current = true;
    setSaving(true); setRetry(request); setError(''); setNotice('');
    const generation = ++operation.current;
    try {
      const {data, error: failure} = await client.rpc('save_balance', request);
      if (!alive.current || generation !== operation.current) return;
      if (failure) throw failure;
      const confirmed = data as FinanceSnapshot;
      setSnapshot(confirmed);
      setRetry(null); setDirty(false);
      setNotice('已保存到云端');
      // A retry can acknowledge an older committed response. Read the latest book
      // before accepting another edit, without ever resubmitting that old edit.
      await read(false);
    } catch (failure) {
      if (alive.current && generation === operation.current) {
        setError(financeError(failure));
        if ((failure as {code?: string})?.code === 'PT409') setConflict(true);
        if ((failure as {code?: string})?.code === '42501') setSnapshot(null);
      }
    } finally {
      working.current = false;
      if (alive.current) setSaving(false);
    }
  }

  return <div className="finance-book">
    <div className="finance-account"><span>{snapshot?.household_name ?? '家庭财务账'}<small>{session.user.email}</small></span><button type="button" className="text-button" onClick={() => {void signOutFinance().catch(() => {});}}>退出登录</button></div>
    {loading && <p role="status">正在读取云端记录…</p>}
    {error && <p className="finance-error" role="alert">{error}</p>}
    {!loading && !snapshot && <button className="primary" onClick={() => void read(false)}>重新读取</button>}
    {snapshot && <>
      <div className="finance-summary"><span className="eyebrow">已保存的储蓄净额</span><strong className="net-worth">¥ {formatRmb(snapshot.net_savings_minor)}</strong>
        <small>{snapshot.saved_at ? `云端更新于 ${new Date(snapshot.saved_at).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}` : '还没有财务记录，从第一笔余额开始。'}</small>
        <small>{BigInt(snapshot.net_savings_minor) < 1000000n ? 'Lv.1 · 街角初成' : '余额已保存 · 后续开发接入十级城市成长'}</small>
      </div>
      <form className="finance-entry" onSubmit={event => {event.preventDefault(); void save();}}>
        <h2>{entry ? '修改余额' : '新增第一笔余额'}</h2>
        <label>余额名称<input value={name} maxLength={100} required disabled={saving || loading || !!retry} placeholder="例如：工资卡" onChange={e => {setName(e.target.value); setDirty(true); setNotice('');}}/></label>
        <label>金额（元）<input inputMode="decimal" value={amount} required disabled={saving || loading || !!retry} placeholder="0.00" onChange={e => {setAmount(e.target.value); setDirty(true); setNotice('');}}/></label>
        {entry && <p className="finance-muted">创建者：{entry.creator_name} · 最近修改：{entry.editor_name}<br/>云端余额：{entry.name} · ¥ {formatRmb(entry.amount_minor)}</p>}
        <div className="finance-actions"><button className="primary" disabled={saving || loading || conflict || (!dirty && !retry)}>{saving ? '正在保存…' : retry ? '重试保存' : '保存余额'}</button>
          <button type="button" className="text-button" disabled={saving || loading} onClick={() => void read(dirty || !!retry)}>读取最新记录</button></div>
        {retry && !saving && <p className="finance-muted">为避免重复保存，重试会提交同一笔输入。需继续修改时，先读取最新记录并核对。</p>}
      </form>
    </>}
    {notice && <p className="finance-success" role="status">{notice}</p>}
    <p className="finance-muted">余额仅在云端确认后生效。其他地区仍使用本机示例数据。</p>
  </div>;
}
