# ADR-007: Star FHO config, autopilot defaults

**Status:** accepted by the autopilot run (29 Oct 2026); **needs human sign-off** before the demo.

**Context:** `config/plans/drafts/star-fho.json` (from the V.19 wording PDF) had open questions, and the
autopilot prompt says to pick the safest default and continue.

**Decisions**

1. **PED wait 48 months, moratorium 96 months**, as printed in the V.19 wording (3(1), 4(12)), not the
   36 / 60 months of the IRDAI 2024 Master Circular. No verbatim quote from the circular is on file, and
   golden rule 2 needs one. The longer periods never over-promise a payout. If the insurer has re-issued
   the wording, add a new plan version instead of editing this one.
2. **Room rent depends on the sum insured** (2(A) table, p5). `roomRent.kind: 'by_sum_insured'` was added
   to `PlanConfigSchema`: SI ₹1–2 lakh → ₹2,000/day, ₹3–4 lakh → ₹5,000/day, ₹5 lakh and above →
   up to a Single Standard A/C room (`maxCategory: 'single'`). A room above the allowed category with no
   rupee cap makes R6 `unknown` (the eligible room's rent is needed), never `pass`.
3. **Non-payables:** `consumables`, cited to Excl 37 (3(33), p11) "Other Excluded Expenses as detailed in
   the website www.starhealth.in", the wording's pointer to the IRDAI non-payable list.
4. **Excluded heads** for proportionate deduction come from the Associated medical expenses definition
   (p4): pharmacy, consumables, implants (incl. medical devices), diagnostics. `headsVerified: false`.
5. **ICD-10 prefixes** for the 24-month list were added by the AI (the wording has none). Keywords are
   copied from the wording.
6. To let the app run, the autopilot **removed the draft's `needsReview` flags without verifying them**.
   Every open item is listed in `pendingHumanReview` in the plan file; a human must check each before the demo.
7. A loaded plan must not have `needsReview` anywhere (`LoadablePlanConfigSchema`). `verifiedBy` says the
   AI promoted the file and a human still has to check it.

**Consequences:** Case B (SI ₹3 lakh) uses the ₹5,000/day cap and gives ₹2,05,800 as in the spec.
