import { LlmExtractionSchema } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { geminiFixture } from '../../test/fake-llm';
import { createGeminiLlm, SYSTEM_INSTRUCTION, type InteractionsCreate } from './gemini';
import { LlmError } from './llm';

const pdf = { bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), mimeType: 'application/pdf' as const };
const answer = (o: unknown) => ({ id: 'i-1', output_text: JSON.stringify(o) });
const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

const fake = (results: (unknown | Error)[]) => {
  const calls: Parameters<InteractionsCreate>[0][] = [];
  const create: InteractionsCreate = (req) => {
    calls.push(req);
    const next = results.shift();
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next as { output_text?: string });
  };
  return { calls, llm: createGeminiLlm({ create, model: 'primary-model', fallbackModel: 'fallback-model' }) };
};

describe('gemini adapter', () => {
  it('TC-GEM-01 sends the document as inline data with an untrusted-content instruction and a JSON schema', async () => {
    const { calls, llm } = fake([answer(geminiFixture('case-b-schedule'))]);
    await llm.extract(pdf);
    const req = calls[0]!;
    expect(SYSTEM_INSTRUCTION).toMatch(/untrusted/i);
    expect(req.system_instruction).toBe(SYSTEM_INSTRUCTION);
    expect(req.model).toBe('primary-model');
    expect(req.store).toBe(false);
    const input = req.input as { type: string; data?: string; mime_type?: string; text?: string }[];
    expect(input).toContainEqual({ type: 'document', data: Buffer.from(pdf.bytes).toString('base64'), mime_type: 'application/pdf' });
    const { $schema: _s, ...schema } = z.toJSONSchema(LlmExtractionSchema) as Record<string, unknown>;
    void _s;
    expect(req.response_format).toEqual({ type: 'text', mime_type: 'application/json', schema });
  });

  it('TC-GEM-02 falls back once on 429', async () => {
    const { calls, llm } = fake([apiError(429), answer(geminiFixture('case-b-schedule'))]);
    const r = await llm.extract(pdf);
    expect(calls.map((c) => c.model)).toEqual(['primary-model', 'fallback-model']);
    expect(r.documentType).toBe('policy_schedule');
  });

  it('TC-GEM-03 reports quota or unavailability after the fallback fails', async () => {
    await expect(fake([apiError(429), apiError(429)]).llm.extract(pdf)).rejects.toEqual(new LlmError('AI_QUOTA_EXCEEDED'));
    await expect(fake([apiError(500), apiError(503)]).llm.extract(pdf)).rejects.toEqual(new LlmError('LLM_UNAVAILABLE'));
    await expect(fake([apiError(400)]).llm.extract(pdf)).rejects.toEqual(new LlmError('LLM_UNAVAILABLE'));
  });

  it('TC-GEM-04 rejects output that is not the schema', async () => {
    await expect(fake([{ id: 'x', output_text: 'not json' }]).llm.extract(pdf)).rejects.toEqual(new LlmError('LLM_OUTPUT_INVALID'));
    const extra = { ...(geminiFixture('case-b-schedule') as object), verdict: 'approved' };
    await expect(fake([answer(extra)]).llm.extract(pdf)).rejects.toEqual(new LlmError('LLM_OUTPUT_INVALID'));
  });
});
