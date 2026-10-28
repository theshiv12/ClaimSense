import { z } from 'zod';
import { notImplemented } from './not-implemented';

/** Money is always integer paise (₹1 = 100 paise). */
export const PaiseSchema = z.number().int().nonnegative();
export type Paise = z.infer<typeof PaiseSchema>;

export const BpsSchema = notImplemented;
export const IsoDateSchema = notImplemented;
