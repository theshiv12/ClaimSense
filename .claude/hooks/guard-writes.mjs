#!/usr/bin/env node
// PreToolUse hook for Edit|Write|MultiEdit.
// Blocks (exit 2) writes that would add secrets, touch real .env files,
// or log health data. The message on stderr goes back to Claude.

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // never block on a parse problem in the hook itself
}

const toolInput = input?.tool_input ?? {};
const filePath = String(toolInput.file_path ?? '');
const name = basename(filePath);

// Collect every piece of text this tool call would write.
const chunks = [toolInput.content, toolInput.new_string];
if (Array.isArray(toolInput.edits)) {
  for (const e of toolInput.edits) chunks.push(e?.new_string);
}
const text = chunks.filter((c) => typeof c === 'string').join('\n');

const problems = [];

// 1. Real env files are written by the human, never by the AI.
if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
  problems.push(
    `Writing ${name} is blocked. Put the variable name in .env.example and ask the human to set the value.`,
  );
}

// 2. Secret-looking values.
const secretPatterns = [
  [/sk-ant-[A-Za-z0-9_-]{10,}/, 'an Anthropic API key'],
  [/AIza[0-9A-Za-z_-]{35}/, 'a Google (Gemini) API key'],
  [/AKIA[0-9A-Z]{16}/, 'an AWS access key'],
  [/ghp_[A-Za-z0-9]{30,}/, 'a GitHub token'],
  [/mongodb(\+srv)?:\/\/[^\s:@/]+:[^\s@/]+@/, 'a MongoDB URI with a password'],
  [/AccountKey=[A-Za-z0-9+/=]{20,}/, 'an Azure storage account key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
];
for (const [re, label] of secretPatterns) {
  if (re.test(text)) {
    problems.push(`Looks like ${label}. Read it from process.env and document the name in .env.example.`);
  }
}

// 3. Health data in logs (CLAUDE.md golden rule 6).
const logOfHealthData =
  /(console\.(log|info|debug|warn|error)|logger\.\w+|this\.logger\.\w+)\([^)]*\b(facts?|diagnosis|diagnoses|icd\w*|medicalHistory|extractedText|rawText|documentText|sourceQuote|rawValue)\b/;
if (logOfHealthData.test(text)) {
  problems.push(
    'This logs health data (facts, diagnosis or document text). Log ids and error codes only.',
  );
}

if (problems.length > 0) {
  process.stderr.write(
    `guard-writes blocked a write to ${filePath || '(unknown file)'}:\n- ${problems.join('\n- ')}\n`,
  );
  process.exit(2);
}
process.exit(0);
