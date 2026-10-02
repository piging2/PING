---
id: ping-perfecting-pass
title: PING perfecting pass
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-19T19:51:11
  every: 6h
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
PING perfecting pass (bounded, quiet). Standing directive from Nolan 2026-09-19: keep the machine improving 24/7; each new mechanism must pay rent by closing a reproduced invariant; never build frameworks by anticipation.

1. Read ~/workspace/BACKLOG.md. Pick the highest-priority OPEN item that is safe, reversible, and needs no credentials, no live platform actions, no Pig access, and no git commits. Work at most 2 items per pass.
2. If no OPEN item qualifies, do a small hygiene sweep instead: (a) verify ~/workspace/ping-content/queue.json parses and post_next.py still selects the first unposted item; (b) grep ~/workspace for new TODO/FIXME markers since the last pass and triage them into BACKLOG.md; (c) check the operations manual file map against reality for dead references; (d) sweep ~/workspace/FAILURE_LEDGER.md: for each OPEN entry inside this pass's safe scope (no live platforms, no Pig, no credentials, no commits), attempt one bounded self-heal step, update the entry's status/self_heal/last_seen in place, and keep the replay section accurate. Platform/Pig/commit-scoped entries stay recorded but untouched.
2b. Failure recording discipline: any failure this pass encounters (including a failure of a self-heal step) gets a ledger entry first, narration second. An entry without a replay section is incomplete; fill it before moving on.
3. Verify every change with actual tool results (run the relevant check/test/script). Update BACKLOG.md statuses. Append a dated entry to ~/memory/YYYY-MM-DD.md for today (create if needed). Never edit MEMORY.md directly.
3b. Backlog commit rule (Nolan 2026-09-19): after ANY change to ~/workspace/BACKLOG.md, commit that file immediately in the ~/workspace repo (`git add BACKLOG.md && git commit -m "backlog: <what changed>"`). Local commits only, never push. Nolan reviews the backlog in VS Code from git history. This is the ONLY file this pass may commit.
4. Stay quiet: surface to the user only real defects found, contradictions, or decisions genuinely needing Nolan. Routine completions stay in the files. No chat report for healthy passes.
5. NEVER: touch the Sunday post queue/schedule/captions, take live platform actions (likes, follows, posts, DMs, emails), use the Pig, use credentials or secrets, push/merge, commit anything except BACKLOG.md, modify the convergence worktree, or reinterpret historical identities.
