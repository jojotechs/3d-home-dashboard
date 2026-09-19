import type {FinanceDraftRow} from './client';
import {rowChanged} from './draft.mjs';
import {formatRmb} from './money.mjs';

type Props = {
  kind: FinanceDraftRow['kind']; rows: FinanceDraftRow[]; disabled: boolean;
  onChange: (id: string, patch: Partial<FinanceDraftRow>) => void;
  onAdd: () => void; onRemove: (id: string) => void;
};
export function FinanceList({kind, rows, disabled, onChange, onAdd, onRemove}: Props) {
  const title = kind === 'balance' ? '余额' : '负债';
  return <section className="finance-list" aria-label={`${title}列表`}>
    <div className="finance-list-heading"><h2>{title}<small>{rows.filter(row => !row.removed).length} 项</small></h2><button type="button" className="text-button" disabled={disabled} onClick={onAdd}>＋ 添加{title}</button></div>
    <p className="finance-muted">{kind === 'balance' ? '记录银行、支付宝 / 微信、公积金等余额。' : '填写正数金额，合计时自动扣除；还清后可移除。'}</p>
    {!rows.length && <p className="finance-empty">暂无{title}，可以从上方添加。</p>}
    {rows.map((row, index) => <fieldset className={`finance-row ${row.removed ? 'is-removed' : ''}`} key={row.id} disabled={disabled}>
      <legend>{title} {index + 1}{!row.base ? ' · 新增' : row.removed ? ' · 待移除' : ''}</legend>
      {row.removed ? <div className="finance-removed"><span>{row.name} · ¥ {formatRmb(row.base!.amount_minor)}<small>保存后移除，历史记录仍会保留。</small></span><button type="button" className="text-button" onClick={() => onChange(row.id,{removed:false})}>撤销移除</button></div> : <>
        <div className="finance-row-inputs"><label>名称<input value={row.name} maxLength={100} required placeholder={kind === 'balance' ? '例如：工资卡' : '例如：房贷'} onChange={event => onChange(row.id,{name:event.target.value})}/></label>
          <label>金额（元）<input inputMode="decimal" value={row.amount} required placeholder="0.00" onChange={event => onChange(row.id,{amount:event.target.value})}/></label>
          <button type="button" className="text-button finance-remove" aria-label={`移除${title} ${index + 1}`} onClick={() => onRemove(row.id)}>移除</button></div>
        {row.base ? <div className="finance-provenance"><span>创建者：{row.base.creator_name}</span><span>最近修改：{row.base.editor_name} · {new Date(row.base.updated_at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</span>
          {row.missing ? <p className="finance-error">云端已移除此项。请移除这项草稿；需要时可重新新增。</p> : rowChanged(row) && <span className="finance-cloud-value">云端：{row.base.name} · ¥ {formatRmb(row.base.amount_minor)}</span>}</div>
          : <p className="finance-muted">尚未保存 · 保存时记录创建者</p>}
      </>}
    </fieldset>)}
  </section>;
}
