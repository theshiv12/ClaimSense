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

## Rules engine R1–R8, waterfall, verdict, cases (approved 28 Oct 2026)

Rule, engine and verdict tests use the synthetic plan **T** (`packages/rules/test/factories.ts`), built
from the rules-spec starting values: initial wait 30 days (accidents exempt); specific-disease wait
24 months (accidents exempt; cataract `H25`, joint replacement `M17`); PED 36 months; moratorium 60 months;
room cap `fixed_per_day` 500000, no ICU cap; excluded heads implants, pharmacy, diagnostics; non-payable
consumables; co-pay 2000 bps from age at entry 61. Only TC-CASE-* read `config/plans/star-fho.json`.
`I` = first inception 2025-01-10. Amounts in paise. TC-R3-01..08 above are part of this set.

| ID | Scenario | Facts that matter | Plan | Expected | Spec ref |
|---|---|---|---|---|---|
| TC-R1-01 | Day before start | policy 2026-03-12..2027-03-11; adm 2026-03-11 | T | fail | R1 |
| TC-R1-02 | On start | adm 2026-03-12 | T | pass (inclusive) | R1 |
| TC-R1-03 | On end | adm 2027-03-11 | T | pass (inclusive) | R1 |
| TC-R1-04 | Day after end | adm 2027-03-12 | T | fail | R1 |
| TC-R1-05 | Missing | policyEndDate null | T | unknown, missing `policy_end_date` | R1 |
| TC-R2-01 | Day 29 | adm 2025-02-08, no accident | T | fail, cites `initialWait.clause` | Boundaries: days |
| TC-R2-02 | Day 30 | adm 2025-02-09 | T | pass | Boundaries: days |
| TC-R2-03 | Day 31 | adm 2025-02-10 | T | pass | R2 |
| TC-R2-04 | Accident inside wait | day 5, isAccident true | T | pass | R2 |
| TC-R2-05 | Accident, plan doesn't exempt | day 5, isAccident true | T, `accidentExempt: false` | fail | plan difference |
| TC-R2-06 | Accident unknown inside wait | day 5, isAccident null | T | unknown | R2 |
| TC-R2-07 | Accident unknown after wait | day 31, isAccident null | T | pass | R2 |
| TC-R2-08 | Missing inception | firstInceptionDate null | T | unknown | R2 |
| TC-R3-09 | Month 23 | cataract, adm 2026-12-10 | T | fail | Boundaries: months |
| TC-R3-10 | Month 25 | cataract, adm 2027-02-10 | T | pass | R3 |
| TC-R3-11 | Month-end clamp, day before | I 2024-02-29, adm 2026-02-27 | T | fail | Boundaries: month-end |
| TC-R3-12 | Month-end clamp, on the date | I 2024-02-29, adm 2026-02-28 | T | pass | Boundaries: month-end |
| TC-R3-13 | Keyword match only | "Total knee joint replacement", icd10 null, month 14 | T | fail | Q6 |
| TC-R4-01 | Month 35 | PED diagnosed 2024-06-01; adm 2027-12-10 | T | fail, cites `pedWait.clause` | Boundaries |
| TC-R4-02 | Month 36 | adm 2028-01-10 | T | pass | Boundaries |
| TC-R4-03 | Month 37 | adm 2028-02-10 | T | pass | R4 |
| TC-R4-04 | PED diagnosed after inception | diagnosed 2025-06-01, month 5 | T | pass | R4 |
| TC-R4-05 | No PED | exists false | T | pass | R4 |
| TC-R4-06 | PED unknown | exists null | T | unknown | R4 |
| TC-R4-07 | PED date unknown inside wait | exists true, date null, month 20 | T | unknown | R4 |
| TC-R4-08 | Plan difference | month 40 (2028-05-10) | T vs T with 48 months | pass vs fail | V.19 wording says 48 |
| TC-R5-01 | Month 59, PED not disclosed | adm 2029-12-10 | T | fail | R5, Q1 |
| TC-R5-02 | Month 60 | adm 2030-01-10 | T | pass | R5, Q1 |
| TC-R5-03 | Month 61 | adm 2030-02-10 | T | pass | R5, Q1 |
| TC-R5-04 | PED disclosed | disclosed true, month 40 | T | pass, applicable false | R5 |
| TC-R5-05 | Disclosure unknown | disclosed null, month 40 | T | pass, applicable false | R5 missing → not applicable |
| TC-R6-01 | Rent at cap | rent 500000 × 1; room 500000 | T | pass, 0 | R6 |
| TC-R6-02 | 1 paise over | rent 500001 × 1; room 500001; nursing 100000 | T | deduction 2 | R6, Rounding |
| TC-R6-03 | Rounding row | rent 700000 × 1; room 700000; nursing 1000 | T | deduction 200286 | Rounding |
| TC-R6-04 | Excluded heads in full | rent 700000 × 1; room 700000; implants 1000000; pharmacy 50000; diagnostics 30000 | T | deduction 200000 | R6 |
| TC-R6-05 | Case B room numbers | Case B without consumables | T | deduction 2460000 | Case B |
| TC-R6-06 | Rent missing | rent null | T | unknown | R6 |
| TC-R6-07 | Days missing | days null | T | unknown | R6 |
| TC-R6-08 | No cap | rent 700000 | T, `kind: 'none'` | pass, applicable false | plan difference |
| TC-R7-01 | Age 60 | running 20580000 | T | pass, 0 | R7 |
| TC-R7-02 | Age 61 | running 20580000 | T | deduction 4116000 | R7 |
| TC-R7-03 | Rounding row | age 61, running 1234567 | T | deduction 246913 | Rounding |
| TC-R7-04 | Age missing | ageAtEntry null | T | unknown | R7 |
| TC-R7-05 | No co-pay | age 70 | T, `tiers: []` | pass, 0 | plan difference |
| TC-R8-01 | At SI | SI 30000000, used 0, running 30000000 | T | pass, 0 | R8 |
| TC-R8-02 | 1 paise over | running 30000001 | T | deduction 1 | R8 |
| TC-R8-03 | Partly used, at limit | used 10000000, running 20000000 | T | pass | R8 |
| TC-R8-04 | Partly used, 1 over | running 20000001 | T | deduction 1 | R8 |
| TC-R8-05 | SI missing | sumInsuredPaise null | T | unknown | R8 |
| TC-R8-06 | SI used missing | sumInsuredUsedPaise null | T | unknown | R8 |
| TC-ENG-01 | Waterfall order | Case B bill, age 61, SI 15000000 | T | 24000000 → −960000 → R6 −2460000 → R7 −4116000 → R8 −1464000 = 15000000; out of pocket 9000000 | Order |
| TC-ENG-02 | Non-payables removed, not proportioned | Case B | T | nonPayablePaise 960000; R6 base 23040000 | Order |
| TC-ENG-03 | Eligibility fail → 0 | Case B, adm I + 10 days | T | payable 0; payableIfEligible 20580000; out of pocket 24000000 | Order |
| TC-ENG-04 | Shape | Case B | T | 8 results R1..R8; clauses from the plan; waterfall R6, R7, R8; parses as `Estimate` | EstimateSchema |
| TC-ENG-05 | No non-payable heads | Case B | T, `heads: []` | nonPayablePaise 0; R6 base 24000000 | plan difference |
| TC-VERDICT-01 | Eligible, payable = claimed | Case D | T | likely_payable | Verdict |
| TC-VERDICT-02 | Eligible, payable < claimed | Case B | T | likely_partial | Verdict |
| TC-VERDICT-03 | Full amount but R6 unknown | Case D, rent null | T | likely_partial | Verdict, Q3 |
| TC-VERDICT-04 | R4 unknown | Case D, ped.exists null | T | at_risk | Verdict |
| TC-VERDICT-05 | R2 fail | Case A | T | at_risk | Verdict |
| TC-CASE-A | Inside initial wait | `fixtures/cases/A` | star-fho | claimed 1000000; payable 0; payableIfEligible 1000000; out of pocket 1000000; at_risk (R2 fail) | README |
| TC-CASE-B | Knee replacement, Single AC | `fixtures/cases/B` | star-fho | claimed 24000000; non-payables 960000; R6 2460000; payable 20580000; out of pocket 3420000; likely_partial | Case B |
| TC-CASE-C | Cataract inside 24 months | `fixtures/cases/C` | star-fho | claimed 4000000; payable 0; payableIfEligible 4000000; at_risk (R3 fail) | README |
| TC-CASE-D | Appendicitis within cap | `fixtures/cases/D` | star-fho | claimed = payable = 8000000; out of pocket 0; likely_payable | README |

