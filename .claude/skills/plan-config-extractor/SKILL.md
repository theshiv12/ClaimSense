---
name: plan-config-extractor
description: Turns a health-insurance policy wording PDF into a draft ClaimSense plan config (JSON) where every value carries its clause id and a verbatim quote, for a human to verify. Use when adding a new plan or a new wording version.
argument-hint: [path to policy wording PDF]
---

# Extract a plan config from a policy wording

The output is a **draft**. A human checks every value against the PDF before it is used.
Wrong values here produce wrong verdicts for real people, so precision beats coverage.

## Rules

- Use **only** the PDF given. Never fill a value from memory, from another plan, or from
  general IRDAI rules. If the wording does not state it, the value is `null` with a note.
- Every value carries `clauseId` (as printed in the wording, e.g. `3(2)`, `Excl 02`) and
  `quote` (the exact sentence, copied, not paraphrased).
- Tables that look garbled (common in PDFs): extract what you can, set
  `"needsReview": true`, and describe the problem in `note`.
- Record the plan's **UIN** and **wording version/date** exactly as printed. Versions
  matter: older wordings may differ from the 2024 IRDAI Master Circular
  (e.g. a 48-month PED wait instead of 36).

## Steps

1. Read the schema in `packages/shared/src/plan-config.schema.ts`.
2. Read the PDF fully. Find, at minimum:
   - insurer, plan name, UIN, version/date
   - initial waiting period and its exemptions
   - specific-disease waiting period and the full disease/procedure list
   - PED waiting period
   - room-rent and ICU limits (by sum insured if tiered) and the proportionate-deduction
     clause with its exclusions
   - co-payment rules (age at entry, zones, etc.)
   - sum insured options and any restore/recharge benefit
   - the moratorium clause, if stated
   - pre- and post-hospitalisation day limits
3. Write the draft to `config/plans/drafts/<insurer>-<plan>-<version>.json`. It must
   parse against the schema.
4. Produce a review checklist in the chat, one line per value:
   `[ ] <field> = <value> — clause <id> — "<first 12 words of quote>…"`
   with `needsReview` items first.

## After human review

The human ticks every line, fixes values, then moves the file from `drafts/` to
`config/plans/` and commits it with the message `plan: add <plan> <version> (verified)`.
Do not move the file yourself.
