# Jev Security Lane — Independent Promotion Verification

Date: 2026-09-23
Verifier role: independent (separate agent from the promotion author).
Method: pristine detached checkout of the candidate SHA (`git worktree add --detach /tmp/jev-verify 5bb2d08b5`),
clean status confirmed (0 dirty files), Node v22.23.2, node_modules symlinked from the main repo's gateway
(deps only, not candidate code).

## Verdict: FAIL — candidate SHA is internally incoherent

One falsified invariant. All seven candidate-committed test suites reproduce cleanly from the SHA,
but the committed tree's production gateway bootstrap **cannot be loaded at 5bb2d08b5**.
The candidate added an unconditional top-level `require()` of a path that was never committed.

### The falsifying evidence (exact)

1. Candidate commit added, at `gateway/bootstrap/gateway_runtime.js` line 88:
   `const { JevShadowWorker } = require('../../ping-runtime/jev/shadow_worker');`
   - Parent commit (`5bb2d08b5^`) contains zero occurrences of `shadow_worker` in that file: the require is new in this candidate.
2. `git ls-tree -r 5bb2d08b5 --name-only | grep -i -E "jev|shadow"` shows NO `ping-runtime/jev/` path in the committed tree
   (only unrelated `brainos/newsletter/` docs with "shadow" in the filename).
3. `ping-runtime/jev/shadow_worker.js` exists only as an UNTRACKED file in the author's other worktree
   (`/home/nolan/ping/worktrees/jev-surgical/ping-runtime/jev/`); it was never committed.
4. Requiring the module at the candidate SHA: `require('/tmp/jev-verify/gateway/bootstrap/gateway_runtime.js')` throws **MODULE_NOT_FOUND**.
   Control: `ping-runtime/workers/canonical_workers.js` and `ping-runtime/events/unified_event_runtime.js` load fine (LOAD-OK).

### Why this is a promotion falsification, not a nit

- The gateway bootstrap is the production registration path for every canonical worker, including the fixed ReplayWorker.
  At the committed SHA it cannot even be loaded, so the candidate is not a deployable, coherent unit.
- The prior "all twelve gates PASS" claim never loaded the committed tree's gateway bootstrap; the suites pass only because
  none of them require `gateway_runtime.js`. This is exactly the class of hole independent verification exists to catch.
- The invariant broken: PROMOTE ONLY WHEN the candidate is a coherent commit whose production wiring works. A commit that
  hard-crashes the production bootstrap at require time fails that bar.

### Likely repair (not performed — lane is frozen, stop here)

Either commit `ping-runtime/jev/shadow_worker.js` (plus `typed_decision.js` if imported) as part of the candidate,
or make the require lazy/optional so the committed tree stands alone. Do NOT mix in the Jev replay-precedence candidate
(which remains committed on `jev/verdict-authority-hardening` and bounded). Do NOT commit anything until Nolan decides.

## What DID reproduce from 5bb2d08b5 (all clean, independently re-run)

| Suite | Result |
|---|---|
| test_replay_precedence.js (P1-P8 hostile replay spoof cases) | 8/8 PASS |
| test_replay_worker_wiring.js | 17/17 PASS |
| test_verdict_authority.js (incl. golden path G1-G7) | 34/34 PASS |
| test_witness_adversarial.js (incl. observable refusals: `replay_authority_evidence_missing`, forged upstream reference rejected) | 13/13 PASS |
| test_witness_negpath.js | 8/8 PASS |
| test_kernel_replay.js (genuine kernel replay incl. determinism corpus) | 23/23 PASS |
| test_correlation_chain.js | 13/13 PASS |

(`test_jev_shadow.js` was never committed — untracked — and is correctly excluded from SHA verification.)

## Statically verified in the SHA (true, but moot while bootstrap cannot load)