**Decisions taken with this table** (also in `docs/rules-spec.md`): see "Engine decisions (28 Oct 2026)".
## Shared schemas, part 2: facts, extraction, room tiers, loadable plans, remedies (autopilot, 29 Oct 2026)

Written by the autopilot run (`AUTOPILOT.md`), not yet approved by a human. See ADR-007.

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|
| TC-SH-11 | Every fact is traceable (golden rule 3) | `FactSchema` | Parse a document fact, a user-stated fact and broken variants | Document fact with quote, page, `documentId`, `verification: 'exact'` passes; user-stated fact with no document passes. Fail: `source: 'document'` without `documentId`; `status: 'found'` with `value: null`; a date key with value `18/11/2026`; a money key with 1.5; a boolean key with `"yes"`; `bill_line_item` with head `none` | Unit |
| TC-SH-12 | Model output is flat and all-required (ADR-003) | `LlmExtractionSchema` and its JSON schema | Parse a valid extraction, one with a missing field, one with an extra key; build `z.toJSONSchema` | Valid passes; missing `sourceQuote` fails; unknown `key` fails; the JSON schema lists every item property under `required` and has no `anyOf`/`oneOf` | Unit |
| TC-SH-13 | Room cap can depend on the sum insured (Star FHO 2(A)) | `roomRent.kind: 'by_sum_insured'` | Parse tiers | Per-day and room-category tiers pass. Fail: no tiers; a per-day tier with fractional paise; an unknown room category | Unit |
| TC-SH-14 | A plan with an unreviewed value is never loaded (rules-spec "Schema decisions") | `LoadablePlanConfigSchema` | Parse a plan, then the same plan with one `needsReview: true` | First passes, second fails | Unit |
| TC-SH-15 | Every committed plan and the remedy catalog parse | `config/plans/*.json`, `config/remedies.json` | Parse each file | Every plan parses with `LoadablePlanConfigSchema`; remedies parse with `RemediesCatalogSchema`; each of R1–R8 has 2–3 remedies for each outcome it can return besides `pass` | Unit |
| TC-SH-16 | Remedies never help hide or change medical facts (golden rule 10) | `config/remedies.json` | Scan every title and body | No remedy says "hide", "conceal", "back-date"/"backdate", "change the diagnosis", "don't disclose" or "approved" | Unit |
| TC-SH-17 | Review fixes (code-reviewer, Phase A) | Fact, plan and remedy schemas | Parse broken variants | Fail: a found document fact with no `sourceQuote` or `page`; a user-stated fact with `verification: 'exact'`; room tiers not in ascending `minSumInsuredPaise`; a loadable plan with `needsReview: false` present; two remedies with the same id | Unit |

