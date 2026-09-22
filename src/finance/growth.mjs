import financeAssets from '../../modeling/finance-levels.json' with {type:'json'};
const thresholds = [0n,1000000n,3000000n,8000000n,15000000n,30000000n,50000000n,80000000n,120000000n,200000000n];
const stages = ['街角初成','邻里商街','区域中心','繁荣市区','花园都会'];
export function financeLevel(minor) {
  const amount = BigInt(minor);
  let level = 1;
  for (let i=1; i<thresholds.length; i++) if (amount >= thresholds[i]) level = i+1;
  return level;
}
export function financeGrowth(currentMinor, history) {
  const currentLevel = financeLevel(currentMinor);
  const peak = history.reduce((highest, update) => {
    const value = BigInt(update.snapshot.net_savings_minor);
    return highest === null || value > highest ? value : highest;
  }, null);
  const next = thresholds[currentLevel] ?? null;
  return {currentLevel, stage:stages[Math.floor((currentLevel-1)/2)],
    peakMinor:peak === null ? null : peak.toString(), peakLevel:peak === null ? 1 : financeLevel(peak.toString()),
    nextLevel:next === null ? null : currentLevel+1, nextMinor:next === null ? null : next.toString(),
    remainingMinor:next === null ? null : (next-BigInt(currentMinor)).toString()};
}
/** Only delivered per-level assets may be selected; legacy three-stage ranges are never reused. */
export function financeProjection(growth, previewLevel = null) {
  if (!growth) return null;
  const displayLevel = previewLevel ?? growth.currentLevel;
  if (!Number.isInteger(displayLevel) || displayLevel < 1 || displayLevel > 10) throw Error('Invalid finance level');
  return {actualLevel:growth.currentLevel, displayLevel, isPreview:previewLevel !== null,
    achieved:displayLevel <= growth.peakLevel, modelLevel:financeAssets.levels[displayLevel] ? displayLevel : 1, modelReady:!!financeAssets.levels[displayLevel]};
}
export function levelFeedback(before, after) {
  if (after > before) return `财务市区从 Lv.${before} 升至 Lv.${after}。积累又多了一步。`;
  if (after < before) return `当前财务等级从 Lv.${before} 调整为 Lv.${after}。历史成果单独保留。`;
  return '';
}
