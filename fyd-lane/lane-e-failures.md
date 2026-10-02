# Lane E failure/observation log

## 2026-09-21 ~14:20 MDT — emit to 8080 gateway rejected
- Action: `emit-overlay.py happy-place ops-probe.json` with default `FYD_GATEWAY_URL=http://127.0.0.1:8080/events`.
- Result: gateway rejected with `{"error":"Unknown event_type: FYD_SITE_OVERLAY"}`.
- Diagnosis: the 8080 deployment gateway does not have FYD_SITE_OVERLAY in its baked
  registry (matches `dump.py` docstring: demo journal used until the 8080 lane registers
  the event type; references FAILURE_LEDGER FL-20260921-231).
- Recovery: re-ran with `FYD_GATEWAY_URL=http://127.0.0.1:18199/events FYD_GATEWAY_NO_AUTH=1`
  (the demo journal that produced the existing overlay event 39fc9971...), then
  `FYD_OVERLAY_JOURNAL=demo dump.py happy-place`. Emit accepted, event
  `bc16de1ee2ae75177dfa22bdaf6efbb8900034d735a4d77e74452cf39cf4f206`.
- Lesson: the legitimate overlay path for the current projection state is the demo
  journal, not the 8080 deployment gateway. Both emit and dump must target the same
  journal.

## 2026-09-21 ~14:35 MDT — Ask FYD corrupt-projection shape (minor boundary)
- Observation: with a corrupt projection, `POST /api/fyd/ask` returns HTTP 500 with an
  EMPTY body, while the missing-projection case returns a proper 404 `{"ok":false,
  "error":"Unknown site."}`. The corrupt case throws inside the bundle loader and
  bypasses the route's error mapping (no try/catch around `answerAskFyd`).
- Honesty: PASS (no service id/name leaks in either case), but the empty 500 is a
  rougher edge than the 404 path.
- Not fixed: `src/app/api/fyd/ask/route.ts` is another lane's dirty file; reported as
  a boundary observation for the owning lane.

## Design note (not a failure)
- The Circle projection (`loadCircleProjection`) carries the service NAME in `topFacts`
  but not the service object ID (public-safe surface by design). Lane E verified the
  name digest matches ground truth; id-level traceability on the circle surface would
  be a product decision for the owning lane.
