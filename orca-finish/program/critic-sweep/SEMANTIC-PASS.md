# SEMANTIC PASS (FRESH): CRITICS-SWEEP

**Critic:** CRITIC-SEMANTIC (fresh pass) | **2026-09-24 ~05:05 MDT**
**Scope:** new artifacts only, produced since SEMANTIC-AUDIT.md.
Read-only. No em dashes used. Prior audit's three recorded errors remain
acknowledged; this pass checks corrections and hunts new drift.

## S1. Terminal-set misquote: CORRECTED in ORCA-B VERDICTS.md

- DOMAIN: semantic consistency / COMPONENT: program/orca-b/VERDICTS.md
- CLAIM: the ledger terminal set is now quoted correctly
- EVIDENCE: STATIC. The ORCA-B checkpoint (T+75 entry) records adopting the
  critic-semantic correction: the work-order LEDGER is orca_status_model.js
  (10 delegation-unit states; terminal = FAILED / VERIFICATION_FAILED /
  CLOSED; no COMPLETED state) and the DURABLE WORK-ORDER RECORD is
  objective-runtime.js + orca_control_loop.js isTerminalWorkOrder (terminal =
  COMPLETED / FAILED / VERIFICATION_FAILED / BLOCKED). VERDICTS.md rule 2
  and the critic-scan section enforce the distinction. The checkpoint
  language is explicit: "These are two different state machines; never
  quote one set for the other."
- CALLER: CRITIC-SEMANTIC / CALLEE: ORCA-B lane
- WRITER: ORCA-B / READER: all lanes
- AUTHORITY: ORCA-B VERDICTS.md + CHECKPOINT.md (T+75)
- CLASSIFICATION: CORRECTION ACCEPTED. The prior error is fixed at the
  source that made it.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: none remaining in ORCA-B's own files
- DEPENDENCIES: other docs that quote terminal sets must be checked against
  the corrected pair (see S3)
- AFFECTS AGENTS: all lanes (quote the right machine for the right artifact)

REGRESSION note: claim "ORCA-B checkpoint terminal-set vocabulary" /
was: checkpoint misquoted the ledger terminal states / now: VERDICTS.md
quotes both state machines correctly and separates them / evidence: STATIC
(ORCA-B CHECKPOINT.md T+75, VERDICTS.md critic scan).

## S2. Work-order vocabulary collision: now labeled, still load-bearing

- DOMAIN: semantic consistency / COMPONENT: cross-lane work-order language
- CLAIM: "work order" means one thing across lanes
- EVIDENCE: STATIC. It does not. Three distinct usages are live in the new
  artifacts: (a) the A5 branch durable work-order record
  (objective-runtime.js, COMPLETED terminal), (b) the orca_status_model.js
  delegation ledger (CLOSED terminal, no COMPLETED), (c) the mainline
  mission/work-order vocabulary in MissionRuntime and the ORCA inventory
  docs. ORCA-B now labels (a) vs (b). CMD-OPS added watch W11 ("work-order
  vocabulary collision before merge") in cycle 3.
- CALLER: CRITIC-SEMANTIC / CALLEE: ORCA-B, CMD-OPS, ORCA-A lanes
- WRITER: n/a (cross-lane) / READER: parent orchestrator
- AUTHORITY: ORCA-B VERDICTS.md, WAVE-LEDGER.md (CMD-OPS cycle 3, W11)
- CLASSIFICATION: LABELED BUT UNRESOLVED. The collision is now named in two
  places, which is progress. It is still live: any merge or cross-branch
  work that says "work order" without the qualifier risks quoting the wrong
  machine's states.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: merge surface (A5 branch to mainline) where both
  vocabularies meet
- DEPENDENCIES: the merge decision (M-1 and related), H5 branch wiring lane
- AFFECTS AGENTS: parent orchestrator, H5 lane, any merge lane

The standing rule should be: every "work order" mention in a verdict,
spec, or merge plan carries the qualifier (ledger / durable-record /
mainline-mission) or it is treated as ambiguous.

## S3. Stale-formula sweep: old A5-era work_order_id form persists in three places

- DOMAIN: semantic consistency / COMPONENT: wave-1 docs + two source copies
- CLAIM: all references to the work_order_id derivation use the current form
- EVIDENCE: STATIC. The semantic audit's follow-on item 4 asked for a sweep
  of the A5-era `sha256('workorder:'+taskId)[0:16]` form. The sweep finds it
  still live in:

  1. `wave1/orca-arch/ORCA-INVENTORY.md:32` (doc): "work_order_id =
     sha256('workorder:'+taskId)[0:16]" (superseded by post-6a342dd27
     `sha256('work-order:'+objective_id+':'+task_key)`, full 64-hex,
     confirmed TEST by ORCA-A).
  2. `wave2/redteam/poc/ping-runtime/external-agent/external_agent_adapter.js:246`
     (source): `crypto.createHash('sha256').update('workorder:' + taskId)`
     with `.slice(0, 16)`.
  3. `program/orca-d/probes/vendor-external_agent_adapter.js:246`
     (vendored probe copy): same old form.

