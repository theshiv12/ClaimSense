import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import { builtinModules } from 'node:module';
import tseslint from 'typescript-eslint';

const WEB = 'apps/web/**/*.{js,mjs,ts,tsx}';
const GENAI = {
  group: ['@google/genai', '@google/genai/*'],
  message: 'Only apps/web/src/server/gemini.ts talks to Gemini (CLAUDE.md golden rule 8).',
};
const MONGOOSE = {
  group: ['mongoose', 'mongoose/*'],
  message: 'Only server code (apps/web/src/server/**) may use mongoose.',
};

// Keep each Next entry's own files/ignores, but only inside apps/web.
const inWeb = (globs) => globs?.map((g) => `apps/web/${g}`);
const scopeToWeb = (config) => {
  if (config.files) return { ...config, files: inWeb(config.files) };
  if (config.rules || config.plugins) return { ...config, files: [WEB] };
  return { ...config, ignores: inWeb(config.ignores) }; // ignores-only entry
};

// A later no-restricted-imports block replaces an earlier one, so the blocks below never overlap.
export default defineConfig(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/coverage/**', '**/dist/**', '**/next-env.d.ts'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  // Next.js rules, scoped to the web app.
  ...nextVitals.map(scopeToWeb),
  { files: [WEB], settings: { next: { rootDir: 'apps/web/' } } },

  // packages/rules is a pure engine: no I/O, no framework, no SDKs.
  {
    files: ['packages/rules/src/**/*.ts'],
    ignores: ['packages/rules/src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            'node:*',
            ...builtinModules.flatMap((m) => [m, `${m}/*`]),
            'next',
            'next/*',
            'mongoose',
            'mongoose/*',
            '@google/genai',
            '@google/genai/*',
          ],
          message: 'packages/rules is pure: no I/O, frameworks or SDKs (packages/rules/CLAUDE.md).',
        }],
      }],
    },
  },

  // apps/web outside src/server: neither Gemini nor mongoose.
  {
    files: [WEB],
    ignores: ['apps/web/src/server/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [GENAI, MONGOOSE] }] },
  },

  // apps/web/src/server: mongoose is fine, Gemini only in gemini.ts.
  {
    files: ['apps/web/src/server/**/*.{js,mjs,ts,tsx}'],
    ignores: ['apps/web/src/server/gemini.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [GENAI] }] },
  },
);
