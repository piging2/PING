# HOLD Operator Runbook

**Scope:** the mission HOLD surface in `ping-runtime/orchestration/`
(`mission_runtime.js`, `mission_scheduler.js`).
**Status:** live as of the E3 HOLD repair round (2026-09-27).
**CLI:** `resolve-hold-cli.js` (same directory).

---

## 1. What a HOLD is

A HOLD is a durable record that one attempt's outcome is UNKNOWN: the worker
may or may not have produced an external effect (dispatch timeout, no result,
stuck worker, killed before ack). The mission row keeps its status; `hold_at`
/ `hold_reason` are set.

While held, a mission is invisible to every dispatch path: the reaper
(`reapExpiredLeases`), the retry reclaimer (`reclaimRetryPending`), the
pending list (`getPending`), the claim (`assign`), and the stuck watchdog
(`findStuckRunning`) all exclude it. A hold is never auto-retried and never
expires on its own. `resolveHold` is the ONLY way a mission leaves HOLD.

## 2. Automatic resolution paths

You do not need to act on every hold. Two automatic paths exist:

**a) Late worker ack.** If the worker's ack lands late through `complete()`
while the mission is held, the next held-resolution sweep
(`MissionScheduler.reconcileHeldMissions`, runs every scheduler poll)
resolves it as PROVEN_OCCURRED: the result is adopted, the mission goes to
`completed`, and it is never re-dispatched. This works for holds in any
holdable status (`running`, `assigned`, `created`), including rows the
reaper-recovery path re-held as `created`.

**b) Escalation.** A hold whose outcome stays unproven past
`holdEscalationMs` (scheduler option, default 24h) is re-surfaced by the
sweep: an escalated `MISSION_RECONCILE_HOLD` event (with `escalated: true`
and `holdAgeMs` in the event data), a reconciliation-log entry, and a
`holdsEscalated` stat. Escalation is a signal, not a resolution: the hold
stands until proven. Treat an escalated hold as "investigate now" and work
this runbook from section 4.

## 3. The three resolutions

| Resolution | Effect on the row | When to use it |
|---|---|---|
| `PROVEN_OCCURRED` | `completed`; the result you pass is adopted (plus `hold_resolution`) | You have proof the external effect happened (ledger entry, provider dashboard, recipient confirmation). The mission is terminal and never re-dispatched. |
| `PROVEN_NOT_OCCURRED` | `created`, hold cleared, for exactly one new attempt | You have proof the effect did NOT happen (provider shows no record, idempotency key absent). Attempt clocks reset (`started_at`, `claimed_at`, `lease_until`, `assigned_to`, `retry_at`); `retries` is deliberately NOT reset, so retries stay bounded toward exhaustion. |
| `MANUAL_RESOLUTION` | `completed`, recorded in result with `manual: true` | You as operator decide the terminal state (e.g. the work is moot, superseded, or handled out of band). Terminal; never re-dispatched. |

Any other resolution string throws (fail closed). Resolving a mission that
is not held is a no-op.

## 4. Listing held missions

SQL (read-only):

```sql
SELECT mission_id, mission_type, status, hold_at, hold_reason, retries,
       assigned_to, tenant_id
FROM ping_missions
WHERE hold_at IS NOT NULL
ORDER BY hold_at ASC;
```

Or the CLI (section 6).

## 5. Verifying an outcome before resolving

Absence of evidence is not evidence of absence: a missing result row does
not prove the effect did not happen. Before `PROVEN_NOT_OCCURRED`, check the
external system of record for the mission's effect (the mission payload and
`hold_reason` say what the attempt was for): the provider ledger, the
recipient's inbox/sent folder, the payment processor, the downstream API's
idempotency log. Resolve `PROVEN_NOT_OCCURRED` only on positive proof of
non-occurrence, not on "I could not find it".

`MISSION_RECONCILE_HOLD` events and `getReconciliationLog()` carry the
reconciler's evidence (mission id, payload digest, dispatch outcome,
correlation/causation ids) to start from.

## 6. CLI invocation path

Connection: `DATABASE_URL`, or `PGHOST` / `PGPORT` / `PGDATABASE` /
`PGUSER` / `PGPASSWORD`. Requires the `pg` package resolvable where the CLI
runs.

```bash
# list held missions, oldest first
node ping-runtime/orchestration/resolve-hold-cli.js list
node ping-runtime/orchestration/resolve-hold-cli.js list --limit 20 --json

# resolve one (examples)
node ping-runtime/orchestration/resolve-hold-cli.js resolve \
  --mission <mission_id> --resolution PROVEN_OCCURRED \
  --result-json '{"proof":"ledger-shows-charge","charge_id":"ch_1"}'

node ping-runtime/orchestration/resolve-hold-cli.js resolve \
  --mission <mission_id> --resolution PROVEN_NOT_OCCURRED

node ping-runtime/orchestration/resolve-hold-cli.js resolve \
  --mission <mission_id> --resolution MANUAL_RESOLUTION \
  --result-json '{"note":"handled out of band by operator"}'
```

Exit codes: 0 done; 2 no-op (mission not held / not found) or usage error;
1 operational failure. The CLI refuses to resolve a mission that is not
held, so a typo cannot silently no-op.

No scheduler restart is needed after a CLI resolution: the scheduler's
per-episode dedup re-reads the durable hold, so a stale in-memory entry is
dropped and the next genuine unknown outcome reconciles fresh.

## 7. Safety rules

- Never `UPDATE` the `hold_at` / `hold_reason` columns (or `status`) by
  hand. `markHold` is the only writer of `hold_at`; `resolveHold` is the
  only clearer. Hand edits bypass the conditional guards and the event
  trail.
- `PROVEN_NOT_OCCURRED` authorizes exactly one new attempt through the
  normal conditional claim. If that attempt also goes unknown, it will be
  held again as a new episode: that is correct behavior, not a bug.
- `MANUAL_RESOLUTION` is terminal. Do not use it to "retry later".
- A hold on a mission whose effect already happened must never be resolved
  `PROVEN_NOT_OCCURRED`: that path re-dispatches, which is exactly the
  duplicate-effect hazard the HOLD exists to prevent.
- If you are unsure, leave the hold standing. A standing hold is safe
  (nothing dispatches it); a wrong resolution is not reversible by the
  machine.

## 8. What the scheduler logs tell you

- `OUTCOME UNKNOWN - RECONCILIATION IN PROGRESS` (event
  `MISSION_RECONCILE_HOLD`): a new hold episode started.
- `HOLD resolved PROVEN_OCCURRED for <id> (late completion ack adopted)`:
  the sweep auto-resolved on a late ack.
- `HOLD ESCALATED for <id> (age ... , outcome still unknown)`: section 2b;
  investigate now.
- `Hold for <id> was resolved after the reconciler snapshot (hold_at
  cleared) - standing down, no re-hold (E3 H5)`: a stale reconciler saw your
  resolution and stood down instead of reversing it. Expected and correct.
