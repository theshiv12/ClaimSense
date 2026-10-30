# ADR-012: Remove all simulation

**Date:** 30 Oct 2026 · **Status:** accepted (the owner's request)

**Decision.** ClaimSense no longer re-runs the engine on hypothetical facts. Removed:

- the room simulator ("Compare room types") and `POST /api/claims/:id/simulate-room`;
- the "Try a room within the limit" preset in "What can I do?";
- typed what-ifs (FR-17: "what if it was an accident…", `parseWhatIf`);
- `simulateFacts` / `simulateRoom` in `packages/rules`, and R6's `roomHead` param (it existed only for the preset).

**Why.** The owner asked for it. Every amount the user now sees is the engine's estimate of their real facts.

**What happens now.** A what-if typed in the check chat (or in "Explain my estimate") is an ordinary
question for the grounded answer. It never computes amounts: the `vet.ts` allow-list lets through only amounts
already in its trusted sources (engine reason, clause, catalog remedies, reviewed cases) and replaces any other.
Removing the feature kept its safety guard: code adds "This only applies if it is true…" and "Medical advice
comes first…" to every what-if, whoever answers (`asksWhatIf`, TC-NOSIM-03..07, CE-2). The R6
remedy now says to ask the hospital for its tariff instead of pointing at the simulator.

**Supersedes** the room simulator in ADR-006 / Figma 04 and the what-if part (decision 1) of ADR-011. Tests
removed with the feature are listed in `docs/test-cases.md` ("Simulation removed").
