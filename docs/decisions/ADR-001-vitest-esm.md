# ADR-001: Vitest and ESM everywhere

**Decision:** Vitest is the only test runner; packages are ESM. **Why:** one runner across web, shared
and rules; per-package coverage gates; property tests via fast-check. **Rejected:** Jest (ESM friction).
