# X API Follow/Like Best Practices

Compiled 2026-09-13 for @GeskeNolan (technology intelligence account building a Technology Influence Graph).
Policy: reads free via headed browser, writes (follows, likes) via official X API only, no comments.

X moved to pure pay-per-use in February 2026. The old Free/Basic/Pro tiers are retired. Rates below were
verified against sources from June to August 2026, but exact rates live in the developer console and can
change, so confirm there before any large spend.

## 1. API rate limits (OAuth 2.0 user context, per user)

| Endpoint | Per 15 min | Per 24 h |
|---|---|---|
| POST /2/users/:id/following (follow) | 50 | 400 |
| DELETE /2/users/:id/following (unfollow) | 50 | 500 |
| POST /2/users/:id/likes (like) | 50 | 1,000 |
| DELETE /2/users/:id/likes (unlike) | 50 | 1,000 |

Every response carries x-rate-limit-limit, x-rate-limit-remaining, and x-rate-limit-reset (unix timestamp).
On a 429: stop, sleep until the reset time, then back off exponentially. Never hammer through 429s.
Repeated 429s are themselves a behavioral flag.

The 400/day follow cap is a technical ceiling, not a target. X's anti-spam rules sit on top of it.

## 2. X platform rules: what gets accounts flagged or suspended

Technical limits are not permission. X's platform manipulation and spam policy treats the following as
violations even when done through the official API:

- Aggressive following: following or unfollowing accounts in a bulk, aggressive, or indiscriminate manner.
  This is the exact phrase in X's rules. Apps have had API access revoked for it, and their users' accounts
  penalized with them.
- Follow/unfollow churn: repeated cycles of following then unfollowing the same accounts, or high-volume
  follow/unfollow turnover used as a growth hack. Enforced as its own category, separate from bulk action.
- Machine-speed pacing: high action volume at regular mechanical intervals. In March-April 2026 X ran a
  mass enforcement wave suspending thousands of accounts for "inauthentic behavior"; postmortems found
  rapid likes and mass unfollows among the triggers, and X staff publicly warned that non-human activity
  patterns can draw suspension. Thresholds are tighter now than they used to be.
- Unsanctioned access paths: browser automation or scraping for writes. We do all writes through the
  official API, so we are clear here. This is also why the headed browser is read-only, never clicking
  follow or like.

Account-level follow facts:

- 400 new follows per day is the technical maximum across all access methods combined.
- After following 5,000 accounts total, further follows are gated on the follow-to-follower ratio. For an
  account with few followers, that 5,000 ceiling arrives fast and then follows stall until followers grow.
  Every follow slot is scarce, so spend them on Tier 1 and builder accounts, not indiscriminate lists.

## 3. Pacing best practices

- Never act in bursts. Spread actions across waking hours with randomized (jittered) intervals, never fixed
  timers. Fixed-interval automation is one of the easiest patterns to detect.
- Mix action types. A session that only follows 50 accounts in a row looks mechanical. Interleave likes
  with follows, and let the account show normal human texture (browser reading, varied timing).
- Respect the warmup. A sudden new pattern of API follows on an account is itself a signal. Start small
  and grow over two weeks.
- Watch for soft signals: a sudden drop in follow-back rate, "unusual activity" notices, forced re-login,
  temporary action blocks. Any of these means halt immediately and tell Nolan. Do not retry through a
  restriction.
- Keep a local ledger of every follow and like: timestamp, target, cost. It is both the budget tracker and
  the evidence trail if anything is ever questioned.

## 4. Cost (pay-per-use, verified summer 2026)

X bills writes per request:

- Follow (User Interaction: Create): $0.015 per request
- Like (User Interaction: Create): $0.015 per request
- Unfollow / unlike (Interaction: Delete): $0.010 per request
- User lookup (resolving a username to an ID): $0.010 per resource. Avoid this; resolve IDs in the free
  browser session instead.

Reads through the headed browser are free. Failed requests are not billed. The same resource re-requested
within a 24-hour UTC window is charged once. xAI credit bonus: 10 percent back at $200+ spend per cycle,
15 percent at $500+, 20 percent at $1,000+.

Budget math at steady state (50 follows + 150 likes per day):