## Rules engine, part 2: room tiers, toClaimFacts, room simulator (autopilot, 29 Oct 2026)

Written by the autopilot run; not yet human-approved. Plan T variants as noted; amounts in paise.

| ID | Scenario | Facts that matter | Plan | Expected | Spec ref |
|---|---|---|---|---|---|
| TC-R6-09 | SI tier ₹3 lakh = Case B | Case B room lines, SI 30000000 | T with tiers 1L→200000, 3L→500000, 5L→single | deduction 2460000 | ADR-007 |
| TC-R6-10 | SI tier ₹2 lakh | SI 20000000; rent 300000 × 1; room 300000; nursing 30000 | same | room 100000 + nursing 30000 − floor(30000 × 2/3) = 10000 → 110000 | ADR-007 |
| TC-R6-11 | Category tier, room allowed | SI 50000000; single 700000 × 1 | same | pass, 0 | ADR-007 |
| TC-R6-12 | Category tier, room above | SI 50000000; deluxe 900000 × 1 | same | unknown, missing `room_category` | ADR-007 |
| TC-R6-13 | Tier needs SI | SI null | same | unknown, missing `sum_insured` | ADR-007 |
| TC-R6-14 | SI below every tier | SI 5000000 | same | unknown, missing `sum_insured` | ADR-007 |
| TC-R6-15 | ICU with no ICU cap | category icu, rent 2000000 | T (fixed, `icuCapPaise` null) | pass, 0 | Engine decision 5 |
| TC-R6-16 | % of SI per day | SI 30000000, 100 bps → 300000/day; rent 400000 × 1; room 400000 | T with `pct_of_si_per_day` 100 | deduction 100000; SI null → unknown | R6 |
| TC-TCF-01 | Verified fact is usable | found, exact, high | n/a | value used | Usable facts |
| TC-TCF-02 | Unverified or low confidence → null | verification none; or fuzzy + low | n/a | null | Usable facts |
| TC-TCF-03 | Confirmed or user-stated is usable | verification none + confirmedByUser; source user-stated | n/a | value used | Usable facts |
| TC-TCF-04 | User correction wins | document fact + user-corrected fact, same key | n/a | user-corrected value | Usable facts |
| TC-TCF-05 | Line items | 3 usable `bill_line_item` facts, 1 unusable | n/a | 3 line items; totalPaise from `bill_total` | Usable facts |
| TC-TCF-06 | Nothing known | no facts | n/a | every field null, empty line items | Usable facts |
| TC-SIM-01 | Twin sharing ₹4,500/day on Case B | Case B, shared 450000 | T | claimed 22750000; payable 21790000; out of pocket 960000 | Case B simulator |
| TC-SIM-02 | Simulator does not change the input | Case B | T | original facts unchanged | Case B simulator |
| TC-SIM-03 | Simulator with unknown days | Case B, days null | T | R6 unknown, likely_partial | R6 |
| TC-R2-09 | Admission missing | admissionDate null | T | unknown, missing `admission_date` | R2 |
| TC-R2-10 | Admission before inception | adm 2025-01-09 | T | fail, `R2_BEFORE_INCEPTION` | Engine decision 7 |
| TC-R3-14 | Listed, inception missing | cataract, firstInceptionDate null | T | unknown, missing `first_inception_date` | R3 |
| TC-R3-15 | Listed, plan doesn't exempt accidents | cataract + accident, month 14 | T, `accidentExempt: false` | fail | plan difference |
| TC-R3-16 | Listed, accident unknown inside wait | cataract, isAccident null, month 14 | T | unknown, missing `is_accident` | R3 |
| TC-R4-09 | PED, inception missing | exists true, firstInceptionDate null | T | unknown, missing `first_inception_date` | R4 |
| TC-R6-17 | ICU with an ICU cap | icu 2000000 × 1; icu line 2000000 | T, `icuCapPaise` 1000000 | deduction 1000000 (icu head at cap) | Engine decision 5 |
| TC-R6-18 | % plan, ICU with no ICU % | icu, rent 2000000 | T, pct 100 bps, `icuBps` null | pass | Engine decision 5 |
| TC-R6-19 | Tier plan, ICU with a cap | SI 30000000, icu 1500000 × 1 | tiers, `icuCapPaise` 1000000 | deduction 500000 | ADR-007 |
| TC-R6-20 | Category tier, category missing | SI 50000000, category null | tiers | unknown, missing `room_category` | ADR-007 |
| TC-R6-21 | Over cap but nothing to cut | rent 700000; only implants on the bill | T | pass, 0 | R6 |
| TC-R6-22 | Empty bill | no line items | T | unknown, missing `bill_line_item` | Engine decision 8 |
| TC-R7-06 | Two co-pay tiers | age 80; tiers 61 → 2000, 76 → 3000; running 1000000 | T variant | deduction 300000 (highest tier that applies) | R7 |
| TC-ENG-06 | Stated total above the line items | Case D with totalPaise 8100000 | T | claimed 8100000 (an `other` line of 100000) | Engine |
| TC-SIM-04 | Simulator edge cases | ICU stay moved to a shared room; no room line; total null | T | room line replaced; others kept; total stays null | Simulator |
| TC-TCF-07 | A user correction replaces a document line item | document `room` 3500000 + user-corrected `room` 2500000 | n/a | one `room` line of 2500000 | Usable facts (review fix) |
| TC-TCF-08 | Conflicting document values are unknown | two usable document `admission_date` facts with different values | n/a | null; a user fact resolves it | Golden rule 4 (review fix) |
| TC-TCF-09 | Same head in two documents is not added twice | `implants` from doc-1 and doc-2, no user fact | n/a | no line items (bill unknown) | Usable facts (review fix) |
| TC-ENG-07 | An unitemised amount makes R6 unknown | Case D with totalPaise 8100000 | T | R6 unknown, likely_partial | Engine decision 10 (review fix) |
| TC-R6-23 | ICU line with no room category | category null, `icu` line | T | unknown, missing `room_category` | Engine decision 11 (review fix) |

