import {inputRmb, parseRmb} from './money.mjs';
export function correctionDraft(entries) {
  return entries.map(entry=>({...entry,baseMinor:entry.amount_minor,amount:inputRmb(entry.amount_minor)}));
}
export function correctionChanges(rows) {
  return rows.flatMap(row=>{
    const amount = parseRmb(row.amount);
    if (row.kind === 'debt' && amount === '0') throw Error('历史负债金额需大于零。');
    return amount === row.baseMinor ? [] : [{id:row.id,amount_minor:amount}];
  });
}
export function refreshCorrection(rows, entries) {
  return correctionDraft(entries).map(fresh=>{
    const draft=rows.find(row=>row.id===fresh.id);
    if (!draft) return fresh;
    let changed=true;
    try {changed=parseRmb(draft.amount)!==draft.baseMinor;} catch { /* Keep partial input for review. */ }
    return changed ? {...fresh,amount:draft.amount} : fresh;
  });
}
