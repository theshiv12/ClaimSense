---
name: tdd
description: Test-driven workflow for a ClaimSense issue - draft test cases from the acceptance criteria, get human approval, write failing tests and commit them red, implement to green without touching the tests, then refactor. Use at the start of any issue that adds or changes behaviour.
argument-hint: [issue number]
---

# Test-driven development for issue $ARGUMENTS

Tests are written from the **spec**, never from the code, so they can catch a wrong
implementation. The human approves the test cases before any test or code exists.

## 1. Test cases (no code yet)

1. Read the issue (`gh issue view <n>`), the matching scope in `docs/prd.md` (FR ids once the
   full PRD is pasted in) or `docs/one-night-build.md`, and the relevant spec
   (`docs/rules-spec.md`, `docs/api.md`).
2. Draft a table:

   | ID | Requirement | Given | When | Then | Type |
   |---|---|---|---|---|---|

   - IDs: `TC-<area>-<nn>` (e.g. `TC-R3-01`, `TC-API-CLAIMS-04`, `TC-WEB-VERDICT-02`).
   - Cover: happy path; boundaries (day before / on / after); missing or invalid input;
     security (no session → `AUTH_REQUIRED`, other user's or malformed id → `NOT_FOUND`, which
     the page renders as 404, bad input → `VALIDATION_FAILED`); dependency
     failures (LLM timeout or invalid output, storage error) where they apply.
   - Type: Unit, API, Contract (recorded LLM output), Eval (conversation), UI.
3. List every point the spec does not decide under **Questions**. Do not guess answers.
4. **Stop and wait for the human to approve or edit the table.**

## 2. Red

1. Append the approved table to `docs/test-cases.md` under a heading for the issue.
2. Write one test per row. Each test name starts with its ID:
   `it('TC-R3-01 fails one day before 24 months of cover', …)`.
3. If the code under test doesn't exist, add the smallest stub that compiles and throws
   `new Error('not implemented')`, so tests fail on behaviour, not on compile errors.
4. Run the tests. Show that each fails **for the right reason** (assertion or "not
   implemented"). A test that passes now is testing nothing: fix the test.
5. Commit only tests and stubs: `test(<area>): <what> (red)`.

## 3. Green

1. Write the smallest code that makes the tests pass. Follow CLAUDE.md and the golden
   slice pattern.
2. **Do not edit any test in this phase.** If a test looks wrong, stop, explain why with
   the spec quote, and ask. Never change an expected value to match the code.
3. Run the full checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm cases`.
4. Commit: `feat(<area>): <what> (green)`.

## 4. Refactor

Improve names, duplication and structure with all tests still green. Commit:
`refactor(<area>): <what>`.

## 5. Report

- Test cases written, tests passing, coverage for the touched package.
- Any question the human answered (add it to the spec if it changed behaviour).
- An `AI_LOG.md` entry if an AI-written test or line of code turned out wrong.
