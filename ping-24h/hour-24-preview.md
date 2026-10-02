# 100h Sprint — Coordinator completion preview (2026-09-28 ~19:48 MDT)

Source: execution coordinator 2bd66aef completed, 14/14 children done.
Full hour-24 report still due ~2026-09-29 19:30 MDT. This is an early preview.

## OBSERVED NEW FACTS
- All 11 read-only lanes and 3 writer tasks complete.
- Reaper: reached runtime is the ce002 code shape, confirmed live in the Pig's ping-gateway container (mission_runtime.js:277-285 still carries the WIDE predicate; live is still hostile today). W2 ported the f01 narrowed predicate into an isolated copy: hostile-before/green-after, T-06 24-cell scorecard byte-identical to baseline, clean-checkout replay green. No deployment performed; promotion is a production-state decision.
- ContextPack: the reached orca loop (Pig-side /home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_control_loop.js, sha256 4d6e4c70) already carries the G1 fixes; 19/19 hostile repro on verbatim-extracted functions. W3: NO CHANGE.
- Projection invalidation: no complete implementation exists in 73 canonical + 49 second-repo refs. W4 specified and proved the 9-stage generic seam on a synthetic transition (23/23, clean-checkout replay green). FYD_REGEN_CMD proven NOT LANDED anywhere.
- U4 identity contract converges on existing implementations; dispatch-identities.json is absent on the Pig, so the MC dispatch entitlement set is empty by fail-closed design.
- Identity uuid4 bypass (claim_worker.py, 4 call sites) remains FIX-REQUIRED; the "three byte-identical identity_authority.js" claim is stale.

## FALSIFIED ASSUMPTIONS
- "Reconciliation/HOLD machinery is missing" (exists unwired in f01/S5; complementary, not competing).
- "Reaper is safe" (wide predicate blindly redispatches unknown-outcome missions; proven).
- "ContextPack fixes need building" (already reached; NO CHANGE).
- "FYD_REGEN_CMD is landed" (proven absent everywhere).
- "The 195-test floor is discoverable" (not in any artifact; must be authored).
- "preservation map served-tree statement" (superseded by lane R: :3100 serves convergence tree 5732485b).

## SEMANTIC WINNERS
1. U4 identity: HARVEST.
2. U3 HOLD/recovery: COMPLEMENTARY convergence (f01 scheduler seam, S5 dispatch refusal, classify decision; wire order narrowed reaper, HOLD, fencing).
3. U7 ContextPack: orca-a G1 fixes (already reached).
4. U5 invalidation: primitives ADOPT/ADAPT named; W4 spike proves the seam.
5. U10: read-only, selection pending.
6. U6: J-16 falsification stands, no writer.
7. U8: dormant, reactivation risk.
8. U1/U2: gate green, repros red, fix held for authorization.

## ACTIVE WRITERS
3 of 4 slots. W2 DONE, W3 NO CHANGE (successful), W4 SPIKE COMPLETE. W1 (tenant) HELD for Nolan's authorization.

## CHANGES LANDED
None in canonical, convergence, or served trees. Two isolated worktrees exist (W2 port copy, W4 spike branch); one live read-only SSH probe only. Live gateway still runs the wide reaper.

## HOSTILE TEST RESULTS
T-05 corpus (8 fixtures) + T-06 runner (24 cells, 20C/1X/3-) drove all three writers. Known INCORRECT: f01 x fixture-06 zombie window (attempt fencing seam, unowned). W2: fixture-02 flipped INCORRECT to CORRECT. W3: 19/19. W4: 23/23 + serve-time forgery refusals.

## REACHED EDGES
Closed (as proven code): ContextPack evidence loss on the reached loop (proven already closed); narrowed reaper port (proven in isolation, not deployed).
Still broken: event-bridge tenant laundering, MC caller-to-tenant chain, mission-projection contamination, wide reaper live, envelope semantic verification, uuid4 bypass, 'hold' vs NEEDS_RECONCILIATION vocabulary gap, zombie fencing window.

## SOURCE/BUILD/SERVED STATE
:3100 serves convergence tree 5732485b (build 2BFLbt5EHFUJeXfd0E6zT), clean of the 144-entry canonical dirt. Served tree contains the forbidden approve-shell-out special case; the generic seam must replace it.

## TEST FLOOR
No authored floor exists; full suite is the only pinned command (last run 207 suites, 196 passed, 11 failed). Scope must be authored.

## NEXT SINGLE BOTTLENECK (Nolan asks, in order)
1. Authorize W1's fail-closed boundary fix.
2. Provision dispatch-identities.json.
3. Author the floor scope.
4. Decide the secrets/ directory ownership.

W1 unblocks the entire U1/U2 safety gate; everything consequential waits on it.

## Bonus note (W2, for the fencing seam's falsifier)
ce002 already mints an attempts-based fencing token on assign() and gates complete() on it, so the f06 zombie window may already be narrower in ce002 than in f01. Not W2's seam; belongs to the fencing falsifier.
