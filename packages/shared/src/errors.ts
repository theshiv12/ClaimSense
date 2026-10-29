import { z } from 'zod';

/** Every code the API can return (docs/api.md). It never returns raw errors. */
export const ErrorCode = z.enum([
  'AUTH_REQUIRED', 'AUTH_INVALID', 'VALIDATION_FAILED', 'EMAIL_TAKEN', 'RATE_LIMITED',
  'NOT_FOUND', 'PLAN_NOT_FOUND', 'FILE_TOO_LARGE', 'FILE_TYPE_NOT_ALLOWED',
  'DOCUMENT_LIMIT_REACHED', 'PDF_PASSWORD_PROTECTED', 'LLM_UNAVAILABLE', 'AI_QUOTA_EXCEEDED',
  'LLM_OUTPUT_INVALID', 'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
