# Influencer-Platform Intelligence Harvest: REPORT

Date: 2026-09-30. Method: public web search plus page fetches of vendor docs and help centers. No signups, no credentials, no vendor contact, no API calls. Every factual claim below carries an evidence grade: CONFIRMED (primary source), STRONG INDICATION (multiple corroborating sources, one primary), WEAK INDICATION (single or third-party source), UNKNOWN (not found or not public).

Scope: ten platforms as candidates for PING INTELLIGENCE layer (layer 3 of the six-layer architecture), strictly as replaceable adapters. PING never treats a vendor as truth.

## 1. Modash

Headless operability: REST API with public documentation and public pricing. Two products: Discovery API (search across claimed 380M+ creator profiles on Instagram, TikTok, YouTube; includes AI Search, Collaborations, Lookalikes) and Raw API (live profile data, campaign post tracking, mention monitoring). Auth is Bearer token issued from marketer.modash.io/developer. CONFIRMED via vendor API pages and FAQ. Interactive docs allow endpoint testing. No vendor MCP server found. No CLI or SDK found; plain REST means curl, Python, or a thin wrapper all work headlessly. Docs grade: excellent for a sales-gated product.

Notable claims verified: 380M+ profiles across IG/TikTok/YouTube (vendor-published; one third-party page says 350M+, minor discrepancy noted, WEAK INDICATION on the exact number). September 2026 API additions: follower-growth filters, API-managed creator lists, full-text bio/caption filters, multi-creator lookalikes, brand-collaboration detection, paid/gifted/ambassador/affiliate classifications, sponsorship-disclosure classifications including likely hidden sponsorships. STRONG INDICATION (vendor API pages). Explicit "AI applications and agents" positioning on the API page. CONFIRMED.

Pricing: Discovery API from $16,200/year, Raw API from $10,000/year, separate from platform plans. STRONG INDICATION (vendor FAQ). Self-serve status: docs and pricing are public, but provisioning a working key routes through a sales call, not instant signup. STRONG INDICATION (storika.ai technical diligence guide, Sept 2026).

Replaceability: semantic role is raw creator intelligence (discovery, audience demographics, collaboration history). PING interface: an observation producer feeding the INTELLIGENCE layer; vendor records become PING EVIDENCE/EVENT, never canonical objects. What survives removal: every derived claim, object, relationship, and outcome PING recorded. Only the sensor is swapped.

## 2. Upfluence

Headless operability: token-based Developer API plus a native MCP server, the strongest agent-native surface found in this survey. API covers seven data types: Search, Profile, Audience, Post, Stream, Stream Analytics, Workflow Data, across Instagram, TikTok, YouTube. MCP server at https://mcp.upfluence.co/mcp over Streamable HTTP with OAuth (dynamic client registration); works with Claude, ChatGPT, Cursor. CONFIRMED via upfluence.com API page and help.upfluence.co MCP guide.

MCP tools: 9 read-only (search, fetch_influencer_from_id, fetch_audience_features, fetch_brand_mentions, handle/URL resolution, list_campaigns, list_contributions, list_threads) and 6 write tools (shortlist_creator, approve_creator, reject_creator, send_initial_email, send_contribution_email, reply_thread). CONFIRMED via the vendor help center. The MCP server is in beta and access is granted on request through support. CONFIRMED. Vendor frames REST as permanent automation infrastructure and MCP as the ad-hoc agent path. CONFIRMED.

Data claims: 14M+ vetted creator profiles (vendor-published, CONFIRMED as a published claim). Estimated sponsorship costs and brand partnership history exposed via the API/MCP. STRONG INDICATION.

Pricing: token-based (500 search results = 1 token, 5 full profiles = 1 token, workflow data free, as of August 2026). CONFIRMED. Dollar cost per token: UNKNOWN, no public price. API access requires a sales conversation; no public self-serve. STRONG INDICATION.

Replaceability: semantic role is agent-native creator intelligence plus campaign workflow execution. PING interface: INTELLIGENCE sensor for discovery/vetting; EXECUTION adapter for outreach writes, which must pass through PING authorization (proposal/approval) before any write tool fires. What survives removal: PING missions, approvals, evidence, and outcome records. The write tools are the risk surface: they make Upfluence an executor, which is acceptable only behind PING authority.

## 3. HypeAuditor

Headless operability: two surfaces. Classic REST API (API key; usage-based credits shared with the platform). STRONG INDICATION. HypeAgent MCP: single hosted endpoint with OAuth sign-in, 6 data tools (search-influencers, analyze-accounts, get-account-insights, compare-accounts, content-search, get-account-social-ids), plus a Claude Cowork marketing plugin adding 12 slash-command workflows (fraud checks, creator comparison, pricing estimates, brand mentions, competitor spying). CONFIRMED via github.com/hypeauditor/hypeagent-plugin and the influencers.club 2026 MCP comparison. Beta: free credits during beta; post-beta pricing not published. STRONG INDICATION.

