# GAP REGISTRY — compressed draft (backlog compression, 2026-10-04)

Draft only. Does not overwrite GAP_REGISTRY.md. Source: full registry as of 2026-10-01 ~17:52 MDT, updated against tonight's state (claim-projection implementation, registry-transition fixes, six authority bypasses closed, pentest 11/11, connector registry built, Vercel Git-link in flight).

Standing rule applied: the backlog should shrink as understanding improves. Be aggressive on DELETE/MERGE/STALE, honest about evidence.

Class key: A = close a proven seam · B = direct user value · C = reliability/security · D = multiplies future development · E = research · F = speculative.

Flag key: DELETE = no longer a gap · MERGE = folds into another item · ALREADY SOLVED = proven closed, record only · STALE = status unknown, re-verify before reinvestment · BLOCKED BY DECISION = needs Nolan's word (exact question named).

Decision line per item: DECISION / DEFAULT / EVIDENCE / RISK / REVERSIBILITY / RECOMMENDATION. One item decidable in under a minute unless constitutional.

## A — CLOSE A PROVEN SEAM

### A1. FYD primitives (66/66 green) not wired into the product
DECISION: authorize wiring or explicitly defer. DEFAULT: leave unwired (archaeology-first). EVIDENCE: JSON Patch 30/30, outcome sensor 24/24, readiness compiler 12/12 re-verified; fyd-build branch dirty, no remote, HEAD 841825c. RISK: wiring unreviewed primitives into the product path. REVERSIBILITY: high (wiring is a patch). RECOMMENDATION: BLOCKED BY DECISION — Nolan: wire, or hold?

### A2. `relate()` has zero production callers; wiring patch delivered-but-unlanded
DECISION: land the wiring patch or remove the dead RELATE stage + test. DEFAULT: dead stage stays. EVIDENCE: patch exists in perfecting-pass-2026-09-27 hidden files. RISK: deleting the stage loses the code. REVERSIBILITY: high either way (patch saved, deletion commits history). RECOMMENDATION: BLOCKED BY DECISION — Nolan: land or remove?

### A3. MC could not surface stuck claim-generation missions
DECISION: none needed — close when tonight's lane proves live projection. DEFAULT: keep open. EVIDENCE: registry transitions assigned→failed / waiting→failed now legal and TESTED (falsifiable tests); claim-projection implementation 11/11 unit + scratch-Postgres E2E; live wiring lane in flight tonight. RISK: closing before live proof. REVERSIBILITY: n/a. RECOMMENDATION: keep open as the live-wiring acceptance item; delete only after new CLAIM_CREATED events project through the gateway composition path.

### A4. Claim-projection live gateway wiring (tonight's lane)
DECISION: crew executes (authorized). DEFAULT: proceed. EVIDENCE: projection implemented and tested; composition site check (exactly one intended consumer path, no second projection authority) added tonight. RISK: introducing a second projection authority at the composition site. REVERSIBILITY: medium (wiring commits are revertable; graph edges are idempotent). RECOMMENDATION: wire, prove one new CLAIM_CREATED end to end, do not bundle the 18-event backfill.

## B — DIRECT USER VALUE

### B1. FYD proof chain (Happy Place + Coppersmith via approved private device path): server start + private URLs not delivered
DECISION: deliver or report blocker. DEFAULT: crew delivers. EVIDENCE: none yet delivered. RISK: low (private path). REVERSIBILITY: high. RECOMMENDATION: crew-owned; deliver or name the blocker by next check-in.

### B2. ping-website browser verification (screenshots + zero console errors)
DECISION: verify via eligible browser delegation. DEFAULT: verify. EVIDENCE: typecheck clean, Next build green, 33 static routes (tonight); no PNGs in repo. RISK: browser time cost only. REVERSIBILITY: n/a (read-only proof). RECOMMENDATION: crew-owned; run the browser proof, record or open defects.

### B3. Threads replacement seeds outstanding since pass 155
DECISION: produce seeds or bless the pool approach. DEFAULT: crew produces. EVIDENCE: passes 155–171 all note it. RISK: pool stays thin, passes burn passes on known handles. REVERSIBILITY: high. RECOMMENDATION: crew-owned; seeds this week or escalate to Nolan for the pool-approach decision.

