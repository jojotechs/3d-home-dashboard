import {formatRmb} from './money.mjs';
import {financeGrowth} from './growth.mjs';
import type {FinanceBook} from './client';

export function FinanceGrowth({book}: {book: FinanceBook}) {
  const growth = financeGrowth(book.current.net_savings_minor, book.history);
  return <section className="finance-growth" aria-label="财务成长状态">
    <div><span className="eyebrow">当前财务等级</span><strong>Lv.{growth.currentLevel} · {growth.stage}</strong></div>
    <div><span>历史最高</span><strong>{growth.peakMinor === null ? '尚无历史记录' : `Lv.${growth.peakLevel} · ¥ ${formatRmb(growth.peakMinor)}`}</strong></div>
    {growth.nextLevel ? <p>下一级 Lv.{growth.nextLevel}：¥ {formatRmb(growth.nextMinor)}<br/>还差 ¥ {formatRmb(growth.remainingMinor)}</p> : <p>已达满级 Lv.10，仍可继续记录金额与历史。</p>}
    <small>十级建筑正在建设中，地图暂展示基础街景。</small>
  </section>;
}
