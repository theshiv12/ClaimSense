import { z } from 'zod';
import { BillHead, FactKey } from './fact-key';
import { Confidence, FactStatus } from './fact.schema';

// ADR-003: flat and all-required, so the JSON schema sent to the model has no optional or union
// fields. Absent values are '' (valueText, sourceQuote) and 0 (page). Code normalises and verifies.
export const DocumentType = z.enum(['policy_schedule', 'hospital_estimate', 'hospital_bill', 'discharge_summary', 'other']);
export type DocumentType = z.infer<typeof DocumentType>;

export const LlmFactSchema = z.strictObject({
  key: FactKey,
  head: BillHead, // 'none' unless key is bill_line_item
  valueText: z.string().max(500), // as printed in the document
  status: FactStatus,
  sourceQuote: z.string().max(500), // verbatim text the value was read from
  page: z.number().int().min(0).max(500), // 1-based; 0 when not found
  confidence: Confidence,
});
export type LlmFact = z.infer<typeof LlmFactSchema>;

export const LlmExtractionSchema = z.strictObject({
  documentType: DocumentType,
  facts: z.array(LlmFactSchema).max(60),
});
export type LlmExtraction = z.infer<typeof LlmExtractionSchema>;
