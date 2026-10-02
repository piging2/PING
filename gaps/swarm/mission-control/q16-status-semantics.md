# Q16 — STATUS SEMANTICS AUDIT (Mission Control read model)

Audited plane: /home/nolan/projects/ping-fyd-converged @ 4ad9a7a3fc7e6276f7147388bfefd597408682bf
(see report.md for SHA note vs the 300c9c91 cited in the task). Read-only; :3100 down, so source-audit only.

## Status vocabularies found

1. `src/app/mission-control/page.tsx:22-30` — `Truth` union: OBSERVED / DERIVED /
   INFERRED / PROPOSED / APPROVED / EXECUTED / VERIFIED / FAILED / UNKNOWN,
   with a distinct style per value (FAILED = red #4f1414/#ff8a8a, UNKNOWN = gray
   #3a3a4a/#b9b9d6, EXECUTED = purple #3a1f5a/#d0a8ff, VERIFIED = green).
2. `src/app/api/mc/_lib/mc-dispatch.ts:85-91` — `MissionStatus`: CREATED / QUEUED /
   RUNNING / SUCCEEDED / FAILED / UNKNOWN / DENIED (not wired into the served UI).
3. `src/app/api/mc/agents/route.ts:91-109` — `displayState()`: "RUNNING" /
   "OUTCOME UNKNOWN — NO RECORD" / "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS" /
   "FAILED (proven)" / "RECORDED — EFFECT VERIFIED". Explicit law: timeouts never
   display as FAILED.
4. `src/app/mission-control/marketingos-panel.tsx:18,56-69` — Epistemic:
   KNOWN (green) / UNKNOWN (gray) / NOT_STARTED / NOT_APPLICABLE / PENDING (amber)
   / CONFLICTING (red); verdicts CONFIRMED (green) / UNCLEAR (amber) / REFUTED (red).
5. `src/app/api/mc/technology/route.ts:14-17,43` — claims PROVEN / DEGRADED /
   PROTOTYPE / UNWIRED (UNWIRED = "looked for (bounded search) and confirmed absent").

## FAIL instances (file:line)

### F16-1. FAILED mission rendered green (KNOWN) — mc-marketingos.ts:218-221
```ts
: {
    state: 'KNOWN',
    ...(row.status === 'failed'
      ? { reason: 'MISSION_FAILED' as const }
      : {}),
```
A marketing mission with `row.status === 'failed'` still returns `state: 'KNOWN'`.
The panel renders KNOWN with the green badge (`#123f2a`/`#7dffa8`,
marketingos-panel.tsx:57,65-66); the failure is demoted to a `reason` string on
a green badge. FAILED -> green/healthy. FAIL.

### F16-2. UNKNOWN outcomes rendered as EXECUTED — page.tsx:1296
```tsx
<TruthBadge t={o.currentState ? "EXECUTED" : "UNKNOWN"} />
```
`currentState` comes from `/api/mc/agents` `displayState()`, whose truthy values
include "OUTCOME UNKNOWN — NO RECORD", "OUTCOME UNKNOWN — RECONCILIATION IN
PROGRESS", and "FAILED (proven)". Any non-empty string -> EXECUTED (purple).
So UNKNOWN outcomes AND proven FAILED states both render as EXECUTED.
UNKNOWN -> EXECUTED; FAILED -> EXECUTED. FAIL.

### F16-3. Ledger verdicts rendered as EXECUTED even when all-FAILED — page.tsx:1395
```tsx
<TruthBadge t={eff ? "EXECUTED" : "UNKNOWN"} />
```
Any truthy verdict object (even `verdicts: {FAILED: n}`) -> EXECUTED badge in
the Results view. The separate Failures view catches it, but the Results view
paints a failed mission EXECUTED. FAILED -> EXECUTED. FAIL.

### F16-4. Unreachable services rendered DEGRADED, not UNKNOWN — today/route.ts:149-152
```ts
const journalHealth: Health = journalPing.ok && overlaysRaw.ok ? "PROVEN" : "DEGRADED";
const siteHealth: Health = selfHealth.ok ? "PROVEN" : "DEGRADED";
```
An unreachable service (no read at all; e.g. :3100 down as of 18:00-18:03 MDT)
renders DEGRADED (amber), which means "partial read". Unreachable != degraded;
the truthful state is UNKNOWN. Also page.tsx:445
`.catch(() => setToday({ ok: false, status: "DEGRADED" }))` — total fetch failure
of /api/mc/today -> DEGRADED instead of UNKNOWN. FAIL (semantic conflation).

### F16-5. Hardcoded PROVEN over error-swallowing readers — today/route.ts
- `today.happening.status = "PROVEN"` (hardcoded) with `runningWorkers` from
  `listDirSafe()`, which returns `[]` on ANY error (dir missing, permission).
  A missing inprogress dir renders "PROVEN: no workers running".
- `today.willHappenNext.status = "PROVEN"` (hardcoded); an unreadable cron.d
  renders "PROVEN: nothing scheduled".
Error-swallowing -> false certainty. FAIL.

### F16-6. Static claim rendered PROVEN/healthy — page.tsx "Live sites" card (~line 660-667)
Card `health="PROVEN"`, prov happened: "two tenant sites are live on the private
:3100 surface" — hardcoded prose, not a live read. With :3100 down (known
18:00-18:03 MDT), "live" is unobservable; it still renders green/PROVEN.
Unwired/unobservable-but-code-exists -> green. FAIL.

## Test 1 verdict (UNKNOWN rendered as FAILED/red)
NOT FOUND in the audited MC code paths. The `/api/mc/agents` route carries an
explicit truth-display law against it (agents/route.ts:13-17, 91-109: timeouts
surface as "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS", never FAILED), and
no mapping sends an UNKNOWN status to the red FAILED badge.

## Test 2 verdict (unwired-but-code-exists rendered green/healthy)
CONFIRMED — F16-1 (FAILED marketing mission -> green KNOWN badge) and F16-6
(hardcoded "two tenant sites are live" -> PROVEN card).

## Partial credit (honest parts)
- TruthBadge color map itself is honest (FAILED red, UNKNOWN gray).
- CRM views render the honestly-UNKNOWN views as UNKNOWN/PROTOTYPE (page.tsx:1087-1103).
- EmptyState cards render PROTOTYPE + UNKNOWN with no invented rows (page.tsx:170-189).
- Failures views filter only proven ledger FAILED verdicts (page.tsx:1407-1460).
- marketingos-panel renders fetch errors in red text (lines 219, 275) — the text
  describes the READ failure, not the underlying state; defensible, not counted
  as a FAIL.

## Smallest fixes (no code written; proposals only)
- F16-1: `state: row.status === 'failed' ? 'REFUTED' : 'KNOWN'` (panel already
  has a red REFUTED style).
- F16-2/F16-3: map the actual state string: unknown-ish -> UNKNOWN,
  "FAILED (proven)" -> FAILED, verified -> VERIFIED, else EXECUTED.
- F16-4: add a DOWN/UNREACHABLE -> UNKNOWN (or a distinct NOT_REACHABLE gray)
  branch; never DEGRADED for zero-read.
- F16-5: status PROVEN only when the read succeeded; error -> UNKNOWN/DEGRADED.
- F16-6: derive liveness from the today services poll, or render PROTOTYPE.
