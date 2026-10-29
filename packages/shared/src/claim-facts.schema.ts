import { z } from 'zod';
import { BillHead, RoomCategory } from './fact-key';
import { IsoDateSchema, PaiseSchema } from './primitives';

/** Engine input. null means unknown, and the rule that needs it returns `unknown`. */
export const ClaimFactsSchema = z.object({
  planId: z.string(),
  policyStartDate: IsoDateSchema.nullable(),
  policyEndDate: IsoDateSchema.nullable(),
  firstInceptionDate: IsoDateSchema.nullable(), // continuous cover, including porting
  sumInsuredPaise: PaiseSchema.nullable(),
  sumInsuredUsedPaise: PaiseSchema.nullable(),
  ageAtEntry: z.number().int().nonnegative().nullable(),
  admissionDate: IsoDateSchema.nullable(),
  dischargeDate: IsoDateSchema.nullable(),
  diagnosis: z.string().nullable(),
  icd10: z.string().nullable(),
  isAccident: z.boolean().nullable(),
  ped: z.object({
    exists: z.boolean().nullable(),
    condition: z.string().nullable(),
    firstDiagnosedDate: IsoDateSchema.nullable(),
    disclosed: z.boolean().nullable(),
  }),
  room: z.object({
    category: RoomCategory.nullable(),
    rentPerDayPaise: PaiseSchema.nullable(),
    days: z.number().int().nonnegative().nullable(),
  }),
  bill: z.object({
    totalPaise: PaiseSchema.nullable(),
    lineItems: z.array(z.object({ head: BillHead, amountPaise: PaiseSchema })),
  }),
});
export type ClaimFacts = z.infer<typeof ClaimFactsSchema>;
