# ADR-005: Free tiers only

**Decision:** Gemini API free tier (gemini-3.8-flash, fallback gemini-3.5-flash-lite), Vercel Hobby,
MongoDB Atlas M0, GitHub Actions; Claude review in CI via the developer's subscription token.
**Consequences:** small, unpublished daily AI limits → per-user quota, fallback model, manual fact entry;
4.5 MB request limit → 4 MB uploads and in-browser image resize; free-tier content may be used by Google
→ synthetic documents only (see `docs/compliance.md`).
