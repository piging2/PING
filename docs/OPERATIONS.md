# Operations

## The 14 proofs

piging2 must demonstrate:

1. ingest Happy Place
2. ingest Coppersmith
3. create deterministic evidence-backed graphs
4. generate materially explainable SiteSpecs
5. render both mobile/desktop
6. Ask FYD answers from evidence
7. owner corrects one fact
8. regeneration preserves correction
9. create one mission
10. worker returns result
11. injected bad result is rejected
12. fallback attempt succeeds
13. mission becomes VERIFIED only after independent verification
14. replay reconstructs the relevant state

## Slices

- FIRST: real website → proceduralizer → evidence → objects → SiteSpec → renderer. Must run.
- SECOND: Ask FYD → evidence-backed answer.
- THIRD: owner correction → regeneration → correction survives.
- FOURTH: mission → worker → verifier → verified result.

## Rules

- ONE primary Postgres. ONE canonical event path. ONE projection strategy. ONE object/evidence API boundary. ONE SiteSpec renderer. ONE worker dispatch seam.
- Do not reproduce every datastore PING experimented with.
- Commit law: every material action ends in a commit. Never push without Nolan's explicit word.
