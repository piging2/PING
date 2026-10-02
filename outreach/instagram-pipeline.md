# Instagram aggressive pipeline playbook (2026-09-24, Nolan directive)

Directive: AGGRESSIVE PIPELINE. CONTROLLED EFFECTS. MEASURE. SCALE WHAT PROVES
SAFE. SCALE BACK FAST WHEN THE EVIDENCE TURNS.

Scope: everything that PREPARES Instagram engagement. The actual sends (likes,
comments, unfollows executed) stay inside the already-authorized envelope:
instagram-engagement-pass every 6h, 20 likes + 5 comments max per pass,
business accounts only, never re-engage a handled handle. Per-pass caps and the
6h cadence change ONLY on Nolan's explicit later order ("slow ramp soon").

## Architecture

- Phase P (pipeline, read-only, instagram-cli only, no browser) runs first in
  the engagement pass worker. It builds/refreshes the deep qualified queue:
  `~/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes/ig-qualified-queue-<ts>.json`.
- The pass pulls its top candidates from the queue and projects them into the
  flat `ig-candidates-<ts>.json` format the guard expects
  (`[{"account":"@handle","url":"..."}, ...]`). Zero scraping during the
  engagement portion of the pass window: the browser task in Phase B executes
  ONLY the closed action set.
- Phase A browser discovery remains as FALLBACK ONLY: it runs when the queue's
  eligible depth (after guard + ledger filter) is below 2x the pass caps
  (< 40 like-slots and < 10 comment-slots available).
- The unfollow lane (goal instagram-mass-unfollow, schedule
  instagram-unfollow-batch daily) owns unfollow semantics. This pipeline does
  NOT touch its queue, schedule, or pacing. It only writes shared evidence:
  `~/workspace/outreach/instagram-unfollow/ig-unfollow-evidence.jsonl`
  (accounts in Nolan's own following set observed dead/private/personal during
  vetting, with reasons). The unfollow lane may adopt it later on Nolan's word;
  until then it is evidence, not instructions.
- The pipeline caches Nolan's following list (`following-cache-<date>.json`,
  refreshed every 3 days) for that cross-reference. Known limitation: the
  Instagram API caps accessible following pages (observed 3,179 of 3,372),
  so the cross-reference covers ~94%, not 100%.

## Qualification gates (deterministic, in ig-pipeline.py)

A candidate enters the queue only if ALL hold:

1. PUBLIC: profile is public (private -> excluded, evidence recorded).
2. BUSINESS: account_type is business or creator (personal -> excluded).
3. COUNTRY: user-profile country field is US. This is the precision gate
   (Durango-MX vs Durango-CO lesson). Non-US -> excluded.
4. GEOGRAPHY TIER: town match from bio/location/website evidence against the
   tier lists in the pass job body (Tier 1 core corridor, Tier 2 near Western
   Slope, Tier 3 further out). No town match -> tier UNKNOWN -> excluded from
   the queue, recorded as STILL_UNKNOWN (never skip-listed, never a permanent
   reject).
5. RECENCY: latest feed post (photo/carousel preferred; reel only if it has
   visible public comments) is <= 90 days old. Stale -> excluded.
6. TRADE CONTENT: the target post shows genuine work content, not a
   promo-graphic, vote ask, giveaway, staff intro, or sale ad. (Determined from
   caption excerpt + media-understanding summary; when ambiguous, the worker
   decides fail-closed and records the reason.)

Re-verification: queue entries older than 7 days are re-vetted (post recency,
account still public/business) before they are served to a pass. The pass-time
guard still owns the per-account never-re-engage rule. Provider-outage rule:
if a re-verification hits PROVIDER_500_RETRYABLE, the last-known-good entry is
carried forward flagged (`carried_forward: true`) rather than regressing the
queue to empty; it is retried on the next build.

## Enrichment schema (per queue entry)

```json
{
  "handle": "@handle",
  "display_name": "...",
  "category": "plumbing|hvac|electrical|roofing|...",
  "town": "Grand Junction",
  "tier": 1,
  "trade_priority": true,
  "followers": 123,
  "post_count": 45,
  "target_post_url": "https://www.instagram.com/p/.../",
  "target_post_date": "2026-09-20",
  "post_type": "photo|carousel|reel",
  "post_evidence": {"caption_excerpt": "...", "media_summary": "..."},
  "comment_draft": null,
  "evidence": {"source": "seed-pool|prospects|second-chance|reconciliation",
               "vetted_at": "2026-09-24T...Z", "cli_refs": ["user-profile", "posts"]},
  "rank_score": 7.0
}
```

