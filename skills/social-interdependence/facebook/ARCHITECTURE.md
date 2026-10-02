# Architecture: Facebook Autonomous Engagement Slice

## Position in the system

This slice is the Facebook execution arm of the social-interdependence skill. It does not own eligibility policy, authority, or the production intent ledger; it consumes them. The dependency arrows point outward to existing PING/outreach machinery, never inward to new stores.

```
                    +---------------------------+
                    | Nolan (envelope author)   |
                    | sets budgets, ramp,       |
                    | breakers, thresholds      |
                    +------------+--------------+
                                 | writes (only writer)
                                 v
+-------------+      +----------------------+      +------------------+
| authority-  |----->| si_fb_scheduler.py   |      | engagement-      |
| check.py    | ALLOW| tick: may a pass     |      | guard.py         |
| holds.json  |      | start?               |      | eligibility_     |
| AUTHORITY.  +----->| si_fb_orchestrator.py|----->| check()          |
| json        |      | run/resume           |      | stamp/verify     |
+-------------+      +----------+-----------+      +------------------+
                                |
              +-----------------+-----------------+
              |                 |                 |
              v                 v                 v
     si_fb_state.py    si_fb_invariants.py   si_fb_adapter.py
     (append-only      (runtime asserts,      (BOUNDARY FIXTURE:
      JSONL + atomic    transition table)     fake Facebook;
      budgets/leases)                         prod: Pig CDP)
              |                 |                 |
              +-----------------+-----------------+
                                |
                                v
                     si_fb_watchdog.py  (rates -> breakers)
                     si_fb_reconcile.py (crash recovery)
```

## Component responsibilities

**si_fb_scheduler.py**: Pass admission. Checks authority, health, safe mode, 2h cadence, the pass lease, breakers, budget headroom. Emits `pass_started` plus a machine-readable reason. Starts nothing else. Never grants authority.

**si_fb_orchestrator.py**: The only component that touches the adapter. Runs the pipeline: evaluate (real guard) -> decision record -> budget consume -> intent persist -> dispatch gates -> execute -> read-after-write verify -> finalize. Owns `drive_intent`, the per-intent state driver, and `recover_unknown`, the read-back recovery. Imports the real guard via importlib and shells out to the real authority-check.py.

**si_fb_state.py**: Durable state. Append-only fsync'd JSONL for intents, transitions, observations, decision records, watchdog events. Atomic budgets (flock, consume-or-refuse) and leases (acquire with TTL, holder-checked release). `fold_intents()` is the single decision-replay fold over the transition stream. Readers tolerate zero-byte files left by kills between create and write (treated as absent, not corrupt).

**si_fb_invariants.py**: The 12 machine-enforced invariants plus the declarative transition table (`ALLOWED_TRANSITIONS`) and the per-target in-flight check. Every `transition()` call checks the table before persisting; illegal transitions raise before anything is written.

**si_fb_envelope.py**: Envelope validation and the deterministic budget formula: `base + ramp_per_week * weeks_since_anchor`. The ramp is constitutional arithmetic; the learner cannot change it.

**si_fb_adapter.py**: THE ONLY FAKE. A durable fake Facebook (posts with liked/like_count/comments/negative_feedback) plus fault injection for failure shapes (timeouts, mid-request crashes, lies, checkpoint aborts, expired credentials, outages). Returns raw evidence only; the module self-checks `NO_ADAPTER_DECISION_AUTHORITY` on its own output. The production adapter implements the same contract against the Pig CDP browser (see CAPABILITY_MATRIX.md).

**si_fb_watchdog.py**: Rate computation over the observation window (failure, unknown, verification-failure), budget anomaly detection, negative-feedback spike scan. Opens breakers; breakers auto-close after cooldown plus a probe. Never grants authority, never dispatches.

**si_fb_reconcile.py**: Crash recovery. Requeues intents that never dispatched, recovers in-flight intents by reading external state (never re-executing), releases dead leases. Replay here is decision replay only.

## State and persistence

All slice state is JSON under `$SI_FB_STATE`:

- `intents.jsonl`, intent records AND transition records AND adapter-evidence records, in one append-only stream. The fold reads this file and only this file.
- `observations.jsonl`, terminal observations (what was finally decided, with detail).
- `decision_records.jsonl`, per-candidate decision records with the full contract fields.
- `watchdog.jsonl`, watchdog events (outcomes, verification failures, breaker actions).
- `budgets.json`, `leases.json`, `circuit_breakers.json`, `relationships.json`, `adapter_facebook.json`, atomic JSON documents.

No new event DB. The production `action-intent-ledger.py` remains the cross-surface intent ledger; this slice's stream is the Facebook-local decision history. The boundary is marked: reconciliation between the two is future work, and the slice never writes to the production ledger in tests (it writes to a scratch copy via `ENGAGEMENT_INTENT_LEDGER`).

## Authority flow (no new PING authorities)

The slice reuses: MissionRuntime (pass execution), MissionScheduler (cadence), WorkerRuntime (the Pig worker, via the production adapter), CapabilityAuthority (action-capability.json via the guard), IdentityAuthority (acting account identity via the envelope + authority gate), HashAuthority (evidence_hash via the guard's stamp), Witness (decision records + observations), Lineage (intent_id determinism + batch lineage), Replay (fold_intents decision replay). No new authority is created. The autonomy envelope is a tenant-scoped policy document, not an authority.

## Failure domains and blast radius

- A fault in one intent cannot affect another: per-intent leases, per-intent evidence, atomic budgets.
- A crash anywhere before VERIFYING leaves the intent recoverable by read-back; a crash after VERIFYING leaves a terminal observation.
- The adapter can lie, time out, or die; the orchestrator never trusts it. Verification is always orchestrator-side.
- The watchdog can only stop mutations (breakers, safe mode); it cannot start them or grant authority.
- The scheduler can only admit passes; it cannot authorize actions.

## What was proven during construction

Building the test suite found and fixed four real defects: transitions were written to a file the fold never read (resume was blind); readers choked on zero-byte files left by kills; the orchestrator did not thread the guard's within-batch duplicate set; the lie fixture mutated before lying. Each fix is covered by a regression test. The suite is 121 tests, all passing, all against scratch state.
