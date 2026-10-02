# Collision Pass — Deployment Convergence (2026-09-30 ~12:00 MDT)

Per Nolan's MarketingOS wiring order: sweep entire repo including all worktrees before allocating.

## Sweep method
Pig repo `/home/nolan/ping` (all branches/worktrees via git), `~/workspace/acquisition-seam`, `~/workspace/mission-control`, `~/workspace/forensics`, goal files, `~/workspace/goals/ping-agent-execution-stack/files/`.

## Findings

| Objective | Existing coverage | Collision? | Owner mapping |
|---|---|---|---|
| Mission labels + verdict vocab | `forensics/mission-labels-20260930` (c01e301ec, ae4b6843f) from 546b62d76 | None — only other hit is `ping-runtime/analysis/claim_chaining.js` (consumer, not scaffolding) | Merge to served line (P2) |
| Approval events + chaining + contradiction | `forensics/approval-events-20260930` @ 217294506 | None | Merge to served line (P2) |
| /ingest producer | `forensics/ingest-producer-20260930` @ 5ab16aba | None | Merge to served line (P2); cron step activates on merge |
| Identity stitching + transcript-accuracy | Designs only, not landed | DEFERRED per charter | Do not pull in |
| Interval-10 deployment convergence | Lane-1 forensics resolved deployed bytes (cc6856c); no active deploy lane; no deploy script found (only `ping-gateway-build/Dockerfile` overlay pattern) | None active | Deployment writer (this program) |
| Acquisition impl | `~/workspace/acquisition-seam` (acquire-url.ts, hostile-battery 58/58, 2026-09-24) | None active | Acquisition writer (this program). FLAG: wiring order references "existing acquisition/PING coordinator" — none active in this view; parent to reconcile with MarketingOS lane |
| MC projection contract | MarketingOS lane wrote v1 (`MARKETINGOS-PROJECTION-CONTRACT.md`) | None — do not duplicate | MarketingOS lane stays reader/falsifier |
| MC implementation | Existing MC writer (Orca wave, completed); MC served :3100 /mission-control per 2026-09-24 STATE.md | None active | MC writer (this program), lineage from Orca-wave MC lane |

## Topology (verified via git)
- `interval10/integrated-20260930` @ cafe156e3 CONTAINS 546b62d76 (Interval-10 is descendant of the forensics base).
- All three forensics branches fork from 546b62d76 and do NOT contain cafe156e → P2 merge = rebase/merge forensics onto the cafe156e line, registry re-run (not hand-merge) on `event_registry.json` collision.
- Deployed Oracle: `ping-gateway:candidate-3c5d280dd` = byte-identical cc6856c event files (lane-1 PROVEN). POST /events has no tenant check, no authorizeNamespace. Three-way divergence: worktree Lane L (007fcf44) vs ping-gateway-src/build (ad9b9c92) vs deployed (4e3c66b6).
- Deploy pattern found: `/home/nolan/ping-gateway-build/Dockerfile` = `FROM curious-squid-gateway:phase4-eventauth8` + COPY overlay of changed files. No build/push/ship script found — ship mechanics to be established by deployment writer.
- Runtime manifest (`runtime-manifest.json`) is 2026-09-19 / HEAD 88c9651be — STALE, stays HOLD per wiring order.

## Open deployment-map questions (for deployment writer, read-only probes first)
- Q-a: forensics-fix reported deployed /ingest requires bearer (image `repair-cert-20260924`) but worktree code has no such middleware. Reconcile with lane-1's `candidate-3c5d280dd` finding — same image retagged, or different image?
- Q-b: deployed gateway writes `brain-postgres/ping_runtime` vs worktree docs `ping-postgres/crx_runtime`. Establish actual DB host/container/database from the live container env (read-only `docker exec` / `docker inspect`).

## Allocation
- Writer D (deployment): P1 + P2, sequential, owns the served-line pointer. Per-lane worktree (lesson from forensics-fix branch collision).
- Writer C (MC): served-chain trace (read-only, immediate) + contract implementer review; implements projection after P3 mission is live.
- Writer M (mission): P3, spawns after Writer D reports merge complete (labels must be on served line).

