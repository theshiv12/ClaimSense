#!/usr/bin/env node
// PreToolUse hook for Bash. Exit 2 blocks the command; stderr goes back to Claude.
import { readFileSync } from 'node:fs';

let cmd = '';
try {
  cmd = String(JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? '');
} catch {
  process.exit(0); // never block on a parse problem in the hook itself
}

const SAFE_RM = /^(\.\/)?([\w.-]+\/)*(dist|coverage|node_modules|\.next|playwright-report|test-results)\/?$/;
const problems = [];

for (const part of cmd.split(/&&|\|\||;|\n/)) {
  const s = part.trim();
  if (/^git\s+push\b/.test(s)) {
    if (/\s(--force(?!-with-lease)|-f)(\s|$)/.test(s)) problems.push('force-push');
    if (/\s(origin\s+)?(HEAD:)?(main|master)(\s|$)/.test(s)) problems.push('push to main (open a PR instead)');
  }
  if (/--no-verify\b/.test(s)) problems.push('--no-verify skips the secret scan and tests');
  const rm = s.match(/^rm\s+(.*)$/);
  if (rm) {
    const args = rm[1].split(/\s+/);
    const flags = args.filter((a) => a.startsWith('-')).join('');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (/r/i.test(flags) && /f/.test(flags) && !targets.every((t) => SAFE_RM.test(t)))
      problems.push(`rm -rf outside build folders (${targets.join(' ')})`);
  }
  if (/\b(cat|less|more|head|tail|grep|source|\.)\s+[^|]*\.env(\.(?!example)\w+)?(\s|$)/.test(s))
    problems.push('reading a real .env file');
  if (/\b(dropDatabase|deleteMany\(\s*\{\s*\}\s*\)|\.drop\(\s*\))/.test(s)) problems.push('dropping MongoDB data');
  if (/\baz\s+storage\s+(container|blob)\s+delete/.test(s)) problems.push('deleting Azure storage');
  if (/\bgh\s+(repo\s+delete|pr\s+merge)/.test(s)) problems.push('gh repo delete / pr merge (a human merges)');
  if (/\b(curl|wget)\b.*\|\s*(sh|bash|zsh)\b/.test(cmd)) problems.push('piping a download into a shell');
}

if (problems.length) {
  console.error(`Blocked by .claude/hooks/guard-bash.mjs: ${[...new Set(problems)].join('; ')}. Ask the human to do this if it is really needed.`);
  process.exit(2);
}
process.exit(0);