- CALLER: CRITIC-SEMANTIC / CALLEE: ORCA-A, redteam, ORCA-D lanes
- WRITER: n/a (stale content) / READER: parent orchestrator
- AUTHORITY: SEMANTIC-AUDIT.md section 3.3 vs grep results
- CLASSIFICATION: STALE-FORMULA HAZARD, CONFIRMED. Items 2 and 3 are code,
  not docs: they implement the old derivation. Caveat: both are redteam
  poc / probe vendor copies that may be intentionally frozen at the A5-era
  form. Even so, a reader quoting them as "the" formula gets the wrong one.
- CONFIDENCE: HIGH for presence; MEDIUM that any live path uses the old form
- BROKEN BOUNDARY: formula documentation (no single owner of the current
  derivation string)
- DEPENDENCIES: ORCA-A VERDICTS.md H1j (key-order identity)
- AFFECTS AGENTS: parent orchestrator, Agent 19 (H1j key-order identity is
  on its TEST-A6 challenge brief)

Watch item W13 added in REGRESSION-WATCH.md. The doc copy
(ORCA-INVENTORY.md:32) should be updated to the post-6a342dd27 form.

## S4. HS-2 run-identity derivation drifts from the W2 form

- DOMAIN: semantic consistency / COMPONENT:
  wave2/impl-safety-finish/stage-out/hs-2-run-lifecycle.md:18
- CLAIM: one run-identity derivation exists
- EVIDENCE: STATIC. HS-2 defines `run_id =
  sha256hex('run:' + scope + ':' + seq)` where "seq [is] a per-scope
  monotonic sequence (sequence allocation is the PING lane's problem; this
  spec only defines the derivation)." The existing W2/A5 form, TEST-PROVEN
  by ORCA-A, is `sha256('run:'+objective_id+':'+run_seq)`. These are two
  different derivations for the same concept: different domain string
  ('run:'+scope vs 'run:'+objective_id), and the HS-2 one depends on an
  unresolved per-scope sequence authority that does not exist yet.
- CALLER: CRITIC-SEMANTIC / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator, PING lane
- AUTHORITY: hs-2-run-lifecycle.md:18 vs ORCA-B VERDICTS.md (W2 run form)
- CLASSIFICATION: IDENTITY-DOMAIN DRIFT. If both get built, two competing
  run identities exist. The spec is honest that sequence allocation is
  someone else's problem, which makes the derivation currently
  unimplementable as specified.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: run identity ownership (who allocates the per-scope
  sequence, and which derivation is canonical)
- DEPENDENCIES: PING lane sequence authority (does not exist), H5 branch
  wiring
- AFFECTS AGENTS: parent orchestrator (must pick one canonical derivation
  before build), PING lane

Watch item W14 added. Recommendation: before HS-2 is built, the parent
decides the canonical run_id derivation and the sequence authority, or
HS-2's identity section gets rewritten to the W2 form.

## S5. HS-2 / HS-3: the UNKNOWN-reconciliation boundary is underspecified

- DOMAIN: semantic consistency / COMPONENT: hs-2-run-lifecycle.md:35-38 +
  hs-3-attempt-identity.md
