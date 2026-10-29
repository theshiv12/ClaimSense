/** Only same-site paths are allowed after sign-in (no open redirect to another site). */
export const safeNext = (next: string | string[] | undefined): string => {
  const n = Array.isArray(next) ? next[0] : next;
  return n && /^\/(?!\/)[\w\-/[\]?=&%.]*$/.test(n) ? n : '/claims';
};
