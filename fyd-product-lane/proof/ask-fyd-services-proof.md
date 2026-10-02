# Ask FYD evidence proof: services question

Ownership chain: OBSERVATION -> EVIDENCE -> OBJECT/FACT
(verifyObjectGraph, tenant attestation "acme-plumbing-proof")
-> ASK FYD (composeAskFyd, deterministic, no LLM) -> EVIDENCE.
The composer restates verified records; it never decides truth.

## Question
What services does this business offer, and how do you know?

## Answer
On record: Drain cleaning: Clear slow drains fast.. [4]

On record: Water heaters: Install and repair.. [5]

I answer from the site record for Acme Plumbing (business). [1]

The record's stated source is https://acme-plumbing.example.com/. [1]

The record was derived on 2026-09-24. [1]

Basis: the site's own words (website statement, not independently verified). [1]

## Objects used
- biz-acme (ping.social.business@1): "Acme Plumbing" [target]
- svc-drains (ping.social.service@1): "Drain cleaning" [related]
- svc-heaters (ping.social.service@1): "Water heaters" [related]

## Evidence used
- [object] svc-drains (ping.social.service@1): "Drain cleaning" — provenance website-derived, ref website-ingestion:https://acme-plumbing.example.com/services
- [relationship] rel-provides-drains: biz-acme provides svc-drains (active), event website-ingestion:https://acme-plumbing.example.com/services
- [object] svc-heaters (ping.social.service@1): "Water heaters" — provenance website-derived, ref website-ingestion:https://acme-plumbing.example.com/services
- [relationship] rel-provides-heaters: biz-acme provides svc-heaters (active), event website-ingestion:https://acme-plumbing.example.com/services
- [object] biz-acme (ping.social.business@1): "Acme Plumbing" — provenance website-derived, ref website-ingestion:https://acme-plumbing.example.com/

## Source references
- https://acme-plumbing.example.com/
- https://acme-plumbing.example.com/services

## Claim classification (DIRECT / DERIVED / INFERRED)

| # | Claim | Class | Evidence class | Evidence |
| - | ----- | ----- | -------------- | -------- |
| 1 | Acme Plumbing offers Drain cleaning | DIRECT | website_statement | svc-drains, rel-provides-drains, rel-provides-drains |
| 2 | Acme Plumbing offers Water heaters | DIRECT | website_statement | svc-heaters, rel-provides-heaters, rel-provides-heaters |
| 3 | Acme Plumbing record identity | DIRECT | website_statement | biz-acme |
| 4 | Acme Plumbing record source | DIRECT | website_statement | biz-acme |
| 5 | Acme Plumbing record date | DIRECT | website_statement | biz-acme |
| 6 | Acme Plumbing record basis | DIRECT | website_statement | biz-acme |

Inferred claims: none.

## Verification
- every factual claim resolves to an authorized object/relationship in the verified graph;
- every offers claim has its grounding provides/offers edge in the verified graph;
- the answer is byte-identical across two runs (deterministic composer);
- unknowns are named explicitly when evidence is absent (see negative cases).
