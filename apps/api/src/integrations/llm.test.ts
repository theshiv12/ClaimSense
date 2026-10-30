import { afterEach, describe, expect, it } from 'vitest';
import { getLlm } from './llm';

// docs/test-cases.md TC-LLM-01: the e2e fake can never answer real users.
const KEYS = ['LLM_FAKE', 'GEMINI_API_KEY', 'NODE_ENV', 'RENDER', 'VERCEL', 'RAILWAY_ENVIRONMENT', 'VITEST'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});
const withEnv = (vars: Partial<Record<(typeof KEYS)[number], string>>) => {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
};

describe('getLlm and LLM_FAKE', () => {
  it('TC-LLM-01 the e2e fake runs only with an e2e key, never on a deploy', async () => {
    withEnv({ LLM_FAKE: '1', GEMINI_API_KEY: 'e2e-not-a-real-key' });
    expect(typeof (await getLlm()).answer).toBe('function');
    for (const env of [
      { LLM_FAKE: '1', GEMINI_API_KEY: 'AIzaRealLookingKey' },
      { LLM_FAKE: '1', GEMINI_API_KEY: 'e2e-not-a-real-key', NODE_ENV: 'production' },
      { LLM_FAKE: '1', GEMINI_API_KEY: 'e2e-not-a-real-key', RENDER: 'true' },
      { LLM_FAKE: '1', GEMINI_API_KEY: 'e2e-not-a-real-key', VERCEL: '1' },
      { LLM_FAKE: '1', GEMINI_API_KEY: 'e2e-not-a-real-key', RAILWAY_ENVIRONMENT: 'production' },
    ]) {
      withEnv(env);
      await expect(getLlm(), JSON.stringify(env)).rejects.toThrow(/LLM_FAKE/);
    }
  });
});
