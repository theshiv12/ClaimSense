import type { ActionResult, ChatReplyView, UploadResultView, WireFact } from '@claimsense/shared';

// The browser's side of the REST API (docs/api.md). Requests go to /api/* on this site; Next rewrites them
// to the API (ADR-009), so the session cookie stays first-party. Same names and ActionResult as the old
// server actions, so components did not change shape.
type R<T> = Promise<ActionResult<T>>;

const call = async <T>(method: string, path: string, body?: unknown): R<T> => {
  try {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return (await res.json()) as ActionResult<T>;
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' };
  }
};
const id = (v: string) => encodeURIComponent(v);

export const signup = (input: unknown): R<null> => call('POST', '/api/auth/signup', input);
export const login = (input: unknown): R<null> => call('POST', '/api/auth/login', input);
export const logout = (): R<null> => call('POST', '/api/auth/logout', {});
export const startSample = (caseId: string): R<{ claimId: string }> => call('POST', `/api/samples/${id(caseId)}`, {});

export const createClaim = (input: unknown): R<{ claimId: string }> => call('POST', '/api/claims', input);
export const deleteClaim = ({ claimId }: { claimId: string }): R<null> => call('DELETE', `/api/claims/${id(claimId)}`);
export const deleteMe = (): R<null> => call('DELETE', '/api/me');

export const confirmFact = ({ claimId, factId }: { claimId: string; factId: string }): R<{ fact: WireFact }> =>
  call('POST', `/api/claims/${id(claimId)}/facts/${id(factId)}/confirm`, {});
export const editFact = ({ claimId, factId, value }: { claimId: string; factId: string; value: unknown }): R<{ fact: WireFact }> =>
  call('PATCH', `/api/claims/${id(claimId)}/facts/${id(factId)}`, { value });
export const addFact = ({ claimId, ...rest }: { claimId: string; key: string; head: string; value: unknown }): R<{ fact: WireFact }> =>
  call('POST', `/api/claims/${id(claimId)}/facts`, rest);


/** Multipart upload; the bytes are read, extracted and discarded by the API (golden rule 9). */
export const uploadAndExtract = async (form: FormData): R<UploadResultView> => {
  const claimId = form.get('claimId');
  const file = form.get('file');
  if (typeof claimId !== 'string' || !(file instanceof Blob)) return { ok: false, code: 'VALIDATION_FAILED' };
  const body = new FormData();
  body.set('file', file, 'document');
  try {
    const res = await fetch(`/api/claims/${id(claimId)}/documents`, { method: 'POST', credentials: 'same-origin', body });
    return (await res.json()) as ActionResult<UploadResultView>;
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR' };
  }
};

/** "Ask about this check" (ADR-010): a grounded answer with its cited sources. Never stored. */
export const askAboutCheck = ({ claimId, ruleId, ...body }: { claimId: string; ruleId: string; question: string; history: { q: string; a: string }[] }): R<ChatReplyView> =>
  call('POST', `/api/claims/${id(claimId)}/checks/${id(ruleId)}/chat`, body);

/** FR-11: "Explain my estimate in simple words", grounded on the whole estimate. */
export const explainEstimate = ({ claimId }: { claimId: string }): R<ChatReplyView> => call('POST', `/api/claims/${id(claimId)}/explain`, {});
