# Effect Class 08: Message Preparation / Execution

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `~/workspace/outreach/send-batch.py` (full 220-line flow read),
`send-eligibility.py` (exit-code contract), `pipeline.md` (status lifecycle),
`facebook-dms.md` (round 131 execution evidence), `action-truth-README.md`,
`action-intent-ledger.jsonl` + `action-truth.jsonl`,
`email-queue-2026-09-22.md`, `x-engagement.md`.

Channels wired TODAY: **cold email** (Gmail, 10/UTC-day cap, `send-batch.py`
via `hatch_gws_cli gmail +send`), **Facebook Page DMs** (Pig headed Chrome
CDP, `send-dm-generic.js`, 10/day), **contact forms** (browser submit,
last-resort channel). NOT evidenced as send paths: Instagram DMs (engagement
is likes/comments only), X posts (likes-only; no posting found), X DMs.

These are REAL external effects on REAL businesses. Gravity noted throughout.

- **Q1 Identity:** DERIVED, composite: `(recipient address/page-id, action
  type, touch sequence)` — e.g. `cold-email / followup-f1 / followup-f2 /
  review-triggered / dm / form-submit` per `send-batch.py` filename convention
  + `action-intent-ledger.jsonl` `intent_id` (uuid) per action with
  `pass_id`/`run_id`. No single canonical operation id spans draft -> send ->
  receipt. **Gap to close:** derive one canonical op id per logical send.
- **Q2 Provider idempotency key:** NONE natively. Gmail `+send` accepts no
  idempotency key; a resend = a second email. FB DM via browser automation: no
  provider key; the "send" is a DOM click. Contact forms: no provider key;
  dedup is entirely procedural (pipeline status `SUBMITTED`).
- **Q3 Queryable:** PARTIAL, channel-dependent. **Email: YES** — Gmail Sent is
  ground truth: `in:sent to:<addr>` (used both as eligibility check and
  post-send verification, capturing the Gmail message id, e.g. id
  `1a0b25022d3383cc` in `email-queue-2026-09-22.md`). **FB DM: PARTIAL** —
  thread re-read in the browser ("first-line text visible in thread" +
  screenshot); no platform message id captured. **Contact forms: GENERALLY
  NO** — no stable receipt; only the row status.
- **Q4 Reconcile:** Email YES (`in:sent to:<addr>` before any re-send —
  exactly what `send-batch.py` and the eligibility checker do). FB DM YES via
  thread re-read. Forms: NO meaningful probe — must rely on local state.
- **Q5 Reversible:** NO for all three. No evidence of any recall/unsend
  capability in `~/workspace/outreach/` (grep for recall/unsend/delete-message
  returned only unrelated prose). Email/DM/form, once delivered, cannot be
  retracted. The only safety is prevention (eligibility gate) and truthful
  recording.
- **Q6 UNKNOWN means:** email sent but Gmail receipt unverified (`UNVERIFIED`
  branch in `send-batch.py`) — the prospect may or may not have received it.
  Blind retry = duplicate cold email = REAL BUSINESS HARM (burns trust, looks
  like spam, can end the relationship before it starts). Consequence class:
  HIGH-SEVERITY, IRREVERSIBLE, REPUTATION-HARMING. FB DM unknown = thread
  state unconfirmed; retry = duplicate DM, similar harm at lower reach.
- **Q7 Retry safe:** (a) the read path proves non-delivery — `in:sent
  to:<addr>` returns zero hits for this draft/action (Gmail), or the FB
  thread contains no message text from this send; AND (b) the deterministic
  eligibility checker (`send-eligibility.py`) exits 0 (fail-closed; needs the
  per-recipient Gmail sent-count input); AND (c) no open intent exists for the
  same logical operation (`action-intent-ledger` has no unresolved intent).
  The `send-batch.py` UNVERIFIED branch already encodes this: stop the batch,
  "check sent mail before re-sending" — re-send only after the probe says
  not-sent.
- **Q8 HOLD:** the send receipt is inconclusive (send CLI returned ok but Sent
  verification failed, or the FB DM thread is unreadable because the
  browser/Pig died mid-run), OR the eligibility checker exits non-zero (1
  INELIGIBLE, 2 DISCREPANCY, 3 ERROR), OR structured state and notes disagree
  (precedence: canonical structured state > suppression > verified history >
  derived projection > notes). A discrepancy emits an evidence record and
  requires explicit reconciliation before ANY send to that recipient.

## Existing dedup (the port must preserve and harden)

- `send-eligibility.py` fail-closed checker (exit codes 0/1/2/3).
- Pipeline statuses (`NEW -> SENT/SUBMITTED/DM SENT/SKIPPED` in `pipeline.md`).
- Gmail sent-mail touch counts (hardened against prose false-positives in the
  2026-09-22 backfill).
- Follow-up ladder (max 3 touches: cold + F1 + F2).
- DM cap 10/day; cold email 10/UTC-day cap; pre-send gates re-run before
  EVERY `+send`.

Confidence: HIGH (code actually read). MEDIUM on FB DM queryability (thread
re-read inferred from verification practice, not a dedicated probe script).

## Port priority note

This is the highest-consequence REAL external effect class in the survey: the
harm of a duplicate is irreversible reputational damage with a real business,
and there is no provider-level protection. The port's first job here is a
canonical operation identity + durable DISPATCHED/UNKNOWN/RECONCILE state per
logical send, reusing the existing eligibility checker as the probe.
