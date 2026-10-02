# Stale Instagram cap snapshot — found + fixed 2026-09-27 ~13:30 MDT

Subagent: backlog-burn (parent: main agent).

## Finding (REAL, live)

`CAPS_SNAPSHOT["instagram"]` in `outreach/pass_policy_engine.py` was
stale by one weekly ramp increment: 50 likes + 12 comments, while the
live caps are 55 likes + 15 comments since IG pass 133 (2026-09-26).

Evidence (from `outreach/instagram-engagement.md`):
- Pass 132 (2026-09-26): "Caps: 0/50 likes, 0/12 comments" + "next
  week's ramped caps 55 likes + 15 comments"
- Pass 133: "Caps: 0/55 likes, 0/15 comments (weekly ramped caps)"
- Pass 134 (2026-09-27): same 55/15

The code's own comment predicted this drift: "Cap table snapshot
2026-09-26. The cron bodies remain authoritative until sequenced to read
this table."

## Impact (CORRECTED 2026-09-27 ~15:05 MDT — the original impact claim
below was wrong)

CORRECTION: `spine_observe.py` has `PLATFORM = "x"` (line 54) — it is
the X pass observer, not an Instagram observer. It reads
`CAPS_SNAPSHOT["x"]` (5 follows / 3 comments / 10 likes, verified
correct), never the Instagram entry. There is NO live Instagram spine
observer: no Instagram journal event ever carried the stale 50/12
caps. The original claim ("every Instagram pass journal event since
pass 133 understated the caps by 8") is retracted — no such events
exist.

True impact: the fix corrected a dormant data value. `new_pass_context`
is called live only by `spine_observe.py` with platform "x"; the
Instagram seed path has no live caller. `evaluate_candidates`
(CAP_EVAL, the only consumer of `ctx["caps"]`) has no live caller
(verified: only test callers). The X snapshot — the only one journaled
live — was already correct. No live journal output and no pass
execution behavior changed. The commit stands as a correct data
fix; the urgency was overstated.

## Original (retracted) impact claim

`spine_observe.py:141` reads the snapshot and emits it into
`MC_PASS_STARTED` (caps) and `MC_PASS_CLOSED` (caps, caps_total) journal
events — every Instagram pass journal event since pass 133 understated
the caps by 8 (62 vs 70). Any landed-vs-cap comparison off the journal
used the wrong denominator. `evaluate_candidates` CAP_EVAL is currently
unwired (no live callers), so no pass execution behavior changed.

[RETRACTED: spine_observe.py is X-only; see correction above.]

## Verification the other platforms were NOT drifted

facebook 75/20, threads 45/12, tiktok 60/20 match their live logs;
x 5 follows / 3 comments / 10 likes matches the 2026-09-26 journal event
and the 2026-09-27 pass logs. Instagram was the only drift.

## Fix

One-line data change + snapshot date comment:
`"instagram": {"like": 50, "comment": 12}` →
`"instagram": {"like": 55, "comment": 15}`.
Verified: engine imports clean; `new_pass_context('instagram')` seeds
the ramped caps. Committed locally as `98f0915` on branch
`burn/outreach-caps-2026-09-27` (never pushed; explicit single-file
commit, working tree otherwise untouched).

## Structural note (not fixed)

Two sources of truth remain: the cron bodies (authoritative) and this
snapshot. The weekly ramp (+5/+3 per the 2026-09-26 no-scale-back order)
will drift the snapshot again next week unless the table is sequenced to
read the cron bodies. Queued as a follow-up for the outreach owner.

Deeper structural finding (2026-09-27 ~15:05 MDT): there is no Instagram
(or FB/Threads/TikTok) spine observer at all — `spine_observe.py` is
X-only, and it is the sole live caller of `new_pass_context`. The
Instagram/FB/Threads/TikTok snapshot entries are currently journaled
nowhere and consumed by nothing live; they are a loaded gun for the
day an observer is built for those platforms. When that day comes, the
observer must read the cron bodies (authoritative), not this table —
or the table must be sequenced first.
