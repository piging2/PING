# X (Twitter) API and Automation Rules Brief
Researched 2026-09-13 for Nolan's PING Social outreach. All figures below are from live web sources read today; where sources conflict or data is missing, that is marked.

## 1. Current API access tiers and pricing (2026)

As of 2026, X defaults NEW developers to pay-per-use. There is no free tier for new signups.

Sources: https://github.com/mcerqua/jam-skills/blob/HEAD/x-api/SKILL.md (updated 2026-07-13); https://github.com/daizedong/market-intel/blob/HEAD/skills/market-intel/reference/tools/x-official-api.md (2026-02)

### Pay-per-use (current, new developers)
Sign up and buy prepaid credits at https://console.x.com, then create an app. No subscriptions, no monthly tiers, no minimum spend. Credits are deducted per request; usage is monitored in the Developer Console. The same resource re-requested within 24h is charged once, so caching saves real money. Rates change often; verify in the console.

| Operation | Cost |
|---|---|
| Read: post | $0.005 per resource returned |
| Read: user/profile | $0.010 per resource |
| Read: like | $0.001 per resource |
| Read: own account data (owned reads) | $0.001 per resource |
| Write: standard post | $0.015 per request |
| Write: post containing a URL | $0.200 per request |
| Webhook event (post.create) | $0.005 per event |

