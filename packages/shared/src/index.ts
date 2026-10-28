import { z } from 'zod';

/** Money is always integer paise (₹1 = 100 paise). */
export const PaiseSchema = z.number().int().nonnegative();
export type Paise = z.infer<typeof PaiseSchema>;