Data claims: 220M+ profiles across Instagram, YouTube, TikTok; 35+ vetting metrics; category-benchmark fraud detection. STRONG INDICATION (vendor claims via primary plugin docs and third-party comparison).

Pricing: API access reported from $208/month on the Pro plan (influencers.club, third party); user reviews cite ~$299/month starting and $2,999/year listings. Exact vendor-confirmed price: UNKNOWN. Treat as roughly $200-300/month band. WEAK INDICATION on the exact figure.

Replaceability: semantic role is independent fraud and audience-quality verification, the quality gate before spend. PING interface: a vetting/verification worker inside INTELLIGENCE; its verdicts become PING evidence. What survives removal: recorded verdicts and the evidence behind them.

## 4. CreatorIQ

Headless operability: ExchangeIQ (Premium API). Auth via x-api-key header. Bi-directional JSON API over TLS: read CreatorIQ data and post external data (attribution, sales, commission, paid media) back against creators, posts, campaigns. CRM Publishers API (create/read/update/delete creator records, sync with Salesforce/HubSpot), CRM Lists API, campaign data endpoints, reporting endpoints, webhooks with signing managed via a Webhooks management API, plus a separate Link-Tracking API. STRONG INDICATION (detailed third-party skill documentation; vendor site confirms bi-directional API). Full endpoint reference at apidocs.creatoriq.com requires authentication. Docs grade: good but gated.

Pricing: enterprise, custom quote. UNKNOWN. Access requires a sales conversation. STRONG INDICATION.

Replaceability: semantic role would be enterprise campaign system of record. That is exactly the role PING must never outsource: PING is the system of record. As an adapter it could only serve as a projection/observation surface, never as truth. What survives removal: everything, because PING would never let canonical state live there. The bi-directional API and webhook patterns are worth harvesting for PING's own campaign ops design.

## 5. impact.com

Headless operability: public Partner API Reference v16 at integrations.impact.com (REST, resource-oriented URLs, JSON or XML responses, standard HTTP auth and verbs; docs offer .md mirrors). CONFIRMED via the live docs. Publisher REST APIs (Actions, ActionUpdates, Items) plus postbacks for conversion lifecycle tracking. STRONG INDICATION.

Role: partnership/affiliate management, attribution, and payouts in 70+ currencies. Not a creator discovery platform. CONFIRMED.

Pricing: enterprise, custom. UNKNOWN (one aggregator shows a $1/month placeholder, which is junk data, disregarded).

Replaceability: semantic role is performance/attribution/payment rail in EXECUTION/INTEROPERABILITY. PING interface: outcome and payout observation adapter; conversion events become PING outcome evidence. What survives removal: all PING outcome records. No near-term need: PING runs no affiliate program today.

## 6. Traackr

Headless operability: an API for custom integrations is confirmed to exist (Cuspera: "you can access Traackr's API for custom integrations"). No public developer documentation URL found; docs appear gated behind the sales relationship. Docs grade: UNKNOWN, effectively poor from the outside.

Abigail: launched September 23, 2026, per the company press release and NetInfluencer coverage. Positioned as an AI-native creator marketing strategist for enterprise, trained on more than a decade of Traackr's strategic decisions rather than performance data alone. The launch includes discovery and content analysis features plus an AI-ready API for enterprise-level integration. CONFIRMED as a launch fact. Early beta claims (90% creator approval vs 60% baseline, 75% time saved) are vendor-reported, unreplicated. WEAK INDICATION.

Pricing: UNKNOWN. Access requires a sales conversation. STRONG INDICATION.

Replaceability: semantic role is enterprise intelligence and orchestration. The harvestable pattern is Abigail's core idea: decision history as a training signal (strategic decisions, not just performance data) feeding a learning loop. That maps directly onto PING's outcome-to-learning path. What survives removal: PING's own accumulated decision/outcome history.

## 7. Influencity

Headless operability: comparisons list API availability as supported, but no public developer documentation was found. Docs grade: poor. MCP: no evidence of a native MCP server or MCP plans found; the "MCP coming" suggestion is UNVERIFIED. Platform pricing from $98/month with customizable plans (Sourceforge comparisons). Data claim of 130M+ influencers (Sourceforge, WEAK INDICATION).

Classification driver: weaker data claims than Modash, no public docs, no MCP evidence, nothing it offers that the stronger candidates do not cover better.

## 8. Captiv8

