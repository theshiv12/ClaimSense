# Similar cases (precedents), ADR-010

`config/precedents.json` is loaded by the API (`apps/api/src/lib/precedents.ts`) and shown as "similar cases"
in a check's "What can I do?" panel, and used as a chat source. **Only real, human-verified decisions go there.**

How to add one:

1. Find the primary decision: an Insurance Ombudsman award (Council for Insurance Ombudsmen, cioins.co.in),
   an IRDAI order, or a consumer-court judgment. Secondary articles are leads, not sources.
2. Add it to a file in `drafts/` with `needsReview: true`, `verifiedBy: null`, a `note` saying what to check, and
   its id in `pendingHumanReview`. Drafts are validated by `DraftPrecedentCatalogSchema` and never loaded.
3. A human reads the decision at `sourceUrl` (https only), checks every field (forum, date, insurer, rule, outcome,
   result, summary in plain words, citation), then moves the entry to `precedents.json` without `needsReview` and
   with `verifiedBy` set. `PrecedentCatalogSchema` refuses anything else.

Fields: `ruleId` + `outcome` say which check it matches (e.g. `R6` + `deduction` for a room-rent cut). The summary
must not contain advice, amounts for this user, or "approved".

Status (30 Oct 2026): no primary decision has been verified yet, so the app shows "No reviewed cases yet".
