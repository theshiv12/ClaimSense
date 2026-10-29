# ClaimSense

**Before a planned hospital admission in India, see what your personal health policy is likely to pay,
what gets cut and why, and what you can do about it.** Every reason cites the policy clause and the
line in your own document it came from.

> **Live demo:** _TODO: add the Vercel URL after deploying (see "Deploy")._
> Estimate, not a guarantee. Only your insurer decides. Not medical or legal advice.

## The problem

A policyholder usually learns what the insurer will cut only at discharge: room rent over the limit
(which also cuts the doctor's, nursing and OT charges in proportion), waiting periods, co-pay, items the
policy never pays. The wording that decides this is a 16-page PDF few people read. ClaimSense reads
the schedule and the hospital estimate, applies the policy's own rules, and shows the money before
admission, while the patient can still choose a different room or call the insurer.

## How it works

1. **Upload** the policy schedule and the hospital estimate (PDF, JPEG or PNG, ≤ 4 MB). Google Gemini
   reads the facts as structured JSON, with a verbatim quote and page for each one.
2. **Check.** Code verifies every quote against the PDF text layer, and checks that the value can
   be read from that quote. Anything unverified shows "Please check" and counts as *unknown* until
   you confirm it.
3. **Understand.** A pure rules engine applies R1–R8 from a human-checked plan config: policy
   active, initial wait, specific-disease wait, PED wait, moratorium, room rent with proportionate
   deduction, co-pay, sum insured. It shows the payout, eight checks with clause quotes, a room
   simulator, remedies and the complaint path (insurer → Bima Bharosa → Ombudsman).

**The model never decides money or verdicts.** Gemini only extracts facts; amounts come from
`packages/rules`, and every number traces to `config/plans/star-fho.json`.

Worked example (Sample B, knee replacement, Single AC ₹7,000/day): **₹2,05,800 payable of ₹2,40,000,
you pay ₹34,200**. In twin sharing at ₹4,500/day: **₹2,17,900 of ₹2,27,500, you pay ₹9,600**.
The arithmetic is in `docs/rules-spec.md`.

## Run it

Needs Node 24 and pnpm 12 (`corepack enable`).

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in MONGODB_URI (Atlas M0) and GEMINI_API_KEY (AI Studio)
pnpm dev                               # http://localhost:3000 — try "See a sample"
```

Checks (no secrets, no network: in-memory MongoDB, fake Gemini):

```bash
pnpm lint && pnpm typecheck && pnpm test:cov && pnpm cases && pnpm build
pnpm --filter @claimsense/web e2e      # Playwright; PW_CHANNEL=chrome to use a system Chrome
node scripts/check-ai-config.mjs
```

### Deploy (Vercel)

Root directory `apps/web`. Add every key from `.env.example` in Project → Settings → Environment
Variables (`MONGODB_DB=claimsense`), then redeploy. Atlas network access must allow Vercel
(`0.0.0.0/0` with a long password: Vercel has no fixed IP).

## Stack

| Part | Choice |
|---|---|
| App | Next.js 16 App Router (server components + server actions), React 19, Tailwind 4 |
| Rules | `packages/rules`: pure TypeScript, no I/O, 100% line coverage |
| Schemas | `packages/shared`: Zod 4, shared by forms, actions, model output and the engine |
| Data | MongoDB Atlas M0 via Mongoose, every query scoped by user, TTL deletion |
| AI | Gemini free tier via `@google/genai` Interactions API, JSON-schema output (ADR-008) |
| Auth | argon2id, opaque session cookie (SHA-256 stored), guest sessions for samples |
| Tests | Vitest, Testing Library, mongodb-memory-server, Playwright; Semgrep and gitleaks in CI |

## Limitations

- **One plan:** Star Family Health Optima, wording V.19. Its config was promoted from a draft by the
  AI and **still needs a human check of every item in `pendingHumanReview`** (ADR-007). The PED wait
  (48 months) and moratorium (96 months) follow the wording, not the IRDAI 2024 circular.
- Not modelled: sub-limits (for example the cataract limit per eye), restoration and recharge
  benefits, pre- and post-hospitalisation, the room category of SI ≥ ₹5 lakh plans (shown as Unknown).
- **Gemini free tier:** documents may be used by Google and read by reviewers, so use synthetic
  documents only. Daily limits are small; when they run out, the app asks for the facts by hand.
- **The live Gemini call has not been checked yet.** Gemini test fixtures are hand-written in the
  response shape (ADR-008).
- No password reset and no email verification.
- Estimates only: ClaimSense never files claims, sells policies or contacts insurers.

## Repo

`apps/web` (UI + server actions), `packages/rules`, `packages/shared`, `config/` (plans,
remedies), `fixtures/` (synthetic cases and documents), `docs/` (PRD, rules spec, architecture,
ADRs, test cases, TDD log, AI usage). AI mistakes and what changed are in `AI_LOG.md`.

**Prior work:** the idea, PRD and design were explored with Claude before the hackathon (links in
`docs/ai-usage.md`). All code in this repository was written during the hackathon.
