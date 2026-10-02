# PING X — INITIAL RELATIONSHIP INTELLIGENCE SWEEP

Spec received from Nolan Geske, 2026-09-13. This is the operating plan for PING's X relationship-intelligence capability.

## OBJECTIVE

Initialize PING's X relationship-intelligence capability for Nolan.

The immediate goal is NOT to mass-follow, mass-like, reply, repost, or otherwise manipulate engagement.

The goal is to intelligently understand Nolan's existing X network and then discover the highest-value adjacent public figures, organizations, creators, researchers, founders, engineers, and communities that Nolan should know about.

Think like:

**PING + Nolan deciding where attention is most valuable.**

Do not repeatedly revisit the same people.

Do not waste API calls or browser actions.

Do not manufacture engagement.

---

## STEP 0 — AUTHENTICATION / CONFIGURATION

First inspect the existing PING X configuration and authentication implementation.

Determine:

* whether X API credentials/configuration already exist
* OAuth version and authorization flow
* authenticated X user
* available scopes
* available read endpoints
* available write endpoints
* current API client/provider implementation
* existing rate-limit handling
* existing caching
* existing X-related capabilities
* existing browser/X integration, if any

Use the existing PING authority and configuration.

DO NOT create a new authentication architecture if one already exists.

DO NOT create duplicate X clients.

DO NOT create duplicate credential storage.

DO NOT expose or print secrets.

If login/authorization is required, initiate the existing supported OAuth flow and stop for Nolan's explicit authorization when required.

Never ask Nolan for an API secret, password, session cookie, or private credential in chat.

Step 0 finding (2026-09-13): no existing X configuration exists anywhere in the PING workspace. No X skill, no X client, no stored X credential. The Secure Vault OAuth 2.0 authorization-code flow established 2026-09-13 is the first and only X authentication architecture. Do not create a second one.

---

## STEP 1 — ESTABLISH THE CURRENT NETWORK

Once authenticated, retrieve the minimum data necessary to establish Nolan's current X relationship graph.

Prioritize:

1. Nolan's authenticated identity
2. accounts Nolan follows
3. accounts Nolan has interacted with recently, where permitted
4. posts Nolan has liked, where permitted
5. existing lists, where permitted
6. relevant account/profile metadata
7. recent posts from already-known high-value accounts

Do NOT repeatedly crawl the same account.

Build a persistent internal record of:

* X user ID
* handle
* display name
* account URL
* category
* relevance
* relationship state
* last inspected timestamp
* source of discovery
* last meaningful observation
* whether already known
* whether already followed
* whether already liked/interacted with
* opportunity score

The existing network is the seed graph.

---

## STEP 2 — NEVER REVISIT UNNECESSARILY

This is critical.

Before inspecting any account, check whether PING already has sufficiently fresh evidence.

Use:

**known identity → last observation → freshness policy → decide whether another request is justified**

Do not repeatedly open:

* the same profile
* the same post
* the same follower list
* the same following list
* the same search result
* the same recommendation

unless there is a concrete reason.

Maintain a crawl frontier.

Prefer NEW information over refreshing OLD information.

---

## STEP 3 — EXPAND OUTWARD INTELLIGENTLY

Starting from Nolan's existing high-value accounts, discover adjacent nodes.

Expansion order:

### Tier A — Direct network

People Nolan already follows or consistently interacts with.

### Tier B — Second-degree network

People repeatedly appearing around those accounts.

Examples:

* people they follow
* people they frequently discuss
* researchers they cite
* founders they interact with
* engineers contributing to the same projects
* podcast guests
* collaborators
* companies
* open-source maintainers

### Tier C — Topic network

Discover people strongly associated with Nolan's actual interests:

* AI
* AI infrastructure
* agents
* context engineering
* RAG
* model routing
* inference
* open-source AI
* developer infrastructure
* software architecture
* robotics
* energy
* startups
* local-business technology
* AI search / GEO
* creator technology
* automation
* organizational intelligence

### Tier D — Opportunity network

Find people who could become:

* valuable technical connections
* collaborators
* customers
* distribution partners
* creators
* podcast guests
* podcast hosts
* open-source partners
* local-business ecosystem connectors
* trade/business organizations
* investors
* strategic relationships

---

## STEP 4 — BUILD THE PING INFLUENCE GRAPH

Do not make a flat list of "influencers."

Construct relationships.