## Writer C findings (2026-09-30 ~12:00 MDT) — appended
- Served MC traced live: :3100 /mission-control 200, served from /home/nolan/projects/ping-fyd-converged (worktree of /home/nolan/projects/ping), branch fyd/convergence-2026-09-28 @ a8957e3fc2f1e3eb5552a67cc3cab66003d7f19c, build CTfvku8OQWWqrG8pKnSy7. Supersedes 2026-09-24 record (fyd-factory).
- FIRST BROKEN EDGE for P4: served MC projection entrypoint reads the FYD file journal (/home/nolan/workspace/fyd-journal-gateway/events.jsonl); it has NO read path to PING postgres. The contract's canonical state is PING postgres primitives. Additionally the forensics commits live in /home/nolan/ping — a different repo from the served MC's /home/nolan/projects/ping.
- Contract flags for MarketingOS lane (owner of contract): (1) contract says ACTION_REJECTED, landed code/registry say REJECTED — contract must be corrected; (2) contract's approval bindings list (principal, artifact digest, approval time in payload) does not match landed payload (action_id, proposed_by/decided_by, evidence_refs; time on event row) — drill-down artifact link must come from evidence_refs/correlation; (3) kernel Evidence field list has no single canonical definition in ping-runtime — implementer resolves at build time.
- Writer C standing by for Task 3 signal (after P3 mission live). Next broken edges: (a) forensics merge + :3100 rebuild/redeploy; (b) read-only Next.js → PING postgres path.

## Hardened charter (2026-09-30 ~12:03 MDT, Nolan binding, supersedes)
- BRUTAL CEO MODE: integrate the system we actually have. SOURCE TREE != SERVED RUNTIME != AUTH EXPECTATION != DATABASE DOCUMENTATION. No capability added; no blind merges; no fourth implementation.
- Chain order: DEPLOYED SOURCE/IMAGE -> AUTH -> DATABASE -> /INGEST -> CANONICAL EVENT -> PROJECTION -> BOUNDED ACQUISITION -> INTELLIGENCE_RESEARCH MISSION -> MC PROJECTION.
- Merge gate: collision clean, tests clean, served-line target identified, auth compatible, DB compatible, event-vocab compatible. Local only, test after each, NO PUSH.
- Producer: CODE PASS / LIVE MANUAL PASS / SCHEDULED PENDING (cron 2026-10-01 08:21 MDT is the proof; observe, do not rescue).
- Behaviors truthful: chaining + contradiction IMPLEMENTED; identity stitching + transcript accuracy DESIGN ONLY (do not implement to flip PARTIAL).
- MC: DEPLOYMENT = UNKNOWN until certified; projection contract v1 PROVISIONAL pending runtime truth.
- Facebook gate fix: UNIT/ADVERSARIAL VERIFIED, LIVE DISPATCH PENDING (next real pass proves it; not this program's lane to re-verify).
- Report format (exact, 13 sections as listed): SERVED GATEWAY / WORKTREE EXPECTATION / DIVERGENCE CAUSE / CANONICAL JOURNAL / TEST OBSERVATION / SCHEDULED PRODUCER / BRANCH COLLISIONS / MERGE / CANONICAL TEST / FACEBOOK NEXT PASS / INTERVAL-10 FIRST OPEN LINK / FIRST BROKEN INVARIANT / NEXT.
- Writer D redirected (interrupt) with hardened orders + format. Writer C (Tasks 1+2 done) holds for Task 3 signal; contract provisionality noted for its implementation phase. Writer M spawns after merge gate green.

## MarketingOS ecosystem-mastery pass (2026-09-30 ~12:30 MDT, Nolan binding, forwarded from MarketingOS lane)
- READER/FALSIFIER program only. No new subsystems, no new writers. Switch from feature invention to ecosystem comprehension.
- Folded into existing lanes as constraints, not new work: BRUTAL CEO MODE chain order still governs; this rides along and does not reorder or add capability.
- Standing classifications: LIVE / PROVEN-BUT-UNWIRED / UI-ONLY / MOCK / DUPLICATE / DEAD / UNSAFE / HARVEST x REACHED-AUTHORITY / REACHED-NONAUTHORITY / UNREACHED-CANDIDATE / COMPETING / SUPERSEDED / UNKNOWN.
- Per-component questions: WHAT DOES IT DO / WHO OWNS ITS SEMANTICS / READS / WRITES / AUTHORIZES / EXECUTES / EVIDENCE / REACHED / DUPLICATES / HARVEST.
- Output vocabulary for future reader reports: REACHED SPINE / SOFTWARE WE SHOULD EXPLOIT MORE / UNWIRED GOLD / DUPLICATION TO KILL / UNSAFE-LYING SURFACES / EXTERNAL SOFTWARE WE ARE UNDERUSING / MARKETINGOS GAPS THAT ARE ACTUALLY REAL / TOP 10 SMALLEST WIRING DELTAS / THINGS WE THOUGHT WE NEEDED BUT ALREADY HAVE / THINGS WE SHOULD NEVER BUILD / FIRST BROKEN MARKETINGOS ARROW.
- Trace the six real journeys; report the FIRST genuinely broken reached edge, not later hypothetical gaps.
- Write rule: no writes unless a reader establishes a small, reached defect and ownership is collision-free.
- Applied now: MC implementation writer notified (async, non-interrupting) to fold the lens into its report's NEXT section. Deployment and mission lanes complete; their results stand as reader evidence.