- CLAIM: run and attempt identity compose cleanly across reconciliation
- EVIDENCE: STATIC. HS-2: "OUTCOME_UNKNOWN -> CANCELLED (cancel). Nothing
  else. UNKNOWN is terminal-except-CANCEL and NEVER auto-retryable.
  Reconciliation produces a NEW run or an explicit operator transition; it
  does not resurrect the UNKNOWN run." HS-3: attempts hang off run_id;
  "Crash re-claim PRESERVES attempt_count: a re-claimed run resumes at n+1,
  never reuses n."
- CALLER: CRITIC-SEMANTIC / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: hs-2-run-lifecycle.md:35-38, hs-3-attempt-identity.md
- CLASSIFICATION: SPECIFICATION GAP. The specs answer the same-run case
  (re-claim preserves attempt_count) but not the cross-run case: when
  UNKNOWN reconciliation produces a NEW run, does the new run's attempt
  numbering restart at 1 or continue from the old run's count? Are the old
  run's attempt records linked to the new run, or does the new run start
  with a clean attempt history? A zombie completion carrying the old
  run's (holder, epoch) could interact with the new run's fencing in
  unspecified ways.
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: run/attempt identity across reconciliation
- DEPENDENCIES: HS-4 fencing (epoch on the attempt record), HS-6 takeover
- AFFECTS AGENTS: impl-safety lane (spec needs the cross-run rule before
  build)

This is a spec question, not a bug: the specs are unbuilt, so the gap is
cheap to close now and expensive to close later.

## S6. HS-6 "externally observable completion evidence" overclaims

- DOMAIN: semantic consistency / COMPONENT:
  wave2/impl-safety-finish/stage-out/hs-6-takeover-liveness.md:24-29
- CLAIM: "A present rendezvous is the worker's externally observable
  completion evidence; resetting past it destroys evidence."
- EVIDENCE: STATIC. A rendezvous file proves a result artifact EXISTS for
  the attempt. It does not prove the worker's external effects occurred
  correctly, completely, or only once, and it does not prove the result
  passed verification. "Completion evidence" is true in the narrow sense
  (the worker wrote a file); it is false in the product sense (the work is
  done and correct).
- CALLER: CRITIC-SEMANTIC / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: hs-6-takeover-liveness.md:24-29
- CLASSIFICATION: WORDING OVERCLAIM. The decision rule itself (do not reset
  past a present rendezvous) is defensible. The justification phrase
  invites readers to treat rendezvous presence as proof of correct
  completion, which it is not. Combined with the security finding that the
  rule accepts any present rendezvous without freshness or digest checks
  (see SECURITY-PASS.md), the phrase is load-bearing in the wrong way.
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: result-artifact existence vs effect correctness
- DEPENDENCIES: HS-6 decision rule 1, verification layer (does not exist
  in the spec)
- AFFECTS AGENTS: impl-safety lane (reword to "result-artifact evidence"
  or add the freshness/digest requirements that would make the phrase true)

## S7. GAUNTLET-RESULTS contradicts itself on production contact

- DOMAIN: semantic consistency / COMPONENT:
  wave2/gauntlet/GAUNTLET-RESULTS.md
