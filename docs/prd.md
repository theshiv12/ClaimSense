# Product requirements

> **TODO tonight (2 min):** export the "ClaimSense: Full PRD" doc from Claude Docs as Markdown and
> paste it below this note. Then mark these as **future scope (not in the one-night build)**:
> Google sign-in, voice, history filters, password reset.
>
> **Update 30 Oct 2026 (ADR-010):** a *grounded* chat about one check ("Ask about this check") and reviewed
> *similar cases* (Ombudsman/IRDAI/consumer-court decisions) are now in scope. Open-ended chat stays out.

## MVP scope for the one-night build

See `docs/one-night-build.md` section 1. Core journey:

1. Consent + claim setup
2. Upload a policy schedule and a hospital estimate (or try sample case B)
3. Check the extracted facts (quote, page, verified badge) and confirm or correct them
4. Estimate: payout, out-of-pocket, label, one row per check with its clause
5. Room simulator, remedies, grounded "Ask about this check" and reviewed similar cases (ADR-010)
6. History list
7. Delete my data
