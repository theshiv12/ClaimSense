import { z } from 'zod';
import { ErrorCode } from './errors';
import { BillHead, FactKey, RoomCategory } from './fact-key';
import { FactValueSchema } from './fact.schema';
import { IsoDateSchema, PaiseSchema } from './primitives';

/** Every server action returns this; never a raw error (CLAUDE.md coding standards). */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; code: ErrorCode };

// Ids are only length-checked here: a malformed id must give NOT_FOUND, not VALIDATION_FAILED.
const Id = z.string().min(1).max(64);
const MaxPaise = PaiseSchema.max(1_000_000_000); // ₹1 crore, far above any SI option

export const SignupInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(128).regex(/\d/, 'Use at least one number'),
  displayName: z.string().trim().max(60).optional(),
  adultAttested: z.literal(true),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(128),
});

export const SampleCaseId = z.enum(['A', 'B', 'C', 'D']);
export const StartSampleInputSchema = z.object({ caseId: SampleCaseId });

export const Relation = z.enum(['self', 'spouse', 'parent', 'child', 'other']);

export const CreateClaimInputSchema = z.object({
  planId: z.string().min(1).max(64),
  subject: z.object({ relation: Relation, treatment: z.string().trim().min(2).max(120) }),
  consent: z.object({ analysis: z.literal(true), retention: z.boolean(), improve: z.boolean() }),
  admissionDate: IsoDateSchema.nullable().optional(),
  room: z.object({ category: RoomCategory, rentPerDayPaise: MaxPaise }).nullable().optional(),
});
export type CreateClaimInput = z.infer<typeof CreateClaimInputSchema>;

export const ClaimIdInputSchema = z.object({ claimId: Id });
export const FactIdInputSchema = z.object({ claimId: Id, factId: Id });
export const EditFactInputSchema = z.object({ claimId: Id, factId: Id, value: FactValueSchema });
export const AddFactInputSchema = z.object({ claimId: Id, key: FactKey, head: BillHead, value: FactValueSchema });
export const SimulateRoomInputSchema = z.object({ claimId: Id, category: RoomCategory, rentPerDayPaise: MaxPaise });
