# PING Recovery Brief — 2026-09-18, Pig returned ~16:23 MDT

Standing rule honored: no auto-execution of the planning queue. Assumptions revalidated first.
Sections below separate VERIFIED / INFERENCE / PROPOSED / UNKNOWN.

## Freeze-race resolution (CORRECTED 16:40 MDT — supersedes the first check)

CORRECTION: the first check stated "None of the five is the F7+MC-1 commit" and
"The freeze held on its terms." Both were wrong/misleading. Verified 16:40:

- VERIFIED: `de1112454` (15:06:41 MDT) IS the F7+MC-1 commit. `git show --stat`
  confirms 15 files: F7 depth semantics (`runtime/kernel/replay/canonical_json.ts`
  + compiled `.js`, `identity_authority.js`, `canonical_authority.js`,
  `scripts/rebuild-canonical-json.sh`) plus MC-1 legacy ingress
  (`ping-runtime/events/legacy_ingress_adapter.js`, 463 lines new,
  `unified_event_runtime.js`, `event_bridge.js`, gateway files). The "not F7+MC-1"
  verdict was read from the commit message, not the diff. Corrected.
- COORDINATOR-REPORTED (freeze timestamp not independently verified): the freeze
  ruling arrived 15:49 MDT, after the 15:06 commit. The freeze did not block the
  commit; the commit predates it. "The freeze held" was misleading. Accurate:
  no commit violated the freeze because the F7+MC-1 commit landed first.
- VERIFIED: the freeze-carrying coordinator (7da778ba) ran 16:23–16:40 MDT after
  Pig recovery and completed. Ruling order status: (a) depth semantics RESOLVED
  in working tree; (b) F7-C 20/20 GREEN (coordinator-reported; vector file
  verified present at `evidence/f7c-depth-boundary-2026-09-18/`);
  (c) MC-1 harness PRESERVED at `tests/mc1-legacy-ingress/` (12 files, untracked;
  coordinator reports 93/93 PASS); (d) pre-commit manifest BLOCKED;
  (e) commit BLOCKED; (f) resume pending.
- VERIFIED: the five-file allowlist was NOT found (coordinator searched backlog,
  worktree docs, workspace). `de1112454` was committed without the allowlist
  Nolan's commit order required. ALLOWLIST-001 opened.
- VERIFIED: new contradiction entries appended with the mandated schema:
  DEPTH-001, DEPTH-001a, O3-SCOPE-001, ALLOWLIST-001 (CONTRADICTIONS.md:119–122).
- INFERENCE: the five commits are pre-freeze work, not freeze violations. Their
  authorization under verify-then-execute remains unrecorded (shared git identity).
- PROPOSED: operator decisions needed (revised): (1) accept `de1112454` as the
  landed F7+MC-1 commit or require changes; (2) authorize the (a)–(c) remediation
  commit once the allowlist question is settled; (3) amend the ruling text
  (envelope 65, not 64, rejected); (4) disposition of the other four commits
  (keep/review/revert), noting 99b55390b broke EVAL-006.

## What changed during planning mode

- VERIFIED: No PING mutation was performed during planning mode. No commit,
  promotion, merge, deployment, authority change, production-policy change,
  schedule change, or canonical-state mutation. Planning work was confined to
  ~/workspace/planning/ and read-only probes.
- VERIFIED: Planning artifacts: ~/workspace/planning/PLANNING_QUEUE.md
  (INV-1..INV-12, findings for INV-1/2/3/4/5/8/9/11/12) and this brief.

## New verified facts (planning mode)

- VERIFIED (INV-1): 16/16 user-owned cron jobs' registered bodies matched
  authored files (canary method). The stale-body incident was isolated to
  meta-ai-intel-pass, already fixed. Gap class is systemic (no drift detector).
- VERIFIED (INV-4): h-marketing-intelligence is a legitimate 5th cycle member;
  selecting it for the 21:04 MDT run is correct per next-brief.py. Cron body
  prose describing a 4-cycle is stale (follow-up queued, not applied).
- VERIFIED (INV-3): Ledger-ok vs sidecar-rejected was a stage distinction
  (capture-ok vs contract-rejected) plus a since-partially-fixed dual-write gap.
  Residual: rotation anchor semantics undocumented (coverage vs quality).
- VERIFIED (INV-2): Governance is almost entirely ADVISORY / DELIVERED COMMAND;
  the few CHECKED PRECONDITIONs are layer-local and bypassable. No ENFORCED
  INTERLOCKS found.

