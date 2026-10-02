# LANE B6: Business Intelligence (Phase 10)

**Status: HYPOTHESIS until replayed from a clean checkout.** Read-only lane. T+0 = 2026-09-28 14:26 MDT; this lane ran ~14:39-15:00 MDT.

## Method and grounding

This report answers, per question, (a) whether PING can answer the question from existing canonical state, and (b) what the last-observed canonical state actually says, with evidence references or UNKNOWN plus the exact missing evidence named.

Evidence base: lane 10 (ORCA knowledge: context compilers, 12-question gap map), lane 15 (memory taxonomy: durable stores, conflation map), lane 9 (phase-0 inventory: tree state, dirty batch, served-vs-worktree staleness), lane 12 (recovery adversary), lane 13 (security adversary), lane 14 (worker contract), lane 16 (falsifier), lane 11 (decision fabric), lanes 2-8 (donor mechanisms), and the program LEDGER. All of those are themselves hypotheses until clean-checkout replay; this report inherits that status.

Transport note: two Pig SSH probes this turn timed out with zero output (known flakiness; AGENTS.md advises BatchMode retry). This lane performed no new canonical-tree reads. Everything below is as-last-observed from the cited lane reports. Where a fresh re-probe was needed but unavailable, it is recorded as UNKNOWN with `PROBE_TRANSPORT_FAILED`, never inferred.

## The four kept-distinct dimensions

- **Executor success**: the transport/executor ran and the outcome kind was recorded (transport-failed / timeout / ran / verified result envelope). Example: `MC_RUN_SUCCEEDED` with `result_id`.
- **Action verified**: a verifier confirmed authorized == invoked == result (lane 14: three-way binding, exact echoes, non-retryable validation). Verification is a separate event from the action.
- **Effect observed**: an evidence-linked record that an effect occurred (journal event with evidence refs). This is not the same as verification.
- **Business outcome observed**: an owner/customer-level consequence (a reply, a correction, an engagement metric, a conversion). Canonical state contains almost none of these; none are manufactured.

No business score is computed. The task forbids it, and the evidence does not support one (empty claims store, no persisted customer questions, no measured customer-side outcomes).

---

## 1. What business is this?

**Verdict: capability REACHED, specific named answer UNKNOWN.**