Headless operability: a press release for its affiliate launch mentions "open APIs" for integrating with traditional affiliate publisher networks. No public developer documentation found. Its API partnerships (TikTok Creator Marketplace alpha partner, Snapchat Creator Discovery API, Facebook, Twitter, YouTube) are inbound integrations Captiv8 consumes, not a public developer surface PING could drive. Headless operability: WEAK INDICATION at best.

Pricing: enterprise, UNKNOWN.

Classification driver: no public headless surface to evaluate or drive; enterprise platform sale, not an intelligence layer.

## 9. Sprout Social Influencer Marketing

Headless operability: the core Sprout Social API (api.sproutsocial.com/docs) is public and covers owned social profiles: posts, scheduling, profile and post analytics, token auth. A community-built MCP server (kodowjam/sprout-social-mcp-server, third party, not vendor) wraps it. The Tagger-acquired influencer marketing product has product terms and a support site but no public API found; its discovery, safety screening, and campaign workflow are UI-led. Payments run via Lumanu.

Classification driver: strong owned-account analytics API, but the influencer discovery and campaign surfaces PING would need are not headlessly operable. Its multimodal brand-safety screening is a product pattern worth noting, not an adapter.

## 10. Aspire

Headless operability: contradictory signals. One aggregator says no API access; a comparison page says API exists; an API directory lists it with blank fields. No public developer documentation found. Effectively not headlessly operable from public evidence. UNKNOWN.

Pricing: quotation-based, UNKNOWN.

Classification driver: nothing verifiable to drive; no docs, no MCP, no public surface.

## Out-of-scope but noted

Two non-survey platforms surfaced repeatedly and deserve a future look: influencers.club (public docs, single API key, published pricing from $249/month, 340M+ claimed profiles, hosted MCP at mcp-dashboard.influencers.club; called the most self-serve of the group by storika.ai, Sept 2026) and SocialCrawl (api-evangelist profile: 50 platforms, ~400 endpoints, public OpenAPI 3.1, llms.txt, local MCP). Neither was in the assigned ten; both clear the self-serve bar the ten mostly fail.

## Reproducibility log

Access date for all searches: 2026-09-30. Method: browser.search text queries, then reading returned snippets; no page fetches beyond search results, no API calls, no accounts.

Queries run (in order):
1. "Modash API documentation REST Discovery API RAW API creator intelligence"
2. "Upfluence native MCP server API documentation influencer marketing"
3. "Traackr Abigail AI-native API influencer intelligence"
4. "HypeAuditor API documentation MCP HypeAgent audience verification"
5. "CreatorIQ API documentation bi-directional enterprise creator platform"
6. "Influencity API documentation MCP coming influencer marketing platform"
7. "impact.com API documentation developer affiliate partnership cloud"
8. "Captiv8 open API documentation influencer marketing developer"
9. "Aspire influencer marketing API developer documentation"
10. "Sprout Social influencer marketing Tagger API developer documentation"
11. "Traackr API developer documentation REST influencer data"
12. "Influencity developer API documentation REST endpoints"

Key primary sources consulted (verbatim URLs from search results):
- https://www.upfluence.com/influencer-marketing-api/
- https://help.upfluence.co/en/articles/15518509-using-the-upfluence-mcp-server
- https://www.upfluence.com/platform/upfluence-mcp/
- https://github.com/hypeauditor/hypeagent-plugin
- https://github.com/hypeauditor/hypeagent-plugin/blob/HEAD/claude/skills/influencer-marketing/SKILL.md
- https://influencers.club/blog/the-best-influencer-marketing-mcps-in-2026/
- https://integrations.impact.com/partner-api-reference
- https://www.creatoriq.com/influencer-marketing-solution
- https://github.com/elisalynnclark81-tech/sales/blob/HEAD/skills/sales-creatoriq/SKILL.md
- https://www.storika.ai/guides/creator-marketing-software-technical-diligence-2026
- https://www.netinfluencer.com/traackr-launches-abigail-an-ai-strategist-for-enterprise-creator-marketing/
- https://www.modash.io/influencer-marketing-api (via arietiform mirror in results)
- https://github.com/influencers-club/influencers-club-mcp/blob/HEAD/README.md
- https://github.com/kodowjam/sprout-social-mcp-server/blob/HEAD/README.md
- https://github.com/amal-david/docingest/blob/HEAD/server/storage/docs/api.sproutsocial.com/documentation_2025-02-21T15:23:17.164Z.md

To reproduce: re-run the twelve queries above, open the same primary URLs, and check for (a) a public docs page, (b) stated auth method, (c) any MCP server URL, (d) a public pricing page. Classify per the rubric in HARVEST-CLASSIFICATION.md.
