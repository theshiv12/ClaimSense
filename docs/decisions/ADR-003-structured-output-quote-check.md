# ADR-003: Structured output + quote verification in code

**Decision:** the model returns a flat, all-required JSON schema (generated from Zod) with a verbatim
`sourceQuote` and `page` per fact; code checks each quote against the PDF text layer.
**Why:** the schema guarantees shape, not truth; the quote check catches invented facts.
Photos have no text layer, so their facts are `unverifiable` and need the user's confirmation.
