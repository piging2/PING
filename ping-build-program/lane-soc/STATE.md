# LANE SOC — Public-Social Fabric: STATE

**Status:** BUILDABLE
**Date:** 2026-09-23
**Worker session:** 21fc34e2 (persistent)

## STATE.md

| Field | Value |
|---|---|
| Status | PROVEN (spike: 15/15 tests pass, executed 2026-09-23) |
| Blocker | None for the lane's own work. Integration requests filed: INTEGRATION-REQUEST-lane-o.md, INTEGRATION-REQUEST-lane-n.md (queued, not blocking). |
| Repo base | /home/nolan/projects/ping @ e48ef710, branch fyd-factory (read-only trace; no commits) |

## Ledger

- RESEARCHED: existing public-surface machinery in PING (see design §1)
- RESEARCHED: git history pattern — spike uses canonicalized sha256 digests per existing digest law (ask/envelope.ts, transition-id.ts)
- HARVESTED: Open Graph protocol pattern (object → deterministic public social representation, ogp.me), headless-CMS structured-content → omnichannel mechanism, logic-less deterministic templating concept
- IMPLEMENTED: spike/projector-spike.mjs (deterministic projector, 3 surfaces, claim ledger, refusal rules, one-way engagement boundary)
- TESTED: 15/15 spike tests pass (executed 2026-09-23): determinism, targeted re-projection, F-1/F-2/F-3/F-4/F-6 refusals, red-team RT-1..RT-6
- PROVEN: projection law holds on the real Happy Place object (deterministic, evidence-bound, refusal-first, drafts-only); see spike/drafts-sample.json
- FILED: INTEGRATION-REQUEST-lane-o.md, INTEGRATION-REQUEST-lane-n.md (queued)
- ADOPT: ObjectView as the projector input (canonical public read model); ConciergeGrade vocabulary; DependencyManifest reverse-walk contract; INV-03 absence-not-redaction; rights-gate vocabulary
- ADAPT: OG-style field mapping (object fields → social surface fields); headless-CMS "canonical content, projected surfaces" architecture
- REJECT: new CMS/publishing vendor; new template engine dependency; new event authority; any write path from engagement to canonical objects
- FALSIFIED: none yet
- BLOCKED: none

## NEXT

1. Run the spike suite on the Pig (node available via the same bridge) — PROVEN/FAILS.
2. File INTEGRATION-REQUEST-lane-o.md: projection artifacts as disposable derived artifacts in the dependency index (reverseWalk(objectField) → affected surfaces).
3. File INTEGRATION-REQUEST-lane-n.md: extend lineage to OBJECT → PUBLIC SURFACE (evidence binding per claim).
4. Coordinate with lane G: projector refusal grades reuse ConciergeGrade; never invent a second claim vocabulary (DUP convergence).
