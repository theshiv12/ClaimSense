# Sample cases

Synthetic only. `<case>/case.json` holds the facts; `<case>/expected.json` holds the expected estimate,
worked out by hand (see Case B in `docs/rules-spec.md`). `pnpm cases` diffs the engine's output against them.

| Case | Story | Expected |
|---|---|---|
| A | Day-to-day admission inside the 30-day initial wait | at_risk (R2 fail) |
| B | Knee replacement, Single AC over the room cap | likely_partial, ₹2,05,800 of ₹2,40,000 |
| C | Cataract inside the 24-month specific-disease wait | at_risk (R3 fail) |
| D | Appendicitis, room within cap, no co-pay | likely_payable |