Represent:

**Person → Topic → Expertise → Organization → Community → Relationship → Opportunity**

Examples:

* researcher → AI safety → researcher
* founder → AI infrastructure → startup
* engineer → inference → open source
* creator → developer education → YouTube
* chamber → local businesses → Western Colorado
* trade association → HVAC/plumbing → local contractors

The purpose is to discover the structure around Nolan's existing network.

---

## STEP 5 — SCORE OPPORTUNITIES

Rank discovered people/accounts using:

* relevance to PING
* relevance to Nolan
* technical authority
* audience quality
* audience overlap
* topical overlap
* activity
* originality
* credibility
* relationship proximity
* collaboration potential
* distribution potential
* local-business relevance
* likelihood of meaningful conversation

Do NOT optimize for follower count alone.

A highly relevant 8,000-follower engineer can outrank an irrelevant 800,000-follower celebrity.

---

## STEP 6 — ENGAGEMENT SAFETY

PING MUST NOT automatically:

* like posts
* follow accounts
* unfollow accounts
* send unsolicited DMs
* mass reply
* mass mention
* mass repost
* manipulate engagement
* perform follow/unfollow churn
* coordinate artificial engagement

X explicitly prohibits automated likes and aggressive/indiscriminate automated following/unfollowing. X also warns against non-API website scripting for automation.

Therefore:

**PING recommends. Nolan acts.**

If a person is worth following:

> RECOMMEND FOLLOW

If a post is worth liking:

> RECOMMEND LIKE

If a conversation is worth joining:

> RECOMMEND REPLY

The final action remains Nolan's.

---

## STEP 7 — MINIMIZE COST

Optimize every sweep for:

**maximum new intelligence / minimum API requests**

Rules:

1. Batch requests whenever supported.
2. Cache identities.
3. Cache observations.
4. Deduplicate IDs before requesting.
5. Never request data already available locally.
6. Prefer incremental updates.
7. Prefer high-value accounts over broad crawling.
8. Stop expanding a branch when marginal information value becomes low.
9. Never crawl the entire X graph.
10. Do not repeatedly refresh unchanged profiles.
11. Persist discovery provenance.
12. Respect API rate limits rather than approaching them aggressively.

The technical follow limit is much higher than what PING should ever target; X currently lists 400 follows/day as a technical limit but separately prohibits aggressive following behavior. Treat technical limits as ceilings, NOT operating targets.

---

## STEP 8 — FIRST SWEEP

For the first run:

### A. Authenticate

Verify Nolan's X identity.

### B. Inventory

Establish the existing network.

### C. Deduplicate

Identify people already known.

### D. Classify

Assign topics, expertise, organizations, communities, and opportunity types.

### E. Expand

Perform a limited second-degree discovery sweep.

### F. Rank

Produce the highest-value new discoveries.

### G. Stop

Do not continue crawling merely because more accounts are available.

The objective is not maximum accounts.

The objective is maximum strategic information.

---

## OUTPUT

Return:

### X NETWORK INITIALIZATION

#### Authentication

* authenticated account
* auth method
* available permissions
* API/client configuration found
* anything requiring Nolan's authorization

#### Existing Network

* number of unique accounts discovered
* major topic clusters
* major organizations
* major creator/technical clusters

#### New High-Value Discoveries

For each:

1. Name
2. Handle
3. Category
4. Why relevant
5. Relationship path from Nolan's existing network
6. Topic(s)
7. Opportunity type
8. Confidence
9. Last observed
10. Recommended next action

Possible recommended actions:

* FOLLOW MANUALLY
* LIKE MANUALLY
* REPLY MANUALLY
* MONITOR
* RESEARCH
* COLLABORATION CANDIDATE
* CUSTOMER CANDIDATE
* IGNORE

#### Cost / Efficiency Report

Report:

* API requests made
* cached requests avoided
* duplicate accounts eliminated
* accounts inspected
* new accounts discovered
* branches stopped
* remaining useful frontier

---

## MOST IMPORTANT PRINCIPLE

Do not behave like an X growth bot.

Behave like an extremely intelligent chief-of-staff who understands Nolan's network.

The system should continuously answer:

> **"Given everyone Nolan already knows and cares about, where is the single highest-value place to look next?"**

Then look there once.

Record what was learned.

Move outward.

Do not circle back unless new evidence justifies it.

**PING discovers. Nolan decides.**
