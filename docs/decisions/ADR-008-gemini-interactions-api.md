# ADR-008: Gemini Interactions API for extraction

**Status:** accepted by the autopilot run (29 Oct 2026).

**Finding (read from the installed `@google/genai@2.31.0` README and type definitions, not from memory):**
the SDK README steers new code to the **Interactions API** (`ai.interactions.create`). On the
`models.generateContent` config, `responseMimeType` / `responseSchema` are marked *"Deprecated: Use
`response_format` instead."* An interaction takes `input` as content blocks, including
`{ type: 'document', data: <base64>, mime_type: 'application/pdf' }` and `{ type: 'image', … }`, plus
`system_instruction`, `response_format: { type: 'text', mime_type: 'application/json', schema }` and
`store`. The text result is `interaction.output_text`. The schema supports a subset of JSON Schema;
`minLength`/`maxLength` are ignored, so Zod re-validates the output in code.

**Decision**
- `apps/web/src/server/gemini.ts` calls `ai.interactions.create` with the document inline (never a file
  upload), a system instruction saying the document is untrusted data, the JSON schema from
  `z.toJSONSchema(LlmExtractionSchema)` (flat, all-required, strict), and `store: false`.
- On 429 or 5xx it retries once on `GEMINI_MODEL_FALLBACK`. Two 429s → `AI_QUOTA_EXCEEDED`; otherwise
  `LLM_UNAVAILABLE`; output that fails Zod → `LLM_OUTPUT_INVALID`.
- The SDK call sits behind an injected `create` function, so tests drive the adapter with no network.
- A document whose text contains instructions aimed at an AI gets the `DOCUMENT_HAS_INSTRUCTIONS`
  warning, and all its facts are `verification: 'none'` (they need the user's check).

**Not verified:** no live call was made (the autopilot does not read `.env` or spend the free quota).
The Gemini fixtures in `apps/web/test/fixtures/gemini/` are **hand-written** in the response shape and
labelled as such. Before the demo: upload the two `fixtures/docs/*SAMPLE.pdf` files in `pnpm dev`, check that
the facts appear, and if the free tier rejects the Interactions API, switch `create` to
`ai.models.generateContent` with `responseJsonSchema` (one function in `gemini.ts`).