## Revalidation on return (all run)

- VERIFIED: meta-ai-intel-pass registered body still matches the authored
  lifecycle-aware file (canary: next-brief.py x2, QUARANTINED x2, head/tail match).
- VERIFIED: Quarantine records unchanged: c-review-complaint-signals
  (2026-09-17) and d-segment-deep-dive (2026-09-18 03:06Z) still present.
- VERIFIED: runs.jsonl last entry is 20260918-210455-c (21:04:55Z = 15:04 MDT):
  capture_failed / contract_rejected, the stale-body double-run of quarantined
  c. No runs since the body re-registration fix. Tonight 21:04 MDT run should
  use next-brief.py and select h-marketing-intelligence (INV-4).
- VERIFIED: No new terminal states beyond what planning mode already recorded.

## New falsifications (planning mode)

- FALSIFIED: "The stale scheduler body indicates systemic drift." (isolated.)
- FALSIFIED: "h-marketing-intelligence is an unauthorized/unknown slug." (legitimate.)
- FALSIFIED: "Ledger and sidecar contradict each other." (different stages.)
- FALSIFIED: "A post-freeze F7+MC-1 commit landed." (no such commit in the log.)

## New contradictions

- INV-6 (2026-09-18, worktree read-only audit): the contradiction register does
  not use the required schema. 68 entries total, 23 closed, 45 open, net open 45.
  Zero of 68 entries carry opened_at, owner, blocking_unit, closure_condition,
  evidence_required, or closed_at. Zero of 23 closures name a verifier or attach
  replayable evidence (no bundle, artifact pointer, or evidence ID). Oldest-open
  age cannot be computed. Net verified contradictions closed = -68 (0 replayable
  closures minus 68 opened). No new contradictions were opened during planning
  mode itself; the -68 reflects the register's lifetime.
- INV-10 (2026-09-18, worktree read-only): depth semantics truth table complete.
  caller_depth = nesting depth of the caller-supplied value (scalar=0, outermost
  container=1, each nested container +1). envelope_depth = caller_depth + 1
  (emit() wraps identityData in exactly one object; serialize adds none).
  Boundary: direct canonicalize accepts caller 64 / rejects 65
  (EXECUTION_LIMIT_EXCEEDED); via emit() accepts caller 63 (envelope 64, ID
  minted) / rejects caller 64 (envelope 65, IDENTITY_VALUE_REJECTED).
  Code constant MAX_NESTING_DEPTH=64 matches the D1 "depth cap 64" spec but the
  spec has no caller/envelope distinction (the DEPTH-001 ambiguity). FALSIFIED:
  the planning background line "envelope depth 64 rejected" is superseded ruling
  text; F7-C proved envelope_depth 64 ACCEPTED, only 65 rejected (DEPTH-001a,
  OPEN, needs ruling-text amendment). The corrected vector exists on disk
  untracked (sha256 matches CONTRADICTIONS.md:119) but is uncommitted; the
  20/20 green run is STAT-attested, not re-verified. "Depth 64 accepted" stays
  UNCERTIFIED.
- INV-7 (2026-09-18, worktree read-only + live harness run): reproducibility
  bundle survey.
  - NAMING CORRECTION: "MC-1 85/85" conflates two things. In the worktree MC-1
    is the TenantOS plane-scope resolution unit (CERTIFICATION.md:118), NOT the
    eval harness. The 85/85 belongs to the constitutional eval harness
    (evals/constitutional-runtime/eval_harness.js, 9 registered scenarios,
    EVAL-010 orphaned), last attested 2026-08-21. Use the right name per claim.
  - FALSIFIED: 85/85 does not reproduce at HEAD ff975122. Live run (node
    v22.23.2): 82 pass, 3 fail. EVAL-006 fails because commit 99b55390b
    (one of the five freeze-window commits, "honor atomic claim verdicts")
    changed MissionRuntime.start(missionId) to start(missionId, workerName),
    breaking the scenario's mock (brittle SQL-text/param-order mirror).
  - No sanitized repro bundle survives: no manifest, no expected-result record,
    no verifier identity, no bundle SHA. The harness is credential-free and
    offline (good), but mocks are unpinned mirrors of production internals
    (bad: drift is silent, spurious failures AND spurious passes possible).
  - Gaps for a clean-state principal: no pinned repo/harness SHA, no expected
    results file, undeclared mock-production coupling, EVAL-010 unregistered,
    single-process shared module cache, no verifier record.
  - Open decision: update EVAL-006 to the new start(mid, workerName) contract,
    or re-examine the 99b55390b production change. The latter is an
    operator/PING call since that commit landed in the freeze window and was
    not in the F7/MC-1 allowlist. Proposed minimum bundle: MANIFEST.yaml
    (pinned SHAs, expected counts), run.sh (preflight + JSON results),
    scenarios/ (10 files, EVAL-010 registered), contract.md (mock-assumed API
    surface), expected-results.json, VERIFIER.md template.
