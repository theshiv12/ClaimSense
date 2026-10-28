# @claimsense/shared

Zod schemas and inferred types shared by `apps/web` and `packages/rules`:
`Fact`, `LlmExtraction` (flat, every field required: the schema sent to Gemini),
`ClaimFacts`, `PlanConfig` + `ClauseRef`, `RuleResult`, `Estimate`, `ErrorCode`,
and money/date primitives (`PaiseSchema`, `BpsSchema`, `IsoDateSchema`).

Starting definitions: `docs/reference/nest-plan/05-schemas-and-data.md` (the Zod part still applies).
Scaffolded in PR #2.
