// The test "browser": the cookies the API set, as a browser would keep them, and the client IP it sends.
export interface SetOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  maxAge?: number;
  path?: string;
  expires?: Date;
}

export const jar = {
  values: new Map<string, string>(),
  options: new Map<string, SetOptions>(),
  get(name: string) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set(name: string, value: string, options: SetOptions = {}) {
    this.values.set(name, value);
    this.options.set(name, options);
  },
  delete(name: string) {
    this.values.delete(name);
  },
  clear() {
    this.values.clear();
    this.options.clear();
  },
  /** The Cookie request header for what is in the jar. */
  header() {
    return [...this.values].map(([k, v]) => `${k}=${v}`).join('; ');
  },
  /** Applies Set-Cookie response headers: a past expiry or an empty value deletes the cookie. */
  absorb(setCookie: string[] | string | undefined) {
    for (const line of [setCookie ?? []].flat()) {
      const [pair = '', ...attrs] = line.split(';').map((s) => s.trim());
      const eq = pair.indexOf('=');
      const name = pair.slice(0, eq);
      const value = decodeURIComponent(pair.slice(eq + 1));
      const opts: SetOptions = {};
      for (const a of attrs) {
        const [k = '', v] = a.split('=');
        const key = k.toLowerCase();
        if (key === 'httponly') opts.httpOnly = true;
        else if (key === 'secure') opts.secure = true;
        else if (key === 'samesite') opts.sameSite = (v ?? '').toLowerCase() as SetOptions['sameSite'];
        else if (key === 'path') opts.path = v;
        else if (key === 'expires' && v) opts.expires = new Date(v);
      }
      if (!value || (opts.expires && opts.expires.getTime() <= Date.now())) this.delete(name);
      else this.set(name, value, opts);
    }
  },
};

export const testIp = { value: '10.0.0.1' };
