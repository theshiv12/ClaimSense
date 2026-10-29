import { expect } from 'vitest';

interface Parser {
  safeParse(value: unknown): { success: boolean };
}

export const accepts = (schema: Parser, value: unknown) =>
  expect(schema.safeParse(value).success, `should accept ${JSON.stringify(value)}`).toBe(true);

export const rejects = (schema: Parser, value: unknown) =>
  expect(schema.safeParse(value).success, `should reject ${JSON.stringify(value)}`).toBe(false);
