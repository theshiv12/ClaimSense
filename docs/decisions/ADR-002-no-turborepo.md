# ADR-002: No Turborepo

**Decision:** a plain pnpm workspace, no Turborepo. **Why:** Turborepo earns its keep by caching build
outputs; with one app, two small packages and one developer there is little to cache, and `pnpm -r run`
already runs scripts across the workspace. **Consequences:** every package's checks run every time;
add Turbo later if CI time starts to hurt. Reasoning in `docs/reference/nest-plan/01-stack-decisions.md`.
