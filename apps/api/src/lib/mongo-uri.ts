// Names what is wrong with MONGODB_URI without ever echoing it: the URI holds a password.
export const MONGO_URI_PROBLEMS = [
  'empty',
  'surrounding_space',
  'quoted',
  'bad_scheme',
  'unencoded_password',
  'no_host',
] as const;
export type MongoUriProblem = (typeof MONGO_URI_PROBLEMS)[number];

const QUOTE = /^["'“”‘’`]|["'“”‘’`]$/;
const SCHEME = /^mongodb(\+srv)?:\/\//;
// Characters the driver rejects unencoded in the user or password, and a % not starting an escape.
const BAD_USERINFO = /[@/?#[\]]|%(?![0-9A-Fa-f]{2})/;

export const mongoUriProblem = (uri: string | undefined): MongoUriProblem | null => {
  if (!uri) return 'empty';
  if (uri !== uri.trim()) return 'surrounding_space';
  if (QUOTE.test(uri)) return 'quoted';
  if (!SCHEME.test(uri)) return 'bad_scheme';
  const rest = uri.replace(SCHEME, '');
  // Credentials end at the last @ before the query string; an @ inside the query is not a password.
  const query = rest.indexOf('?');
  const at = rest.lastIndexOf('@', query >= 0 ? query : rest.length);
  if (at >= 0) {
    const userinfo = rest.slice(0, at);
    const colon = userinfo.indexOf(':');
    const password = colon >= 0 ? userinfo.slice(colon + 1) : '';
    if (BAD_USERINFO.test(userinfo) || password.includes(':')) return 'unencoded_password';
  }
  const host = rest.slice(at + 1).split(/[/?]/)[0];
  return host ? null : 'no_host';
};

const HINTS: Record<MongoUriProblem, string> = {
  empty: 'MONGODB_URI is not set. Paste the Atlas "Connect → Drivers" string into apps/api/.env.local.',
  surrounding_space: 'MONGODB_URI has spaces around the value. Write MONGODB_URI=mongodb+srv://… with nothing else on the line.',
  quoted: 'MONGODB_URI has a stray or curly quote. Use plain " on both ends, or no quotes at all.',
  bad_scheme:
    'MONGODB_URI must start with mongodb+srv:// or mongodb://. Remove anything before it (for example "mongodb_uri = ").',
  unencoded_password:
    'MONGODB_URI user or password has a character that must be URL-encoded: @ → %40, : → %3A, / → %2F, # → %23, ? → %3F, % → %25.',
  no_host: 'MONGODB_URI has no host after the @.',
};

export const mongoUriHint = (problem: MongoUriProblem): string => HINTS[problem];
