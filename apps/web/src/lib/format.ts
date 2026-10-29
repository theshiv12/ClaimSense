
/** ₹ with Indian grouping (₹2,05,800); paise shown only when not zero. */
export const formatInr = (paise: number): string => {
  const rupees = paise / 100;
  const whole = Number.isInteger(rupees);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(rupees);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'YYYY-MM-DD' → '18 Nov 2026' (calendar date, no time zone). */
export const formatDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
};

/** Rupees typed by a person ("7,000", "4500.50") → paise, or null. */
export const rupeesToPaise = (text: string): number | null => {
  const t = text.replace(/[,₹\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
};
