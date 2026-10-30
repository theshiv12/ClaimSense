import type { ChatAskInput, ChatSource, ErrorCode } from '@claimsense/shared';

export type LlmMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export interface LlmDocument {
  bytes: Uint8Array;
  mimeType: LlmMimeType;
}

/** One grounded chat question: the numbered sources it may use, the question, and the recent turns. */
export interface LlmChatRequest {
  sources: ChatSource[];
  question: string;
  history: ChatAskInput['history'];
}

/** Raw JSON the caller Zod-parses. Only gemini.ts implements it for real. */
export interface LlmClient {
  /** Reads one document. */
  extract(doc: LlmDocument): Promise<unknown>;
  /** Answers a question about one check from the given sources only (ADR-010). */
  answer(req: LlmChatRequest): Promise<unknown>;
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

/**
 * e2e only (LLM_FAKE=1, never in production): documents are not read, and the chat gives one canned answer
 * that cites the check's own reason and clause, so the browser journey runs without a Gemini key.
 */
const e2eFake: LlmClient = {
  extract: () => Promise.reject(new LlmError('LLM_UNAVAILABLE')),
  answer: () =>
    Promise.resolve({
      refused: false,
      answer: 'The room costs more than the limit in your policy, so the other charges are cut in the same ratio. Choosing a room within the limit avoids this.',
      citations: ['S-REASON', 'S-CLAUSE'],
    }),
};

export const getLlm = async (): Promise<LlmClient> => {
  if (override) return override;
  if (process.env.LLM_FAKE === '1') {
    if (process.env.NODE_ENV === 'production') throw new Error('LLM_FAKE must never be set in production');
    return e2eFake;
  }
  if (process.env.VITEST) throw new Error('Tests must use FakeLlm (setLlmForTests); live Gemini is never called in tests');
  return (await import('./gemini')).geminiFromEnv();
};