- PING can describe the business represented in its FYD tenant graph from canonical state. The governed read seam (`PingObjectReader` -> `fyd-tenant-graph.ts`) composes the live tenant graph from fixture plus journal overlays with digest verification at both layers, and the Ask FYD serving path (`buildAskContext` in `src/lib/ping/ask-composer.ts:189`) answers questions about it today with evidence-cited answers (lane 10, Q1 REACHED; compiler Q1 REACHED post-patch).
- The graph's provenance vocabulary shows the tenant content is largely demonstration material: provenance kinds observed include `procedural-fixture`, `demo-overlay`, `owner_asserted`, `website-ingestion`, `canonical-journal`, `directory`, `owner-authored`, `owner-correction` (lane 15). The served :3100 build runs with demo-owner mode explicitly ON for every restart (workspace AGENTS.md, :3100 restart protocol). The claims store (`data/fyd-claims/`) is EMPTY; the claim lifecycle machinery is wired but no real claims exist (lane 15).
- **UNKNOWN (named identity):** the fixture tenant's actual business name was not recorded by lanes 10, 15, or 9, and this lane's Pig re-probe failed with `PROBE_TRANSPORT_FAILED`. Missing evidence: a fresh read of the fixture base graph (e.g. `src/fyd/data/` fixture objects) or the journal's `FYD_SITE_OVERLAY` records naming the tenant business.
- Note: PING Social (the user's business) is not represented in the canonical tree as a tenant; the tree's business content is FYD demo tenant content. Do not conflate the product's operator with its demo businesses.

## 2. What changed?

**Verdict: PARTIAL (reachability for the dispatch-time packet; PARTIAL for the Ask path).**

- Change events exist in the journal. Overlay ops carry `provenance.derivedAt` and accumulate `ping-event:<id>` in `updatedRefs` per `fyd-tenant-graph.ts` (lane 10, Q2). The journal (`data/fyd-journal/events.jsonl`) last wrote 2026-09-27 20:44 MDT, ~18h before T+0 (lane 9). Owner intent changes are append-only with `provenance.supersedes` chains and `owner.restored-fact` reverts, corrections preserved in the log (lane 15).
- The worktree itself changed in one stamped dirty batch 2026-09-27 22:55-23:00 MDT: 144 files (74 modified, 70 untracked), no active writer for ~15.5h at T+0 (lane 9). The ContextPack patch then landed on the patch branch at `9a555021` (LEDGER).
- The Ask path surfaces `updatedRefs`/`lastChecked` in citations (lane 10, Q2 PARTIAL).
- **Missing:** no per-claim STALE/changed tag exists in the compiler (G12 recency affects scoring only; lane 10); STALE is derived per read (`sourceDrifted`) and never written (lane 15). So "what changed" is answerable from event sequence, not from claim-level change tags.

## 3. What is stale?

**Verdict: PARTIAL, weak. Staleness is detectable in places, representable in none.**

- The served `:3100` build is ~17.5h stale relative to the worktree (built 2026-09-27 21:00:32, tree HEAD includes later work; lane 9). Behavior verified through `:3100` reflects the old build, not the current tree (lane 10 caveat).
- Staleness indicators observed: journal quiet ~18h (lane 9); `codex blockedUntil 2026-09-17` expired, a stale config (lane 11, resolved as intended-temporary by lane 16); lane 11's "patch branch ABSENT" line went stale within the hour (lane 16).
- **Missing (named):** STALE is not a stored tag anywhere. `sourceDrifted` is derived per read and never persisted (lane 15). The compiler's `classificationFromProvenance` has no STALE mapping; lane 16's falsifier proved the proposed attack-9 retraction test surfaces UNKNOWN, not STALE. No freshness SLO or stale-claim ledger exists. A claim that was true and may no longer be true cannot be distinguished from a claim that is simply old.

## 4. What conflicts?

**Verdict: REACHED in the live Ask serving path; ABSENT in the context compiler/packet.**

- The Ask serving path carries the complete, locked conflict model (`src/fyd/ask/field-conflicts.ts`, FYD-Q1 locked 2026-09-24): `AskFieldConflict` with `status: unresolved | resolved`; both observations survive in evidence; the disputed value is suppressed in the public projection; citation code marks conflict cites CONFLICTED; public copy is fixed to "Contact information is being verified." (lane 10, Q5; lane 15).
- The context compiler cannot represent CONFLICTED: no mapping, no conflicts input (lane 10, Q5 ABSENT; lane 15 absence audit). Lane 10's smallest-gap proposal (owner: FYD Ask lane) would close this by adding `conflicts?: AskFieldConflict[]` to `CompilerInput` and minting conflict observation refs `<objectId>#<field>#conflict-<index>` classified CONFLICTED. That patch has not landed.
- **Observed conflict instances:** none reported by any lane. The conflict machinery is live and locked, but no active conflicts were recorded in the evidence this lane consumed. Conflict projection policy is stronger than conflict inventory.
- Vocabulary hazard: three epistemic vocabularies (compiler classification, Ask FactClass, MC projection vocab) have no canonical mapping; `classificationFromProvenance` exists twice with different mappings (lane 10, lane 15 conflation #2). A conflict assertion compiled by one vocabulary cannot be faithfully carried by another.

## 5. What does the owner want?

**Verdict: PARTIAL. Owner assertions are preserved; standing owner intent is not compiled.**

- Owner assertions are first-class and survive every surface: the owner-overlay projection composes owner corrections AFTER digest verification with the full correction record (source value, owner value, timestamp, actor label, basis) carried per object; surfaces can render SOURCE SAYS X / OWNER SAYS Y honestly (lane 15). The compiler preserves owner assertions as `USER_OVERRIDE` (lane 10, Q7).
- Owner intent as a decision primitive: the Ask FYD proposal flow (`AskProposal`/`proposalDigest` with human approval of the exact digest) is the nearest intent-as-decision primitive; it is not packet-visible (lane 10, Q7). Lane 10 found no `WAITING_APPROVAL` primitive in `src/`.
- Standing owner directives observed in this program's context (operator-level, not canonical): (a) the jev namespace fix is HELD for the owner's authorization, parent presented the one-decision ask (LEDGER); (b) the Reaper-vs-HOLD design gap "needs Nolan" (workspace AGENTS.md 2026-09-24; lane 12 confirmed the violation in code); (c) the canary-rollout auto-vs-human promotion policy is a policy question for the owner (lane 4).
- **Missing:** intent/approval-state input to any context packet; a compiled view of what the owner has approved, proposed, or is waiting to approve.

## 6. What are customers asking?

**Verdict: ABSENT as durable knowledge. UNKNOWN as an event history.**

- The compiler detects question intent at request time (`questionSignals`/`questionIntents` over 8 keyword families) but persists nothing (lane 10). The Ask path returns honest unknowns (`noEvidenceAnswer`) when evidence is absent (lane 10, Q6). Engagement actions persist only minimally (`data/fyd-follows/local.json`, `data/fyd-likes/local.json`: site key + timestamp; lane 15).
- **Missing (named):** no ask/question log, no demand-signal store, no persisted record of actual customer questions exists in canonical state. Whether any real customer question has ever been asked of the canonical deployment is UNKNOWN; the missing evidence is an ask-request log or journal admission of ask events.
- Note: the 24h program's lanes are researcher/agent activity, not customers. Do not count lane activity as customer demand.

## 7. What actions have we taken?

**Verdict: PARTIAL. Agent-operation actions are journaled; business-effect actions are not.**

- Journaled: `MC_*` lifecycle events (mission created, run queued, execution started, agent authorized, run succeeded/failed/unknown) written by the dispatch slice (lane 12); 409 HOLD records on duplicate intent (lane 12 S3/S4); owner corrections and approvals in the owner event log and idempotency ledger (lane 15); local engagement actions (follows/likes; lane 15).
- The dispatch slice emits executor-success records (`MC_RUN_SUCCEEDED` with `result_id` via `verifyResultEnvelope`) and first-class UNKNOWN records (`MC_RUN_UNKNOWN`); verification (lane 14's three-way agent binding) is strong where it runs.
- **Missing / not taken:** no reconciler has ever run (reconciliation explicitly withheld; `agents/route.ts:210-219`; lane 12); no live dispatch executed by this program's lanes (lane 12 UNTESTABLE-SAFELY items); no dedup-conflict resolutions, no late-result ingestions. Program-level engagement metrics (outreach sends, social engagement passes) live in the Muse/outreach machinery and assistant operational memory, which lane 15 correctly scopes OUT of the product tree.

## 8. What actually worked?

**Verdict: mechanism-level successes are evidenced; business outcomes are absent.**

Executor-success and effect-observed evidence (code-level unless stated):

- Test suite: last full run 2026-09-27, 207 suites, 196 pass / 11 fail; 2230 tests pass / 22 fail against a known-failing list (lane 9). Current state after the dirty batch: UNKNOWN.
- Journal gateway: dedupe by request_id proven (`dedupe.test.mjs`), torn-write crash window proven (`h-crash-window.test.ts:153`) for the FYD gateway (lane 12 S5). The MC dispatch journal's torn-write skip path is code-only, untested (lane 12 S5).
- Secret broker: renewal denies expired handles (EXPIRED) and beyond-cap renewal (PERMISSION_DENIED); rotation resolves new values for unexecuted handles, seals executed ones, leaks no secret material (lane 12 S7/S9).
- Approvals: silence-is-never-approval (`approval_request.py:25-28`), expiry maps to EXPIRED/HOLD outcomes (lane 12 S8).
- Tenant isolation: `resolveCaller` refuses unknown keys; mission ids tenant-bind in the hash; hostile privacy suite passes both directions (lane 12 S10).
- ContextPack patch: 4/4 jest pass in the patch worktree AND in a pristine clean-checkout replay at `9a555021`; falsifier: pre-patch packet zero obj:/field:/rel: refs, post-patch 32 (LEDGER).
- Jev shadow sensor: 6/6 agreement, Brier 0.0076 (LEDGER). **Falsified as a measurement:** lane 16 recomputed the arithmetic (one mean was wrong: 422ms reported vs 429.8ms true), found n=6 hand-picked with 3 of 8 deny checks unexercised, and showed the 0.5 threshold is lane-imposed (threshold <= 0.19 flips S6 to GRANT). Verdict: first smoke test, not a measurement; calibration NOT established.
- **Action verified vs business outcome observed:** even where verification is strong (lane 14's three-way binding), the verified actions are internal agent operations. **Business outcome observed: zero.** No reply, conversion, retention, or revenue signal exists in canonical state. The claims store is empty; customer-question history is absent.

## 9. What failed?

**Verdict: well-evidenced internal failures; zero business-outcome failures observable.**

- The jev scheduler incident: gateway `NAMESPACE_OWNERS` has no jev entry, so every `JEV_DECISION_EVALUATED` emission was rejected as NAMESPACE_VIOLATION with /health degraded (LEDGER). **Mechanism corrected by lane 16:** not unbounded retry (scheduler: max_attempts 3, backoff 5000ms, then terminal/DLQ); the steady state is re-minted doomed missions. The fix is HELD for the owner's authorization; 3 jev-shadow scheduler missions are explicitly out of bounds for this lane (mission ids 402152d14539171b, 70e962a9d257c6dc, a5dc21a36107b0a5).
- Unwired declared machinery: `compileAskContext` had zero production callers (now the patch's single call site, unpushed branch); `verifyAnswerClaims` still has zero production callers; the executor received the raw prompt, not the artifact (lane 10; lane 14 confirms binding the work order is NOT sufficient; spec adds `input_digest` to make artifact receipt verifiable).
- Zero test files reference `mc-dispatch`; zero dedicated unit tests reference `authorizeWorkOrder` (lane 11/14 R9; lane 12 S1/S3/S15).
- `reapExpiredLeases()` in the Pig-side ping-runtime (`mission_runtime.js:331`) resets expired-lease missions to `created` with `retry_at = NOW()`: lease-expired -> redispatch, the exact forbidden pattern (lane 12 S7). Liveness of that runtime against a live deployment: UNKNOWN. Flagged by parent as possible active external-effect risk.
- Terminal transitions are set, not WON (no CAS single-winner guard; lane 12 S13); transport-failed misclassification renders possibly-delivered runs as FAILED via the abort-substring heuristic (lane 12 S2/S12); effect-succeeds-but-event-write-fails loses the result entirely (lane 12 S16, weakest edge #2); no quiescence gate for future re-drive (lane 12 S19, weakest edge #3); coordinator-death recovery terminates at HOLD with no reconciler (lane 12 S4, weakest edge #1).
- 22 known test failures across 11 suites (lane 9); embedding init UNKNOWN; ping-vault unhealthy (not new; lane 9).
- ContextPack budget defect (carried, not approved): the 32-item evidence budget is first-come-first-served shared across kinds; with 8 objects x 4 fields all 32 slots fill with obj:/field: refs before any rel: ref, starvation is untracked in the packet ledger, and dangling `rel:<id>` references can point at unregistered entries (LEDGER budget evaluation).

## 10. What is uncertain?

**Verdict: UNKNOWN is first-class in doctrine; the specific unknowns are named.**

- `MC_RUN_UNKNOWN` is a first-class state with 409 HOLD on duplicates (lane 12). The write boundary's contract: a journal POST with unknown outcome (timeout/lost response) surfaces as UNKNOWN, never as failure; timeout never means failed (lane 15).
- Named unknowns (each with its missing evidence): journal sink-path convergence (in-tree `data/fyd-journal/events.jsonl` vs out-of-tree MC read path; missing: clean-checkout replay proving which MC reads); the nine unpushed constitutional-runtime commits (trunk @ 74fbb74) location (missing: a tree containing them); Qdrant embedding init state (missing: a live :6333 probe response); jev API cost (missing: billing surface); `confidence:null` unpopulated (missing: recorded response body); orca-adapter vs fyd-journal-gateway shared `.git` pointer anomaly (missing: re-verification; lane 9); reaper liveness against a live deployment (missing: deployment observation); whether mc-dispatch currently passes its (nonexistent) tests (missing: the tests).
- Program unknowns: served :3100 behavior reflects the stale build, so any runtime observation through it is ambiguous between old-build and new-tree behavior (lane 9/10).
- This lane's own observation gap: Pig transport failed twice, so no fresh canonical reads were possible; all verdicts inherit the replay-pending status of the lane reports they cite.

## 11. What opportunity is supported by evidence?

**Verdict: mechanism-level opportunities are evidenced; no business opportunity is scored.**

- Donor-harvested mechanisms with explicit verdicts (lanes 2-8): Talos mint re-decides at issue; Pioneer per-use credential fencing; Nerve single-winner CAS terminal transitions and drain-before-drive quiescence gates; Pi checkpoint-before-effect with replay-safety declaration; AgentArk typed promotion gates and paired live canary; POLYROB three-valued liveness probes; ShibaClaw fingerprint-bound approve-once grants; ORCH scope-prefix leases; nanoMuse model-proposes/code-disposes tidy-up; Hivekeep standing-context admission rule wording. Harvest shapes, not thresholds (lane 4 cross-donor note); ForkScout code harvest BLOCKED on license (README claims MIT, no LICENSE file).
- Lane-owned smallest gaps (carried as surgical-write candidates, Phase 16 only, each needs the 11-gate checklist; none approved): (a) compiler conflicts input (lane 10); (b) ContextPack 32-item budget starvation with dangling rel: refs and untracked count-cap drops (LEDGER); (c) lane-12 weakest edge #2, effect-succeeds-but-event-write-fails; (d) lane-14 gaps R1-R10 (posture-as-adapter-data, selection with no authority record, completion attribution without process binding, no cancellation, registry-state health, dual attempt bookkeeping, caller-supplied verifiedAt, null causation_id, zero authorizeWorkOrder tests, no redeem-time re-decide); (e) jev namespace registration.
- Lane-15 ownership answer: every knowledge category maps to an existing surface; there is no evidence supporting a new memory store, graph, or event spine. The gaps are discipline gaps (admission rule, vocabulary convergence, wiring the declared compiler), not storage gaps.
- No scored business opportunity is offered. A scored opportunity would require business-outcome evidence (customers asking, conversion, demand signals), which sections 6 and 8 show is absent from canonical state.

## 12. What needs owner attention?

**Verdict: three decisions require owner authority; one correction to the authorization ask.**

- **Jev namespace registration** (the owner's one-decision ask, presented by parent): fix assessment verdict FIX NEEDS GUARD (lane 13). Guards: re-run `test_verdict_authority.js` (A5) against the fixed image before/after deploy; record in-process source-string spoofing as possible-by-design; optional: enforce the NAMESPACE_OWNERS value and revive the dead OWNER_MISMATCH check by passing `authority_owner` through `emit()`. Lane 16's correction must ride the ask: the incident is bounded 3-attempt failures with re-minted doomed missions, NOT unbounded retry.
- **Reaper-vs-HOLD design gap**: lease-expired -> `created` -> redispatch confirmed in code (lane 12), matching the 2026-09-24 open design note. It needs the owner's design word before any watchdog/reconciler is deployed; do not ship the stuck-running watchdog on a hypothesis.
- **Canary promotion policy**: if PING adopts canary rollout, auto vs human promotion must be explicit auditable policy per surface (lane 4). Policy question for the owner.
- These are decisions requiring owner authority (per the CEO feed vs engineering ledger rule): they belong in the owner's feed, not buried in housekeeping.

## 13. What can PING safely handle itself?

**Verdict: the deterministic, code-gated, fail-closed invariants; nothing that requires owner authority or that is unwired.**

- Safe-by-code (observed in code, several tested): tenant refusal contract (`requireTenant` REFUSE, never empty fallback); request_id tenant-bound dedupe, fail-closed on cross-tenant reuse; deterministic event ids with duplicate-skip; 409 HOLD on duplicate non-terminal intents; digest-verified overlay composition with tenant scoping at the authority; server-is-digest-authority on owner actions (client never supplies the digest); capability-chain 403 on owner mutation; silence-is-never-approval; timeout-surfaces-as-UNKNOWN; append-only owner log with supersedes chains; immutability of journal events.
- These are code gates, not docstrings (lane 15). Where tests exist (journal dedupe/crash window, broker renewal/rotation, approval expiry, tenant privacy hostile suite), the safety is pinned; where tests do not exist (all of mc-dispatch, authorizeWorkOrder, the dispatch torn-write path, the 409 HOLD path), the safety is code-review-only and should be treated as unproven.
- Not safely self-handled: anything that writes or repairs production state on a hypothesis (the Reaper question, the jev fix, reconciler deployment), anything requiring owner authority, and any claim about served behavior (the served build is stale; the tree is dirty).

## 14. What is PING currently doing and why?

**Verdict: running a bounded intelligence program under read-only default; holding known defects for owner authorization.**

- The 24h intelligence maximization program (T+0 2026-09-28 14:26 MDT, T+24 2026-09-29 14:26 MDT): Wave A lanes (donor harvests 2-8, phase-0 inventory 9, ORCA knowledge 10, decision fabric 11, recovery adversary 12, security adversary 13, worker contract 14, memory taxonomy 15, falsifier 16) all landed as hypotheses. Wave B spawned 14:39 MDT: B1 decision-surface deep map, B2 processor tournament, B3 ORCA-vs-patched-dispatch re-trace, B4 recovery torture execution, B5 work-contract replaceability, B6 this lane (business intelligence), B7 Mission Control observability, B8 object/protocol portability, B9 continuous security adversary, B10 Wave B falsifier. T+20 freezes discovery; T+24 ships the package (LEDGER).
- The ContextPack patch is baseline at branch `decision-fabric/contextpack-wire-2026-09-28`, commit `9a555021`, NOT pushed, not to be modified by lanes (LEDGER). It closes the EVIDENCE -> ORCA CONTEXT edge by evidence (4/4 tests in clean-checkout replay) while leaving executor-receives-raw-prompt and verifyAnswerClaims-unwired open.
- The served `:3100` (PID 23046, started 06:18 MDT) continues to serve the stale build; per standing constraints no lane restarts it. The journal gateway serves the dirty `server.mjs`; journal quiet ~18h (lane 9). The scheduler continues re-minting doomed jev missions (bounded attempts, terminal/DLQ) because the namespace fix awaits the owner's word.
- Why: Nolan's standing operating rules. Bounded authorized automation with fail-closed behavior; detected restrictions become BLOCKED, never optimization problems; the platform-automation principle (not evasion). Housekeeping failures go to the engineering ledger; the owner's feed carries only user-visible progress, security/canonical incidents, external-effect risks, the first broken product step, or decisions requiring owner authority. Known defects are held for authorization rather than self-repaired, and UNKNOWN is a legitimate state rather than a gap to paper over.

---

## Falsifiability

This report is falsified, in whole or part, by any of the following, verified from a clean checkout:

1. The fixture base graph names a real operating tenant business with non-demo provenance (falsifies section 1's UNKNOWN and the demo-content characterization).
2. A persisted ask/question log or customer-demand record exists in canonical state (falsifies sections 6 and 8's absence claims).
3. `verifyAnswerClaims` has production callers, or the compiler carries a conflicts input, or a STALE tag exists in a stored tag set (falsifies sections 4, 9, 10).
4. The patch branch `decision-fabric/contextpack-wire-2026-09-28` contains commits beyond `9a555021` or has been pushed (falsifies section 14's baseline claim).
5. The jev namespace fix landed without owner authorization, or the three jev-shadow scheduler missions were touched (falsifies section 12 and the standing-constraint claim).
6. Any lane report cited here is itself falsified on clean-checkout replay; the dependent section inherits the falsification.

## Open questions for the parent

1. Pig transport failed twice this turn (zero-output SSH timeouts). If the coordinator can reach the Pig, a 60-second read of the fixture base graph would close section 1's named-identity UNKNOWN without inventing it.
2. Whether the parent wants a follow-on lane to attempt the section 6 missing-evidence search (ask-request logs, demo-owner-mode telemetry) outside the canonical tree, in the Muse/outreach machinery where program-level engagement metrics live.

---
*Read-only lane. No canonical tree modified, no gateway/:3100/jev missions touched, no commits, no pushes, no secrets read or printed. No em dashes used.*
