# MISSION CONTROL SWARM — READ-ONLY FORENSICS REPORT (2026-10-01 ~18:24-18:40 MDT)

## SHA / PLANE note (material)
Task cited served tree `/home/nolan/projects/ping-fyd-converged @ 300c9c91`.
Observed HEAD at audit time: **4ad9a7a3fc7e6276f7147388bfefd597408682bf**
("fix: route dispatch events through canonical journal", 18:24:10 MDT, the
journal-truth-split convergence commit). Dirty files present but untouched:
`M src/app/api/mc/approvals/route.ts`, untracked `mc-approval/__pycache__/`,
`var/`. Served :3100 was DOWN 18:00-18:03 MDT; audit is source + direct
read-only queries, no restarts, no writes. Memory now records the convergence
chain as 300c9c91 -> 4ad9a7a3 -> 6405011d, so the task's SHA was the pre-fix
served baseline; I audited the post-fix source.

---

## Q16 — STATUS SEMANTICS

**PROPOSITION:** MC distinguishes UNKNOWN from FAILED, unwired from broken,
source state from deployed state.
**VERDICT: FAIL** (Nolan's "PARTIAL" was generous in the wrong direction: the
honest parts are real, but the conflations are FAIL-grade, and they run in BOTH
directions).

**COMMAND-REQUEST:** read-only grep + line inspection of
`src/app/mission-control/page.tsx`, `src/app/api/mc/_lib/mc-marketingos.ts`,
`src/app/api/mc/today/route.ts`, `src/app/api/mc/agents/route.ts` via
pigwsl-exec; no code executed.

**OBSERVED RESULT — FAIL instances (each = FAIL with file:line):**
1. `mc-marketingos.ts:218-221` — marketing mission with `row.status === 'failed'`
   returns `state: 'KNOWN'` (green badge); failure demoted to `reason:
   'MISSION_FAILED'` string. FAILED -> green/healthy.
2. `page.tsx:1296` — `<TruthBadge t={o.currentState ? "EXECUTED" : "UNKNOWN"} />`;
   `currentState` truthy values include "OUTCOME UNKNOWN — NO RECORD",
   "OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS", AND "FAILED (proven)" —
   all render EXECUTED (purple). UNKNOWN -> EXECUTED; FAILED -> EXECUTED.
3. `page.tsx:1395` — `<TruthBadge t={eff ? "EXECUTED" : "UNKNOWN"} />`; any
   verdict object (even all-FAILED) -> EXECUTED in the Results view.
4. `today/route.ts:149-152` + `page.tsx:445` — unreachable service / total fetch
   failure renders DEGRADED (amber, = "partial read") instead of UNKNOWN.
   Unreachable != degraded.
5. `today/route.ts` (happening/willHappenNext) — hardcoded `"PROVEN"` over
   `listDirSafe()` readers that return `[]` on ANY error: a missing dir renders
   "PROVEN: no workers running" / "PROVEN: nothing scheduled".
6. `page.tsx` "Live sites" card (~660-667) — `health="PROVEN"`, hardcoded
   "two tenant sites are live on the private :3100 surface"; with :3100 down
   this is unobservable but renders green.

**Task's concrete test 1** (UNKNOWN rendered as FAILED/red): NOT FOUND — the
`/api/mc/agents` route carries an explicit law against it (timeouts surface as
"OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS", never FAILED). But the
proposition still fails: UNKNOWN and FAILED are both rendered as
healthy-looking states (EXECUTED/KNOWN), which is worse than the asked-for
direction for an operator.
**Task's concrete test 2** (unwired-but-code-exists rendered green):
CONFIRMED (instances 1 and 6).

**Honest parts (PASS):** TruthBadge color map itself; CRM honestly-UNKNOWN
views; EmptyState PROTOTYPE+UNKNOWN cards; Failures views filtering only proven
ledger FAILED verdicts; marketingos fetch errors in red describe the read
failure, not the state.

