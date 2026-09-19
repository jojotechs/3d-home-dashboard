import {inputRmb, parseRmb} from './money.mjs';

/** @param {import('./client').FinanceEntry[]} entries
 * @returns {import('./client').FinanceDraftRow[]} */
export function createDraft(entries) {
  return entries.map(entry => ({id:entry.id,kind:entry.kind,name:entry.name,amount:inputRmb(entry.amount_minor),removed:false,base:entry}));
}

/** @param {import('./client').FinanceDraftRow} row */
export function rowChanged(row) {
  if (row.removed) return !!row.base;
  if (!row.base) return true;
  try {return row.name.trim() !== row.base.name || parseRmb(row.amount) !== row.base.amount_minor;}
  catch {return true;}
}

/** @param {import('./client').FinanceDraftRow[]} rows
 * @returns {import('./client').FinanceChange[]} */
export function draftChanges(rows) {
  return rows.filter(rowChanged).flatMap(row => {
    if (row.missing) {
      if (row.removed) return [];
      throw new Error('有项目已被其他成员移除，请放弃该项修改；需要时可重新新增。');
    }
    if (row.removed) return [{id:row.id,operation:'remove',expected_version:row.base.version}];
    const name = row.name.trim(), amount = parseRmb(row.amount);
    if (!name || [...name].length > 100) throw new Error('请填写 1–100 字的项目名称。');
    if (row.kind === 'debt' && amount === '0') throw new Error('负债请输入大于零的金额；已还清可移除该项。');
    return [{id:row.id,operation:'upsert',expected_version:row.base?.version ?? '0',kind:row.kind,name,amount_minor:amount}];
  });
}

/** @param {import('./client').FinanceDraftRow[]} rows */
export function draftTotals(rows) {
  let balance = 0n, debt = 0n;
  for (const row of rows.filter(row => !row.removed)) {
    const amount = BigInt(parseRmb(row.amount));
    if (row.kind === 'debt') debt += amount;
    else balance += amount;
  }
  return {balance:balance.toString(),debt:debt.toString(),net:(balance-debt).toString()};
}

/** Explicit user refresh only: retain edits, replace their comparison versions,
 * and bring in unrelated current rows. The UI asks for review before resaving.
 * @param {import('./client').FinanceDraftRow[]} rows
 * @param {import('./client').FinanceEntry[]} entries */
export function refreshDraft(rows, entries) {
  const edits = rows.filter(rowChanged);
  const merged = createDraft(entries).map(current => {
    const edit = edits.find(row => row.id === current.id);
    return edit ? {...edit,base:current.base,missing:false} : current;
  });
  for (const edit of edits) {
    if (entries.some(entry => entry.id === edit.id)) continue;
    if (!edit.base) merged.push(edit);
    else if (!edit.removed) merged.push({...edit,missing:true});
  }
  return merged;
}
