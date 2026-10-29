import { readFileSync } from 'node:fs';
import type { LlmClient, LlmDocument } from '@/server/llm';

/** Recorded (or hand-written) Gemini output from test/fixtures/gemini, minus its `_note`. */
export const geminiFixture = (name: string): unknown => {
  const { _note, ...rest } = JSON.parse(readFileSync(new URL(`./fixtures/gemini/${name}.json`, import.meta.url), 'utf8')) as Record<string, unknown>;
  void _note;
  return rest;
};

export const docFixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/docs/${name}`, import.meta.url)));

/** A test LLM: returns queued answers in order and records what it was sent. Never touches the network. */
export class FakeLlm implements LlmClient {
  calls: LlmDocument[] = [];
  constructor(private readonly answers: unknown[]) {}
  extract(doc: LlmDocument): Promise<unknown> {
    this.calls.push(doc);
    const next = this.answers.shift();
    if (next === undefined) return Promise.reject(new Error('FakeLlm: no answer queued'));
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  }
}
