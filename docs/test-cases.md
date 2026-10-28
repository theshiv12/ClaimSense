# Test cases

Written **before** the tests and the code, from `docs/prd.md` and `docs/rules-spec.md`,
and approved by a human. Every automated test name starts with its ID here, so each
requirement can be traced: FR → test case → test → commit.

## Template

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|

Type: Unit · API · Contract (recorded LLM output) · Eval (conversation) · UI

---

## Example: R3 specific-disease waiting period (Star FHO)

Given for all rows: Star Family Health Optima, policy first started 10 Jan 2025,
24-month list includes cataract (clause 3(2)).

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|
| TC-R3-01 | R3 | Cataract, no accident | Admission 9 Jan 2027 (one day short of 24 months) | Fail, cites clause 3(2) | Unit |
| TC-R3-02 | R3 | Same | Admission 10 Jan 2027 (exactly 24 months) | Pass: months are inclusive (`docs/rules-spec.md`, Boundaries) | Unit |
| TC-R3-03 | R3 | Same | Admission 11 Jan 2027 | Pass | Unit |
| TC-R3-04 | R3 | Cataract caused by an accident | Admission at 14 months | Pass (accident exemption) | Unit |
| TC-R3-05 | R3 | Appendicitis (not on the list) | Admission at 3 months | R3 not applicable (pass) | Unit |
| TC-R3-06 | R3 | Diagnosis missing | Any date | Unknown, never pass | Unit |
| TC-R3-07 | R3 | Ported: 12 months on old policy + 13 months on this one | Admission now | Pass (25 months continuous) | Unit |
| TC-R3-08 | R3 | Same facts as TC-R3-01 on plan 2 | Admission at 14 months | Follows plan 2's own list and period | Unit |

## Scaffold smoke tests (PR #2)

These IDs replace the `TC-SMOKE-*` cases in `docs/setup.md` (superseded NestJS plan).

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|
| TC-SMOKE-01 | `packages/shared` loads and validates money | `PaiseSchema` | Parse 100, 1.5 and -1 | 100 is accepted; 1.5 and -1 are rejected (money is integer paise) | Unit |
| TC-SMOKE-02 | `packages/rules` loads and resolves `@claimsense/shared` | The rules package | Import `RULE_IDS` and `PaiseSchema` | `RULE_IDS` is R1…R8 in order; `PaiseSchema` parses 0 | Unit |
| TC-SMOKE-03 | `apps/web` renders under Vitest | The home page | Render it to static HTML | It has an `<h1>` containing "ClaimSense" | Unit |

## Shared schemas: `packages/shared` (approved 28 Oct 2026)

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|
| TC-SH-01 | Money, percentages and dates have one exact form (CLAUDE.md coding standards) | `PaiseSchema`, `BpsSchema`, `IsoDateSchema` | Parse each value | Paise: 0 and 24000000 pass; 1.5, −1, `"100"` fail. Bps: 0, 2000, 10000 pass; −1, 10001, 12.5 fail. IsoDate: `2026-11-18`, `2028-02-29` pass; `2026-02-29`, `2026-11-18T00:00:00Z`, `18/11/2026` fail | Unit |
| TC-SH-02 | Every plan value traces to a clause (golden rule 2) | `ClauseRefSchema` | Parse a valid ref and broken variants | `{ clauseId: '3(2)', page: 12, quote: ≥ 20 chars, source: 'wording' }` passes; `'regulation'` passes; optional `needsReview`/`note` pass. Quote < 20 chars, page 0, `source: 'memory'`, missing `clauseId` fail | Unit |
| TC-SH-03 | Plan config holds every R1–R8 value plus non-payables, each with its clause | A complete synthetic plan (made-up values) | Parse it, then mutate one field at a time | Fixture passes. Fail: no `nonPayableHeads`; unknown `roomRent.kind`; `fixed_per_day` with fractional `capPaise`; co-pay tier 10001 bps; `initialWait` without clause; unknown head in `excludedHeads` | Unit |
| TC-SH-04 | Unknown is a legal fact value: null, never guessed (golden rule 4) | `ClaimFactsSchema` | Parse all-null facts, Case B, then bad variants | All-null (empty `lineItems`) and Case B pass. Fail: rent 7000.5 paise; admission `18-11-2026`; line item head `food`; missing `ped` object | Unit |
| TC-SH-05 | Results are internally consistent; errors are a closed set | `RuleResultSchema`, `EstimateSchema`, `ErrorCode` | Parse valid and broken values | RuleResult: `unknown` + `missingFacts: ['admission_date']` passes; `unknown` + empty `missingFacts` fails; `pass` + `deductionPaise: 100` fails; `deduction` + `deductionPaise: 0` fails. Estimate: Case B (24000000 claimed, 20580000 payable, 3420000 out of pocket, 960000 non-payable, `likely_partial`, 8 results) passes; 7 results fails. ErrorCode: every code in `docs/api.md` plus `INTERNAL_ERROR` passes; `FORBIDDEN` fails | Unit |

**Decisions taken with this table:** `nonPayableHeads` is `{ heads: BillHead[], clause: ClauseRef }`;
`RoomCategory` is `general | shared | single | deluxe | suite | icu`; `ClauseRef` has optional
`needsReview`/`note` (drafts only); `Estimate` has `nonPayablePaise`; the RuleResult invariants are
enforced by the schema; `ErrorCode` adds `INTERNAL_ERROR`. See `docs/rules-spec.md`, "Schema decisions".

## Draft plan configs: `DraftPlanConfigSchema` (approved 28 Oct 2026)

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|
| TC-SH-06 | A fully extracted plan is a valid draft | The TC-SH-03 synthetic plan with `verifiedBy: null` (a draft is never verified) | Parse with `DraftPlanConfigSchema` | Accepted, output equals input. The same plan with `verifiedBy: 'test'` is rejected | Unit |
| TC-SH-07 | A gap is allowed when it is flagged | `pedWait.months: null` with a not-stated clause (`clauseId`/`page`/`quote`/`source` null, `needsReview: true`, note) | Parse with the draft and strict schemas | Draft accepts, strict rejects. Also accepted: `roomRent.kind: 'unknown'` with a flagged clause; `conditions: null` under a found clause flagged with a note; `[]` for a list the wording says is empty; `uin: null` with a top-level `notes` entry | Unit |
| TC-SH-08 | A gap must be flagged | As TC-SH-07 but with the flag missing | Parse with the draft schema | Rejected: `needsReview` missing; `note` missing or `""`; a null value under a found clause without `needsReview`; `kind: 'unknown'` with an unflagged clause; `uin: null` with no `notes` | Unit |
| TC-SH-09 | No half-filled clause refs | A ref with a quote but `page: null`; a ref with `page: 12` and a quote under 20 chars | Parse with `DraftClauseRefSchema` and inside a draft | Both rejected: a ref is fully found or fully not stated | Unit |
| TC-SH-10 | Nullability doesn't loosen ranges | Draft with co-pay 10001 bps; `initialWait.days` −1; unknown `BillHead`; `optionsPaise: [1.5]` | Parse with the draft schema | Each rejected | Unit |

**Decisions taken with this table:** `null` means the wording is silent, `[]` means the wording says none;
`roomRent.kind: 'unknown'` exists in drafts only; `uin`/`wordingVersion` may be null in a draft with an
entry in top-level `notes`; `verifiedBy` is always `null` in a draft; values are nullable one at a time,
never a whole section, and the section's clause carries the flag and note. The loader keeps the strict
`PlanConfigSchema`, so a draft can never be loaded.
