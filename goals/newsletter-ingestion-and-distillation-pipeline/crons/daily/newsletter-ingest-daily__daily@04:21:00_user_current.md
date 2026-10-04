---
id: newsletter-ingest-daily
title: Newsletter ingest daily pass
enabled: true
owner: goal:newsletter-ingestion-and-distillation-pipeline
mode: task
schedule:
  kind: daily
  timezone: '@user.current'
  time: 04:21:00
timeout_secs: 5400
metadata:
  tags: [cron:flexible-time]
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Run the daily newsletter ingest pass on the Pig: execute `~/workspace/bin/pigwsl-exec '/home/nolan/newsletter-ingest/start-newsletter-ingest.sh 7'` from this VM. The script reads Yahoo credentials from the Windows user environment (never from a file), is read-only against the mailbox, and is idempotent via the seen message-id set. When it finishes, read the last 3 lines of the Pig-side log `/home/nolan/newsletter-ingest/pass.log` (via pigwsl-exec) and verify the summary line shows `errors=0` and `emitted` equals `fetched`. Stay silent on success (log the pass summary to the run record only). On non-zero exit, errors>0, or an unreachable Pig/tunnel: report the failure with the last 15 lines of pass.log and do NOT retry blindly; if the Pig is unreachable, stay quiet unless it fails three runs in a row. Never print, log, or echo the Yahoo credentials or the gateway bearer; the starter script handles them through environment variables only.
