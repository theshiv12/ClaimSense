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