## Ranking (higher is better)

- Tier: T1 +3, T2 +2, T3 +1
- Home-service trade priority: +2
- Post recency: <= 30d +2, <= 60d +1, <= 90d +0
- Post type: photo/carousel +1, reel 0
- Freshness bonus: never before vetted +1

The pass takes the top 25 like-candidates and top 8 comment-candidates to give
the guard/ledger filters headroom; the final closed action set is capped at
20 likes + 5 comments by the pass job body.

## Comment-draft voice contract (worker drafts, script validates)

Every draft is tied to ONE specific post and must be post-specific: under 20
words, funny first, then punchy, expert/techy but down to earth. Never sell,
never mention PING Social, no links, no contact info, no customer-posing, no
em dashes. The script validates drafts already in the queue: <= 20 words, no
em dash, no "PING", no URL. Drafts failing validation are dropped with a note
and regenerated.

## Measurement schema: ig-health-<pass_id>.json

Written by the pass worker after Phase B (or after the stop point). Fields:

```json
{
  "pass_id": "ig-20260924-2301",
  "ts": "2026-09-24T...Z",
  "auth": {"session_restored_ok": true, "login_failed": false, "checkpoint_seen": false},
  "unknown_execution_open": 0,
  "duplicate_effect_risk": {"reverted_likes": 0, "guard_violations": 0, "mark_without_observation": 0},
  "provider_warnings": {"action_block": false, "checkpoint": false, "verification_challenge": false, "rate_limit_warning": false},
  "acceptance": {"likes_attempted": 0, "likes_landed": 0, "comments_attempted": 0, "comments_landed": 0},
  "caps": {"likes_used": 0, "likes_authorized": 20, "comments_used": 0, "comments_authorized": 5, "halved": false},
  "queue": {"depth_at_pass_start": 0},
  "classification": "SUCCESS_ACTION|SUCCESS_EMPTY|..."
}
```

These feed the scale-back decision and Nolan's future ramp order.

## AUTO-SCALE-BACK TRIPWIRE (2026-09-24, Nolan)

Encoded in the pass job body; the worker applies it mechanically, never
powers through:

1. AUTH DEGRADED (login cannot be restored after 2 attempts): stop with zero
   engagement, keep the schedule enabled, log AUTH_FAILURE. (Stay-on rule;
   routine auth/infra hiccups never disable the schedule.)
2. UNKNOWN OUTCOMES: if open UNKNOWN_EXECUTION intents for instagram >= 5 at
   pass start, skip Phase B this pass (discovery/pipeline only). Reconcile
   before the next pass runs Phase B.
3. DUPLICATE-EFFECT RISK: any reverted like in a pass -> halve the NEXT pass's
   caps immediately. A second revert, any guard VIOLATION, or any
   mark-without-observation gap -> stop the pass immediately, halve caps,
   surface to Nolan.
4. PROVIDER WARNINGS: any action block, checkpoint, verification challenge,
   or rate-limit warning -> stop the pass instantly, halve next pass's caps,
   surface to Nolan. A blocked account produces zero metrics; backing off is
   the priority over volume.
5. ACCEPTANCE: like acceptance (landed/attempted) below 50% on a pass ->
   halve next pass's caps. Comment acceptance below 50% -> next pass comments
   capped at 2.
6. Nothing in this tripwire raises caps, shortens the 6h cadence, or disables
   the schedule. Restoring volume is Nolan's explicit order only.

## What this pipeline does NOT change

- Per-pass send caps (20 likes + 5 comments) and the 6h cadence: Nolan's later
  order only.
- Guard semantics: per-account never-re-engage stays mechanical.
- Intent ledger semantics: fail closed, deliberate reconciliation.
- The unfollow lane's queue, schedule, pacing, or target_per_day.
- Any safety, eligibility, stay-on, near-miss/skip-list, or fail-closed rule.