## Backend: data, auth, ownership, server actions (autopilot, 29 Oct 2026)

Written by the autopilot run; not yet human-approved. mongodb-memory-server, no network, `next/headers`
cookies faked in memory. "A" and "B" are two signed-up users.

| ID | Requirement | Given | When | Then | Type |
|---|---|---|---|---|---|
| TC-SH-18 | Form rules are shared (apps/web CLAUDE.md) | `SignupInputSchema` | Parse | `A@Example.com ` → `a@example.com`; password without a number, under 8 chars, or `adultAttested: false` rejected | Unit |
| TC-AUTH-01 | Sign up | new email | `signup` | ok; user stored with an argon2id hash (`$argon2id$`), never the password; session cookie set httpOnly, Secure, SameSite=Lax | API |
| TC-AUTH-02 | Email is unique | A exists | `signup` with `A@…` in another case | `EMAIL_TAKEN` | API |
| TC-AUTH-03 | Login | A | `login` right / wrong password / unknown email | ok + cookie / `AUTH_INVALID` / `AUTH_INVALID` (same code) | API |
| TC-AUTH-04 | Rate limit | A | 5 wrong passwords, then the right one | 6th → `RATE_LIMITED` | API |
| TC-AUTH-05 | Session token is never stored | A logged in | read the Session row | `tokenHash` = SHA-256 of the cookie value; the cookie value is not in the database | API |
| TC-AUTH-06 | Logout | A logged in | `logout` | cookie cleared, session row deleted, `currentUser()` null | API |
| TC-AUTH-07 | Guest sample | no session | `startSample('B')` | guest session; claim with Case B facts; `runCheck` → 20580000 payable | API |
| TC-AUTH-08 | Expired session | session `expiresAt` in the past | `currentUser()` | null | API |
| TC-OWN-01 | Every action needs a session | no cookie | each claim action | `AUTH_REQUIRED` | API |
| TC-OWN-02 | Another user's claim is not found | B's claim | A calls each claim action with B's id | `NOT_FOUND`; B's data unchanged | API |
| TC-OWN-03 | Malformed id is not found | A | `runCheck('not-an-id')`, `findClaim(…, '../x')` | `NOT_FOUND` / null | API |
| TC-OWN-04 | Delete my data | A with 2 claims, facts, estimates; B with 1 | A `deleteMe` | every A row (user, sessions, claims, facts, estimates) gone; B untouched; cookie cleared | API |
| TC-ACT-01 | Create a claim | A | `createClaim` with consent, admission date, room | claim id; user-stated facts for admission date and room | API |
| TC-ACT-02 | Consent is required | A | `createClaim` with `consent.analysis: false`; unknown plan | `VALIDATION_FAILED`; `PLAN_NOT_FOUND` | API |
| TC-ACT-03 | Confirm, edit, add facts | A's claim with an unverified fact | `confirmFact`; `editFact` with a bad value; `editFact`; `addFact` | confirmed; `VALIDATION_FAILED`; source `user-corrected`; new `user-stated` fact | API |
| TC-ACT-04 | Run check and simulate | A's Case B claim | `runCheck`, `simulateRoom(shared, 450000)` | saved estimate 20580000; scenario 21790000 not saved | API |
| TC-ACT-05 | Delete a claim | A's claim | `deleteClaim` | claim, facts, estimates gone; other claims stay | API |
| TC-ACT-06 | TTL indexes | models | read indexes | Session, Claim, Fact, Estimate (and guest User) have `expiresAt` with `expireAfterSeconds: 0` | API |
