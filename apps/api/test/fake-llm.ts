import { readFileSync } from 'node:fs';
import type { LlmChatRequest, LlmClient, LlmDocument } from '../src/integrations/llm';

/** Recorded (or hand-written) Gemini output from test/fixtures/gemini, minus its `_note`. */
export const geminiFixture = (name: string): unknown => {
  const { _note, ...rest } = JSON.parse(readFileSync(new URL(`./fixtures/gemini/${name}.json`, import.meta.url), 'utf8')) as Record<string, unknown>;
  void _note;
  return rest;
};

export const docFixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/docs/${name}`, import.meta.url)));

/**
 * A test LLM: returns queued answers in order and records what it was sent. Never touches the network.
 * `answers` feed `extract` (documents); `chatAnswers` feed `answer` (the check chat).
 */
export class FakeLlm implements LlmClient {
  calls: LlmDocument[] = [];
  chatCalls: LlmChatRequest[] = [];
  constructor(
    private readonly answers: unknown[],
    private readonly chatAnswers: unknown[] = [],
  ) {}
  extract(doc: LlmDocument): Promise<unknown> {
    this.calls.push(doc);
    return FakeLlm.next(this.answers);
  }
  answer(req: LlmChatRequest): Promise<unknown> {
    this.chatCalls.push(req);
    return FakeLlm.next(this.chatAnswers);
  }
  private static next(queue: unknown[]): Promise<unknown> {
    const next = queue.shift();
    if (next === undefined) return Promise.reject(new Error('FakeLlm: no answer queued'));
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  }
}
