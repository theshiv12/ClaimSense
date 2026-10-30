// formatInr and formatDate live in @claimsense/shared (the API uses them too).
export { formatDate, formatInr } from '@claimsense/shared';
/** Rupees typed by a person ("7,000", "4500.50") → paise, or null. */
export const rupeesToPaise = (text: string): number | null => {
  const t = text.replace(/[,₹\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
};