- Follows: 50 x $0.015 = $0.75/day
- Likes: 150 x $0.015 = $2.25/day
- Total: $3.00/day, about $90/month

Likes dominate the budget. Dropping likes to 100/day brings the total to about $67/month.

## 5. What @grok does on X, and how we beat it

@grok on X is a reactive mention bot. Users tag @grok in a reply, it answers the question, end of
interaction. It does not proactively follow people, does not like posts, does not build a network, and
does not develop a point of view over time. It is a Q&A vending machine waiting to be summoned.

We do the opposite:

- Proactive, not reactive: we go find the conversations (Tier 1, builders, the 12 territories) instead of
  waiting to be tagged.
- Relationship graph, not answers: every follow and like is a node in the Technology Influence Graph,
  scored, clustered, and revisited.
- Point of view: technology intelligence with analysis (claim, evidence, contradiction, PING analysis),
  never a fan account and never a reply bot.
- Human-gated: Nolan decides what the account says. The API only follows and likes.

## 6. Recommended operating plan for @GeskeNolan

Warmup (do not skip):

- Days 1-3: 5 follows/day, 20 likes/day
- Days 4-7: 10 follows/day, 40 likes/day
- Days 8-10: 20 follows/day, 75 likes/day
- Days 11-14: 30 follows/day, 100 likes/day

Steady state (day 15+):

- Follows: 40-50/day, hard internal ceiling 100/day (never approach 400)
- Likes: 100-150/day, hard internal ceiling 300/day (never approach 1,000)

Pacing:

- Follows: one every 8-20 minutes, jittered, spread across the day. Never more than 10 follows in any
  single hour.
- Likes: one every 2-6 minutes, jittered, interleaved with follows. Never more than 25 likes in any
  single hour.
- Run only during plausible human hours for the account's timezone (roughly 7am to 11pm Mountain).
- Resolve usernames to user IDs in the free browser session. Never pay $0.01 for a lookup the browser
  can do free.

Red lines (never cross):

1. Never hit the 400/day follow cap or the 1,000/day like cap. Internal ceilings are 100 and 300.
2. Never burst more than 50 follows or 50 likes in any 15-minute window (the API hard limit), and in
   practice stay far below it.
3. Never follow then unfollow the same account to churn. No mass unfollows, ever, for any reason.
4. Never automate writes through the browser. API only, always.
5. On any 429, restriction notice, checkpoint, or "unusual activity" warning: halt all X activity
   immediately and tell Nolan. Do not retry through it.
6. Never exceed the daily budget Nolan sets. Default working budget: $3/day.
7. Keep the follow list curated. Remember the 5,000-following ratio gate: indiscriminate follows now
   mean a stalled account later.

## Sources

- Rate limits: https://github.com/dlangk/x-admin/blob/HEAD/CLAUDE.md and
  https://github.com/mcerqua/jam-skills/blob/HEAD/x-api/SKILL.md and
  https://github.com/iskandarsulaili/fireroute/blob/HEAD/doc/api-references/social/twitter.md
- Account limits (400/day follows, 5,000 ratio gate):
  https://www.gizbot.com/social-media/news/x-account-limits-explained-daily-caps-on-posts-messages-and-follows-014-125647.html
- Pricing (pay-per-use, $0.015 per follow/like):
  https://github.com/griffinwork40/x-api-cli/blob/HEAD/docs/00-auth-and-fundamentals.md and
  https://github.com/mcerqua/jam-skills/blob/HEAD/x-api/SKILL.md and
  https://github.com/0xnyk/xint/blob/HEAD/references/x-api.md
- Automation rules (aggressive following, churn):
  https://techcrunch.com/2019/01/31/dont-buy-twitter-followers/576 and
  https://who.unfollowed.me/blog/how-to-unfollow-inactive-twitter-accounts-safely/ and
  https://medium.com/@marcusreedo/how-to-auto-unfollow-inactive-twitter-accounts-without-triggering-a-flag-71f379789a00
- March 2026 inauthentic-behavior enforcement wave:
  https://factually.co/fact-checks/media/x-suspension-inauthentic-behaviour-5eb3fa
- @grok mention-reply behavior:
  https://techcrunch.com/2025/03/07/x-now-lets-you-query-grok-by-mentioning-it-in-replies/?__s=dbt04z7bdgzhedsex44z
