// Display names need not be unique; member IDs carry identity.
export function randomMemberName() {
  const letters = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (value, index) => {
    const alphabet = index % 2 === 0 ? letters : digits;
    return alphabet[value % alphabet.length];
  }).join('');
}
