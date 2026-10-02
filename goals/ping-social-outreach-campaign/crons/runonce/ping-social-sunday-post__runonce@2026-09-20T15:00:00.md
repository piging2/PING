---
id: ping-social-sunday-post
title: PING Social Sunday post
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-20T15:00:00
timeout_secs: 1200
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
One-shot authorized business action. Decision record: ~/workspace/ping-content/sunday-post-decision-2026-09-14.md (decision: POST queue item ping-pig-suit.png, Sunday 2026-09-20 afternoon, via the existing post_next.py machinery). This executes Nolan's authorized Sunday post decision; no human owner is needed. The authorization itself is not re-decided here; the step below records the execution-time verdict only.

Execute exactly these steps, in order:

1. Record the execution-time decision BEFORE any posting action. Create ~/workspace/ping-content/sunday-post-execution-2026-09-20.md containing: (a) the authorized item from the decision record (ping-pig-suit.png); (b) the current first-unposted queue item read from ~/workspace/ping-content/queue.json; (c) Pig reachability (exit code of ~/workspace/pig-fb/ensure-cdp.sh); (d) image presence on the Pig at the item's pig_image_path (source ~/workspace/pig-fb/pig-ssh.sh, then pig_ssh test-path); (e) any new evidence since 2026-09-14 that bears on the decision (for example a newer post, a page-state change, or a brand-rule update). Then record exactly one verdict with its reasons:
   - POST: first unposted item is still ping-pig-suit.png, Pig reachable, image present, no countervailing new evidence. Continue to step 2.
   - DEFER: transient or state blocker (Pig unreachable, queue state changed, image missing). Post nothing, do not retry automatically, and report: DEFERRED, <reason>.
   - RESEARCH MORE: the acting-as-PING-Social confirmation or the live duplicate check cannot be performed or is inconclusive from this seat. Post nothing, and report: RESEARCH MORE, <what is missing>.
   On DEFER or RESEARCH MORE, stop after writing the record. Never post on anything but an explicit POST verdict recorded in that file.

2. Read ~/workspace/ping-content/queue.json. Find the first item with posted=false. It MUST be ping-pig-suit.png. If it is not (queue state changed since the decision), STOP, post nothing, and report: BLOCKED, queue state changed, first unposted item is <name>.

3. Preflight the Pig: run ~/workspace/pig-fb/ensure-cdp.sh. If it exits nonzero, STOP and report: FAILED, Pig CDP unreachable, nothing posted.

4. Verify the image exists on the Pig at the item's pig_image_path (source ~/workspace/pig-fb/pig-ssh.sh, then pig_ssh test-path). If missing, STOP and report: FAILED, image missing on Pig, nothing posted.

5. Run: python3 ~/workspace/pig-fb/post_next.py. It posts the first unposted item to the PING Social Facebook Page through the Pig's headed Chrome and marks it posted on success. Before the post lands, the Pig-side path must confirm the composer is acting as PING Social (Page), not the personal profile, and must check the Page's recent posts and drafts for duplicates of the suit item or its caption; post only if no duplicate.

6. Re-read queue.json and confirm ping-pig-suit.png now has posted=true with a posted_at timestamp. If not, report: FAILED, post script did not confirm.

7. On success: append the outcome (posted_at) to the step-1 execution decision record, then stay quiet. Do not report routine success to the user. Just end.

On any failure: report the failure plainly with the exact step and error, and record it in the step-1 execution decision file. Never post a different item than the decided one. Never retry a failed post automatically. Never invent a new caption or concept.
