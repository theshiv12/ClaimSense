import type { ErrorCode } from '@claimsense/shared';

/** A known outcome a service reports instead of a raw error; the HTTP layer turns it into ActionResult. */
export class ActionError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = 'ActionError';
  }
}

export const fail = (code: ErrorCode): never => {
  throw new ActionError(code);
};

/** HTTP status per error code (docs/api.md). The body is always `{ ok: false, code }`. */
export const STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  PDF_PASSWORD_PROTECTED: 400,
  AUTH_REQUIRED: 401,
  AUTH_INVALID: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PLAN_NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  DOCUMENT_LIMIT_REACHED: 409,
  FILE_TOO_LARGE: 413,
  FILE_TYPE_NOT_ALLOWED: 415,
  LLM_OUTPUT_INVALID: 422,
  RATE_LIMITED: 429,
  AI_QUOTA_EXCEEDED: 429,
  LLM_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};
