# Q25 — NUMBERS (customer-visible quantitative claims)
Audited: 2026-10-01 ~18:24 MDT
Worktree SHA: 2b5c95eef02f3c271c3c1966ec80df2f7e629876
Surface: homepage (src/app/page.tsx); spot-check of about/products/technology pages for %-style marketing numbers: none found.

Master evidence for the capture-era numbers: research/website-truth-matrix.md (the site's own claim-evidence matrix) + /home/nolan/ping/gateway/COMMISSIONING_REPORT.json + /home/nolan/ping/database/events.sql + /home/nolan/ping (commit hashes).

## Claim table

| Claim (page.tsx location) | Classification | Source |
|---|---|---|
| "770 events" / "150 worker executions" / "14 scenarios" (receipt card; hero card "770 events in the run", "150 worker executions", "14 scenarios") | SOURCE-BACKED | /home/nolan/ping/gateway/COMMISSIONING_REPORT.json: summary {scenarios:14, events:770, workerExecutions:150}, generated_at 2026-07-28T02:10:55Z |
| event_id e9591d7277…ce5864c5, recorded 2026-07-28T02:10:54Z, mission 51009ceae9ef316a LEAD_FOLLOWUP priority 3 (receipt card) | SOURCE-BACKED | same report; event id present (prefix match verified) |
| "150 executions in the captured 2026-07-28 run" (/act loop bullet) | SOURCE-BACKED | same report |
| "Retry/dead-letter path verified live: 12/12 assertions" (/act bullet) | SOURCE-BACKED | truth-matrix row 19: verified live 2026-09-16/17, fail-once-then-succeed attempt 2, bounded exhaustion dead-letters exactly once (MISSION_DEAD_LETTERED 21a6af0b72a8cfeb2c3dbbec40184e87456065f956c67b62238b936d3b76e0b7) |
| "delegation issuance decision … implemented and tested 18/18 (captured 2026-09-17)" (SCOPED GRANTS card) | SOURCE-BACKED | truth-matrix lines 57-63: authorizeWorkOrder() 18/18 assertions PASS, captured 2026-09-17 |
| "44/44 assertions, zero Python-emitted events" (python capability receipt + MultiRuntime card) | SOURCE-BACKED | truth-matrix row 14/16: 44/44 assertions from live Postgres rows, verified zero Python-emitted events, captured 2026-09-16/17 |
| mission bfe815990337e45d · event 27482dbdabfb57b… · task e694f5787ad45764 · evidence 49a96bff42cb1bdf5bc19dd56901a1955a0fb962a24d498dc36a21d0bd7e180e · result sha 1945b844… (receipt card) | SOURCE-BACKED | truth-matrix lines 59-61, same IDs |
| Hermes WorkOrder 0d598aef352b9a8a · exit 0 · result sha f0b02184… · events f326ea70… / e91681bf… / daaa75fc… (receipt card) | SOURCE-BACKED | truth-matrix rows 10/14/16: captured 2026-09-17, independently verified, honest limits stated ("one execution, not a fleet") |
| Changelog: c5f7808 / 81336402 / 15d0a9b8 (2026-09-16) | SOURCE-BACKED | verified real in /home/nolan/ping: c5f7808b2, 813364025, 15d0a9b83 with matching messages |
| "Captured 2026-09-16/17", "Captured 2026-07-28", "probed 2026-09-16" as-of labels | SOURCE-BACKED (accurate) | truth-matrix line 57: gateway probe 2026-09-16 ~19:56 MDT |
| "Trigger rejects UPDATE/DELETE" (maturity "Live") | SOURCE-BACKED (definition) | /home/nolan/ping/database/events.sql:40-60 (prevent_event_updates/prevent_event_deletes triggers). Deployment-live status not probed on-page; label asserted. |
| "Gateway healthy, authentication enforced" (maturity "Live") | SOURCE-BACKED but STALE-LABELED | truth-matrix line 57: /health 200 healthy, /constitution 1.0.0, /events/stats 401 without auth — captured 2026-09-16 ~19:56 MDT. Labeled "Live" on the page 15 days later. |
| "scheduler resumes after restart" (status strip) | SOURCE-BACKED | truth-matrix row 20: restarts during patch deploys, /health 200 after each, scheduler resumed and executed post-restart |

## Verdict

PROPOSITION: "Every customer-visible number on the site traces back to a source."
STATUS: PASS on internal sourcing — no MARKETING-ESTIMATE or UNSUPPORTED numbers found; every quantitative claim has a real internal source. Two honest defects: (1) VISITOR-OPAQUE: no number links to its source (the truth matrix, the commissioning report, and the PING repo are all unlinked and private), so a visitor cannot reproduce any of them — the numbers are SOURCE-BACKED but not visitor-traceable; (2) STALE "LIVE" LABEL: the gateway/auth claims carry a Live maturity label on a probe captured 2026-09-16 ~19:56 MDT.
SMALLEST FIX IF FAIL: link each receipt card to a public evidence note (even a redacted one); replace the hardcoded "Live · probed 2026-09-16" badge with a build-time probe stamp.
