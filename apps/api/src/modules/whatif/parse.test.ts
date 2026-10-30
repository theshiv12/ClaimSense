import { describe, expect, it } from 'vitest';
import { parseWhatIf } from './parse';

// docs/test-cases.md TC-WIP-*: what-if questions are recognised in code (FR-17), never by the model.
describe('parseWhatIf', () => {
  it('TC-WIP-01 accident, in English and Hinglish', () => {
    expect(parseWhatIf('What if it was an accident?')).toEqual({ label: 'it was an accident', patch: { isAccident: true } });
    expect(parseWhatIf('agar accident hota toh?')).toEqual({ label: 'it was an accident', patch: { isAccident: true } });
  });

  it('TC-WIP-02 a room type with a rent per day', () => {
    expect(parseWhatIf('what if we take twin sharing at 4500?')).toEqual({ label: 'twin sharing at ₹4,500/day', patch: { room: { category: 'shared', rentPerDayPaise: 450_000 } } });
    expect(parseWhatIf('What if general ward at ₹2,000 per day')).toEqual({ label: 'general ward at ₹2,000/day', patch: { room: { category: 'general', rentPerDayPaise: 200_000 } } });
    expect(parseWhatIf('what if general ward?')).toBeNull(); // no rent: nothing to compute
  });

  it('TC-WIP-03 an admission date, or after the waiting period', () => {
    expect(parseWhatIf('what if admitted on 12/03/2027?')).toEqual({ label: 'admission on 12 Mar 2027', patch: { admissionDate: '2027-03-12' } });
    expect(parseWhatIf('what if I get admitted after the waiting period ends?')).toEqual({ label: 'admission after the waiting period', afterWait: true, patch: {} });
  });

  it('TC-WIP-04 the condition was declared', () => {
    expect(parseWhatIf('what if the condition was declared?')).toEqual({ label: 'the condition was declared', patch: { pedDisclosed: true } });
  });

  it('TC-WIP-05 a sum insured', () => {
    expect(parseWhatIf('what if my sum insured was 5 lakh?')).toEqual({ label: 'sum insured ₹5,00,000', patch: { sumInsuredPaise: 50_000_000 } });
  });

  it('TC-WIP-06 anything else is not a what-if', () => {
    for (const q of ['Why was this cut?', 'Which clause is this?', 'what if I lie about it', 'If the hospital charges more?']) expect(parseWhatIf(q), q).toBeNull();
  });
});
