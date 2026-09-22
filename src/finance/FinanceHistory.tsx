import {useEffect, useState} from 'react';
import {appClient, isAccessError} from '../auth/client';
import type {FinanceHistoryEntry} from './client';
import {formatRmb} from './money.mjs';
import {beijingTime, historyTotals, trendPoints} from './history.mjs';

export function FinanceHistory({householdId, onAccessDenied}: {householdId: string; onAccessDenied: () => void}) {
  const [history, setHistory] = useState<FinanceHistoryEntry[] | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setHistory(null); setError('');
    void appClient?.rpc('get_finance_history', {p_household_id:householdId}).then(({data, error: failure}) => {
      if (cancelled) return;
      if (failure) {
        if (isAccessError(failure)) onAccessDenied();
        setError('暂时无法读取财务历史，请重新读取。');
      } else setHistory(data as FinanceHistoryEntry[]);
    });
    return () => {cancelled = true;};
  }, [householdId, refresh]);
  const points: {x:number; y:number}[] = history ? trendPoints(history) : [];
  const values = history?.map(update => BigInt(update.snapshot.net_savings_minor)) ?? [];
  const range = values.length ? {min:values.reduce((a,b) => a < b ? a : b).toString(), max:values.reduce((a,b) => a > b ? a : b).toString()} : null;
  return <section className="finance-history" aria-label="财务历史与趋势">
    <div className="finance-list-heading"><h2>历史与趋势</h2><button className="text-button" onClick={() => setRefresh(value => value+1)}>刷新历史</button></div>
    {error ? <p className="finance-error" role="alert">{error}</p> : !history ? <p role="status">正在读取财务历史…</p> : !history.length ? <p className="finance-empty">还没有财务历史。第一次保存后，这里会留下当时的完整记录。</p> : <>
      <figure className="finance-trend">
        <figcaption>储蓄净额趋势 <small>按保存时间排列 · 人民币元</small></figcaption>
        <small>{range && `最高 ¥ ${formatRmb(range.max)} · 最低 ¥ ${formatRmb(range.min)}`}</small>
        <svg viewBox="0 0 440 160" role="img" aria-label={`储蓄净额趋势，共 ${history.length} 次更新；详细金额见下方历史记录`}>
          <path d="M20 20V140H420" fill="none" stroke="currentColor" opacity=".2"/>
          <polyline points={points.map(point => `${20+point.x*4},${20+point.y*1.2}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/>
          {points.map((point, i) => <circle key={history[i].id} cx={20+point.x*4} cy={20+point.y*1.2} r="4" fill="currentColor"><title>{beijingTime(history[i].saved_at)} · ¥ {formatRmb(history[i].snapshot.net_savings_minor)}</title></circle>)}
        </svg>
        <div className="finance-trend-range"><span>{beijingTime(history[0].saved_at)}</span><span>{beijingTime(history.at(-1)!.saved_at)}</span></div>
        <small>北京时间 · 每个点对应一次保存，可展开下方记录查看完整明细。</small>
      </figure>
      <div className="finance-history-list">{[...history].reverse().map(update => {
        const totals = historyTotals(update.snapshot.entries);
        return <details key={update.id} className="finance-history-update">
          <summary><span><strong>¥ {formatRmb(update.snapshot.net_savings_minor)}</strong><small>{beijingTime(update.saved_at)}（北京时间）</small></span><span>{update.actor_name}</span></summary>
          <p>余额 ¥ {formatRmb(totals.balance)} − 负债 ¥ {formatRmb(totals.debt)}</p>
          <p className="finance-muted">操作人：{update.actor_name} · 第 {update.version} 次更新</p>
          {(['balance','debt'] as const).map(kind => <div key={kind} className="finance-history-entries"><h3>{kind === 'balance' ? '当时的余额' : '当时的负债'}</h3>{update.snapshot.entries.filter(entry => entry.kind === kind).map(entry => <div className="finance-history-entry" key={entry.id}><span>{entry.name}<small>原创建者：{entry.creator_name}</small></span><strong>¥ {formatRmb(entry.amount_minor)}</strong></div>)}{!update.snapshot.entries.some(entry => entry.kind === kind) && <p className="finance-muted">没有{kind === 'balance' ? '余额' : '负债'}记录</p>}</div>)}
        </details>;
      })}</div>
      <p className="finance-muted">创建者表示最初录入的人，不代表资金所有人。历史保留每次保存时的名称与归属。</p>
    </>}
  </section>;
}
