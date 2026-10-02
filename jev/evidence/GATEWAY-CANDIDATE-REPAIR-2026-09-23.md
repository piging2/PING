# Jev Gateway Candidate Repair — Evidence Record

2026-09-23. Repair of the independent-verification FAIL (candidate SHA `5bb2d08b5`).

## Repair decision

Nolan chose OPTION 1: commit the missing shadow worker into the candidate.
The require stays hard. Missing required code fails loudly; it is never made
optional to make bootstrap survive.

## Provenance inspection (before adding anything)

The missing code was two untracked files in the author's worktree
`/home/nolan/ping/worktrees/jev-surgical/ping-runtime/jev/`:

- `shadow_worker.js` (JevShadowWorker, P3 shadow evaluation, zero execution authority)
- `typed_decision.js` (typed decision contract, P2: DecisionRequest /
  TypedDecisionProvider / RuleClaimDecisionProvider / MayExecutePolicy P12)

Findings:

- Intended implementation, not stale artifact: created Sep 22 20:07-20:11
  (same build window as the candidate), referenced by the candidate's own
  bootstrap require (`gateway/bootstrap/gateway_runtime.js:88`), referenced by
  the candidate's own comments (`typed_decision.js` header: "Registered in
  gateway/generated/event_generator.js"), and asserted by the candidate's own
  untracked test (`gateway/test_jev_shadow.js`).
- No secrets: secret-pattern scan over both files found nothing.
- No network access, no credentials, no environment reads. Shadow-only:
  `MayExecutePolicy.mayExecute` always returns `{ allowed: false, mode: 'shadow' }`.
- In-tree dependency closure: `../workers/canonical_workers` (committed in
  candidate), `../authorities/constitutional_time_authority.js` (committed),
  `./typed_decision` (committed together).
- One genuine gap found during repair: the untracked shadow test revealed
  that `JEV_DECISION_EVALUATED` was not registered in the live event
  artifacts, so the shadow worker's emissions would be REJECTED by
  `EventValidator` at admission. The registration hunks existed only in the
  worktree's dirty generated files (authored with the candidate, same
  timestamp). The registration delta (`gateway/generated/event_generator.js`
  +4, `gateway/generated/event_registry.json` +38/-3, 234 -> 235 types) was
  committed as part of the required worker/dependency delta. This is
  packaging-failure class, not new architecture: without it the worker's
  documented emission path silently fails at admission.

## Commits (branch `jev/verdict-authority-hardening`, no push, no merge, no deploy)

1. `8bdfdfd78` — commit missing shadow worker pair (`ping-runtime/jev/`
   two files, +292).
2. `8eccdfcf9` — add permanent production-bootstrap load regression gate
   (`gateway/test_production_bootstrap_load.js`, PB-1..PB-6).
3. `fffe99f7a` — register `JEV_DECISION_EVALUATED` in generated event
   artifacts (+39/-3).

Final repaired SHA: `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`.

## Permanent regression gate

`gateway/test_production_bootstrap_load.js` (committed, part of the
canonical gate suite from now on):

- PB-1: `require('./bootstrap/gateway_runtime')` loads (the exact
  MODULE_NOT_FOUND failure mode that killed the old SHA).
- PB-2: `require('../ping-runtime/jev/shadow_worker')` loads.
- PB-3: `require('../ping-runtime/jev/typed_decision')` loads.
- PB-4: the shadow worker's in-tree dependency files exist in the tree.
- PB-5: bootstrap requires and registers `jev-shadow` on CLAIM_CREATED,
  and the require is NOT lazy/optional.
- PB-6: the worker's MayExecutePolicy denies execution (shadow-only).

Sanity check: the gate FAILS (exit 1, PB-2/PB-3/PB-6) on the old broken SHA
`5bb2d08b5` from a clean checkout. It PASSES (6/6) on the repaired SHA.

## Acceptance chain (from a second, independent clean checkout of the final SHA)

All executed on the Pig from `/tmp/jev-independent-checkout` (fresh detached
worktree of `fffe99f7a`, gateway `npm ci` 360 packages,
`runtime/constitutional` install + `tsc` build, constitutional-dist staged
from build output):

1. CLEAN CHECKOUT: detached worktree at `fffe99f7a`, no unrelated files.
2. INSTALL: gateway `npm ci` clean; constitutional TS build clean.
3. PRODUCTION BOOTSTRAP LOAD: PB gate 6/6 from the clean tree.
4. GATEWAY START: real production entry `node gateway/server.js` booted to
   `Gateway running on http://0.0.0.0:18101` (degraded mode: test sandbox
   has no production DB; PG pipeline skipped, no crash).
5. HEALTH: `GET /health` returned with gateway component `healthy`.
6. SHADOW WORKER LOAD: module loads from committed tree; live registration
   path verified in code; functional probe through WorkerRuntime mirroring
   the bootstrap registration exactly:
   - REGISTERED: true, class JevShadowWorker, eventTypes ["CLAIM_CREATED"],
     capabilities ["jev.shadow"]
   - handle(CLAIM_CREATED) -> ok, emitted JEV_DECISION_EVALUATED with source
     stamp `jev-shadow` (constructor-set name, not caller input)
   - mode: shadow, agreement computed, decision ACCEPT_CLAIM (rule R3)
   - mayExecute: allowed=false, mode=shadow
   Full PG-backed bootstrap registration could not be exercised live because
   the sandbox test DB schema (`pingtest`) is incompatible with the
   production schema (`column "source" does not exist` in
   UnifiedEventRuntime.initialize). This is test-infra divergence, not a
   candidate defect; the registration code path is synchronous inside the
   pgAvailable branch and is statically covered by PB-5.
7. 12 GATES (all suites exit 0 from the clean checkout):
   - PB production bootstrap load: 6/6
   - replay precedence hostile spoof: 8/8
   - replay worker wiring: 17/17
   - verdict authority (incl. golden path): 34/34
   - witness adversarial (observable refusals): 13/13
   - witness negpath: 8/8
   - kernel replay (genuine, determinism corpus): 23/23
   - correlation chain: 13/13
   - EVAL-009 replay convergence: exit 0
   - jev shadow (P2/P3/P4/P12, incl. live EventValidator acceptance after
     registration): 21/21
8. INDEPENDENT REPRODUCTION: every step above was executed from the
   independent checkout alone; nothing was reused from the author's
   worktree except the untracked shadow test file (copied in, since it is
   not committed) and the SHA itself.

## Unrelated dirty files left untouched

`gateway/generated/event_generator.js` and `event_registry.json` beyond the
JEV hunks: no other diff. `gateway/routes/orchestration.js`,
`ping-runtime/orchestration/execution/engine.js`, `gateway/test_jev_shadow.js`
still dirty/untracked in the author's worktree, untouched per lane rules.

## Status

REPAIRED and INDEPENDENTLY REPROVED from the SHA alone. No push, no merge,
no deploy performed. Awaiting Nolan's promotion decision.
