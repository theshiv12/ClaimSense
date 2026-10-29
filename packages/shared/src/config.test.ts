import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LoadablePlanConfigSchema } from './plan-config.schema';
import { RemediesCatalogSchema } from './remedies.schema';

// Committed config must always load: every plan, and the remedy catalog (golden rules 2 and 10).
const root = new URL('../../../config/', import.meta.url);
const read = (path: string): unknown => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const planFiles = readdirSync(new URL('plans/', root)).filter((f) => f.endsWith('.json'));

// Outcomes each rule can return besides pass (docs/rules-spec.md): R5's missing fact → not applicable.
const OUTCOMES: Record<string, string[]> = {
  R1: ['fail', 'unknown'], R2: ['fail', 'unknown'], R3: ['fail', 'unknown'], R4: ['fail', 'unknown'],
  R5: ['fail'], R6: ['deduction', 'unknown'], R7: ['deduction', 'unknown'], R8: ['deduction', 'unknown'],
};

describe('Committed config', () => {
  it('TC-SH-15 every plan and the remedy catalog parse, with 2–3 remedies per outcome', () => {
    expect(planFiles.length).toBeGreaterThan(0);
    for (const f of planFiles) {
      const r = LoadablePlanConfigSchema.safeParse(read(`plans/${f}`));
      expect(r.success, `${f}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
    const catalog = RemediesCatalogSchema.parse(read('remedies.json'));
    for (const [ruleId, outcomes] of Object.entries(OUTCOMES)) {
      for (const outcome of outcomes) {
        const n = catalog.remedies.filter((r) => r.ruleId === ruleId && r.outcome === outcome).length;
        expect(n, `${ruleId} ${outcome}`).toBeGreaterThanOrEqual(2);
        expect(n, `${ruleId} ${outcome}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('TC-SH-16 no remedy helps hide or change medical facts, or promises approval', () => {
    const catalog = RemediesCatalogSchema.parse(read('remedies.json'));
    const banned = /\b(hide|conceal|back-?date|change the diagnosis|don't disclose|do not disclose|approved)\b/i;
    for (const r of catalog.remedies) expect(`${r.title} ${r.body}`, r.id).not.toMatch(banned);
  });
});
