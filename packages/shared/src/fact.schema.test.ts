import { describe, it } from 'vitest';
import { FactSchema } from './fact.schema';
import { accepts, rejects } from './test-helpers';

// Golden rule 3: value, status, source, documentId, sourceQuote, page, confidence, verification.
const docFact = (patch: Record<string, unknown> = {}) => ({
  key: 'admission_date',
  head: 'none',
  value: '2026-11-18',
  status: 'found',
  source: 'document',
  documentId: 'doc-1',
  sourceQuote: 'Date of admission: 18/11/2026',
  page: 1,
  confidence: 'high',
  verification: 'exact',
  confirmedByUser: false,
  ...patch,
});

const userFact = {
  key: 'is_accident',
  head: 'none',
  value: false,
  status: 'found',
  source: 'user-stated',
  documentId: null,
  sourceQuote: null,
  page: null,
  confidence: 'high',
  verification: 'none',
  confirmedByUser: true,
};

describe('Fact', () => {
  it('TC-SH-11 keeps every fact traceable and typed by its key', () => {
    accepts(FactSchema, docFact());
    accepts(FactSchema, userFact);
    accepts(FactSchema, docFact({ key: 'sum_insured', value: 30_000_000, sourceQuote: 'Sum Insured Rs. 3,00,000' }));
    accepts(FactSchema, docFact({ key: 'bill_line_item', head: 'implants', value: 10_500_000 }));
    accepts(FactSchema, docFact({ key: 'diagnosis', status: 'not_found', value: null, sourceQuote: null, page: null, verification: 'none' }));

    rejects(FactSchema, docFact({ documentId: null }));
    rejects(FactSchema, docFact({ value: null }));
    rejects(FactSchema, docFact({ value: '18/11/2026' }));
    rejects(FactSchema, docFact({ key: 'sum_insured', value: 1.5 }));
    rejects(FactSchema, docFact({ key: 'is_accident', value: 'yes' }));
    rejects(FactSchema, docFact({ key: 'bill_line_item', head: 'none', value: 100 }));
    rejects(FactSchema, docFact({ confidence: 'certain' }));
    rejects(FactSchema, docFact({ verification: 'maybe' }));
  });
});
