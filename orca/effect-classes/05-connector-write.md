# Effect Class 05: Connector Write

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `/home/nolan/ping/gateway/routes/connectors.js` (236 lines, read on Pig),
skill definitions in `/opt/hatch/skills/*` and `~/workspace/skills/*`,
`~/workspace/business-connectors`, `~/workspace/outreach`.

## Structural finding (architectural, affects the port)

`gateway/routes/connectors.js` exposes NO write endpoints. It is capability
introspection (`/capabilities*`), connector discovery/health (`/:name/discover`,
`/health`), sync (`/:name/sync` POST), events/search (GET), and OAuth
onboarding (URL/callback/refresh/revoke/status/apikey). **All external-state
mutations happen outside the PING gateway**: agent-driven skill CLIs
(`hatch_gws_cli`, `instagram-cli`, `threads-cli`, `hatch_messenger_cli`,
`spotify-api`, `shopify-ucp-cli`, `vercel-api.py`, `gh-api.py`) and Pig browser
automation (`~/workspace/pig-fb/` — Facebook Page DMs, the actual first-choice
outreach channel per AGENTS.md).

Consequence for the ORCA port: there is no central dispatch point to attach
idempotency keys to. The port lane must either route skill-CLI writes through a
durable effect wrapper or accept per-class wrappers. Wiring "registry entries"
at the gateway will not catch these effects.

Reads are NOT effects and are excluded (Plaid = explicitly read-only;
FlightAware = read-only lookups; OpenAI `generate`/`embed` in
`/home/nolan/ping/adapters/openai_adapter.js` = inference only, no external
state mutated, only token cost — treat as read-like for the port).

---

## 5a. Gmail send / reply / forward

Evidence: `/opt/hatch/skills/gmail/SKILL.md` lines 95-111.

