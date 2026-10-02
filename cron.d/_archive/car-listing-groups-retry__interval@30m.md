---
id: car-listing-groups-retry
title: Avalon listing group cross-post retry
enabled: true
owner: goal:car-sale-on-facebook-marketplace
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-23T13:53:58
  every: 30m
timeout_secs: 1200
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Car-listing group cross-post retry (Avalon). Nolan's authorized outcome: remove the listing from its 3 pending groups and add it to up to 3 more local groups with the most members (buy/sell-intent local groups first, then general local community groups; never join new groups to reach three; never touch groups where it is already listed).

Run this exact command and report what it printed:
`~/workspace/goals/car-sale-on-facebook-marketplace/hidden_files/run-mkt-groups.sh`

The runner is fully self-managing and fail-closed:
- Exits quietly (success, nothing to do) if `groups-done.marker` exists or a Facebook engagement worker is driving the Pig Chrome (it checks Pig node.exe command lines for fb-engage).
- Otherwise acquires the fb browser-profile lock, deploys the enumerate + action scripts to the Pig via pigwsl-put.sh with sha256 verification, enumerates the real "List in more places" dialog for the listing "2008 Toyota Avalon XLS, only ~61k miles", picks the pending groups (checked rows labeled pending) and up to 3 new local groups by member count, unchecks/checks them, clicks Post, re-opens the dialog and verifies final checkbox states, and writes the marker only on verify=OK.

If the run prints "DONE marker written", the task is complete: remove this cron job (cron.remove id `car-listing-groups-retry`) and report the final group lists to the main agent. If it prints anything else (worker busy / enumerate failed / action did not verify), do nothing further; the next tick retries. Never report routine busy/failed ticks to Nolan; only report completion or a genuine decision point (e.g., fewer than 3 eligible new groups found, a Facebook warning/checkpoint appeared, or repeated failures across 6+ ticks).
