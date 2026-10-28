## What and why
Closes #

## Test cases
- [ ] Test cases written in `docs/test-cases.md` and approved **before** tests (IDs: TC-…)
- [ ] Red commit(s) pushed before green: <sha> → <sha>

## Verification (paste summaries)
- [ ] `pnpm lint && pnpm typecheck && pnpm test:cov`
- [ ] `pnpm cases` (if rules/config changed)
- [ ] Ran the `code-reviewer` agent; findings fixed or answered below
- [ ] I read every line of the diff and can explain it

## AI involvement
Model / agent / skill used:
What the AI got wrong (and the `AI_LOG.md` entry, if any):

## Safety
- [ ] No secrets, real PHI or plain-text injection payloads added
- [ ] Ownership tests (other user → 404) still pass
