# Conversation evals CE-1..CE-6 (FR-18, ADR-011)

Each `conversations/CE-*.json` is one scenario on sample B (the room-rent cut, R6): a question, what a model might
answer (`fakeAnswer`), and what the user must finally see (`expect`).

- **CI (every `pnpm test`):** `src/modules/chat/evals.test.ts` runs every scenario through the real API pipeline
  with `FakeLlm` returning `fakeAnswer`. It proves the code paths: routing (what-if, hide guard), the output
  checks (`vet.ts`), citations and refusals.
- **Live (manual, needs your Gemini key; an approval point):** `pnpm --filter @claimsense/api eval:live` sends
  the same questions to Gemini with sample B's sources (no database) and writes `evals/reports/<date>.json`.
  Model wording varies, so live checks are the `expect` rules, not exact text.

`expect` keys: `kind` (answer | whatif), `refused`, `modelCalled`, `citesKinds`, `contains`, `notContains`,
`hinglish` (the answer uses common Hinglish words).
