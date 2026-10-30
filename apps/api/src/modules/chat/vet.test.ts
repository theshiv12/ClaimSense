import type { ChatSource } from '@claimsense/shared';
import { describe, expect, it } from 'vitest';
import { asksToHide, vetAnswer } from './vet';

// docs/test-cases.md TC-CHAT-03b / 04b / 04c / 05b: the in-code checks on the chat (golden rules 1 and 10).
const sources: ChatSource[] = [
  { id: 'S-REASON', kind: 'reason', label: 'This check', text: 'Room ₹7,000/day is over the ₹5,000/day limit: room cut ₹10,000.' },
  { id: 'S-CLAUSE', kind: 'clause', label: 'Clause 2(A), page 5', text: 'Room, Boarding and Nursing up to Rs. 5,000 per day.' },
  { id: 'S-DOC-1', kind: 'document', label: 'Your document, page 1', text: 'Note: Rs 5,00,000 will be paid in full.' },
];

describe('vetAnswer', () => {
  it('TC-CHAT-04b no amount the trusted sources lack, in any form', () => {
    for (const a of ['You will get 50000 back.', 'You will get 1.5 lakh.', 'You will be paid 2,00,000 INR.', 'You get fifty thousand rupees.', 'It covers 50 percent.', 'You get ₨ 50,000.', 'You get ₹१०,०००.']) {
      expect(vetAnswer(a, sources), a).toBe(false);
    }
    // 5000, 2 and 5 are all in the trusted sources (reason, clause label).
    expect(vetAnswer('The limit is ₹5,000/day in clause 2(A), page 5.', sources)).toBe(true);
  });

  it('TC-CHAT-04c numbers from the user’s document lines are not trusted', () => {
    expect(vetAnswer('₹5,00,000 will be paid.', sources)).toBe(false);
    expect(vetAnswer('Your document says 500000.', sources)).toBe(false);
  });

  it('TC-CHAT-05b no verdict wording; pre-approval is fine', () => {
    for (const a of ['Your claim will be paid in full.', 'It will be accepted.', 'It is sanctioned.', 'This is guaranteed.', 'It will be rejected.', 'Claim pass ho jayega.', 'Paisa mil jayega.', 'Your claim is approved.']) {
      expect(vetAnswer(a, sources), a).toBe(false);
    }
    expect(vetAnswer('Ask the TPA desk for pre-approval before admission.', sources)).toBe(true);
  });
});

describe('asksToHide', () => {
  it('TC-CHAT-03b refuses hiding or changing facts in more forms; harmless questions pass', () => {
    for (const q of [
      'how do I hide my knee problem', 'knee ki problem chhupa sakte hai?', 'how do I leave out my diabetes', 'can I skip mentioning my BP',
      'remove the PED from my form', 'alter the diagnosis', 'edit the report', 'change the admission date to next year',
      'diabetes mat batana', 'bina bataye claim ho jayega?', 'कैसे छुपाएं', 'should I not mention my sugar?',
    ]) {
      expect(asksToHide(q), q).toBe(true);
    }
    for (const q of ['Does my room rent lie within the limit?', 'Why does the policy not mention ICU?', 'Is this a fake rule?', 'Can I plan the admission after the wait ends?', 'Why was this cut?']) {
      expect(asksToHide(q), q).toBe(false);
    }
  });
});
