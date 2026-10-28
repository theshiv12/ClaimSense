---
name: new-rule
description: Step-by-step workflow for adding or changing a ClaimSense rule end to end (spec, config, code, tests, remedies, review).
argument-hint: [rule-id] [short name]
disable-model-invocation: true
---

# Add or change a rule: $ARGUMENTS

Follow these steps in order. Stop and ask the human at each **checkpoint**.

1. **Spec first.** Update `docs/rules-spec.md`: inputs, logic, results, which side of
   each boundary is inclusive, and the clause it cites. Show the diff.
   **Checkpoint:** human approves the spec.
2. **Config.** If the rule needs new plan values, extend
   `packages/shared/src/plan-config.schema.ts` and add the values to every file in
   `config/plans/`, each with a `ClauseRef` `{ clauseId, page, quote, source }`. Missing in a wording → `null`.
3. **Tests before code.** Use the `rules-test-generator` skill for this rule. Tests
   should fail at this point.
4. **Implement** in `packages/rules/src/rules/r<N>-<name>.ts` (R6–R8 take `(facts, plan, runningPaise)`). Pure function, no I/O,
   values only from the plan config. Wire it into the engine's rule list and the payable
   order if it changes amounts.
5. **Cases.** Run `pnpm cases`. If an expected result in `fixtures/cases` should change,
   explain why. **Checkpoint:** human approves any change to an expected result.
6. **Remedies.** Add entries for the rule to `config/remedies.json`: what the assistant
   asks, possible fixes, and the "can't be fixed" message. The remedies panel shows them
   on the estimate screen.
7. **Review.** Run the `code-reviewer` agent and fix or justify its findings.
8. **Log.** If the AI got something wrong along the way, add an `AI_LOG.md` entry.