### B4. FB pool thin (539→427→75→2 eligible); tiered geographic expansion authorized
DECISION: execute closest-first, never skip yielding tiers. DEFAULT: execute (authorized 2026-10-01). EVIDENCE: guard rails unchanged, deterministic eligibility holds. RISK: over-broad geo dilutes local relevance. REVERSIBILITY: high. RECOMMENDATION: crew executes; IN PROGRESS.

## C — RELIABILITY / SECURITY

### C1. Gateway rebuild/restart decision (MERGE of old P0 + P4)
DECISION: authorize the gateway rebuild/restart to serve the committed auth fix. DEFAULT: rebuild stays on HOLD. EVIDENCE: unauthenticated POST /tenants confirmed live, fixed at source (0b8b130c), hostile re-test 3/3 green (INTEGRATION); served container still vulnerable; served gateway also predates HOLD sweep / markHold / tenant enforcement and reports /health 503. RISK: restarting serves the fix but changes the served surface under other lanes. REVERSIBILITY: medium (rebuild is forward-only; old image retained). RECOMMENDATION: BLOCKED BY DECISION — Nolan: authorize rebuild, or keep HOLD? (Carries the 8 owner decisions from the 12:17 wave note.)

### C2. Gate adjacent unauthenticated mounts (/deployments, /runtime, /identities, /context, /system, /api/v1/repository) + fix DELETE /tenants/:id pool bug
DECISION: crew executes, one proposition per commit. DEFAULT: proceed. EVIDENCE: observed during the P0 probe; DELETE 500s on pool undefined. RISK: gating a mount that a live caller uses. REVERSIBILITY: high (one-line gates, per-commit). RECOMMENDATION: crew-owned; IN PROGRESS tonight (P0b/P0c lane). No deployment or restart.

### C3. C: disk below 15% headroom invariant
DECISION: pick a reclaim lever (docker build cache 7.5 GB, npm cache 1.1 GB, VHDX compaction, or accept risk). DEFAULT: accept current ~5% with growth watch. EVIDENCE: tonight freed 250 MB (duplicate Goose zip); post-cleanup ~23 GB free ≈ 4–5%. RISK: C: exhaustion stalls the Pig. REVERSIBILITY: medium (docker cache regrows; VHDX compaction needs wsl --shutdown). RECOMMENDATION: BLOCKED BY DECISION — Nolan picks the lever. No VHDX moves, no docker prune, no DB relocation without his explicit word.

### C4. Deploy worktree `deploy/interval10-forensics-20260930` + merge `67da6aab1` gone from disk
DECISION: confirm expected post-certification cleanup vs lost-work needing rebuild. DEFAULT: none (must ask). EVIDENCE: absent from ~/workspace/.worktrees/. RISK: rebuilding work that was deliberately retired (waste) or ignoring real loss. REVERSIBILITY: n/a. RECOMMENDATION: BLOCKED BY DECISION — Nolan: expected cleanup, or rebuild?

### C5. Oracle tenant backfill UPDATE vs append-only triggers; journal sealed at 2557 rows
DECISION: pick repair class — (a) maintenance window backfill, (b) COALESCE read-path + DEFAULT UNKNOWN (coordinator-recommended, shadow-proven), (c) trigger-absent-gated UPDATE. DEFAULT: (b) if Nolan does not pick (recommended). EVIDENCE: verified live 17:45 MDT; (b) shadow-proven. RISK: (a) touches sealed history; (c) widens trigger surface. REVERSIBILITY: (b) is read-path only, fully reversible. RECOMMENDATION: BLOCKED BY DECISION — recommend (b) unless Nolan says otherwise.

### C6. Ollama publishes 11434 on all interfaces
DECISION: Option A (recreate open-webui on shared net + rebind ollama to 127.0.0.1; exact commands captured) or Option B (Windows Firewall inbound block, zero container changes). DEFAULT: none (must ask — Option B is the cheap reversible one). EVIDENCE: assessed, untouched. RISK: Option A restarts containers; Option B only affects inbound. REVERSIBILITY: both high. RECOMMENDATION: BLOCKED BY DECISION — recommend Option B as the first move.