- INV-10 (2026-09-18, worktree read-only): depth semantics truth table complete.
  caller_depth = nesting depth of the caller-supplied value (scalar=0, outermost
  container=1, each nested container +1). envelope_depth = caller_depth + 1
  (emit() wraps identityData in exactly one object; serialize adds none).
  Boundary: direct canonicalize accepts caller 64 / rejects 65
  (EXECUTION_LIMIT_EXCEEDED); via emit() accepts caller 63 (envelope 64, ID
  minted) / rejects caller 64 (envelope 65, IDENTITY_VALUE_REJECTED).
  Code constant MAX_NESTING_DEPTH=64 matches the D1 "depth cap 64" spec but the
  spec has no caller/envelope distinction (the DEPTH-001 ambiguity). FALSIFIED:
  the planning background line "envelope depth 64 rejected" is superseded ruling
  text; F7-C proved envelope_depth 64 ACCEPTED, only 65 rejected (DEPTH-001a,
  OPEN, needs ruling-text amendment). The corrected vector exists on disk
  untracked (sha256 matches CONTRADICTIONS.md:119) but is uncommitted; the
  20/20 green run is STAT-attested, not re-verified. "Depth 64 accepted" stays
  UNCERTIFIED.

## Contradictions closed with replayable evidence

- None during planning mode. (Only closures with replayable evidence satisfying
  explicit closure conditions count; none were processed.)

## Top 5 decisions ready (revised 16:40 MDT; need operator or PING authority)

1. Accept `de1112454` as the landed F7+MC-1 commit, or require changes/revert.
   (It landed pre-freeze at 15:06 without the required five-file allowlist.)
2. Authorize the (a)-(c) remediation commit (depth resolution, F7-C vector,
   MC-1 harness) once the allowlist question is settled.
3. Amend the ruling text: "envelope depth 65 rejected" (not 64). (DEPTH-001a)
4. Disposition of the other four commits (keep/review/revert); 99b55390b broke
   EVAL-006, supporting review-first.
5. Adopt the pre-commit manifest mechanism (sidecar + diff-sha trailer). (INV-8)

## Top 5 execution units ready (do NOT execute without revalidation)

1. Sync meta-ai-intel-pass body prose to the 5-cycle [a, b, c, d, h]. (INV-4 follow-up)
2. Single round-trip byte comparison on one cron job (settles scheduler-transform). (INV-9)
3. Backfill or annotate the 20260915-210425 ledger entry (classification). (INV-3)
4. Document rotation-anchor reading in next-brief.py docstring + body prose. (INV-3)
5. Write the runtime delivery-semantics statement the chaos harness will test. (INV-11)

## New risks

- RESOLVED: the freeze race (no F7+MC-1 commit landed). Residual: five
  unaudited-by-operator commits sit on the branch; review before building on them.
- The five commits touch files outside the F7+MC-1 allowlist
  (mission_scheduler.js, mission_runtime.js, dead_letter_authority.js,
  witness_authority.js, gateway agents, canonical_json.js); they were separate
  commits, not the allowlisted freeze commit, but their authorization basis is
  unrecorded.
- Scheduler drift detector still absent (INV-9); the class can recur anywhere.

## Experiments ready (need approval + Pig)

- INV-9 sentinel round-trip byte comparison.
- INV-11 chaos scenarios A-D (worker kill, scheduler kill, runtime kill, duplicate measurement).

## Revalidation checklist

- [x] Pig reachable; worktree HEAD and index state recorded.
- [x] Freeze-race outcome determined.
- [x] Cron registered bodies re-checked (meta-ai-intel-pass canary; no drift).
- [x] runs.jsonl reviewed (last run 15:04 MDT, stale-body incident; fix in place for 21:04 MDT).
- [x] Quarantine/terminal states checked (c, d unchanged).
- [x] INV-6 run against the Pig worktree (done: register fails required schema, net -68).
- [x] INV-7 run against the Pig worktree (done: MC-1 naming corrected, 85/85 falsified at HEAD 82/85, no repro bundle survives).
