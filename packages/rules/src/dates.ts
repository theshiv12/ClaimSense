import type { IsoDate } from '@claimsense/shared';

// Calendar dates only (docs/rules-spec.md Boundaries). ISO strings compare correctly as strings.
const parts = (iso: IsoDate) => iso.split('-').map(Number) as [number, number, number];
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export const addDays = (iso: IsoDate, days: number): IsoDate => {
  const [y, m, d] = parts(iso);
  return fmt(new Date(Date.UTC(y, m - 1, d + days)));
};

/** Same calendar date N months later; clamps to the month end (31 Jan + 1 month = 28/29 Feb). */
export const addMonths = (iso: IsoDate, months: number): IsoDate => {
  const [y, m, d] = parts(iso);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return fmt(new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay))));
};
