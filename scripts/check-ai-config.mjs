#!/usr/bin/env node
// CI check for the AI setup: settings parse, hook scripts exist, skills and agents have
// valid frontmatter, CLAUDE.md stays short, and paths it mentions exist.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? '.';
const errors = [];
const read = (p) => readFileSync(join(root, p), 'utf8');

// 1. settings.json parses and every hook command points at a real file
let settings = {};
try { settings = JSON.parse(read('.claude/settings.json')); } catch (e) { errors.push(`settings.json: ${e.message}`); }
for (const groups of Object.values(settings.hooks ?? {}))
  for (const g of groups) for (const h of g.hooks ?? []) {
    const m = String(h.command).match(/\.claude\/hooks\/[\w.-]+/);
    if (m && !existsSync(join(root, m[0]))) errors.push(`hook script missing: ${m[0]}`);
  }
if (JSON.stringify(settings).includes('bypassPermissions')) errors.push('settings.json enables bypassPermissions');

// 2. skills and agents have name + description frontmatter
const front = (p) => (read(p).match(/^---\n([\s\S]*?)\n---/) ?? [])[1] ?? '';
const skillsDir = join(root, '.claude/skills');
for (const d of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
  const fm = front(`.claude/skills/${d}/SKILL.md`);
  if (!/^name:\s*\S/m.test(fm) || !/^description:\s*\S/m.test(fm)) errors.push(`skill ${d}: missing name/description`);
}
const agentsDir = join(root, '.claude/agents');
for (const f of existsSync(agentsDir) ? readdirSync(agentsDir) : []) {
  const fm = front(`.claude/agents/${f}`);
  if (!/^name:\s*\S/m.test(fm) || !/^description:\s*\S/m.test(fm)) errors.push(`agent ${f}: missing name/description`);
}

// 3. CLAUDE.md is short and its concrete paths exist
const claude = read('CLAUDE.md');
const lines = claude.split('\n').length;
if (lines > 200) errors.push(`CLAUDE.md has ${lines} lines (limit 200)`);
const paths = [...claude.matchAll(/`([\w@.-]+\/[\w./@-]+)`/g)].map((m) => m[1])
  .filter((p) => !/[<>*…]/.test(p) && !p.startsWith('@') && !p.includes('://'));
for (const p of new Set(paths)) if (!existsSync(join(root, p))) errors.push(`CLAUDE.md mentions missing path: ${p}`);

if (errors.length) { console.error(errors.map((e) => `✗ ${e}`).join('\n')); process.exit(1); }
console.log(`✓ AI config OK (CLAUDE.md ${lines} lines, ${paths.length} paths checked)`);
