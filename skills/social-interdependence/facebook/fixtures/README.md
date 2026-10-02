# Fixtures

This directory documents the test fixtures for the Facebook slice. There is exactly one fixture in the system, and it lives at the adapter boundary only.

## The boundary fixture: `../bin/si_fb_adapter.py`

A durable fake Facebook: posts with `liked`, `like_count`, `comments`, and `negative_feedback`, persisted as JSON under `$SI_FB_STATE`. It implements the production adapter contract (`read` / `execute` returning raw evidence only) so the orchestrator, state machine, watchdog, and recovery are exercised as real code.

Fault injection via `SI_FB_ADAPTER_FAULT`:

| Mode | Simulates |
|---|---|
| `timeout_before_request` | Request dies before reaching Facebook; read-back proves no effect |
| `crash_during_request` | Mutation committed, acknowledgement lost; read-back finds the effect |
| `timeout_after_success` | Mutation committed, timeout returned; read-back finds the effect |
| `lie_about_success` | Adapter claims success without mutating; read-after-write catches the lie |
| `checkpoint_abort` | Platform checkpoint signal; pass aborts, no mutation committed |
| `expired_credential` | Logged-out session; `attempted: false`, no mutation attempted |
| `platform_outage` | Every call raises; safe mode defers before any attempt |
| `outage_after_probe` | Probe answers, then execute and reads fail; UNKNOWN cannot resolve |

The fixture self-checks `NO_ADAPTER_DECISION_AUTHORITY` on its own output: any record claiming a canonical outcome is rejected before return.

## What is NOT a fixture

Everything else is real code under test:

- Eligibility: the real `engagement-guard.py` `eligibility_check()`, `stamp_evidence()`, `verify_evidence()` against scratch copies of the real eligibility data.
- Authority: the real `authority-check.py` against scratch `holds.json` / `AUTHORITY.json`.
- Ledger pattern: the real `action-intent-ledger.py` against a scratch ledger file.
- Envelopes, budgets, leases, state machine, invariants, scheduler, watchdog, reconciler: the actual slice code.

## Rules

1. Fixtures exist ONLY at the adapter boundary. A test that fakes eligibility, authority, budgets, or state is a defective test.
2. Tests run against scratch state via env overrides (`SI_FB_STATE`, `ENGAGEMENT_GUARD_DIR`, `HOLDS_JSON_PATH`, `AUTHORITY_JSON_PATH`, `AUTHORITY_CONFLICTS_DIR`, `OUTREACH_ROOT`, `ENGAGEMENT_INTENT_LEDGER`). Production state is never touched.
3. Eligibility-data copies in scratch are regenerated from the single source copies on every test setup and never written back. This is isolation, not a fork.
4. LIVE EXTERNAL EXECUTION is BLOCKED in this environment: no credentials exist here and the Pig CDP endpoint is unreachable. The fixture stands in for the production adapter (Pig CDP browser) whose contract is specified in `CAPABILITY_MATRIX.md`.
