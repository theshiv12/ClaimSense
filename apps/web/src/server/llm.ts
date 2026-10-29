import 'server-only';
import type { ErrorCode } from '@claimsense/shared';

export type LlmMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export interface LlmDocument {
  bytes: Uint8Array;
  mimeType: LlmMimeType;
}

/** Reads one document and returns raw JSON, which the caller Zod-parses. Only gemini.ts implements it. */
export interface LlmClient {
  extract(doc: LlmDocument): Promise<unknown>;
}

export class LlmError extends Error {
  constructor(readonly code: Extract<ErrorCode, 'LLM_UNAVAILABLE' | 'AI_QUOTA_EXCEEDED' | 'LLM_OUTPUT_INVALID'>) {
    super(code);
    this.name = 'LlmError';
  }
}

let override: LlmClient | null = null;

/** Tests only: swap in FakeLlm. Tests never call live Gemini. */
export const setLlmForTests = (llm: LlmClient | null) => {
  override = llm;
};

export const getLlm = async (): Promise<LlmClient> => override ?? (await import('./gemini')).geminiFromEnv();
