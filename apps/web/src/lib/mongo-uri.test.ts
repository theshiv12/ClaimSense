import { describe, expect, it } from 'vitest';
import { MONGO_URI_PROBLEMS, mongoUriHint, mongoUriProblem } from './mongo-uri';

describe('mongoUriProblem', () => {
  it('TC-ENV-01 a well-formed URI passes', () => {
    expect(mongoUriProblem('mongodb+srv://u:p@cluster0.example.net/?retryWrites=true')).toBeNull();
    expect(mongoUriProblem('mongodb://localhost:27017')).toBeNull();
  });

  it('TC-ENV-02 a missing value is empty', () => {
    expect(mongoUriProblem(undefined)).toBe('empty');
    expect(mongoUriProblem('')).toBe('empty');
  });

  it('TC-ENV-03 text before the scheme is bad_scheme', () => {
    expect(mongoUriProblem('mongodb_uri = mongodb+srv://u:p@h.net/')).toBe('bad_scheme');
  });

  it('TC-ENV-04 stray or curly quotes are quoted', () => {
    expect(mongoUriProblem('“mongodb+srv://u:p@h.net/”')).toBe('quoted');
    expect(mongoUriProblem('"mongodb+srv://u:p@h.net/')).toBe('quoted');
  });

  it('TC-ENV-05 spaces around the value are surrounding_space', () => {
    expect(mongoUriProblem(' mongodb+srv://u:p@h.net/')).toBe('surrounding_space');
  });

  it('TC-ENV-06 unencoded password characters are unencoded_password', () => {
    for (const pass of ['p@ss', 'p/ss', 'p#ss', 'p:ss', 'p%zz']) {
      expect(mongoUriProblem(`mongodb+srv://u:${pass}@h.net/`)).toBe('unencoded_password');
    }
    expect(mongoUriProblem('mongodb+srv://u:p%40ss@h.net/')).toBeNull();
  });

  it('TC-ENV-07 no host is no_host', () => {
    expect(mongoUriProblem('mongodb+srv://u:p@/')).toBe('no_host');
  });

  it('TC-ENV-08 the hint names the variable and never the value', () => {
    for (const problem of MONGO_URI_PROBLEMS) {
      const hint = mongoUriHint(problem);
      expect(hint).toContain('MONGODB_URI');
      expect(hint).not.toContain('h.net');
    }
  });
});
