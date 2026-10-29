# TDD log

Red → green pairs from `git log` (generated 29 Oct 2026). Each red commit holds only tests (and test-case
rows in `docs/test-cases.md`); the green commit after it makes them pass without changing assertions.
Exceptions are listed under *Honest notes*.

| Tests | Red | Green | Branch |
|---|---|---|---|
| TC-SH-01..05 schemas | `689d8ff` | `ef8c7e1` | `feat/shared-schemas` |
| TC-SH-06..10 draft plan config schema | `599e5b8` | `739edec` | `feat/shared-schemas` |
| TC-SH-11..16 facts, extraction, room tiers, loadable plans, remedies | `f75a8f9` | `7b497b3` | `feat/shared-schemas` |
| TC-SH-17 review fixes for facts, tiers, loadable plans, remedies | `783613c` | `4e931e4` | `feat/shared-schemas` |
| TC-R1..R8, TC-ENG, TC-CASE | `b2f8391` | `a304bce` | `feat/rules-engine` |
| TC-R6-09..16, TC-TCF, TC-SIM room tiers, toClaimFacts, simulator | `05111ec` | `a304bce` | `feat/rules-engine` |
| TC-TCF-07..09, TC-ENG-07, TC-R6-23 review fixes | `0b8edcb` | `f88a66c` | `feat/rules-engine` |
| TC-AUTH-01..08, TC-OWN-01..04, TC-ACT-01..06, TC-SH-18 backend | `9a1a150` | `d4f8590` | `feat/backend` |
| TC-AUTH-09..12, TC-ACT-07 and ownership additions from review | `023ed3c` | `d06458a` | `feat/backend` |
| TC-QV, TC-NORM, TC-GEM, TC-EXT, TC-INJ extraction | `8701d36` | `4bae919` | `feat/extraction` |
| TC-QV-07..09, TC-NORM-05, TC-EXT-11..13 extraction review fixes | `9c3326d` | `1024e8b` | `feat/extraction` |
| TC-UI-01..07 format, PayoutBar, CheckRow, RoomSimulator, FactRow | `0188380` | `b58d4db` | `feat/ui` |
| TC-UI-08, TC-AUTH-13 UI review fixes | `6e267f1` | `36e7f55` | `feat/ui` |

## Honest notes

- `ef6ec01`/`b2f8391` (rules red) was written before this run and rebased onto the Phase A commits.
- `edge-cases.test.ts` (TC-R2-09/10, TC-R3-14..16, TC-R4-09, TC-R6-17..22, TC-R7-06, TC-ENG-06, TC-SIM-04) was
  added in the green commit `a304bce` to reach the coverage gate, so those cases were never red.
- TC-E2E-01..03 (`60ce362`) were written after the screens and passed on their first run.
- Three test files had **type-only** or call-shape edits after red, never assertion changes: TC-SH-12 cast,
  two `as unknown as` casts in Phase C tests, and TC-SMOKE-03 awaiting the async home page.
- TC-EXT-12's expected paise value was wrong by ×100 in the red commit (my arithmetic). It was corrected with
  the working in a comment; the behaviour under test (`verification: 'none'`) did not change. See `AI_LOG.md`.
- Review fixes each got their own red → green pair after the `code-reviewer` agent ran on the phase.
