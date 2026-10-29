import { z } from 'zod';

/** Money is always integer paise (₹1 = 100 paise). */
export const PaiseSchema = z.number().int().nonnegative();
export type Paise = z.infer<typeof PaiseSchema>;

/** Percentages are basis points: 20% = 2000. */
export const BpsSchema = z.number().int().min(0).max(10_000);
export type Bps = z.infer<typeof BpsSchema>;

/** A calendar day, 'YYYY-MM-DD', no time zone. */
export const IsoDateSchema = z.iso.date();
export type IsoDate = z.infer<typeof IsoDateSchema>;
