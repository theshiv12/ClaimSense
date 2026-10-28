---
name: rules-test-generator
description: Writes Vitest tests for one ClaimSense rule (R1-R8) from the rules spec and plan config, covering boundary dates, missing facts, exemptions, negative cases and plan-version differences. Use when a rule is added or changed, or when the QA agent reports missing rule tests.
argument-hint: [rule-id, e.g. R3]
---

# Generate tests for a rule

The goal is tests that would **catch a wrong implementation**, so expected values must
come from the spec and config, never from the code under test.

## 1. Gather the source of truth

Read, in this order:
- `docs/rules-spec.md`: the section for the rule (inputs, logic, result values).
- `config/plans/*.json`: every plan config. Note the values this rule reads
  (waiting months, caps, percentages, disease lists, clause ids) and how they differ
  between plans and wording versions.
- `packages/shared/src/` facts and `RuleResult` types.
- `packages/rules/src/rules/` the rule's file: only its **signature and exports**. Do not
  read the body to decide expected results.

## 2. Write the test plan first

Before any code, output this table, then continue:

| # | Scenario | Facts that matter | Plan | Expected outcome | Spec reference |
|---|---|---|---|---|---|

Cover, where the rule allows:
- **Boundaries:** the day before, the day of, the day after each limit (e.g. exactly
  24 months of cover). State which side is inclusive, quoting the spec.
- **Missing facts:** each required fact absent → outcome `unknown`, never `pass`.
- **Exemptions:** accident, porting credit, more than 12 months of continuous cover.
- **Plan differences:** same facts on two plans or two wording versions give different
  results where the config differs (e.g. PED wait 48 vs 36 months).
- **Negative and odd input:** zero or very large amounts, admission before policy start,
  dates in the future, age exactly at a threshold (e.g. 61 for co-pay).
- **Money:** integer paise; rounding stated in the spec.

If the spec is silent or ambiguous on a scenario, do not invent the answer: list it under
**Spec questions** for the human and skip that test.

## 3. Write the tests

- File: `packages/rules/src/rules/__tests__/<rule-file-name>.test.ts`.
- Build facts with the helpers in `packages/rules/test/factories.ts` (create the helper if
  missing; keep it tiny).
- One `it()` per table row. The test name states the scenario and the expected outcome.
- Add a comment on each test citing the spec line or plan config key it checks.
- No snapshots for rule outcomes; assert outcome, amount and `clauseId` explicitly.

## 4. Run and report

Run `pnpm --filter @claimsense/rules test`. Then report:
- tests written and how many pass or fail;
- for each failure, whether the **code** or the **test** looks wrong, with the spec quote;
- the **Spec questions** list.

Never change an expected value just to make a failing test pass. A failing test may be
the point. Remind the human to review the tests before committing, and suggest an
`AI_LOG.md` entry if a test exposed an AI-written bug.