### C7. BACKLOG_NOLAN storage items 7/8 conflict (monitor+evacuate vs fix-writers; thresholds vs 15% invariant; relocation vs no-relocation rule)
DECISION: retire both as superseded by closed-form invariants, or keep item-8 investigation open. DEFAULT: retire (invariants are closed-form now). EVIDENCE: standing invariants (2026-10-03): C: ≥15% headroom, no VHDX move/delete, no docker prune, no DB relocation without Nolan's word. RISK: retiring buries a real investigation. REVERSIBILITY: high (doc change). RECOMMENDATION: BLOCKED BY DECISION — recommend retire.

### C8. Unclear follow-up mission `3b0f430a06a41357` in created/UNCLAIMED
DECISION: claim or close with a decision record. DEFAULT: crew closes with record if no owner emerges. EVIDENCE: scheduler record exists. RISK: closing a live intent (low — no claims since 10-01). REVERSIBILITY: medium. RECOMMENDATION: crew-owned; re-probe, then claim or close.

### C9. Storage lifecycle contract (Nolan item 30) unwritten; required before first byte-producing cron
DECISION: crew drafts, Nolan signs off. DEFAULT: draft. EVIDENCE: none written. RISK: cron bytes with no retention/eviction rule. REVERSIBILITY: high (doc). RECOMMENDATION: crew drafts this week.

### C10. Pig wake-lock reversal (revert AC sleep/display to before-values) unacknowledged
DECISION: verify before-values exist, then Nolan's word to execute. DEFAULT: hold interim policy. EVIDENCE: interim policy active. RISK: reverting removes the wake protection under authorized automations. REVERSIBILITY: high. RECOMMENDATION: BLOCKED BY DECISION — Nolan: revert or keep interim?

