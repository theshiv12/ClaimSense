import { describe, expect, it } from 'vitest';
import { verifyQuote } from './quote-verify';

const pages = ['Policy Period From 12/03/2026 To 11/03/2027\nSum Insured (Rs.) 3,00,000\nType of cover Floater, continuous renewal'];

describe('verifyQuote', () => {
  it('TC-QV-01 is exact ignoring case, spacing and ligatures', () => {
    expect(verifyQuote('sum insured  (RS.)\n3,00,000', pages)).toBe('exact');
    expect(verifyQuote('Type of cover Floater, continuous', ['Type of cover Floater, continuous'])).toBe('exact');
    expect(verifyQuote('Deﬁnitions apply', ['Definitions apply'])).toBe('exact');
  });

  it('TC-QV-02 is fuzzy with a typo or dropped punctuation', () => {
    expect(verifyQuote('Policy Period From 12/03/2026 To 11/03/2027 Sum Insurred', pages)).toBe('fuzzy');
    expect(verifyQuote('Type of cover Floater continuous renewal', pages)).toBe('fuzzy');
  });

  it('TC-QV-03 is none for an invented quote', () => {
    expect(verifyQuote('Sum Insured Rs. 99,00,00,000', pages)).toBe('none');
  });

  it('TC-QV-04 is unverifiable without a text layer', () => {
    expect(verifyQuote('Sum Insured (Rs.) 3,00,000', null)).toBe('unverifiable');
  });

  it('TC-QV-05 is none for an empty quote', () => {
    expect(verifyQuote('', pages)).toBe('none');
    expect(verifyQuote('   ', pages)).toBe('none');
  });

  it('TC-QV-06 needs an exact match for a short quote', () => {
    expect(verifyQuote('Sum Insurd', pages)).toBe('none');
    expect(verifyQuote('Sum Insured', pages)).toBe('exact');
  });
});
