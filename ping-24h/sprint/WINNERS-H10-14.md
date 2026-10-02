# SEMANTIC WINNERS + WRITER ACTIVATIONS (hour 10-14 decisions)

Date: 2026-09-28 ~19:45 MDT. Coordinator: 100-hour execution coordinator.
Basis: 11/11 read-only lanes complete (h00-02: R, A, B, C, D, E, F; h02-06: G, H, I, J).
Activation preconditions per ~/workspace/ping-24h/prelaunch/06-WRITER-CANDIDATES.md
plus Nolan's two binding pre-GO corrections.

## NAMED SEMANTIC WINNERS

1. U4 identity contract: HARVEST (lane H). All five concepts converge on existing
   implementations. No new IdentityAuthority. No code writer needed; one small
   fix (claim_worker.py uuid4 bypass, 4 call sites) folds into Writer 1's scope
   when it activates.
2. U3 HOLD/recovery: COMPLEMENTARY, converge the semantics (lane G, 24 cells:
   20 CORRECT / 1 INCORRECT / 3 INAPPLICABLE). f01 owns the durable HOLD record
   and scheduler seam; S5 owns dispatch-path refusal; classifyUnknownExecution
   owns the reconciliation decision. Forcing one winner would delete a seam.
   Wire order: narrowed reaper into the reached runtime FIRST, then HOLD wiring,
   then attempt fencing for the zombie window (f01 x fixture-06 INCORRECT).
   Vocabulary gap open: 'hold' vs NEEDS_RECONCILIATION at the projection seam.
3. U7 ContextPack/evidence (orca loop): fixes already landed in orca-a (G1:
   trimMission preserves result_recorded; MISSION_* merged by missionId).
   Lane B proved them byte-level on the mu6wmbzn repro. Winner: the orca-a
   fixes; Writer 3 first determines reachedness, ports only if absent.
4. U5 projection invalidation: NO complete implementation exists. Primitives:
   ADOPT dump.py (rebuild+verify+atomic publish+freshness proof) and
   ping-object-source serve-time verify; ADAPT DependencyIndex affected-map and
   the regen-trigger verify-then-report PATTERN (not its shape). The served
   convergence tree's approve-embedded shell-out is the forbidden special
   case: it must be REPLACED by the generic seam, never blessed.
5. U10 decision records: READ-ONLY. T-11 measured (Shape A rejects 9/15 strict;
   B invents silently; C/D lossy). Schema selection pending; no writer.
6. U6 WorkOrder/ResultEnvelope: no writer at launch (per plan). J-16 stands as
   the falsification: verifier is structural-only; objective is not an argument.
7. U8 retrieval: no writer. T-09: pseudo-vector ALL DORMANT, zero live paths.
   Recorded as reactivation risk only.
8. U1/U2 tenant authority: U4 gate GREEN, Wave A RED at code level (T-01, T-02,
   T-04). Strongest reached patterns: FYD gateway 400s (H7), MC dispatch
   x-mc-caller-key (H5, dirty). No new code winner yet; the missing piece is
   the fail-closed boundary fix, which needs Nolan's authorization.

## ACTIVATION DECISIONS

- Writer 2 (U3 HOLD/recovery): ACTIVATED. First bounded task W2-1: confirm the
  reached mission runtime, port the f01 narrowed reaper predicate (lease expiry
  NEVER turns 'running' into 'created') in an isolated worktree, prove with
  the T-05 corpus + T-06 runner with no regressions. Explicitly NOT: HOLD
  wiring, watchdog, dispatch changes, other units.
- Writer 3 (U7 ContextPack): ACTIVATED. First bounded task W3-1: determine
  whether the orca-a G1 fixes are already in the reached orca loop. If yes:
  NO CHANGE with evidence. If no: port the smallest winning correction with
  byte-level before/after proof on the mu6wmbzn repro. Explicitly NOT:
  ContextPack v3, retrieval sources, the 9a555021 MC dispatch seam, other units.
- Writer 4 (U5 projection invalidation): ACTIVATED. First bounded task W4-1
  (spec-first): specify and spike the smallest generic contract
  AUTHORIZED TRANSITION -> INVALIDATE -> DETERMINISTIC REBUILD -> VERIFY ->
  ATOMIC PUBLISH -> FRESHNESS PROOF in an isolated worktree, harvesting the
  named primitives. Prove the seam on a synthetic transition. Explicitly NOT:
  FYD approve wiring, blessing the served special-case, new stores, event bus,
  U10 decision records.
- Writer 1 (U1/U2 tenant/namespace): HELD. Precondition requires Nolan's
  explicit authorization of the fail-closed boundary fix (not yet given).
  U4 gate is GREEN and Wave A RED repros exist, so the unit is ready the
  moment authorization lands. Related operator action: dispatch-identities.json
  is absent on the Pig; the entitlement set is empty until provisioned.

Active writers: 3 of maximum 4. One writer per semantic unit. No collisions.

## NOLAN ASKS (operator authority required)

1. Authorize Writer 1's fail-closed boundary fix (event-bridge tenant refusal +
   MC dispatch tenant binding harvest). Without it, Writer 1 stays held.
2. Provision dispatch-identities.json (H5 operator registry) on the Pig, or
   direct an alternative caller registry. Until then the MC dispatch
   entitlement set is empty by fail-closed design.
3. Author the T-19 floor scope. The "195-test floor" is not discoverable in
   any artifact; `npx jest` full suite is the only pinned command (222 files;
   last run 207 suites / 196 passed / 11 failed). If the floor is a subset,
   its scope must be authored, not discovered.
4. Decide ownership of the untracked src/lib/secrets/ directory (exists in
   the frozen canonical tree dated Sep 27 21:35 and in ping-lane-l-broker).
   Name-only scan: fixture/canary/doc identifiers only; no live values
   observed or reproduced.

## READY-QUEUE DELTA

- RESOLVED (no writer needed): T-09 (dormant), T-08 fix existence (landed in
  orca-a; reachedness check is W3-1), U4 contract (H, harvest).
- WITH WRITERS: T-07 reaper (W2-1), T-08 port-if-absent (W3-1), T-17 seam
  (W4-1), T-05/T-06 (corpus + runner done; runner proves W2-1).
- READ-ONLY CONTINUING: T-11 schema selection (pending), T-15/J-16 (falsified,
  tracked), T-18 binding (proven on served tree; re-prove after any serve
  change), T-19 floor (needs authorship), E1 integrity (re-verify before any
  Jev release discussion; Jev stays parked, zero calls).
- FALSIFIED PREMISES: preservation map served-tree statement (superseded by
  lane R); "reconciliation/HOLD missing" (exists unwired); byte-identical
  identity_authority.js claim; FYD_REGEN_CMD landed (proven not landed).

## WIRE ORDER (binding)

1. Narrowed reaper into reached runtime (W2-1), proven by corpus+runner.
2. HOLD wiring (f01 parkHold) only after (1) lands.
3. Attempt fencing for the f01 x fixture-06 zombie window before the
   SAFE_TO_RETRY path carries consequential effects.
4. U5 generic seam proven on synthetic transitions before any FYD consumer
   discussion. FYD stays frozen throughout.
