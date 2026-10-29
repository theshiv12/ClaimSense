import 'server-only';
import type { ActionResult, ErrorCode } from '@claimsense/shared';
import type { z } from 'zod';
import { currentUser, type CurrentUser } from './auth';
import { connectDb } from './db';

export class ActionError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export const fail = (code: ErrorCode): never => {
  throw new ActionError(code);
};

/** Logs the error class only: never facts, quotes, file names or messages (golden rule 6). */
const logInternal = (action: string, err: unknown) => {
  const kind = err instanceof Error ? err.name : typeof err;
  console.error(`[action] ${action} failed: ${kind}`);
};

const run = async <T>(name: string, body: () => Promise<T>): Promise<ActionResult<T>> => {
  try {
    return { ok: true, data: await body() };
  } catch (err) {
    if (err instanceof ActionError) return { ok: false, code: err.code };
    logInternal(name, err);
    return { ok: false, code: 'INTERNAL_ERROR' };
  }
};

/** A server action that needs no session. */
export const publicAction =
  <S extends z.ZodType, T>(name: string, schema: S, handler: (input: z.infer<S>) => Promise<T>) =>
  (raw?: unknown): Promise<ActionResult<T>> =>
    run(name, async () => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return fail('VALIDATION_FAILED');
      await connectDb();
      return handler(parsed.data);
    });

/** A server action for a signed-in user or guest. The session is checked before the input. */
export const userAction =
  <S extends z.ZodType, T>(name: string, schema: S, handler: (user: CurrentUser, input: z.infer<S>) => Promise<T>) =>
  (raw?: unknown): Promise<ActionResult<T>> =>
    run(name, async () => {
      const user = await currentUser();
      if (!user) return fail('AUTH_REQUIRED');
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return fail('VALIDATION_FAILED');
      return handler(user, parsed.data);
    });
