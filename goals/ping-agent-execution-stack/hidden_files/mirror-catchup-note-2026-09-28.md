# Mirror catch-up decision 2026-09-28 ~13:58 MDT

- 13:40 MDT mirror run failed: tunnel failure (SSH banner-exchange timeout on orca chunk), exit 12.
- Worker could not schedule workspace-mirror-catchup (detached scheduler run, no durable chat owner).
- Main agent checked: no catch-up queued (cron.view: schedule does not exist).
- Decision: NO redundant catch-up scheduled. Next regular 6h run fires 14:26 MDT (~28 min out),
  which satisfies the "retry about 30 minutes out" intent. A literal catch-up at ~14:28 would
  overlap the regular run and risk concurrent rsync --delete chunks.
- Failure count: 1 in a row, below the 3-in-a-row escalation threshold. Staying quiet.
