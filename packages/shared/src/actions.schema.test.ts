import { describe, expect, it } from 'vitest';
import { SignupInputSchema } from './actions.schema';
import { rejects } from './test-helpers';

describe('Action input schemas', () => {
  it('TC-SH-18 signup lowercases the email and enforces the password rule', () => {
    const ok = SignupInputSchema.parse({ email: ' A@Example.com ', password: 'abcdefg1', adultAttested: true });
    expect(ok.email).toBe('a@example.com');
    rejects(SignupInputSchema, { email: 'a@example.com', password: 'abcdefgh', adultAttested: true });
    rejects(SignupInputSchema, { email: 'a@example.com', password: 'abc1', adultAttested: true });
    rejects(SignupInputSchema, { email: 'a@example.com', password: 'abcdefg1', adultAttested: false });
    rejects(SignupInputSchema, { email: 'not-an-email', password: 'abcdefg1', adultAttested: true });
  });
});
