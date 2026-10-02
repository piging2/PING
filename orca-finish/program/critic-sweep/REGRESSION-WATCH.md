# REGRESSION WATCH: CRITICS-SWEEP

**2026-09-24 ~05:40 MDT.** Flipped claims since the prior critic passes,
plus the standing watch list. Format: claim / was / now / evidence.
No em dashes used. This file complements (does not replace)
program/cmd-ops/REGRESSION-LOG.md, which carries R1-R16.

## Flips recorded by this sweep

### RW-1. Product critique completeness (NEW, blocking-grade)

- **Claim:** program/critic-product/PRODUCT-CRITIQUE.md is a complete
  deliverable (six records, scoreboard, follow-on queue).
- **Was:** checkpoint at 2026-09-23 22:05 MDT records the deliverable as
  complete with six records, a scoreboard, and a follow-on queue.
- **Now:** the file on disk ends mid-Target-5 with the literal text
  `...[truncated 6902 chars]`. Target 5 is cut mid-sentence; Target 6,
  the scoreboard, and the follow-on queue are not present.
- **Evidence:** STATIC (file bytes read 2026-09-24).
- **Disposition:** the checkpoint overclaims. Treat the critique as four
  written records plus a truncated fifth. Do not cite targets 5/6 content
  that does not exist.

### RW-2. A6 crash recovery (improvement; already R16 in CMD-OPS)

- **Claim:** A6 crash recovery works.
- **Was:** 2026-09-18 witnessed A6 FAIL (work lost on mid-dispatch kill).
- **Now:** 2026-09-24 TEST-A6 PASS on all 6 gates (kill mid-dispatch, lock
  re-acquire, reconcile-before-dispatch, no duplicate delegation, honest
  terminal WORKER_FAILED, durable budget 1/2) + synthetic 9/9.
- **Evidence:** TEST (GAUNTLET-RESULTS.md).
- **Disposition:** improvement flip, witnessed. Caveat: the real worker
  produced zero output and timed out at 180s, so the mission FAILED
  honestly; recovery is proven, mission completion is not. Independent
  falsification by Agent 19 is pending (its first attempt errored on
  infrastructure).

### RW-3. ORCA-B terminal vocabulary (improvement)

- **Claim:** ORCA-B quotes the ledger terminal states correctly.
- **Was:** ORCA-B checkpoint misquoted the ledger terminal set (recorded
  as a semantic error in the prior audit).
- **Now:** VERDICTS.md quotes both state machines correctly and
  explicitly separates them: ledger (orca_status_model.js: FAILED /
  VERIFICATION_FAILED / CLOSED, no COMPLETED) vs durable record
  (objective-runtime.js: COMPLETED / FAILED / VERIFICATION_FAILED /
  BLOCKED).
- **Evidence:** STATIC (ORCA-B VERDICTS.md + CHECKPOINT.md T+75).
- **Disposition:** corrected at the source. Other docs quoting terminal
  sets must be checked against the corrected pair (see W13-adjacent note
  in SEMANTIC-PASS.md S3).

### RW-4. Deletion docket stability (no flip)

- **Claim:** all 24 proven-dead verdicts hold against the current tree.
- **Was:** docket issued 2026-09-24 02:51 UTC; GC-12 re-grep completed
  ~03:35 UTC with 24/24 surviving.
- **Now:** rescan on the current tree (same HEAD cc6856c3b, dirty count
  17) confirms: no dead claim resurrected, no rejected candidate became
  dead, no status changes.
- **Evidence:** STATIC (Pig SSH rescan, gc12-regrep.sh re-run).
- **Disposition:** no regression. Docket confidence not reduced. No
  deletions authorized (standing).

## Watch list (standing + new)

| ID | Watch | Owner | Trigger |
|----|-------|-------|---------|
| W13 (new) | Stale A5-era `sha256('workorder:'+taskId)[0:16]` persists in wave1/orca-arch/ORCA-INVENTORY.md:32 and two source copies (redteam poc + orca-d vendor) | parent / ORCA-A | any doc quoting the formula; Agent 19 H1j brief |
| W14 (new) | HS-2 run identity `sha256hex('run:'+scope+':'+seq)` depends on a per-scope sequence authority that does not exist; drifts from W2 `sha256('run:'+objective_id+':'+run_seq)` | parent | before HS-2 build: pick one canonical derivation |
| W15 (new) | Gauntlet harness observe() GETs production health by default; next chaos run must remove it or add an egress allowlist | parent / next chaos lane | CHAOS-B/C launch |
| W16 (new) | HS-6 rendezvous acceptance has no freshness/digest/identity requirements; spec must gain them before build | impl-safety lane | HS-6 build authorization |
| W17 (new) | HS-2/HS-3 cross-run reconciliation: attempt numbering and record linkage for NEW runs from UNKNOWN are unspecified | impl-safety lane | HS-2/HS-3 build |
| W18 (new) | PRODUCT-CRITIQUE.md targets 5/6 + scoreboard + follow-on queue missing; checkpoint claims complete | parent / critic-product | any citation of product targets 5+ |
| W1-W12 | carried from CMD-OPS REGRESSION-LOG.md (spawn retry, checkpoint discipline, vantage fields, docket gating, GC-5 live-path changes, GC-7 token flaw, Agent 19 falsification, GC-10/GC-6 docket, GC-11 harness authority, GC-12 re-grep gate, work-order vocabulary, FC-2/FC-3 second instance) | various | per REGRESSION-LOG.md |

## Agent 19 cross-check (standing)

- FALSIFICATION-RECORD.md: still absent.
- Agreements (checkpoint-verified): C5 wiring, C3 ancestry + zero-hit
  reproduction, C2 GAP12 scope, P-7 substance (with "verbatim" downgraded).
- wedge-test.js landed; run result not logged.
- TEST-A6 independent falsification: first attempt errored (infrastructure
  timeout, no checkpoint); recovery queued with the full challenge brief.
- No final contradiction assertable until FALSIFICATION-RECORD.md exists.
