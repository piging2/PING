# Marketing OS: Content Engine

Built 2026-09-29. How the daily loop, the video packages, the voice clone, and the explainers fit together into a repeatable weekly content system.

Standing laws: Nolan approves each post daily before anything publishes. Never create a native Facebook draft, publish, or schedule from a recurring job. No em dashes. Humor native to PING. Practical business outcomes, never AI hype. Exact pig mascot only. TikTok is on hold until Nolan lifts it.

## 2026-09-30 technical audience strategy (Nolan, standing)

The engine now runs a discovery program on top of the daily loop. Full program: EXPERIMENT-PLAN.md. The rules that change the loop:

- **Two reporting tables, never mixed.** Historical audience performance (frozen baselines in NICHE-ANALYSIS.md) vs target-audience experiment performance (new technical content). The cron pulls both and reports them separately.
- **Two measurement dimensions.** Distribution performance (views, 3s hold, average watch, completion, rewatches, shares, saves) and audience quality (qualified technical followers, technical comments, senior-dev engagement, GitHub/profile clicks, repeat technical viewers, inbound engineering conversations, implementation questions, references to previous episodes). Views alone are weak evidence.
- **30 technical posts, tagged.** Each technical post carries TOPIC, DEPTH, FORMAT, HOOK TYPE, SYSTEM, AUDIENCE, CLAIM TYPE. No winner declared early. The claim-status convention (VERIFIED / INFERRED / UNKNOWN) from SYSTEMS.md is enforced on every technical draft; occasionally expose verification publicly.
- **Series supply the cadence.** The technical series (SHOW THE RECEIPTS, ONE AUTHORITY, WE WERE WRONG, FAILURE IS A STATE, BUILDING PING, MECHANISMS NOT FRAMEWORKS, ONE BRAIN MANY HANDS) plus the commercial pillars keep ideation cheap. The weekly rhythm in section 2 keeps running; the ratio of technical to commercial posts is itself an experiment variable, reported honestly.
- **Personal-profile mirroring is manual-only.** The connector supports managed-Page writes (approval-gated) and personal-profile reads only. Mirroring an approved post to Nolan's personal profile is not technically supported by the tooling; the only route is a manual share in the Facebook UI, decided by Nolan after he approves the post. The cron must never promise automated mirroring.

---

## 1. The parts

- **Daily draft loop.** Cron `ping-page-daily-post-side`, daily around 8:21 AM MDT, delivers one candidate to the "PING daily content" side chat. It pulls fresh Page analytics, rotates formats (never the same format twice in a row), and drafts exactly one post or one video package. Definition: `~/workspace/goals/ping-social-brand-launch/crons/daily/ping-page-daily-post-side__daily@08:21:00_user_current.md`.
- **Knowledge base.** `SYSTEMS.md` (this folder): five explainers with evidence tags and content angles. The idea supply. Every video package traces its claims to a VERIFIED line here.
- **Video playbook.** `VIDEO-PLAYBOOK.md` (this folder): the craft standard. Every video package follows its three-track script format and review checklist.
- **Voice clone.** Nolan's clone via the Pig's CosyVoice TTS service. Works on short paragraphs (confirmed 2026-09-29). Voiceover scripts are written per paragraph, 20-40 words each. Long-form continuity is a separate engineering track and is never promised in content.
- **DaVinci Resolve (Pig).** Where packages become videos. Professional craft per the playbook.
- **Content store.** `~/workspace/ping-content/`: `queue.json` (post state, posted flags, 14-day image reuse rule), `captions.md` (the CONTENT HUMOR CHECK gate), `inbox/` (images).

## 2. The weekly rhythm

One post a day. Formats rotate; the same format never appears twice in a row. A sample week:

| Day | Format | Source |
|---|---|---|
| Mon | Short text post | Analytics winner pattern or a SYSTEMS.md angle compressed to one punch |
| Tue | Pig-image post | `inbox/`, unposted per `queue.json` |
| Wed | Video package | SYSTEMS.md angle, produced on the Pig |
| Thu | Short text post | Reply-bait or teaching post |
| Fri | Pig-image post | Fresh angle, same mascot law |
| Sat | Video package | Series installment ("Show the receipts," "One trade truth," etc.) |
| Sun | Rest and analyze | No post. Review the week's metrics, pick next week's hypotheses. |

