# Rules spec (R1–R8)

This is the source of truth for rule behaviour and test expectations. Values such as months, caps,
percentages and lists come from `config/plans/<plan>.json`, never from this file or from code.
**Status:** draft for the one-night build. Items marked **DECIDE** must be confirmed by the human
before their tests are written.

## Inputs

`ClaimFacts`: every field is nullable, and null means unknown.

- `firstInceptionDate`: continuous cover, including porting
- `policyStartDate`, `policyEndDate`
- `sumInsuredPaise`, `sumInsuredUsedPaise`
- `ageAtEntry`
- `admissionDate`, `dischargeDate`
- `diagnosis`, `icd10`, `isAccident`
- `ped { exists, condition, firstDiagnosedDate, disclosed }`
- `room { category, rentPerDayPaise, days }`
- `bill { totalPaise, lineItems[{ head, amountPaise }] }`

**Usable facts** (`toClaimFacts`): a fact counts only if one of these holds:
- it is `found`, its quote verified as `exact` or `fuzzy`, and its confidence isn't `low`;
- the user confirmed it;
- its source is `user-stated` or `user-corrected`.

Anything else becomes null, so the rule that needs it returns `unknown`.

## Order

1. **Eligibility:** R1 → R2 → R3 → R4 → R5. Any `fail` makes the payable amount 0.
2. **Non-payable items** (heads listed in `plan.nonPayableHeads`) are removed from the bill.
3. **Amount waterfall:** R6 (room rent) → R7 (co-pay) → R8 (sum insured cap), each on the running amount.

## Rules

| Rule | Passes when | Missing fact → | Cites |
|---|---|---|---|
| R1 Policy active | `policyStartDate ≤ admissionDate ≤ policyEndDate` | unknown | schedule |
| R2 Initial wait | admission ≥ inception + `initialWait.days`, **or** `isAccident` and the plan exempts accidents | unknown | `initialWait.clause` |
| R3 Specific-disease wait | diagnosis not on the plan list, **or** admission ≥ inception + `specificDiseaseWait.months` (accident exemption if set) | unknown (not applicable if the diagnosis is known and not listed) | `specificDiseaseWait.clause` |
| R4 PED wait | no PED, **or** PED first diagnosed after inception, **or** admission ≥ inception + `pedWait.months` | unknown | `pedWait.clause` |
| R5 Moratorium | continuous cover ≥ `moratorium.months` → PED non-disclosure can't be raised (overrides an R4 non-disclosure fail) | not applicable | `moratorium.clause` |
| R6 Room rent | rent per day ≤ cap → no deduction. Otherwise the room head is paid at cap × days, and every head **not** in `excludedHeads` is paid × (cap ÷ rent) | unknown | `roomRent.clause` |
| R7 Co-pay | `ageAtEntry` below every tier → none. Otherwise deduct the tier's bps of the running amount | unknown | `coPay.clause` |
| R8 SI cap | running amount ≤ SI − SI used, otherwise capped | unknown | `sumInsured.clause` |

## Boundaries (decided; test both sides)

- **Months:** a wait of N months ends on the same calendar date N months after inception. Admission
  **on** that date passes (inclusive). Month-end example: 31 Jan + 1 month = 28/29 Feb (date-fns `addMonths`).
- **Days:** a wait of 30 days: admission on inception + 30 days passes; on day 29 it fails.
- **Rounding:** proportionate amounts use `floor(amount × cap ÷ rent)` per head. Co-pay uses
  `floor(running × bps ÷ 10000)`. Rounding always favours the insurer and is never more than 1 paise per head.

## Verdict

- `at_risk`: any of R1–R5 is `fail` or `unknown`.
- `likely_partial`: eligible, and payable < claimed or any of R6–R8 is `unknown`.
- `likely_payable`: eligible, and payable = claimed.

## Worked example: Case B (canonical, hand-calculated)

Mother, knee replacement (right), Star Family Health Optima, wording V.19.

- First inception 12 Mar 2019; admission 18 Nov 2026, so cover has run 92 months.
- SI ₹3,00,000, none used. Age at entry 52.
- Osteoarthritis first diagnosed Jun 2021, after inception, so it isn't a PED.
- Single AC room at ₹7,000/day × 5 days. Plan cap is ₹5,000/day for SI ₹3–4 lakh (clause 2(A): **verify**).

