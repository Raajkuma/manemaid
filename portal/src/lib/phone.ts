/**
 * Phone handling — must match the mobile app (mobile/src/app/sign-in.tsx), which sends
 * `+91` + 10 digits. A different format would create a second account for the same person.
 */
export function tenDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

export const isValidMobile = (input: string) => /^[6-9]\d{9}$/.test(tenDigits(input));

export const toE164 = (input: string) => `+91${tenDigits(input)}`;

/** 919876543210 / +919876543210 -> +91 98765 43210 */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return '—';
  const d = tenDigits(p);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p;
}