**EVIDENCE LOCATION:** [q16-status-semantics.md](sandbox://workspace/gaps/swarm/mission-control/q16-status-semantics.md)
**SMALLEST FIX IF FAIL:** map actual state strings (unknown-ish -> UNKNOWN,
"FAILED (proven)" -> FAILED) instead of truthiness at page.tsx:1296,1395;
FAILED -> REFUTED (red exists in panel) at mc-marketingos.ts:218-221;
unreachable -> UNKNOWN at today/route.ts:149-152; PROVEN only on successful
read; derive "Live sites" liveness from the services poll.

---

## Q17 — ONE MISSION / ONE AUDIT STORY

**PROPOSITION:** One MC screen answers what was wanted / evidence used / who
authorized / what capability allowed it / what executed / what effect occurred /
what verified the outcome for the last real mission.
**VERDICT: FAIL** (as a projection; the answers exist forensically but NOT in
MC's read model).

**Mission:** `a32db704f0aa81c3`, run `integrate-coppersmith-20260930`, tenant
`tenant::ping`, 2026-09-30 09:05 MDT. 23 events in the FORK journal
`/home/nolan/workspace/fyd-journal-gateway/events.jsonl`; cross-checked with
`/home/nolan/workspace/integrate-run-20260930/evidence/effect-ledger.json`.

| Question | Verdict | Source |
|---|---|---|
| WHAT WAS WANTED | ANSWERED | MC_MISSION_CREATED.request: "Run one real Coppersmith FYD generation ... place one generated asset through media.placement ..."; requested by integrate-run-driver under Nolan binding order 2026-09-30 ~08:10 MDT |
| WHAT EVIDENCE WAS USED | ANSWERED (caveat) | per-stage run-log refs + sha256 input/output digests; caveat: stages self-report `sink_status:"error"/"No persistence available"`, stages are "post-hoc instrumentation", run-log file not confirmed on disk |
| WHO AUTHORIZED | ANSWERED | MC_AGENT_AUTHORIZED: `MissionScheduler._authorizeDispatch (Lane AG eab4f714a)`; gate_branch "no capability required (mission declares no tenant-data capability)"; tenant scope enforced ping |
| WHAT CAPABILITY ALLOWED IT | ANSWERED | media.placement grant: evaluated_by "Lane C W5 validateGrant (media-placement-provider.js)", verdict authorized, scope media.placement:placeAsset, data_class public-presentation |
| WHAT EXECUTED | ANSWERED | worker "projection"; ACQUIRE/EXTRACT/RESOLVE/OBJECT_GRAPH/SITE_SPEC/RENDER all SUCCEEDED |
| WHAT EFFECT OCCURRED | ANSWERED (ledger level) | MC_ARTIFACT_PUBLISHED: placement mp_fc4b4742143efe40, asset coppersmith-hero-001, slot hero, effect_effected; corroborated by provider effect-ledger file (effect_2ac30f03c5bfa94e = effect_effected) |
| WHAT VERIFIED THE OUTCOME | UNKNOWN via MC; PARTIAL forensically | MC_RUN_SUCCEEDED + artifact event + effect ledger; no independent verifier; the synthetic failure-injection mission (278093e4ba9cc2c8) correctly stayed effect_unknown ("do not retry, do not mark FAILED") |

**The projection FAIL:** this mission is INVISIBLE to every MC view. Its events
live in the fork journal, which the canonical :18199 gateway cannot see (the
known truth-split; convergence commit 4ad9a7a landed 18:24 but its probes only
append NEW events — the fork's 193 MC operational IDs remain unreachable).
MC's missions/today APIs read the fleet ledger + inprogress dirs (no trace of
this mission), and /api/mc/missions fail-closes on unset FYD_JOURNAL_STORE
(start-3100.sh sets none). No MC route folds MC_* journal events.
**EVIDENCE LOCATION:** [q17-one-mission-audit-story.md](sandbox://workspace/gaps/swarm/mission-control/q17-one-mission-audit-story.md)
**SMALLEST FIX:** point MC's mission projection at the ONE canonical journal
AFTER the fork's events are classified/reconciled (read-path fix, NOT a new store).

**Stop-condition check:** no fabricated approval rendered legitimate; no
private/PING_ONLY/OWNER fields in reviewed records. Lane continues.

---

## Q18 — REPRODUCIBLE NUMBERS

**PROPOSITION:** Every MC number is reproducible with source query / filter /
time window / projection version.
**VERDICT: PASS on fabrication, FAIL on projection-version.**

**COMMAND-REQUEST:** reproduced 7 numbers by direct read-only queries against
the same sources the API routes read (canonical journal file, fleet ledger
tail, inprogress dirs, cron.d, git status, GRILLING-BRIEF.md).

**OBSERVED RESULT:**
- overlayEventCount: 15 (CJ, last 15 FYD_SITE_OVERLAY, 09-25 -> 09-29) REPRODUCED
- recentMissionVerdicts: 6 (FL, last 6 lines, NO time bound — file tail) REPRODUCED
- failed entries: 6 (FL tail, regex /fail|error|reject/i on verdict keys)
  REPRODUCED — CAVEAT: all 6 match via "FALSIFIED" keys (claim-falsification
  verdicts, not mission failures); the "Failed (proven only)" card conflates them
- runningWorkers: 7 (IP dirs) REPRODUCED
- scheduledJobs: 13 (cron.d, 4 daily / 2 hourly / 5 minutely / 2 runonce)
  REPRODUCED
- dirtyFiles: 7 (`git -C /home/nolan/projects/ping status --porcelain`) REPRODUCED
- activeGrillQuestions: 16 (GRILLING-BRIEF.md) REPRODUCED
- graph objectCount: DERIVED (pinned fixture + overlays, not fully live)
- "two tenant sites are live": hardcoded prose, unobservable with :3100 down — DERIVED-or-REMOVE

**FAIL-grade gaps:** (a) NO `projection_version` field exists in ANY /api/mc/*
envelope (grep: zero hits) — every number is version-unpinned; (b) no as-of
labels — the "TODAY" screen shows a 2026-09-24 ledger tail and 09-25..09-29
overlays as "today"; (c) "file tail" is a window in name only.

**EVIDENCE LOCATION:** [q18-reproducible-numbers.md](sandbox://workspace/gaps/swarm/mission-control/q18-reproducible-numbers.md)
**SMALLEST FIX:** add `projection_version` (code SHA + schema rev) to every
/api/mc/* envelope; replace file-tail windows with time windows + as-of labels;
split the failed-entries regex (FAILED-proven vs FALSIFIED claims) or document
the conflation in the card prov.

---

## Summary for the CEO scoreboard

- Q16: **FAIL** — 6 concrete status-conflation instances (FAILED->green,
  UNKNOWN->EXECUTED, FAILED->EXECUTED, unreachable->DEGRADED, error-swallowing->PROVEN,
  hardcoded claim->PROVEN). "UNKNOWN rendered as FAILED red" not found; the
  reverse confusions are the actual defect.
- Q17: **FAIL (projection)** — the most recent real mission's full 7-question
  story is answerable forensically (fork journal + effect ledger) but invisible
  to every MC view. Fix = read-path convergence after fork classification, not a
  new store.
- Q18: **PASS (no fabrication) / FAIL (no projection version)** — all 7
  reproduced numbers check out; no invented numbers found; but nothing is
  version-pinned, windows are "file tail", and the screen shows week-old data as
  "today" with no as-of.
- Stop conditions: none triggered. Read-only throughout; nothing built,
  restarted, or modified.
