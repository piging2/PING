# Effect Class 09: Campaign Publication

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `~/workspace/outreach/engagement-guard.py` (contract read),
`x-engagement.md`, `facebook-engagement.md`, `instagram-engagement.md`,
`action-truth.jsonl` (2026-09-23 fb entry), `action-intent-ledger.jsonl`,
`~/workspace/pig-fb/post_next.py`, `~/workspace/ping-content/queue.json`,
`sunday-post-decision-2026-09-14.md`.

Two sub-classes: (a) engagement passes (likes/comments across FB/IG/Threads/X/
TikTok, including the 2-DAY MAX SPRINT through 2026-09-25 09:00 MDT);
(b) PING Social Page publishing (machinery exists; standing state = PAUSED
under the silent restriction).

- **Q1 Identity:** (platform, action=like|comment|post, account/handle, post
  URL/id). X: numeric status id; FB: post id + a UNIQUE page descriptor per
  post; IG: handle; TikTok: video URL. Plus `pass_id`/`run_id` (e.g.
  `fb-20260923-143513`) and per-action `intent_id`. Job files carry the action
  set.
- **Q2 Provider idempotency key:** NONE. All dedup is bolted on externally.
- **Q3 Queryable:** YES. Like state re-checkable by re-visiting the post
  (button flip to Unlike = effect present); comments re-checkable by
  re-querying the post's comments. `action-truth.jsonl` already separates
  `succeeded` (worker claim) from `verified` (independent re-check).
- **Q4 Reconcile:** YES via the probe above + the guard's post-pass `verify`
  against the pre-pass snapshot (`engagement-guard.py verify`).
- **Q5 Reversible:** PARTIAL. Likes/comments are manually removable
  (unlike/delete), but there is no automated compensation and unlike-after-like
  is itself a visible signal. Page posts: deletable (compensation exists but is
  a separate action). Engagement on OTHER BUSINESSES' pages is effectively
  irreversible in the social sense — the notification/impression already
  happened.
- **Q6 UNKNOWN means:** effect may or may not have landed; there IS an
  explicit `UNKNOWN_EXECUTION` intent state (`action-intent-ledger.py`, e.g.
  fb pass 101). CRITICAL NUANCE: **likes are toggling, not additive.** A
  duplicate like on X/IG/FB *unlikes*. Blind retry of an unconfirmed like can
  UNDO the effect — retry here is worse than redundant, it is INVERTING.
  Consequence class: MEDIUM-SEVERITY, SELF-CORRECTING-WITH-CARE (re-query
  state first; never re-click blind).
- **Q7 Retry safe:** (a) the probe proves the effect absent — re-visit shows
  the like button NOT in liked state / comment not present; AND (b)
  `engagement-guard.py check` returns ELIGIBLE (mechanical never-re-engage
  over the durable markdown history); AND (c) the in-flight intent for that
  action is resolved (not left `UNKNOWN_EXECUTION` — the fb pass-101 pattern
  shows 20 tail likes "provably unexecuted" = safe to re-queue, versus open
  intents which must be reconciled first). Page posts: safe when `queue.json`
  shows `posted=false` AND the Page timeline does not already show it.
- **Q8 HOLD:** the driver/worker died mid-pass leaving open intents
  (`UNKNOWN_EXECUTION`), OR the guard can't consult history
  (`UNKNOWN-UNCHECKABLE` / exit 3 = fail closed), OR any platform warning
  (checkpoint, action block, rate limit -> drop to minimum, 14-day hold per
  AGENTS.md). On FB: never reuse a generic "page" descriptor in a job file
  (the guard's within-pass dedup keys on the page string; duplicates get
  stripped).

## Existing dedup guard (the port must preserve and harden)

`engagement-guard.py` — mechanical never-re-engage: consults durable logs,
classifies ELIGIBLE/ALREADY_ENGAGED/BLOCKED/UNKNOWN-UNCHECKABLE, strips
within-pass duplicates; index rebuilt by sha256 of source log. GUARD-RECORD
lines (`ts, platform, action, account, url`) are the execution evidence.
Intent ledger lifecycle `ACTION_INTENT_DURABLE -> OBSERVATION -> EXECUTED`
with reconcile-on-finalize (the X 2026-09-15 passes document
1-EXECUTED/13-NOT_ATTEMPTED style reconciliation).

## Port priority note

The retry-safety predicate here is probe-state-dependent per action type and
adversarially different from class 8's (retrying a SEND creates harm;
retrying a LIKE can INVERT the effect). The port must never implement a
generic "retry the intent" — it must implement "re-probe, then decide."
Highest volume class in the survey (hundreds of actions/day during the
sprint), so even small duplicate rates compound into account-risk.

Confidence: HIGH (guard contract + pass notes read). MEDIUM on the like-toggle
retry semantics (platform behavior, stated as a behavioral fact to verify).
