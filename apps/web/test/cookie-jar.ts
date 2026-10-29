// In-memory stand-in for next/headers cookies() (test/setup.ts mocks the module with it).
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
};

/** The client IP the fake request comes from (x-forwarded-for); random per test. */
export const testIp = { value: '10.0.0.1' };