### C11. FYD `visibility-customize-dangling-import` (patch.ts untracked, provenance unverified, sha mismatch)
DECISION: commit a typechecked recovery copy, or drop. DEFAULT: none (typecheck/commit is Nolan's call). EVIDENCE: sha mismatch vs proven copy. RISK: committing unverified recovery code. REVERSIBILITY: high. RECOMMENDATION: BLOCKED BY DECISION — Nolan: typecheck + commit, or drop the recovery path?

### C12. FYD-034 (260-commit push status unknown) vs FL-20260919-004 (push blocked, egress-proxy 401)
DECISION: (1) is the 401 resolved? (2) exactly what is pushed? (3) authorize a new push attempt? DEFAULT: hold — no push without explicit word. EVIDENCE: Sept 19 blockage; no fresh evidence. RISK: pushing 260 unknown commits to the wrong target. REVERSIBILITY: low (push is public). RECOMMENDATION: BLOCKED BY DECISION — recommend re-verifying transport first, then a bounded push plan.

### C13. Gateway self-reports unhealthy: `event_governance` degraded (12 NAMESPACE_VIOLATION of 150), `embedding` not initialized
DECISION: address, or accept as known-degraded. DEFAULT: watch (Ask FYD itself healthy). EVIDENCE: /health output; Ask FYD verified healthy 17:45 MDT. RISK: normalization of degraded core. REVERSIBILITY: n/a. RECOMMENDATION: crew-owned watch; escalate if the violation count grows or Ask FYD degrades.

### C14. FYD-010 privacy gate: adversarial proof that a PUBLIC VIEWER cannot retrieve PRIVATE/PING_ONLY/OWNER fields
DECISION: run the proof; Nolan accepts it. DEFAULT: no increased private-data exposure until proven. EVIDENCE: closure ledger DONE_VERIFIED 2026-09-27, but release criterion is adversarial proof. RISK: shipping a leak is the concrete release blocker. REVERSIBILITY: n/a (gate). RECOMMENDATION: crew-owned; IN PROGRESS tonight. If any leak is found, FAIL with the exact path.

### C15. X tail-scanner standing fix (false positives dormant since 13:14)
DECISION: repair the scanner. DEFAULT: crew repairs. EVIDENCE: passes dodge by rephrasing; false positives dormant. RISK: low. REVERSIBILITY: high. RECOMMENDATION: crew-owned; fix the scanner rather than letting passes keep dodging.

### C16. 18-event bounded backfill: plan only, do not execute
DECISION: produce the plan (18 exact event IDs, current graph baseline, idempotency proof, expected nodes/edges, dry run, post-run digest/count, rollback/rebuild strategy); execute only on explicit authorization. DEFAULT: hold execution. EVIDENCE: implementation is idempotent and deterministic. RISK: backfilling 18 events without a plan risks double-projection. REVERSIBILITY: medium (rebuild strategy required). RECOMMENDATION: crew produces the plan tonight; execution stays BLOCKED BY DECISION.

### C17. Vercel GitHub→Vercel connection (operational configuration change)
DECISION: link piging2/fyd in fyd-product Git settings; then prove commit/push → expected trigger → exact SHA deployed → health → rollback path. DEFAULT: proceed once signed in. EVIDENCE: zero repository webhooks; manual deploy works, automatic does not. RISK: misconfigured branch or env changes. REVERSIBILITY: high (disconnect/revert). RECOMMENDATION: crew executes; IN PROGRESS tonight (blocked on sign-in card).

## D — MULTIPLIES FUTURE DEVELOPMENT

### D1. page-insights producer not on the served line; scheduled proof unproven (SCHEDULER_NOT_SCHEDULED)
DECISION: authorize merging the producer line to the served line? DEFAULT: hold. EVIDENCE: runonce fired 09:01; known blockers (merged gateway has no Bearer port; Lane L backfill conflict). RISK: merging a producer into the served line under the rebuild HOLD. REVERSIBILITY: medium. RECOMMENDATION: BLOCKED BY DECISION — sequence after the gateway rebuild decision (C1).

### D2. ping-parallel Codex commits (~20 files WIP, e25fca33 / 1326d275 / f565e785 landed)
DECISION: re-inventory before reinvestment. DEFAULT: do not touch. EVIDENCE: state from 2026-10-01; tonight's 15-worker wave landed elsewhere (ping/website @ c8f062d7). RISK: refining a stale branch wastes writer time. REVERSIBILITY: n/a. RECOMMENDATION: STALE — re-inventory the branch, then either refine per the 17:31 directive or retire.

## E / F — RESEARCH / SPECULATIVE

### E1. Journal convergence (old M3): three divergent journal files, dedicated worker attacking steps 2–7
DECISION: re-probe before any further investment. DEFAULT: do not invest. EVIDENCE: state from 2026-10-01 18:00–18:03; no worker report has landed in this record. RISK: re-investing in a resolved or relocated problem. REVERSIBILITY: n/a. RECOMMENDATION: STALE — one fresh inventory probe; only then re-sequence the writer convergence (fix: point writers at journal #1, retire :18200 fork after unique history is characterized).

### F1. MC dispatch proof ("Mission Control can now dispatch a real headless agent")
DECISION: defer until execution lineage + attention inbox are proven. DEFAULT: do not run. EVIDENCE: none; it is a capability-expansion test, not a seam closure. RISK: building control surface before inspectability. REVERSIBILITY: n/a. RECOMMENDATION: PARK — revisit after A3/A4 land and the lineage view exists.

### F2. Adversarial probe families (Q1–Q30, compressed)
The 30 OPEN probes stand as a falsification checklist, not 30 separate gaps. Families, class, and disposition:
- Truth/journal (Q1–Q5): C, folds into E1 (re-probe with the inventory).
- Security/authority (Q6–Q9): C. Q6 served-level → MERGE into C1. Q7 (forge tenant/actor/capability), Q8 (fabricated approval displayed as legitimate), Q9 (journal writer bypasses) → stay OPEN as crew-run hostile probes; cheapest next probe wins.
- Effect safety/deployment/reachability (Q10–Q12): C. Q10 (served bytes match tested source) → re-run after C1. Q11 (idempotency at the effect boundary) → OPEN probe, highest-value durability question. Q12 (dead code in the served product) → research, E.
- Durability/replay (Q13–Q15): C, re-probe after C1 (process-death semantics unknown until the served line is the tested line).
- Observability/MC (Q16–Q18): C. Q17 (one screen answers what/why/who/what ran/what was verified) → MERGE into the MC endpoints lane's lineage acceptance. Q16/Q18 → keep as acceptance probes for that lane.
- ORCA (Q19–Q20): C. Q20 (proposal vs execution distinguished) is the inspectability acceptance for A3/A4.
- Visual product (Q21–Q25): B/E. Keep as the visual-integration acceptance set; none is a gap today.
- FYD/privacy (Q26–Q27): C. Q26 → MERGE into C14 (same gate). Q27 (owner correction without rewriting observed truth) → OPEN, acceptance for the FYD owner loop.
- TenantOS/placement (Q28–Q29): E. Q28 only when a real mission proves placement the first broken edge (Nolan's rule). Q29 stands as the no-PING-specific-hack invariant.
- Learning (Q30): F. Standing question; answered weekly by evidence, never by assertion.

## FLAGGED — shrink log

DELETE (no longer gaps; record kept in the changelog of the source registry):
- P7: 42 intents OPEN/UNKNOWN_EXECUTION — terminal, genuinely unknowable, guard already prevents re-targeting. Not a queue.
- P8: backlog hygiene — FIXED 17:46 MDT.
- P14: pipeline reconcile — FIXED 17:45 MDT.
- A2: Ask FYD healthy — HEALTHY, not a gap.
- F5: Codex webdev harvest — a noted state, not a gap (paths-only until Codex re-engaged).
- W3: never-touch happy-place origin — a standing guardrail, not a gap. Nothing violated.
- W4: memory-claim correction — resolved note.

MERGE:
- P0 → C1 (gateway rebuild decision absorbs the undeployed auth fix).
- Q6 served-level → C1. Q26 → C14. Q16–Q18 → MC endpoints lane acceptance. Q17 → lineage view acceptance.

STALE (re-verify before reinvestment; do not delete blindly):
- P13: discovery-scheduler failure streak — resolved as watch, streak ended 2026-10-01. Two watched runs were due Oct 2; confirm before deleting.
- P2's sibling question is covered by C4; nothing else stale in Pillar 1.
- D2 (ping-parallel WIP), E1 (journal convergence) as noted above.

ALREADY SOLVED (record, do not re-work):
- P9: "25 stuck missions" — re-verified twice: zero non-terminal missions in both DBs. Resolved history since 2026-09-30.
- Registry transitions assigned→failed / waiting→failed — fixed and TESTED with falsifiable tests (commits dafe6681e, afbb35b97).
- Claim-projection implementation — 11/11 unit + scratch-Postgres E2E, byte-identical evidence retrieval (commits b8612f344, a12f3c809, 287d0d953). Live wiring still open (A4).
- Six authority bypasses — closed; pentest suite 5/11 → 11/11.
- Canonical serialization collision — fixed (in the 30-worker wave).
- Connector registry — built tonight (workspace/connectors/connector-registry.md); Meta creds consolidated.

BLOCKED BY DECISION (exact questions for Nolan — the only handoff material):
1. C1: authorize the gateway rebuild/restart, or keep HOLD?
2. C3: which disk reclaim lever (docker cache, npm cache, VHDX compaction, accept risk)?
3. C4: deploy worktree gone — expected cleanup or lost work?
4. C5: Oracle repair class — (a) maintenance window, (b) COALESCE read-path (recommended), (c) trigger-absent-gated UPDATE?
5. C6: Ollama exposure — Option B firewall block (recommended) or Option A rebind?
6. C7: retire BACKLOG_NOLAN items 7/8 as superseded (recommended)?
7. C10: Pig wake-lock reversal — revert or keep interim?
8. A1: FYD primitives — wire into the product or defer?
9. A2: relate() — land the wiring patch or remove the dead stage?
10. C11: patch.ts recovery — typecheck + commit, or drop?
11. C12: FYD-034 push — authorize a bounded push attempt after transport re-verify?
12. D1: merge the page-insights producer to the served line?
13. C16: authorize the 18-event backfill after the plan is clean? (ask only after the plan lands)

## Counts

| Class | Active items |
|---|---|
| A — close a proven seam | 4 (2 blocked by decision, 2 in progress tonight) |
| B — direct user value | 4 (1 in progress) |
| C — reliability/security | 17 (8 blocked by decision, 4 in progress tonight) |
| D — multiplies future development | 2 (1 blocked by decision, 1 stale) |
| E/F — research/speculative | 3 (+ 30 probes compressed into 9 families, mostly OPEN acceptance probes) |
| Total active | 30 |
| DELETE | 7 |
| MERGE | 4 |
| STALE | 3 |
| ALREADY SOLVED | 6 |
| BLOCKED BY DECISION | 13 |

Net: 35 registry gaps + 30 probes compressed to 30 active items + 9 probe families + 20 shrunk entries. Tomorrow's one-by-one review walks the 13 BLOCKED BY DECISION questions only — each decidable in under a minute per the DECISION/DEFAULT/EVIDENCE/RISK/REVERSIBILITY/RECOMMENDATION format above.
