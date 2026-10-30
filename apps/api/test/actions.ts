import type { ActionResult, ChatReplyView, CurrentUserView, Estimate, UploadResultView, WireFact } from '@claimsense/shared';
import { result, send, upload } from './http';

// The server actions the tests were written against (docs/test-cases.md), now as calls to the REST API
// (docs/api.md). Same names and the same ActionResult, so every test keeps its assertions.
// A path cannot leave an id out. A missing or non-string id is sent as a 65-character segment, which fails
// the same shared `Id` schema (1–64 chars) the action input did, so it is still VALIDATION_FAILED.
const MISSING_ID = 'x'.repeat(65);
const idOf = (input: unknown, key: string) => {
  const v = (input as Record<string, unknown> | null | undefined)?.[key];
  return typeof v === 'string' && v !== '' ? encodeURIComponent(v) : MISSING_ID;
};
const without = (input: unknown, ...keys: string[]) =>
  input && typeof input === 'object' ? Object.fromEntries(Object.entries(input).filter(([k]) => !keys.includes(k))) : input;

type R<T = unknown> = Promise<ActionResult<T>>;
const call = async <T>(method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: unknown): R<T> => result<T>(await send(method, path, body));

export const signup = (input?: unknown): R<null> => call('post', '/api/auth/signup', input ?? null);
export const login = (input?: unknown): R<null> => call('post', '/api/auth/login', input ?? null);
export const logout = (): R<null> => call('post', '/api/auth/logout', {});
export const startSample = (input?: unknown): R<{ claimId: string }> => call('post', `/api/samples/${idOf(input, 'caseId')}`, {});

export const createClaim = (input?: unknown): R<{ claimId: string }> => call('post', '/api/claims', input ?? null);
export const deleteClaim = (input?: unknown): R<null> => call('delete', `/api/claims/${idOf(input, 'claimId')}`);
export const deleteMe = (): R<null> => call('delete', '/api/me');

export const confirmFact = (input?: unknown) => call<{ fact: WireFact }>('post', `/api/claims/${idOf(input, 'claimId')}/facts/${idOf(input, 'factId')}/confirm`, {});
export const editFact = (input?: unknown) => call<{ fact: WireFact }>('patch', `/api/claims/${idOf(input, 'claimId')}/facts/${idOf(input, 'factId')}`, without(input, 'claimId', 'factId'));
export const addFact = (input?: unknown) => call<{ fact: WireFact }>('post', `/api/claims/${idOf(input, 'claimId')}/facts`, without(input, 'claimId'));

export const runCheck = (input?: unknown) => call<{ estimate: Estimate }>('post', `/api/claims/${idOf(input, 'claimId')}/estimate`, {});
export const simulateRoom = (input?: unknown) => call<{ estimate: Estimate }>('post', `/api/claims/${idOf(input, 'claimId')}/simulate-room`, without(input, 'claimId'));

/** The upload the facts page sends: FormData with claimId and file, as multipart to the documents endpoint. */
export const uploadAndExtract = async (form: FormData) => {
  const claimId = form.get('claimId');
  const file = form.get('file');
  const path = `/api/claims/${idOf({ claimId }, 'claimId')}/documents`;
  if (!(file instanceof File)) return result<UploadResultView>(await send('post', path, {}));
  return result<UploadResultView>(await upload(path, new Uint8Array(await file.arrayBuffer()), file.name, file.type || 'application/octet-stream'));
};

/** The signed-in user (or guest) for the jar's cookie, or null. */
export const currentUser = async (): Promise<CurrentUserView | null> => {
  const r = await call<CurrentUserView | null>('get', '/api/auth/me');
  return r.ok ? r.data : null;
};

/**
 * The sample button: POST to start a sample, then go to its estimate. Mirrors the web's redirect so
 * TC-ACT-08 keeps its shape: rejects with a `digest` naming the target, like Next's redirect().
 */
export const openSample = async (form: FormData): Promise<never> => {
  const r = await startSample({ caseId: form.get('caseId') });
  const target = r.ok ? `/claims/${r.data.claimId}` : r.code === 'RATE_LIMITED' ? '/?sample=busy' : '/';
  throw Object.assign(new Error('redirect'), { digest: `NEXT_REDIRECT;replace;${target};307;` });
};

/** "Ask about this check" (ADR-010): one grounded question about one rule of one claim. */
export const askAboutCheck = (claimId: string, ruleId: string, body: unknown): R<ChatReplyView> =>
  call('post', `/api/claims/${encodeURIComponent(claimId)}/checks/${encodeURIComponent(ruleId)}/chat`, body);