| Bill head | Amount (₹) | Treatment |
|---|---|---|
| Room (7,000 × 5) | 35,000 | R6: paid at 5,000 × 5 = 25,000 |
| Nursing | 7,500 | associated: × 5/7 |
| Surgeon fees | 30,000 | associated: × 5/7 |
| OT charges | 13,600 | associated: × 5/7 |
| Implants | 1,05,000 | excluded head: paid in full |
| Pharmacy | 18,000 | excluded head: paid in full |
| Diagnostics | 21,300 | excluded head: paid in full |
| Consumables (non-payable list) | 9,600 | non-payable: 0 |
| **Total claimed** | **2,40,000** | |

Arithmetic (paise in tests):

- Non-payables: −9,600.
- R6 room: 35,000 − 25,000 = −10,000.
- R6 associated: (7,500 + 30,000 + 13,600) = 51,100; 51,100 × 5 ÷ 7 = 36,500 exactly, so −14,600.
- R6 total deduction = 10,000 + 14,600 = **24,600**.
- Payable = 25,000 + 36,500 + 1,44,300 (excluded heads) = **₹2,05,800**.
- R7: age 52 is below the 61 tier, so no co-pay. R8: 2,05,800 ≤ 3,00,000, so no cap.
- Out of pocket = 2,40,000 − 2,05,800 = **₹34,200** (24,600 room rent + 9,600 non-payables).
- **Verdict: `likely_partial`.**

**Room simulator, twin sharing at ₹4,500/day.** Associated charges are assumed unchanged; say so on screen.

- Room = 4,500 × 5 = 22,500, which is within the cap, so there's no R6 deduction.
- Bill = 2,40,000 − 35,000 + 22,500 = **₹2,27,500**.
- Payable = 2,27,500 − 9,600 = **₹2,17,900**.
- Out of pocket = **₹9,600**, saving ₹24,600 against Single AC.
- (An earlier design draft showed "₹2,30,400 of ₹2,40,000". That's wrong because the bill shrinks. See `AI_LOG.md`.)

## Plan values to verify in the Star FHO wording before PR #3

Starting values for building the config, **not test expectations**: tests read `config/plans/*.json`.

| Value | Starting value | Source to confirm |
|---|---|---|
| Initial wait | 30 days, accidents exempt | clause no. + quote |
| Specific-disease wait | 24 months (joint replacement, cataract, …) | clause 3(2) list |
| PED wait | 48 months in V.19; the IRDAI 2024 cap is 36 → use 36, `source: regulation` | clause 3(1) + circular |
| Moratorium | 60 months | regulation |
| Room cap | ₹5,000/day for SI ₹3–4 lakh | clause 2(A) |
| Excluded heads | implants, pharmacy, diagnostics (**unverified**, so `headsVerified: false`) | clause 2(A) / circular |
| Non-payable heads | consumables | IRDAI non-payable items list |
| Co-pay | 20% (2000 bps) if age at entry ≥ 61 | **verify** |

## Schema decisions (28 Oct 2026, with TC-SH-01..05)

- `plan.nonPayableHeads` is `{ heads: BillHead[], clause: ClauseRef }`. The IRDAI list is cited with
  `source: 'regulation'`.
- `RoomCategory`: `general | shared | single | deluxe | suite | icu`. "Single AC" → `single`,
  "twin sharing" → `shared`.
- `ClauseRef.needsReview` / `ClauseRef.note` are optional and only for drafts in `config/plans/drafts/`.
  A plan loaded by the app must not have `needsReview` set (the loader enforces this in PR #3).
- `Estimate.nonPayablePaise` records the non-payables removed before R6 (Case B: 9,60,000 paise), so
  `outOfPocketPaise = claimedPaise − payablePaise` can be explained line by line.
- `RuleResult`: `deductionPaise > 0` **if and only if** `outcome === 'deduction'`; `missingFacts` is
  non-empty **if and only if** `outcome === 'unknown'`. The schema rejects anything else.
