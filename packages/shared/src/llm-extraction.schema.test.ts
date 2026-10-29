import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LlmExtractionSchema } from './llm-extraction.schema';
import { accepts, rejects } from './test-helpers';

// ADR-003: the model returns a flat, all-required JSON object; code checks the quotes.
const item = (patch: Record<string, unknown> = {}) => ({
  key: 'sum_insured',
  head: 'none',
  valueText: 'Rs. 3,00,000/-',
  status: 'found',
  sourceQuote: 'Sum Insured: Rs. 3,00,000/-',
  page: 1,
  confidence: 'high',
  ...patch,
});
const extraction = (items: unknown[]) => ({ documentType: 'policy_schedule', facts: items });

describe('LlmExtraction', () => {
  it('TC-SH-12 is flat and all-required', () => {
    accepts(LlmExtractionSchema, extraction([item(), item({ key: 'diagnosis', status: 'not_found', valueText: '', sourceQuote: '', page: 0 })]));
    accepts(LlmExtractionSchema, extraction([]));

    const { sourceQuote: _omit, ...missing } = item();
    void _omit;
    rejects(LlmExtractionSchema, extraction([missing]));
    rejects(LlmExtractionSchema, extraction([item({ key: 'favourite_colour' })]));
    rejects(LlmExtractionSchema, { facts: [item()] });

    const json = z.toJSONSchema(LlmExtractionSchema) as {
      required: string[];
      properties: { facts: { items: { required: string[]; properties: Record<string, unknown> } } };
    };
    const items = json.properties.facts.items;
    expect(json.required).toEqual(expect.arrayContaining(['documentType', 'facts']));
    expect([...items.required].sort()).toEqual(Object.keys(items.properties).sort());
    expect(JSON.stringify(json)).not.toMatch(/anyOf|oneOf/);
  });
});
