import {CheckCircle, LockSimple, Eye} from '@phosphor-icons/react';
import type {FinanceBook} from './client';
import {financeGuide, financeGrowth} from './growth.mjs';
import {formatRmb} from './money.mjs';

const buildings = [
  ['街角小店','瓦屋顶、小花箱与街边外摆'],['市场街角','大屋顶市场与储蓄所'],
  ['邻里商街','连续底商、骑楼与阳台'],['拱廊街区','红砖角楼与拱顶商廊'],
  ['区域中心','中层商务楼与活动广场'],['退台商务区','绿化露台与水景庭院'],
  ['繁荣市区','成熟地标与商业核心'],['花园商业区','高端商街、退台与屋顶花园'],
  ['未来都会','折面塔冠、全息与飞行广告'],['都会之冠','观景环、空中拱桥与立面光秀'],
];

export function FinanceGuide({book, previewLevel, onPreview, onRefresh, refreshing}: {
  book: FinanceBook; previewLevel: number | null; onPreview: (level: number | null) => void;
  onRefresh: () => void; refreshing: boolean;
}) {
  const growth=financeGrowth(book.current.net_savings_minor,book.history);
  return <section className="finance-guide" aria-label="十级财务图鉴">
    <div className="finance-guide-heading"><div><h2>小城的十种面貌</h2><p>点选街景，在地图中旋转查看。</p></div><button className="text-button" disabled={refreshing} onClick={onRefresh}>刷新图鉴</button></div>
    <p className="finance-muted">{growth.peakMinor===null?'尚无历史记录，Lv.1 是基础街景。':'已达成状态来自有效历史；纠正错误记录后会重新核对。'} 预览不会保存金额或解锁等级。</p>
    <div className="finance-guide-grid">{financeGuide(book).map(entry=>{
      const [name,description]=buildings[entry.level-1];
      const label=entry.status==='current'?'当前等级':entry.status==='achieved'?'已达成':'未达成';
      return <button key={entry.level} className={`finance-guide-card is-${entry.status}`} aria-label={`预览 Lv.${entry.level} ${name} · ${label}`}
        aria-pressed={previewLevel===entry.level} aria-current={entry.status==='current'?'true':undefined} onClick={()=>onPreview(entry.level)}>
        <div className="finance-guide-picture"><img src={`/models/finance/previews/level-${entry.level}.png`} alt="" width="240" height="180" loading="lazy"/><span className="finance-guide-status">{entry.status==='locked'?<LockSimple size={13}/>:<CheckCircle size={13}/>} {label}</span></div>
        <div className="finance-guide-caption"><strong>Lv.{entry.level} · {name}</strong><span>{description}</span><small>{entry.level===1?'基础街景（含负净额）':`门槛 ¥ ${formatRmb(entry.thresholdMinor)}`}</small>
          {entry.status==='locked'&&<small>距当前还差 ¥ {formatRmb(entry.remainingMinor)}</small>}
          <span className="finance-guide-view"><Eye size={13}/>{previewLevel===entry.level?'正在预览':'查看街景'}</span></div>
      </button>;
    })}</div>
    <button className="primary" disabled={previewLevel===null} onClick={()=>onPreview(null)}>返回当前城市 Lv.{growth.currentLevel}</button>
  </section>;
}

export function FinancePreviewNotice({book, level, onExit}: {book: FinanceBook; level: number; onExit: () => void}) {
  const entry=financeGuide(book)[level-1];
  return <aside className="finance-preview-notice" aria-label="财务模型预览" role="status">
    <div><strong>模型预览 · Lv.{level} {buildings[level-1][0]}</strong><span>{entry.status==='locked'?'未达成 · ':''}{level===1?'基础街景':`门槛 ¥ ${formatRmb(entry.thresholdMinor)}`} · 不改变账本</span></div>
    <button className="text-button" onClick={onExit}>结束预览</button>
  </aside>;
}
