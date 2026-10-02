# Sunday post execution decision — 2026-09-20 15:00 MDT slot

Executed by: Pigi (scheduled run, cron ping-social-sunday-post), 2026-09-20.
Authorization: ~/workspace/ping-content/sunday-post-decision-2026-09-14.md (DECISION: POST ping-pig-suit.png, Sunday 2026-09-20 afternoon, via existing post_next.py machinery). Authorization not re-decided here; this file records the execution-time verdict only.

## Execution-time inputs (recorded BEFORE any posting action)

(a) Authorized item from the decision record: ping-pig-suit.png (queue index 1).

(b) First unposted queue item read from ~/workspace/ping-content/queue.json at 2026-09-20 ~15:00 MDT: ping-pig-suit.png (posted=false, posted_at=null). Only the 2026-09-13 plumber item is posted. Queue has 6 items; the mason (National Tradesmen Day 2026-09-18) item sits last, unposted.

(c) Pig reachability: ~/workspace/pig-fb/ensure-cdp.sh exit code 0 (CDP reachable).

(d) Image presence on the Pig at the item's pig_image_path (C:/Users/nolan/.local/share/pigi/fb-engage/page-inbox/ping-pig-suit.png): PowerShell Test-Path returned True (first attempt used a bad `test-path` literal, corrected to PowerShell).

(e) New evidence since 2026-09-14:
- sunday-post-dryrun-2026-09-19.md (2026-09-19 rehearsal, nothing published): queue gained ping-pig-mason.png (National Tradesmen Day 2026-09-18, unposted, boolean-normalized, last in queue; does not affect Sunday selection). Page now shows 20 followers (was 13 on 2026-09-13); no Page restriction signals observed in the read-only probe. Dry-run verdict was POST. Caption passed the first formal content humor check unchanged.
- Daily memory 2026-09-20 hygiene sweeps: queue.json parses (6 items), first unposted still ping-pig-suit.png, all posted flags booleans; post_next.py selection logic verified read-only (first-unposted select); nothing posted.
- No newer Page post, no page-state restriction, and no brand-rule change bears against the decision. The Friday (2026-09-18) mason item was never posted; its occasion has passed and it remains queued, out of this slot's scope.

## Verdict: POST

Reasons: first unposted item is still ping-pig-suit.png (matches the authorized item); Pig CDP reachable (ensure-cdp.sh exit 0); image present on the Pig (Test-Path True); no countervailing new evidence (dry run green, follower count up, no restrictions, queue state unchanged). Proceeding to post_next.py.

## Outcome

POSTED. post_next.py ran 2026-09-20 ~15:06 MDT and reported "POSTED ping-pig-suit.png (4 remaining in queue)". queue.json verified: item 1 (ping-pig-suit.png) posted=true, posted_at=2026-09-20T21:05:55.692751+00:00 (15:05:55 MDT). Pig-side worker result: ok=true (page-post-job.json.result.json). Pre-post probe confirmed: composer acting as "PING Social" (Page, not personal profile), no duplicate of the suit caption on the Page timeline, no checkpoint/block signals, composer closed cleanly with no draft left. Probe script removed from the Pig afterward.

2026-09-20 15:06 MDT. Executor: Pigi.
