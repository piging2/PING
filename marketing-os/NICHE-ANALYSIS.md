# PING Social: Audience Baseline Analysis (NOT a niche decision)

Date: 2026-09-30. Sources: facebook-cli pages API (posts list LAST_90D, account-insights LAST_90D, post read); facebook-cli timeline fetch for Nolan's personal profile (100000536018898), reaction/comment reads.

## Read this first: what this file is

This is BASELINE evidence, not strategy. It describes the audience we had. It does not describe the audience we want.

Standing law (Nolan, 2026-09-30): "Past analytics describe the audience we had. Experiments create the audience we want. Optimize for qualified attention, not historical conformity."

The previous conclusion ("The $400 missed call" as PING's permanent niche) is withdrawn. It was one directional signal from a tiny dataset: 10 Page posts, 18 followers. It now lives below as one content pillar candidate, not the identity.

## Part 1: Page baseline (2026-07-01 to 2026-09-28)

- follower_count: 18 (snapshot)
- views: 324 | unique_viewers: 32
- engagement_including_clicks: 3
- profile_visits: 294 | new_followers: 25 | unfollowers: 5
- Note: 294 profile visits vs 324 views. People check the page; almost nobody touches a post.

## All 10 Page posts, ranked by views

| Date | Format | Topic (summary) | Views | Unique viewers | Engagements incl. clicks | Clicks | Link clicks |
|---|---|---|---|---|---|---|---|
| Sep 16 4:02 PM | Photo | Pitch: "valley running" offer post, 7-day automation offer, message-the-page CTA | 37 | 22 | 0 | 0 | 0 |
| Sep 16 3:50 PM | Link share | Portfolio proof: "Made a client a beautiful website" + happy-place link | 37 | 19 | 2 | 2 | 2 |
| Sep 15 11:42 AM | Text | AI-infrastructure stock rant (nuclear, chips, data centers) | 35 | 18 | 0 | 0 | 0 |
| Sep 16 3:50 PM | Photo | Duplicate of the Sep 16 pitch post (same caption, 16 sec apart) | 34 | 20 | 0 | 0 | 0 |
| Sep 13 8:30 PM | Photo | Dave the plumber: under a sink at 7 AM, $400 job goes to whoever picks up first | 30 | 12 | 0 | 0 | 0 |
| Sep 20 3:05 PM | Photo | PIGING front-desk pig: "every shop has a front desk" generic mascot pitch | 21 | 11 | 1 | 1 | 0 |
| Sep 14 10:18 PM | Video | No caption at all | 21 | 10 | 0 | 0 | 0 |
| Sep 20 7:04 PM | Photo | Fan-badge repost ("top fans" of another page) | 14 | 9 | 0 | 0 | 0 |
| Sep 29 9:56 AM | Text | Cathie Wood / crypto rant | 0 | 0 | 0 | 0 | 0 |
| Sep 13 9:36 PM | Text | No caption at all | 0 | 0 | 0 | 0 | 0 |

Reactions, comments, shares: 0 on all 10 posts.

## Directional findings from the Page (useful for craft, not for identity)

1. **Proof of work is the only thing that ever earned an action.** The portfolio link post holds 2 of the page's 3 lifetime engagements (both link clicks among the 10 returned posts). Nothing else has ever moved anyone past viewing.
2. **A specific trade + a specific dollar loss beat the generic mascot pitch.** Dave the plumber ($400 job, under a sink, 7 AM) drew 30 views on a Sunday evening; the generic "front desk" PIGING pig post drew 21 views on a Sunday afternoon. Same weekend, worse slot, 43% more views. Specificity wins.
3. **Off-topic rants are dead weight.** The Cathie Wood post had 0 views after 8 hours. The AI-infra rant pulled 35 views but zero engagement and zero business relevance: views without a path to the business.
4. **Captionless posts are invisible or near it.** 0 and 21 views; the video post's 21 views prove nothing about video, only that no hook means no reason to care.
5. **Duplicates cannibalize.** The same pitch caption posted twice within a minute split 37/34 views instead of stacking on one post.
6. **Weekday afternoons outperformed weekends** (34-37 views Tue/Wed PM vs 0-30 on weekends), with the Dave post as the exception that proves the trade-story rule.

What these findings may be used for: hook specificity, proof-versus-pitch behavior, caption discipline, CTA placement, format failures. What they may NOT be used for: choosing the permanent audience or declaring what PING is about.

## Part 2: Personal profile baseline (Nolan Geske)

- 120 unique own posts on the personal timeline, 2009-12-05 to 2026-09-29.
- 2026: 20 own posts. Zero of them mention PING Social, Jev, Typesafe, or the PING pig mascot.
- Topic mix (rough keyword buckets, directional): personal/misc dominates; about 9 finance/markets posts; about 8 AI/tech posts across the sampled window.
- Engagement (all 20 2026 posts, reactions read 2026-09-30): roughly 38 reactions total, under 2 per post on average. Best: the Aug 25 Forward-Deployed Engineer job-seeking post (6 likes, 2 comments). AI-tech posts sit in the same band: the Aug 2 coding-agents rant (3 likes), the Sep 9 "Are y'all using Muse? I'm using it for cold outreach" post (3 likes), the Sep 17 Meta Muse post (2), the Sep 20 AI-adoption rant (1), the Sep 21 Muse unit-economics post (0). The Sep 11 9/11 post got 4 reactions.
- Comments are near zero everywhere except the job post.
- No professional-mode analytics are exposed through the connector: the timeline returns no view or reach metrics, only posts. So personal-profile "performance" here means reactions and comments only, a weaker signal than Page insights.

What the personal profile adds to the baseline:
- Nolan has a real voice on AI consumer tooling (Muse, coding agents, ChatGPT) that already draws his usual level of engagement. This is a bridge, not a verdict: the personal audience has tolerated AI talk, but it has never been offered technical PING content, so nothing here proves or disproves the technical strategy.
- The personal profile is a larger historical dataset than the Page, but it is still the WRONG dataset for choosing PING's audience. It predates the strategy and was never aimed at it.

## Part 3: What is UNTESTED (the whole point of this file)

The following have no meaningful signal in either dataset and must be classified UNTESTED, not rejected and not chosen: Jev, Typesafe, TenantOS, constitutional architecture, replay, determinism, Oracle migration, multi-runtime execution, and technical PING content generally.

## Part 4: The withdrawn conclusion and what replaces it

WITHDRAWN: "The narrowest niche the evidence supports is 'The $400 missed call': one Western Colorado trade, one painful moment, one dollar figure, per post." That sentence confused a small-sample craft finding with a business identity. It is retracted.

REPLACED WITH:
- "The $400 missed call" becomes one content pillar (home-services commercial story), alongside technical pillars, not the identity.
- The next 30 technical posts are an explicit discovery period. See EXPERIMENT-PLAN.md. No winner is declared before testing.
- The intended audience is chosen by strategy, not by history: senior and staff engineers, AI infrastructure engineers, agent and runtime engineers, founders building AI systems, technical operators, systems engineers, and developers interested in reliability, distributed systems, event sourcing, orchestration, deterministic systems, local AI, and evidence-backed AI.

## Key permalinks

- Portfolio proof post (only Page clicks among returned posts): https://facebook.com/61594275542163/posts/pfbid0YtfR8ppzHxgmyRTEen4Nfq5oBEVLpCPiyAW4H1e4CBqBMevNG47qTr2ZHeFZi2YCl/
- Dave the plumber post (trade story beat generic pitch): https://facebook.com/61594275542163/posts/pfbid0pohxbmr8sXBqrBDXpV74gj6cB4tsdiRx4P7bPWFXV1M9rvfjqvRNCC1JQLcjrX7Ml/
- Page: https://www.facebook.com/profile.php?id=61594275542163
