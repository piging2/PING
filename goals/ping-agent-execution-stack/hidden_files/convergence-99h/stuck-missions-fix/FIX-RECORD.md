# Stuck-mission fix — 2026-09-30 (99h program, Nolan redirect)

## First missing edge (EXACT)
`MissionRuntime.failWithRetry()` retry-schedule UPDATE guarded on
`status IN ('running','assigned')`, excluding `'retry_pending'`.
A mission in `retry_pending` that fails again can never advance its retry
counter, refresh `retry_at`, or reach exhaustion → immortal poison pill at
the head of `getPending()` (`ORDER BY priority DESC, created_at ASC LIMIT 3`),
starving every newer mission. 69k log lines / 6h of the same 3 missions
failing on the jev-shadow namespace error; 25 CLAIM_GENERATE + others stuck
in `created` since 2026-09-25 09:22:16 UTC.

## Fix (existing machinery only, one line)
File: `/app/ping-runtime/orchestration/mission_runtime.js` line 228
(live container `ping-gateway`, image `ping-gateway:repair-cert-20260924`).
- BEFORE: `WHERE mission_id = $4 AND status IN ('running', 'assigned')`
- AFTER:  `WHERE mission_id = $4 AND status IN ('running', 'assigned', 'retry_pending')`
The exhaustion branch (line 219) already included `retry_pending`; the
retry-schedule branch was the oversight. No graph redesign, no new tables,
no new authority.

## Deployment
- Patched live container file via `docker cp`; `node --check` SYNTAX_OK.
- Backup of pre-patch file: Pig `/tmp/mr-live.js.bak` (md5 6c8d0833c077ae9627f1652eba9d2fca).
- Patched copy (durable): `mission_runtime.js.patched-20260930` in this dir
  (md5 7b46c11ab3a416859780b678f723d859).
- Gateway restarted `docker restart ping-gateway` 2026-09-30 ~16:2x MDT.
- NOTE: fix lives in the container filesystem, not the image. Next image
  rebuild from the (unknown) build context will lose it unless re-applied.
  No local repo copy matched the container file; f01-fix tree holds a
  redesigned lifecycle that is NOT what runs.

## Upstream defect (NOT fixed here, reported)
`jev-shadow: emit JEV_DECISION_EVALUATED failed — No owner defined for
namespace 'jev'` — the reason the 3 CLASSIFICATION_CREATE missions kept
failing. Namespace-owner governance decision belongs to Nolan.

## Verification (2026-09-30 ~16:14 MDT, CONFIRMED)
- [x] 3 poison missions exhaust to `failed` (retries 1->3, then failed;
      jev-shadow namespace error preserved as the error text)
- [x] ONE CLAIM_GENERATE mission end-to-end: 30a6476a747987c7 —
      bridge 09-25 09:22:15Z -> created 5 days -> claimed 22:12:14.814Z ->
      assigned_to='claim' -> started 22:12:14.819Z -> ClaimWorker 17ms ->
      result JSONB -> MISSION_COMPLETED 22:12:14.839Z -> CLAIM_CREATED
      event with upstreamEventId threading to the original OBSERVATION_CREATED
- [x] Drain: all 25 completed via the standard scheduler path
      (maxConcurrent=3 per 5s poll; no row patching, no new machinery).
      25 CLAIM_CREATED events in ping_events. Downstream chain re-flowing:
      CLASSIFICATION_CREATE 17 created / 4 retry_pending / 8 failed
      (failures = the separate jev-shadow namespace-owner defect).
- [ ] Durable source fix: patch lives in container FS only; next image
      rebuild loses it. Build context for ping-gateway:repair-cert-20260924
      not identified; no local repo copy matched.
