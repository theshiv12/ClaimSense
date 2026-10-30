import { z } from 'zod';

// "Ask about this check" (ADR-010): grounded Q&A. The API sends Gemini numbered sources; the model answers
// only from them and cites their ids. Amounts and verdicts stay with the rules engine (golden rule 1).

export const CHAT_QUESTION_MAX = 500;

export const ChatAskInputSchema = z.object({
  question: z.string().trim().min(2).max(CHAT_QUESTION_MAX),
  /** The last few turns of this conversation, from the browser (untrusted, bounded, never stored). */
  history: z
    .array(z.object({ q: z.string().max(CHAT_QUESTION_MAX), a: z.string().max(1600) }))
    .max(4)
    .default([]),
});
export type ChatAskInput = z.infer<typeof ChatAskInputSchema>;

export const ChatSourceKind = z.enum(['reason', 'clause', 'document', 'remedy', 'case']);
export interface ChatSource {
  id: string;
  kind: z.infer<typeof ChatSourceKind>;
  label: string;
  text: string;
}

/** What the model must return (Zod-parsed; the served schema drops bounds, as TC-GEM-05). */
export const LlmChatAnswerSchema = z.object({
  refused: z.boolean(),
  answer: z.string().max(1200),
  citations: z.array(z.string().max(80)).max(10),
});
export type LlmChatAnswer = z.infer<typeof LlmChatAnswerSchema>;

export interface ChatReplyView {
  answer: string;
  refused: boolean;
  citations: { id: string; label: string; kind: ChatSource['kind'] }[];
}