Bonus: X gives xAI API credits worth up to 20% of cumulative X API spend per billing cycle. (https://Www.socialmediatoday.com/news/x-formerly-twitter-announces-new-api-pricing-structure-xai/811667/)

### Legacy subscription tiers (existing subscribers only, NOT offered to new signups)
- Free (legacy): posting only, 1,500 posts/mo originally, later cut to 500/mo. Read API capped at 100 requests.
- Basic: $100/mo originally, raised to $200/mo. ~3,000 posts/mo at user level, 10k reads/mo (later 15,000 posts).
- Pro: $5,000/mo. ~1M reads/mo, 300K posts/mo.
- Enterprise: ~$42,000/mo.
- Annual plans were offered for Basic ($2,100/yr) and Pro ($54,000/yr).
Sources: https://www.techradar.com/pro/x-is-ramping-up-the-cost-of-its-basic-api-tier; https://Www.socialmediatoday.com/news/x-formerly-twitter-adds-off-api-access-expansion/710935/

### Which tier permits automated posting, replies, likes, follows, DMs
Under pay-per-use, all write endpoints are available (posts, replies, likes, follows, DMs are costed per function). BUT see section 2: since Feb 23, 2026, programmatic replies via POST /2/tweets are API-blocked except when the original author mentions or quotes your account. This restriction applies to Free, Basic, Pro, and Pay-Per-Use alike. Enterprise customers and Public Utility apps are exempt. Automated main posts are still allowed.
Source: https://piunikaweb.com/2026/02/24/x-api-blocks-automated-spam-replies/

## 2. X's Automation Rules: allowed vs prohibited

Official rules live in three places: the X Developer Policy, the Automation Rules, and the Restricted Use Cases.

- https://github.com/xdevplatform/docs/blob/HEAD/developer-guidelines.mdx (official docs repo mirror, updated 10 days ago)
- https://github.com/xdevplatform/docs/blob/HEAD/developer-terms/policy.mdx
- https://github.com/xdevplatform/docs/blob/HEAD/developer-terms/restricted-use-cases.mdx
- Automation Rules: https://help.x.com/en/rules-and-policies/x-automation

Allowed:
- Automated main posts (not replies), within rate limits.
- Scheduling tools where a human decided the content and timing.
- Labeled, non-deceptive bots (weather updates, stock prices, informational bots) that do not pretend to be human.

Prohibited or restricted:
- Spam or platform manipulation of any kind via the API.
- Automated replies or DMs without the recipient's explicit consent; must immediately honor opt-outs.
- Bulk, aggressive, or spammy actions, including bulk following and inorganic follow behavior.
- Posting identical or substantially similar content across multiple accounts.
- AI conversational engagement without a human in the loop (replying to strangers at scale as if a person is at the keyboard). X's head of product: "using AI to programmatically engage with users without a human in the loop runs counter to our mission."
- Apps that distribute tokens, points, or cash in exchange for engagement (InfoFi ban, Jan 2026).
- Bot accounts must clearly label themselves as bots (e.g., in the bio) and never mislead about whether the account is a bot.
- Only the official API may be used; scraping or browser automation is a policy violation (see section 3).
- Max 3 applications for dev/staging/prod instances of one service; no white-label duplicates without separate approval.

## 3. Is browser-based automation (non-API) against X's Terms of Service?

Yes. The X Terms of Service (2026-04-10 version) prohibit accessing or searching the services "by any means (automated or otherwise), except through our currently available published interfaces," and state that "browsing or automatic scanning of content in any form, for any purpose without our prior written consent is expressly prohibited."
Source (ToS text): https://g.sbsb.nyc.mn:443/https/legal.x.com/content/dam/legal-twitter/site-assets/x-terms-of-service-2026-04-10/cs/x-terms-of-service-2026-04-10.pdf

The official developer guidelines ask: "Are you only using the official API (not scraping/browser automation)?" A "no" means the app likely violates policy.
Source: https://github.com/xdevplatform/docs/blob/HEAD/developer-guidelines.mdx

## 4. Concrete signup path

1. Go to https://console.x.com and apply for a developer account (also referenced as https://developer.x.com/en/apply-for-access).
2. Create a project and an app in the Developer Console (name, use case, description).
3. Under Keys and Tokens, generate the API Key and Secret, Bearer Token, and Access Token and Secret. These display ONCE; store them in a password manager or environment variables immediately. Regenerating invalidates the old ones.
4. Buy prepaid API credits in the console before making paid calls.
5. For user-context writes (posting, liking, DMs as your account), use OAuth 1.0a user tokens or OAuth 2.0 with the right scopes; set the app's permissions to Read and Write.

Approval wait times: NOT VERIFIED from current sources. No reliable 2026 data found on how long developer-account approval takes. Treat as unknown; the self-serve pay-per-use flow appears designed to be instant once payment is attached, but do not assume.

Sources: https://communalytic.org/docs/obtaining-x-api-key/; https://github.com/xdevplatform/samples

## 5. Gotchas

- Enforcement is at historic highs. In 2026 X removed ~42,000 AI reply-bot accounts in one action and has purged over 1.7 million bots since early 2026, suspending up to 208 accounts per minute at peak in April 2026. No warnings, no grace period. Source: https://startupfortune.com/x-removes-42000-ai-reply-bot-accounts-and-the-warning-to-growth-marketers-is-impossible-to-ignore/
- "Human-only interaction" detection: X runs behavioral analysis checking for genuine human screen interaction. Accounts automating replies, likes, or follows without human input risk suspension, including all associated accounts. Source: https://almcorp.com/blog/x-ai-bot-crackdown-grok-human-only-rules/
- Programmatic replies are API-blocked unless invited (mention or quote), Feb 2026. Source: https://piunikaweb.com/2026/02/24/x-api-blocks-automated-spam-replies/
- New/unverified accounts face in-app limits: 50 original posts and 200 replies per day (down from 2,400), DMs 500/day, follows 400/day. Phone verification is commonly required on new accounts. Source: https://Www.Socialmediatoday.com/news/x-implements-new-posting-restrictions-on-nonpaying-users/820671/
- Further DM-spam enforcement was announced as planned. Source: https://almcorp.com/blog/x-ai-bot-crackdown-grok-human-only-rules/
- X changes API rates and rules often. Verify pricing in the Developer Console before committing spend.

## Bottom line for PING Social

X is the most automation-hostile platform of the three in play (Facebook, Instagram, LinkedIn, X). The compliant path is the paid API with prepaid credits, but the engagement automation that works elsewhere (auto-replies, auto-likes, auto-follows) is exactly what X is banning and suspending accounts for in 2026. What remains compliant on X: scheduled human-written posts (cheap: $0.015 each, though $0.20 with a URL), read-only research and listening, and clearly labeled informational bots. Browser-based X automation violates the ToS and now carries real suspension risk given the 2026 enforcement waves.