- CLAIM: "Nothing production was touched."
- EVIDENCE: STATIC. The same file's caveat 2 documents that "the loop
  performed a read-only GET to the production gateway health endpoint"
  (the script's own observe() helper, in a try/catch). Both statements are
  in the same deliverable. "Nothing production was touched" is false as
  written; the accurate claim is "no production mutation occurred" (which
  the caveat supports: the GET was read-only).
- CALLER: CRITIC-SEMANTIC / CALLEE: W2-GAUNTLET-INFRA lane
- WRITER: W2-GAUNTLET-INFRA / READER: parent orchestrator
- AUTHORITY: GAUNTLET-RESULTS.md (header claim vs caveat 2) +
  wave2/gauntlet/CHECKPOINT.md line 6 (19:52 entry documents the observe()
  GET as a known incidental)
- CLASSIFICATION: INTERNAL CONTRADICTION. The lane documented the
  incidental honestly in the checkpoint and the caveat; the header claim
  was not updated to match.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: "touched" (any contact) vs "mutated" (state change)
- DEPENDENCIES: none
- AFFECTS AGENTS: parent orchestrator (morning-brief wording must use the
  accurate form)

The fix is one sentence: replace "Nothing production was touched" with
"No production state was mutated; one read-only health GET was made by the
harness's observe() helper (documented in caveat 2)." The security
implication (harness egress to production by default) is in SECURITY-PASS.md.

## S8. TEST-A6 sub-claims are single-witness until Agent 19's recovery run

- DOMAIN: semantic consistency / COMPONENT: GAUNTLET-RESULTS.md TEST-A6
  record
- CLAIM: the TEST-A6 gates are independently verified
- EVIDENCE: STATIC. They are not yet. Agent 19's independent falsification
  errored on infrastructure (model-resolution timeout at load 25.39, no
  checkpoint) and its recovery is queued with a challenge brief that names
  the specific sub-claims to falsify: prove PID 16931 dead before run 2,
  verify objective ID derivation, exclude attempt-1/attempt-2 concurrency,
  verify scratch WORKER_FAILED event_b8c9060c4d342a46, four C3 fold-in
  verdicts, H1j key-order identity, memory deletion/ingestion/tenant
  behavior. Until that run completes, each of these is a single-witness
  claim from the gauntlet lane.
- CALLER: CRITIC-SEMANTIC / CALLEE: W2-GAUNTLET-INFRA, Agent 19
- WRITER: n/a (verification status) / READER: parent orchestrator
- AUTHORITY: WAVE-LEDGER.md ("Fleet drained" section: Agent 19 TEST-A6
  falsification UNRESOLVED) + agent19/CHECKPOINT.md
- CLASSIFICATION: VERIFICATION STATUS. Not a contradiction; a pending
  second witness. Cite TEST-A6 as "gauntlet-witnessed, independent
  falsification pending," not as "independently verified."
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: single-witness vs independently-verified claims
- DEPENDENCIES: Agent 19 recovery run (queued, gated on machine load < 8)
- AFFECTS AGENTS: parent orchestrator, Agent 19

## S9. Provenance-chain depth is ~0: "trusted knowledge" claims need care

- DOMAIN: semantic consistency / COMPONENT:
  program/mem-b/MEMORY-HARVEST.md (H-7)
- CLAIM: memory entries carry trustworthy provenance chains
- EVIDENCE: STATIC. H-7: "the index does not store provenance chains."
  The ledger's MEM-B section elaborates: "Provenance-chain depth: ~0
  trustworthy hops. MEM-A's v1.0->v1.1 declared chain (depth 2) has neither
  endpoint trustworthy (v1.1 never indexed, v1.0 deleted-but-served)."
- CALLER: CRITIC-SEMANTIC / CALLEE: MEM-B lane
- WRITER: MEM-B / READER: parent orchestrator
- AUTHORITY: MEMORY-HARVEST.md H-7 + WAVE-LEDGER.md MEM-B section
- CLASSIFICATION: SUPPORTED NEGATIVE CLAIM. The lane proved the absence.
  Any downstream claim of "trusted because provenance-chained" is
  semantically unsupported until the index stores chains.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: memory index (no provenance storage)
- DEPENDENCIES: HS-7 provenance column (spec only)
- AFFECTS AGENTS: parent orchestrator, PING lane (HS-7 is the spec that
  would fix this)

## Scoreboard (fresh pass only)

| # | Finding | Type |
|---|---------|------|
| S1 | Terminal-set misquote corrected in ORCA-B | correction accepted |
| S2 | Work-order vocabulary collision labeled (W11), still live | open, labeled |
| S3 | Stale A5-era formula in 1 doc + 2 source copies | open (W13) |
| S4 | HS-2 run identity drifts from W2 form; sequence authority missing | open (W14) |
| S5 | HS-2/HS-3 cross-run reconciliation boundary underspecified | open (spec gap) |
| S6 | HS-6 "externally observable completion evidence" overclaims | open (wording) |
| S7 | GAUNTLET-RESULTS internal contradiction on production contact | open (one-sentence fix) |
| S8 | TEST-A6 sub-claims single-witness pending Agent 19 | pending |
| S9 | Provenance depth ~0; no "trusted chain" claims supportable | recorded |

The three prior recorded errors are not repeated here. S1 is the correction
of the first; the other two (work-order collision, stale formula) have new
evidence above (S2, S3).
