# packages/rules: rules for this folder

- **Pure engine.** No I/O, no clock (`today` is an input), no network, no SDKs, no `node:*`,
  `fs`, `next` or `mongoose` imports in `src/` (ESLint enforces it; test helpers may read JSON).
- Input: `ClaimFacts` (null = unknown) + `PlanConfig`. Output: `RuleResult[]` + `Estimate`.
- Values come **only** from the plan config, each with its `ClauseRef`. No numbers about the
  policy in code.
- Money in integer paise; percentages in basis points; dates `YYYY-MM-DD` compared as calendar dates.
- Order: R1–R5 eligibility, then non-payables, then R6 → R7 → R8 on the running amount.
- A missing fact gives `unknown`, never `pass`.
- Coverage gate: lines/functions/statements 100%, branches 95%.
- Expected amounts in tests are worked out **by hand** with the arithmetic in a comment.
  The canonical worked example is Case B in `docs/rules-spec.md`.
