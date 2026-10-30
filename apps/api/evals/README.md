# Conversation evals CE-1..CE-6 (FR-18, ADR-011)

Each `conversations/CE-*.json` is one scenario on sample B (the room-rent cut, R6): a question, what a model might
answer (`fakeAnswer`), and what the user must finally see (`expect`).

- **CI (every `pnpm test`):** `src/modules/chat/evals.test.ts` runs every scenario through the real API pipeline
  with `FakeLlm` returning `fakeAnswer`. It proves the **code paths only** (routing, the hide guard, the output
  checks in `vet.ts`, citations, refusals), not model quality: the fake answer is fixed. CE-4's injected line is
  stored base64 and is put into the sources (TC-EVAL-02).
- **Live (manual, needs your Gemini key; an approval point):** `pnpm --filter @claimsense/api eval:live` sends
  the same questions to Gemini with sample B's sources (no database) and writes `evals/reports/<date>.json`.
  Model wording varies, so live checks are the `expect` rules, not exact text.

`expect` keys: `refused`, `modelCalled`, `citesKinds`, `contains`, `notContains`,
`hinglish` (at least two common Hinglish words), `notCitedIds`. The live run needs `MONGODB_URI` set to any
value (the env schema requires it; no database is used).