- **Q1 Identity:** must be DERIVED. No stable operation identity in code.
  Candidate: `send:<run_id>:<recipient>:<subject-hash>` or the approved-content
  fingerprint (the skill freezes approved content: "the approved content is
  frozen for execution"). Derive from the frozen approval snapshot.
- **Q2 Provider idempotency key:** NONE. Gmail `users.messages.send` accepts no
  idempotency key. Bolt-on externally only: create a Draft then send the draft
  by draft ID (the draft is consumed on send, making the send idempotent-ish),
  but draft creation itself is not deduplicated.
- **Q3 Queryable:** YES. `users.messages` search by recipient + subject +
  thread; Sent mailbox read-back. Caveat: email delivery has no ack; the API
  returns "endpoint acceptance" only (skill line 111).
- **Q4 Reconcile:** BUILDABLE. Probe: search Sent for
  `in:sent to:<a> subject:<fingerprint>` within the attempt window; compare body
  hash to the frozen approval snapshot. Found -> RECOVER_SUCCEEDED. Absent with
  healthy provider -> SAFE_TO_RETRY. False-negative probe -> duplicate (Gmail
  has no dedup), so probe confidence must be high.
- **Q5 Reversible:** effectively NO. A sent email is externally visible; a
  follow-up correction email is a new effect, not a reversal. Drafts ARE
  reversible (delete draft). Mailbox labels reversible.
- **Q6 UNKNOWN means:** the email may or may not be in the recipient's inbox. A
  second send = a duplicate cold email to a real business, which the outreach
  law forbids (follow-up ladder caps at 3 touches).
- **Q7 Retry safe:** only when a definitive Sent/All-Mail probe shows no
  matching message from the attempt window AND no bounce was received AND the
  retry carries the same frozen approval snapshot.
- **Q8 HOLD:** when the probe is ambiguous (search error, delayed Gmail index,
  or the CLI died after "endpoint accepted" but before the message ID was
  persisted). Also hold while a follow-up ladder is active (duplicate send
  would violate the 3-touch cap).
- Confidence: HIGH on provider behavior; MEDIUM on the probe pattern (unbuilt).

## 5b. Google Calendar events insert / patch / delete

Evidence: `/opt/hatch/skills/google-calendar/SKILL.md` lines 36-43.

- **Q1 Identity:** partially derivable. `patch`/`delete` key on provider
  `eventId` carried from a read (skill: "Carry the account, calendar ID, and
  event ID from the read that found the event straight through the write").
  `insert` has no identity in code today; derive `(calendarId, iCalUID)`.
- **Q2 Provider idempotency key:** bolt-on supported, not native.
  `events.insert` body accepts `iCalUID`, which Google treats as a
  calendar-scoped uniqueness token in practice; the skill never sets it. No
  ETag/If-Match concurrency in code.
- **Q3 Queryable:** YES, strongly. `events get/list` by eventId or by time
  window + iCalUID.
- **Q4 Reconcile:** BUILDABLE and cheap. Probe `events list
  timeMin/timeMax + q=<fingerprint>`: exists with matching fields ->
  RECOVER_SUCCEEDED; absent -> SAFE_TO_RETRY. `patch`/`delete` retry-safe when
  read-back verified via `events get`.
- **Q5 Reversible:** YES, fully compensating. Insert -> delete. Patch ->
  re-patch to prior fields (state read before write per skill). Delete ->
  re-insert from saved snapshot. EXCEPT: guest-visible notifications
  (`sendUpdates: all`) already emailed cannot be unsent.
- **Q6 UNKNOWN means:** ambiguous external visibility. Worst case: guest
  notification sent twice (annoying) or zero times (missed meeting). Low
  financial, moderate social/trust consequence.
- **Q7 Retry safe:** `patch`/`delete` (idempotent by eventId) after a `get`
  confirms current state; `insert` only after time-window probe confirms
  absence AND the retry sets a stable iCalUID derived from the operation
  identity.
- **Q8 HOLD:** guest-visible writes (`sendUpdates: all`) with an ambiguous
  probe; blind retry risks double notifications to attendees.
- Confidence: HIGH.

## 5c. Threads `publish-post`

Evidence: `/opt/hatch/skills/threads/SKILL.md` lines 372-397, 73-75, 419-421.

- **Q1 Identity:** DERIVED. Provider gives `post_id` only after success.
  Candidate: hash of approved text + media manifest + account + approval
  window (the skill already builds an exact preview).
- **Q2 Provider idempotency key:** NONE. The skill's answer is procedural: zero
  transport retries, `--retries` not supported for publish-post "because a
  retry could duplicate a mutation"; "A child or parent failure is terminal
  and ambiguous. Any later attempt is a new invocation with a new explicit
  approval."
- **Q3 Queryable:** YES. `post-by-id`/read commands exist; rule 7 mandates
  read-back verification against the approved snapshot.
- **Q4 Reconcile:** exists in procedure, not in code. Probe: read own profile
  recent posts / top-posts within the attempt window; match text exactly
  (byte-preserved). Match -> RECOVER_SUCCEEDED; healthy provider + no match ->
  SAFE_TO_RETRY with the same approved snapshot.
- **Q5 Reversible:** NO. No delete endpoint in the skill; published duplicates
  cannot be pulled back. No edit offered.
- **Q6 UNKNOWN means:** the post may be live on a public social profile; retry
  risks an irreversible public duplicate. Reputational, public, permanent.
- **Q7 Retry safe:** only when the read-back probe definitively shows the post
  absent (post list healthy, window searched) AND the retry is re-approved as
  a new invocation with the same frozen snapshot. Never retry on provider
  error before the probe.
- **Q8 HOLD:** whenever the probe is inconclusive (list fetch failed,
  pagination ambiguous, provider degradation). No compensating delete exists;
  HOLD is the only safe terminal state short of proof.
- Confidence: HIGH. Best-designed skill in the set for exactly this problem.

## 5d. Instagram `post-feed` / `post-story`

Evidence: `/opt/hatch/skills/instagram/SKILL.md` lines 374-391, 462-464.

- **Q1 Identity:** DERIVED (account + approved media manifest + caption hash).
  The draft-render-then-post pattern gives a stable artifact: the final
  published render file.
- **Q2 Provider idempotency key:** NONE. The per-account daily publish limit is
  a rate bound, not dedup.
- **Q3 Queryable:** YES. Post grids, post-by-ID reads, tagged posts. NOTE:
  AGENTS.md (2026-09-21) documents the browser-session read-back path is
  degraded (post grid no longer renders /p/ or /reel/ anchors in the CDP
  session); use the CLI read path for probes.
- **Q4 Reconcile:** BUILDABLE. Probe recent media / post-by-ID for
  caption+media fingerprint match.
- **Q5 Reversible:** PARTIAL. Posts are deletable via API in most IG flows,
  but the skill does not list delete as a capability (UNKNOWN). Stories are
  time-limited (24h), so duplicate damage self-heals.
- **Q6 UNKNOWN means:** possibly-live public media; duplicate risks daily-limit
  burn plus a visible duplicate on the brand account.
- **Q7 Retry safe:** only after definitive probe absence on the CLI read path
  (not the degraded browser path), within the daily publish limit budget.
- **Q8 HOLD:** ambiguous probe; near the daily publish limit (a blind retry
  could burn the last slot on a duplicate).
- Confidence: MEDIUM-HIGH.

## 5e. X API v2 follows / likes

Evidence: `~/workspace/skills/x-api/SKILL.md` lines 3-13.

- **Q1 Identity:** DERIVED (`follow:<source>:<target>`,
  `like:<user>:<tweet_id>`).
- **Q2 Provider idempotency key:** NONE — but both operations are NATURALLY
  IDEMPOTENT: following twice returns the existing relationship; liking twice
  returns the existing like. Defining property of this class.
- **Q3 Queryable:** YES. User lookups, follows/lookup reads exist.
- **Q4 Reconcile:** cheap and definitive. Probe `GET /2/users/:id/following`
  membership or relationship lookup; either state is unambiguous.
- **Q5 Reversible:** YES. Unfollow / unlike supported.
- **Q6 UNKNOWN means:** trivial ambiguity; worst case of blind retry is a
  no-op or re-follow after an unfollow. Low consequence.
- **Q7 Retry safe:** ALMOST ALWAYS. Natural idempotency makes retry safe even
  after timeout. Note: this path is presently DORMANT (zero API cost budget;
  X engagement stays browser-only per alignment synthesis).
- **Q8 HOLD:** when auth is 401/403 ambiguous (a request built without the
  credential helpers "looks exactly like a wrong or under-scoped token") —
  the real failure is credential attachment, not the effect. Retry without
  fixing auth is pointless, not dangerous.
- Confidence: HIGH on semantics.

## 5f. Facebook Marketplace listing create / edit / publish / delete

Evidence: `/opt/hatch/skills/facebook-cli/SKILL.md` lines 38-41, 113, 132,
rule 19 (line 176).

- **Q1 Identity:** provider gives `listing_id` on create; derive
  `listing:<draft-id>` or create-fingerprint.
- **Q2 Provider idempotency key:** NONE. The skill's answer is human-in-the-
  loop: "Never silently retry a failed Marketplace write. ... surface the
  situation to the user and wait for their review."
- **Q3 Queryable:** YES. `marketplace my-listings --status
  draft/active/pending/sold` exposes the full state machine.
- **Q4 Reconcile:** BUILDABLE via `my-listings` status query. If publish timed
  out, check whether status flipped to ACTIVE.
- **Q5 Reversible:** YES, strongly. Listings can be deleted/unpublished; the
  status machine is a compensating-action ladder (publish <-> unpublish/delete).
- **Q6 UNKNOWN means:** a draft may or may not exist; a listing may or may not
  be LIVE (public). Public-listing ambiguity is the consequential case.
- **Q7 Retry safe:** only when `my-listings` definitively shows the listing
  absent (create) or still DRAFT (publish); never on ambiguous `my-listings`.
- **Q8 HOLD:** rule 19 says HOLD and surface to a human on ANY failed
  Marketplace write. This is the only class whose current rule is literally
  "HOLD and ask a human" — consistent with the Port Law human boundary
  (publishing to real businesses routes to Nolan).
- Confidence: HIGH.

## 5g. Messenger send / unsend / edit / react

Evidence: `/opt/hatch/skills/messenger/SKILL.md` lines 274-340, 425-463.

- **Q1 Identity:** DERIVED. Provider returns `message_id` after send (used by
  react/unsend/edit as `--mid`).
- **Q2 Provider idempotency key:** NONE in this skill's surface.
- **Q3 Queryable:** YES. `sync messages --cid` re-reads the thread; sent
  messages appear in the thread.
- **Q4 Reconcile:** BUILDABLE. Probe `sync messages --cid`, match the exact
  approved text (the skill shows exact outgoing text pre-send, so the snapshot
  exists). Found -> RECOVER_SUCCEEDED.
- **Q5 Reversible:** YES — uniquely among message classes. `unsend --mid`
  "removes the user's message for everyone"; `edit --mid` exists. A duplicate
  send can be compensated by unsending the duplicate. Partial: recipient may
  have already seen/been notified.
- **Q6 UNKNOWN means:** message may be delivered; retry risk is a visible
  double-message to a real person. Recoverable via unsend.
- **Q7 Retry safe:** only when the `sync messages` probe definitively shows
  the text absent AND the mutation-at-most-once rule has not been consumed for
  this target ("Call the mutation at most once per target per user request").
  After a consumed attempt, only a fresh user request re-authorizes.
- **Q8 HOLD:** ambiguous probe; any case where the single mutation was already
  attempted; group threads (participant ambiguity).
- Confidence: HIGH. Unsend-as-compensation is the pattern to generalize.

## 5h. Spotify / podcast publish

Evidence: `/opt/hatch/skills/generate_podcast/SKILL.md` lines 125-140, 170-175;
spotify skill line 70.

- **Q1 Identity:** DERIVED from `--slug` (publish) or episode identifier; the
  podcast catalog manifest records feed state.
- **Q2 Provider idempotency key:** NONE observed. Title-based feed matching
  ("publishing with a --feed-title that matches an existing feed adds to it")
  is routing dedup, not effect dedup.
- **Q3 Queryable:** YES. `podcast-helper manifest read` shows published state;
  RSS feed read-back.
- **Q4 Reconcile:** BUILDABLE. Probe manifest read + feed URL fetch for episode
  presence.
- **Q5 Reversible:** PARTIAL. Episode removal not explicitly documented
  (UNKNOWN). Spotify library save is user-removable.
- **Q6 UNKNOWN means:** episode may be public on the RSS feed; a retry
  duplicates an episode entry in subscriber feeds. `blocked: true` from
  content review is a hard terminal, never retry, never reword around it.
- **Q7 Retry safe:** only after manifest + feed probe show the episode absent
  and content review did not block.
- **Q8 HOLD:** `blocked: true` (absolute hold); ambiguous manifest/feed probe.
- Confidence: MEDIUM (helper CLI behavior read from docs, not code).

## 5i. Kit (ConvertKit) newsletter subscribe

Evidence: `/home/nolan/projects/ping/src/app/api/newsletter/subscribe/route.ts`
(FYD app, :3100); `syncNewsletterSubscriber` in `@/lib/kit`.

- **Q1 Identity:** email address (normalized lowercase + trimmed) is the
  natural logical identity.
- **Q2 Provider idempotency key:** bolt-on / provider-deduped. The route
  maps `kitResult.suppressed` -> HTTP 409 (`subscription_suppressed`),
  indicating the provider or wrapper treats re-subscription of a suppressed
  address as a no-op signal.
- **Q3 Queryable:** YES (via Kit subscriber lookup; the wrapper returns a
  structured success/failure/suppressed verdict).
- **Q4 Reconcile:** BUILDABLE via subscriber lookup by email.
- **Q5 Reversible:** YES (unsubscribe exists in ESPs; effect is a list
  membership, not a visible publication).
- **Q6 UNKNOWN means:** address may or may not be on the list; duplicate
  subscribe is a no-op (suppressed), so consequence is negligible.
- **Q7 Retry safe:** when the subscriber lookup shows absence, or on any
  5xx/validation-failure path that the wrapper reports as failed.
- **Q8 HOLD:** when the wrapper reports an ambiguous state (neither success
  nor suppressed nor clean failure).
- Confidence: MEDIUM (route code read; `syncNewsletterSubscriber`
  implementation not fully traced).

## Cross-class notes for the port

- Only naturally-idempotent classes (X follow/like, GitHub repo create,
  Kit subscribe) converge under blind retry. Everything else needs the probe.
- Best existing no-blind-retry rules to generalize: Threads "zero transport
  retries, failure terminal and ambiguous"; IG "no --retries for posting";
  FB marketplace rule 19 "never silently retry a failed write"; Spotify
  device rule (no retry after timeout, verify via `now-playing`).
- The gap is not probes (read paths exist for every class except
  Gmail-delivery confirmation) — it is DURABLE OUTCOME STATE: nowhere today
  persists DISPATCHED/UNKNOWN/RECONCILE per logical operation.