- API routes hardcode source: `gateway/routes/events.js:97,120` and `identities.js:178` call `eventRuntime.emit(..., 'api', ...)` — caller input cannot supply the authoritative source.
- `BaseWorker._emit` stamps `this._name` (constructor-set per subclass: 'replay', 'witness', etc.) as the emission source — caller payload cannot override it.
- `ReplayWorker._buildReplayEvents`: caller `payload.replay_events` honored ONLY when constructed with `allowPayloadTranscript: true` (constructor system metadata, `options.allowPayloadTranscript === true`); production resolves the authoritative correlation group from the canonical store; otherwise single-event fallback of the triggering event.
- `ReplayWorker._buildAuthorityEvidence`: `event.namespace || event.metadata?.namespace` — event-row namespace outranks caller metadata for tenant identity; verdict (`verified`, `reason`, `fingerprint`) comes from the kernel replay result, never incoming claims.
- `allowPayloadTranscript: true` appears only in test harnesses (`test_replay_precedence.js`, `test_replay_worker_wiring.js`, `test_verdict_authority.js`, `EVAL-009_replay_convergence.js`); production `registerCanonicalWorkers(...)` in `gateway_runtime.js` does not set it — the flag is unreachable from any event payload.
- Commit contents match the claim: 9 files, +1024/-21, no unrelated diff in the candidate.

## Not re-verified (superseded by the FAIL)

- DB role boundary live re-inventory: not needed once the verdict is FAIL; the prior inventory stands as the last read-only observation.
- Dispatcher consequence-path live trace: likewise superseded.

## Action

Lane frozen. No new commits, no push, no merge, no deploy. Awaiting Nolan's decision on the repair above.

---

## REPAIR (2026-09-23, Nolan's directive: Option 1)

The lane chose commit-the-worker, not make-it-optional.

### Provenance finding

The two missing files were the intended P2/P3 implementation (created in
the candidate's build window, referenced by the candidate's own bootstrap
require, its own comments, and its own untracked test). No secrets, no
network access, shadow-only policy. Both were required: `shadow_worker.js`
requires `./typed_decision` at module scope.

A second genuine gap surfaced during repair: the candidate's own shadow
test asserted the live EventValidator accepts `JEV_DECISION_EVALUATED`, but
the registration existed only in the author's dirty generated files. The
registration delta (234 -> 235 types) was committed as part of the required
worker/dependency delta.

### Repair commits on `jev/verdict-authority-hardening`

- `8bdfdfd78` — commit `ping-runtime/jev/shadow_worker.js` + `typed_decision.js`
- `8eccdfcf9` — permanent PB regression gate (bootstrap load, see below)
- `fffe99f7a` — register `JEV_DECISION_EVALUATED` in generated artifacts

Final repaired SHA: `fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f`.

### Permanent regression gate

`gateway/test_production_bootstrap_load.js` (PB-1..PB-6): loads the
production composition root from the committed tree, loads the shadow
worker and typed decision contract, verifies the in-tree dependency
closure, verifies the bootstrap requires and registers `jev-shadow` on
CLAIM_CREATED with a NON-optional require, and verifies shadow-only
execution policy. Verified: FAILS on `5bb2d08b5` (MODULE_NOT_FOUND class),
PASSES 6/6 on the repaired SHA.

### Independent re-verification (second clean checkout of the final SHA)

CLEAN CHECKOUT -> INSTALL -> PRODUCTION BOOTSTRAP LOAD -> GATEWAY START ->
HEALTH -> SHADOW WORKER LOAD -> 12 GATES -> INDEPENDENT REPRODUCTION.

- Fresh detached worktree of `fffe99f7a`; gateway `npm ci` (360 pkgs);
  constitutional TS build; bootstrap loaded from the committed tree.
- Real production entry `node gateway/server.js` booted and served;
  `GET /health` returned gateway component healthy (degraded mode: no
  production DB in sandbox, PG pipeline skipped, no crash).
- Shadow worker: module loads; functional probe through WorkerRuntime
  mirroring the bootstrap registration: registered, handled a synthetic
  CLAIM_CREATED, emitted JEV_DECISION_EVALUATED stamped `jev-shadow`,
  mode shadow, mayExecute denied.
- All suites exit 0 from the clean checkout: PB 6/6, replay precedence 8/8,
  wiring 17/17, verdict authority 34/34, witness adversarial 13/13, witness
  negpath 8/8, kernel replay 23/23, correlation chain 13/13,
  EVAL-009 replay convergence, jev shadow 21/21.

Full evidence: [GATEWAY-CANDIDATE-REPAIR-2026-09-23.md](sandbox://workspace/jev/evidence/GATEWAY-CANDIDATE-REPAIR-2026-09-23.md)

### Verdict

**REPAIRED AND REPROVED.** The committed tree is self-contained: the
production bootstrap loads from the SHA alone, the gateway starts from the
real production entry path, and all gates reproduce. No push, no merge, no
deploy. Awaiting Nolan's promotion decision.
