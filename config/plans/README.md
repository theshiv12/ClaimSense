# Plan configs

One file per plan and wording version, e.g. `star-fho.json`. Every value carries a `ClauseRef`
`{ clauseId, page, quote, source: 'wording' | 'regulation' }` and parses with `PlanConfigSchema`.
Drafts from the `plan-config-extractor` skill go in `drafts/` and are never loaded until a human
verifies every line and moves the file here.
