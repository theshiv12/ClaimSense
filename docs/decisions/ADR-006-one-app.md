# ADR-006: One Next.js app for the one-night build

**Decision:** server actions in `apps/web` replace the planned NestJS API; files are processed in memory
and never stored; the LLM chat becomes a remedies panel + room simulator.
**Why:** one deploy, no cold starts between services, no token passing, no file storage, no background
jobs, while the important boundary (a pure, fully tested rules engine) stays a separate package.
**Rejected for now:** NestJS API on Render (two deploys, ~1 min cold starts), Azure Blob, LLM chat.
The original design is kept in `docs/reference/nest-plan/` for future scope.
