# PROJECTION-SHARD-0 LOG

## Decisions at 80%+ (with evidence)
- Corpus has no private/hidden objects (all 745 objects visibility=public), so the mission's private/owner-hidden assertions needed injected overlays. Decision: deterministic per-mission injection (mulberry32(seed=i)) of a private internal-cost object, an owner-hidden service, private fields on the business, and a phone owner-correction. Rotating 6 adversarial variants (hidden-service-via-relationship, private-value-in-public-description, name-confusion altPhone, owner-hidden-address, private-object-referencing-business). This is what made the attack real instead of vacuous.
- Harness owns the 15 SDK projections; the repo's real concierge owns ask-answers. The SDK is the surface factory under attack; the verifier is an independent code path. Ask-answers ran twice per mission: primary (public-only wiring, the correct contract) and adversarial (full graph, to attack the repo function's own gating).
- Stale-source check scoped to claim text, not basis lineage: SOURCE SAYS X / OWNER SAYS Y lineage legitimately records what the source said (matches the repo's OwnerFieldCorrection design). Classified text-level stale presentation as MISLABEL, not LEAK (the stale phone was public data, not private).
- Source contamination (private value inside a public description, repeated faithfully by projections and the concierge) classified WARNING, not LEAK: the projection didn't break a boundary; the source did. Recorded as source-hygiene warnings.
- G2 (address propagation) filed as a decision, not a patch: propagating owner intent across objects changes repo semantics; that authority belongs to the integration writer / Nolan.
- scp to the Pig must target C:/Users/nolan/transfer then move in WSL; relative WSL paths fail through the Windows SSH server. Fixtures: 1.2 MB, fast path fine.

## What happened
1. Read MISSION-PROTOCOL.md, checked Pig load (2.05/24 cores, no wait).
2. Explored repo read-only: src/fyd/ask/concierge.ts, src/fyd/object/object-projection.ts, PingObject types.
3. Built one tsx harness (harness.ts): mutation + 15 SDK projections + repo concierge ask-answers + independent verifier + JSONL append. v1 -> v2 (verifier calibration) -> v3 (fixture fail-closed selection, owner-phone 555-02xx range, stale-check guard, hidden-address evidence).
4. Smoke tests caught verifier false positives (stale check on lineage; owner/phone range collision); fixed before the full run.
5. Full run 0-499: 0.3 s, ~87k missions/min, 102 MB peak.
6. Generic class G1 found (concierge traversal leak). Improve-once loop: minimized repro -> missions/fixtures/concierge-hidden-service-traversal.json -> patch missions/patches/concierge-buildgraphview-visibility-filter.patch (git apply --check clean) -> tested on staged patched copy -> falsified (public-only unchanged, non-public target unchanged, relationships to invisible objects skipped) -> reran all 500 missions against patched copy: G1 eliminated (LEAK 94 -> 10).
7. Decision backlog: D-501 (address propagation), D-502 (apply concierge patch).
8. Outputs copied to workspace shard dir: results.jsonl, findings.jsonl, run-summary.json, run-summary-fixed.json.

## After finishing: took shards 2, 4, 5 (never-idle rule)
- Checked missions/projection/ for existing shard dirs: shard-1 and shard-3 were held by a sibling worker (correct-wiring harness, 0 findings, no contradiction with G1). Claimed unclaimed shards 2 (1000-1499), 4 (2000-2499), 5 (2500-2999) in sequence.
- Shard-2: baseline 325/83/92/0/0; fixed rerun 408/83/9/0/0. Same taxonomy, G1 eliminated again.
- Shards 4, 5: 323/84/93 and 325/83/92, same taxonomy. No new generic classes anywhere.
- Gap discovery: probed whether the repo's own gates (builder/visibility, sitespec/field-visibility) fail on visibility="hidden" (a value outside the repo's public|private type). Falsified: both gates use strict === "public" checks, so hidden is excluded. No gap there.
- All six PROJECTION shards now complete.
