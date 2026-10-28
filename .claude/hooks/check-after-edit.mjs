#!/usr/bin/env node
// PostToolUse hook for Edit|Write|MultiEdit.
// Lints the edited TypeScript file, and re-runs the rules-engine tests when a
// rule, plan config or remedy entry changes. On failure it exits 2 so the
// output is shown to Claude (the edit itself has already happened).

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || input?.cwd || process.cwd();
const filePath = String(input?.tool_input?.file_path ?? '');
if (!filePath || !existsSync(join(root, 'package.json'))) process.exit(0); // not scaffolded yet

const rel = relative(root, filePath).split('\\').join('/');
const failures = [];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', shell: true, timeout: 120_000 });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

// 1. Lint the file that changed.
if (/\.(ts|tsx)$/.test(rel)) {
  const lint = run('pnpm', ['exec', 'eslint', '--fix', `"${rel}"`]);
  if (!lint.ok) failures.push(`ESLint failed for ${rel}:\n${lint.out.slice(-3000)}`);
}

// 2. Rules engine, plan configs and remedies must stay green.
if (/^(packages\/(rules|shared)\/|config\/plans\/|config\/remedies\.json|fixtures\/cases\/)/.test(rel)) {
  const tests = run('pnpm', ['--filter', '@claimsense/rules', 'exec', 'vitest', 'run', '--silent']);
  if (!tests.ok) failures.push(`Rules tests failed after editing ${rel}:\n${tests.out.slice(-3000)}`);
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n\n')}\n`);
  process.exit(2);
}
process.exit(0);
