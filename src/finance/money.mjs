/** Convert an RMB input to an exact integer-cent string for JSON and PostgreSQL. */
export function parseRmb(value) {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('请输入非负金额，最多保留两位小数。');
  const [yuan, cents = ''] = text.split('.');
  return (BigInt(yuan) * 100n + BigInt(cents.padEnd(2, '0'))).toString();
}

export function inputRmb(minor) {
  const value = BigInt(minor);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export function formatRmb(minor) {
  const [yuan, cents] = inputRmb(minor).split('.');
  return `${yuan.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
}
