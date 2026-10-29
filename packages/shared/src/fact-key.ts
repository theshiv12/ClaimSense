import { z } from 'zod';

// Enum values stay single-word lowercase (model output can change their case).
export const FactKey = z.enum([
  'plan_uin', 'policy_start_date', 'policy_end_date', 'first_inception_date', 'sum_insured',
  'sum_insured_used', 'age_at_entry', 'admission_date', 'discharge_date', 'diagnosis',
  'diagnosis_icd10', 'is_accident', 'ped_exists', 'ped_condition', 'ped_first_diagnosed_date',
  'ped_disclosed', 'room_category', 'room_rent_per_day', 'room_days', 'bill_total', 'bill_line_item',
]);
export type FactKey = z.infer<typeof FactKey>;

export const BillHead = z.enum([
  'none', 'room', 'icu', 'nursing', 'surgeon', 'consultation', 'ot',
  'pharmacy', 'consumables', 'implants', 'diagnostics', 'other',
]);
export type BillHead = z.infer<typeof BillHead>;

export const RoomCategory = z.enum(['general', 'shared', 'single', 'deluxe', 'suite', 'icu']);
export type RoomCategory = z.infer<typeof RoomCategory>;