The rotation is a default, not a prison. If analytics show video far outperforming, the ratio shifts; the rule that survives is: never the same format twice in a row, and every post carries a hypothesis.

## 3. The feedback loop (the engine's core)

Nolan's standing post-publish learning loop, applied to every published post:

**OBSERVE** → **PUBLISH** → **VERIFY** → **REVIEW** → **ONE IMPROVEMENT** → **PATCH** → **TEST** → **RE-CERTIFY**

In practice:

1. **Observe.** Before drafting, pull `account-insights` (LAST_7D) and the posts list (LAST_28D). Record the exact metric nouns and values. Identify the current winner pattern: format, hook, topic.
2. **Hypothesize.** Every draft states its bet in 2-4 lines: which pattern it follows and why. No bet, no draft.
3. **Publish (on approval only).** Nolan approves the exact post. Publish natively per platform. Record the receipt: post ID, time, exact caption, image used.
4. **Verify.** Confirm the post is live and the receipt matches. Update `queue.json` posted flags only after confirmation.
5. **Review.** After 24-48 hours, pull the post's metrics. Compare against the hypothesis. Metrics that matter, in order: shares, saves, comments (quality, not count), profile visits, follows. Views are context, not success.
6. **One improvement.** Pick exactly one change for the next similar post. Not three. One. ("Hook was 11 words; cut to 6." "Caption emphasis lagged the voice by half a second; tighten sync.")
7. **Patch, test, re-certify.** The improvement goes into the playbook or the cron instructions, the next post tests it, and the result is recorded in the daily memory log. A improvement that does not move a metric gets reverted.

The loop compounds. Ten honest iterations beat ten clever guesses.

## 4. From explainer to video: the idea pipeline

1. Pick a content angle from SYSTEMS.md. Check its evidence tag: VERIFIED can be asserted; INFERRED must be framed as a reading; UNKNOWN must be said out loud or cut.
2. Compress to one idea and one payoff. If the angle needs two ideas, it is two videos.
3. Write the three-track script (visual, audio, text) per the playbook, with 5 hook variants.
4. Generate voiceover per paragraph with the clone. Budget 75 words per 30 seconds.
5. Edit on the Pig per the professional grammar. Run the review checklist.
6. Deliver the approval package to Nolan: video file, caption (first line as second hook), hashtags, hypothesis, metric to watch.
7. On approval, publish natively, record the receipt, enter the feedback loop.

A single strong explainer angle should yield: one video, one text post (the script's core claim compressed), and one image post (the claim as a headline over the mascot). Never on the same day. The waterfall spreads one idea across the week without repeating a format.

## 5. Metric discipline

- **Never invent metrics.** An unavailable metric stays unavailable. The Page baseline from Sept 1-28, 2026 (VERIFIED via facebook-cli): 324 views, 3 engagements including clicks, 294 profile visits, 18 followers. Small numbers are honest numbers; the loop is how they grow.
- **Winner pattern, not vanity.** Compare per-post views, engagements, engagements including clicks, clicks, link clicks, saves. Name the pattern in plain words ("fence-truth text posts earn saves; portfolio posts earn views but no clicks").
- **Kill list.** A format or angle that fails its hypothesis three times gets retired for 30 days. Write the retirement down. Sentimentality is the enemy of the loop.
- **Weekly review (Sunday).** One page in the daily memory log: posts published, hypothesis results, the one improvement banked, next week's bets. This is the re-certify step.

## 6. What the engine never does

- Never publishes without Nolan's explicit approval of the exact post.
- Never claims a system capability marked INFERRED or UNKNOWN in SYSTEMS.md.
- Never reuses an image posted within 14 days.
- Never posts the same format twice in a row.
- Never touches TikTok until Nolan lifts the hold.
- Never lets a metric go unrecorded. If it was published, it was measured.
- Never confuses activity with progress: a week of posts with no learning is a failed week, reported honestly.
