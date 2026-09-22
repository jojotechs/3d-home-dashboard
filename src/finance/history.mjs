export function historyTotals(entries) {
  let balance = 0n, debt = 0n;
  for (const entry of entries) {
    if (entry.kind === 'debt') debt += BigInt(entry.amount_minor);
    else balance += BigInt(entry.amount_minor);
  }
  return {balance:balance.toString(), debt:debt.toString(), net:(balance-debt).toString()};
}

/** Only normalized drawing coordinates use Number; financial values stay exact. */
export function trendPoints(history) {
  if (!history.length) return [];
  const values = history.map(update => BigInt(update.snapshot.net_savings_minor));
  const min = values.reduce((a,b) => a < b ? a : b);
  const max = values.reduce((a,b) => a > b ? a : b);
  const times = history.map(update => new Date(update.saved_at).getTime());
  const duration = times.at(-1) - times[0];
  return values.map((value, index) => ({
    x: duration ? (times[index]-times[0])/duration*100 : 50,
    y: max === min ? 50 : Number((max-value)*10000n/(max-min))/100,
  }));
}

export const beijingTime = value => new Date(value).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai',hour12:false});
