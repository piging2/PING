---
id: codex-quota-recheck-2026-09-28
title: Codex quota re-probe and deliberate re-enable
enabled: true
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-28T15:45:00
timeout_secs: 600
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
One-shot: re-probe the codex CLI worker on the Pig after its ChatGPT-plan quota reset.

Run: `~/workspace/bin/pigwsl-run.sh ~/workspace/ping-24h/codex-recheck.sh`

The script probes codex with a trivial prompt. If codex answers PROBE_OK, the script deliberately removes the block from /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js, syntax-checks the file, and verifies authorizeWorkOrder grants codex again. If the probe still fails, the script changes nothing and codex stays blocked.

Report the outcome in your final message: either CODEX_REENABLED (with the verification line) or CODEX_STILL_BLOCKED (with the retry time the probe reported, if any). Do not retry the probe yourself; one run is enough.
