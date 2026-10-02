# S9 OPEN-ITEMS PROBE — small leftovers (F29 remainder, F179, F159)

Date: 2026-09-24 ~05:20 MDT. Investigator: semantic probe S9 (read-only).
Standing posture: no commits, no destructive actions, WIP preserved, live runtime read-only.
No patches applied by this probe.

## W9-F1 — F29 REMAINDER: identity.ts comment-only patch ATTRIBUTED [WRITE-GATE] [P2]

**Classification: ATTRIBUTED.**

**Target file:** `src/fyd/claim/identity.ts` in the sprint worktree `/home/nolan/projects/ping-constitutional`
(branch `constitutional-convergence-v2`, worktree HEAD `a69bb68fc84620a5635e071030cf49a633df7394`).

**Forensic evidence:**
- Worktree diff (vs index and vs HEAD, identical): comment-only docstring change, replacing the stale claim that the Google-ready auth adapter was "being built in parallel (src/fyd/identity)" and "when that adapter lands" with the corrected statement that a Google-ready adapter already exists in-tree (provider, callback flow, session routes, file store, audit), still deliberately not consumed by the claim bridge. The inserted comment itself is dated "corrected 2026-09-23".
- `git log` of the file: single committed revision `060d7eb2d` (2026-09-21 16:15:18 -0600, Pigi) — the change is uncommitted WIP. File mtime on disk: 2026-09-23 20:41:51 -0600.
- **The author admitted it in writing:** `fyd-path/FYD-GOLDEN-PATH.md` line 3: "Investigator: forensic subagent (read-only; one authorized docstring patch, uncommitted)"; lines 115-122 carry the full Nolan-authorized patch record (WHY: stale docstring on the auth seam is a truthfulness defect; script retained at `fyd-path/patch-identity-comment.py` for replay). F29's own original text already named it: "disclosed docstring-only patch by the FYD golden-path worker".

**Why it looked unidentified:** F193's "still UNIDENTIFIED" reflected Agent 16's cross-lane visibility (Agent 16 truthfully reported not touching it), not a missing admission. The admission was in the FYD lane's evidence all along.

**Verdict:** ATTRIBUTED to the FYD golden-path investigator's forensic subagent. No governance action outstanding; the write-gate breach concern for this file closes (the docstring patch was disclosed and carried a patch record). This does NOT need a full lane.

## W9-F2 — F179 RESOLVED: /mc/queues is NOT vestigial; it reads the live journal [OBSERVABILITY] [P2]

**Classification: LIVE** (route registered, boot-wired, serves live journal data; consumerless caveat below).

**Evidence (live runtime `/home/nolan/ping`, read-only):**
- Route registration: `gateway/routes/mission_control.js` defines `router.get('/queues', ...)` — groups `unifiedEventRuntime.query({ since, limit })` results by `event_type` (default window = last hour, limit 50) — and `router.get('/queues/:eventType', ...)` — same source, filtered by type.
- Mount: `gateway/bootstrap/gateway_runtime.js:810` — `this._app.use('/mc', createMissionControlRoutes(services))`; the `unifiedEventRuntime` injected is the live `UnifiedEventRuntime` constructed at `gateway_runtime.js:433` and initialized at boot (`:439`).
- Data source: `UnifiedEventRuntime.query()` at `ping-runtime/events/unified_event_runtime.js:224` builds `SELECT * FROM ping_events WHERE 1=1` (`:227`) — the **live journal**. Corroborating in-file evidence: `mission_control.js:33` companion helper runs `SELECT COUNT(*) FROM ping_events`, and the file header states "Every widget is backed by canonical events from ping_events."
- Callers/consumers: zero code references to `/mc/queues` anywhere in the live repo (searched js/py/ts/sh/ps1/json; only matches are doc listings in `AGENTS.md:1570` and in old worktrees). The route is mounted and functional but has no in-repo consumer — a consumerless live endpoint, not a dead one.

**Resolution of the contradiction:** OBS1 (obs1-mission-trace.md T8) was correct. OBS3's row-table claim ("`/queues` reads the vestigial protocol") is refuted at the current revision — it conflates `/mc/queues` with the genuinely vestigial `/events/unprocessed|/processed|/failed` protocol (`gateway/routes/events.js:129-150`, `event_processing` table, documented at obs3-worker-queue.md:50). Two distinct things shared a name family; the "vestigial" label belongs to the `/events/*` queue protocol only.

**Verdict:** LIVE. No retirement action is defensible on the "vestigial" theory; if cleanup is wanted, the honest framing is "consumerless live endpoint". This does NOT need a full lane.

## W9-F3 — F159 TRIGGER: `trg_ping_events_append_only` PROVEN-absent on the live journal [EVENT] [P2]

**Classification: PROVEN-absent.**

**Query (read-only, executed 2026-09-24 ~05:19 MDT):**
Transport: Pig WSL (`pigwsl-run.sh`), `docker exec brain-postgres`, credentials sourced from the container's own environment inside the container (no secret values exfiltrated or printed).

```sql
SELECT c.relname AS table_name, t.tgname AS trigger_name, t.tgenabled AS enabled
FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'ping_events' AND NOT t.tgisinternal
ORDER BY t.tgname;
```
against `brain-postgres` DB `ping_runtime` (the F58-proven live journal).

**Output:** zero rows. No user triggers exist on `ping_events` in the live journal.
Sanity control (read-only): `SELECT count(*) FROM ping_events;` → `2429`, matching F58's live-journal identity (brain-postgres/ping_runtime).

**Verdict:** the append-only trigger does not exist on the live journal tonight. This is an independent re-verification that corroborates F59 (Agent 13's catalog sweep, which found zero triggers on brain-postgres/ping_runtime and the trigger only in staging DBs). Practical consequence stands: append-only is enforced by code (`INSERT ... ON CONFLICT DO NOTHING` + fail-closed), not by the database — anyone with app credentials can still UPDATE/DELETE the live journal silently. (F59's proposed P1 trigger promotion remains unapplied.) This does NOT need a full lane.

---

## Scope note

All three targets resolved inside probe scope with file:line evidence. No target turned out to be bigger than a probe; none needs a full lane. No commits created, no files modified outside this report, live runtime untouched.
