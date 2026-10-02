# TenantOS Marketing Mission Control: Product Spec

Status: BANKED 2026-09-25. Spec only. No code, no lanes, no commits.
Build starts only on Nolan's explicit go after the 18:15 MDT checkpoint. The FYD product sprint is P0 until then.

## 1. The frame

TenantOS Mission Control sits one level above Metricool, Sprout Social, Hootsuite, Later, Brandwatch, HubSpot and the rest. It is not a marketing dashboard. It is an organic-growth operating system.

The recurring problem is fragmentation: each platform is strong at a slice of the loop, but the marketer still has to decide what to do, move data between systems, and manually connect activity to business outcomes. Mission Control absorbs the whole loop.

The moat is the closed loop:

- Metricool: Data → Dashboard → human figures out what to do.
- TenantOS: Evidence → Opportunity → Recommended mission → Authorization → Execution → Attribution → Learning → Next mission.

TenantOS can close the loop to booked revenue because it controls the operational side of the business too. No generic marketing platform can do that.

## 2. What we steal, and what we do not

We absorb product patterns, never proprietary implementations. Metricool gives us the baseline Mission Control UX pattern (calendar plus analytics plus inbox plus competitors plus reports). Later validates that influencer and organic belong at the center, not as an add-on. Aspire gives us the creator lifecycle pattern (inbound plus discovery plus listening plus relationship history). HubSpot gives us the social-to-CRM-to-revenue attribution pattern.

We do not clone any dashboard. We do not build 50 competitors' feature sets. A descriptive analytics screen that ends at "engagement down 14%" is a failure of this spec. Every surface must end at a recommended action, an authorization gate, or an attributed outcome.

## 3. The data model (exact)

The marketing subsystem revolves around twelve durable objects, in order:

Signal → Opportunity → Campaign → Mission → Asset → Publication → Conversation → Creator → Relationship → Conversion → Experiment → Learning.

| Object | What it is | Key fields |
|---|---|---|
| Signal | One typed market observation | signal_type, source, tenant, captured_at, payload, confidence, provenance |
| Opportunity | A ranked, evidence-backed chance to act | supporting_signals[], hypothesis, expected_value, evidence_score, status |
| Campaign | An owner-approved container of intent | objective, audience, budget_policy, window |
| Mission | The executable unit (a constitutional mission) | plan, authorization, intents[], execution_state |
| Asset | A content or creative artifact | kind, body/media, provenance, approvals |
| Publication | An asset placed on a channel | channel, scheduled_at, published_at, url, mission |
| Conversation | Inbound engagement around a publication | channel, participants, sentiment, needs_routing |
| Creator | An external person with an audience | handles, audience_profile, authenticity_signals |
| Relationship | The tenant's history with a creator | stage, terms, past_deliverables, performance |
| Conversion | A business outcome traceable to marketing | kind (call, estimate, job, review, referral), value, evidence |
| Experiment | A bounded test with a hypothesis | variants, success_metric, window, result |
| Learning | A durable conclusion fed back into the loop | claim, supporting_evidence, scope, expiry |

Every object carries TenantOS provenance and evidence. An object without provenance is not a Mission Control object; it is a draft.

## 4. Constitutional mapping (binding)

Marketing is another constitutional mission domain. It is not a separate SaaS bolted onto PING. The data model maps onto the existing chain:

OBSERVATION → CLAIM → CLASSIFICATION → RECOMMENDATION → MARKETING OPPORTUNITY → HUMAN/POLICY AUTHORIZATION → MISSION → EXECUTION → RESULT → EVIDENCE → REPLAY → LEARNING.

Mapping: Signal is an OBSERVATION. Opportunity is a CLAIM plus CLASSIFICATION plus RECOMMENDATION. Campaign plus Mission pass through HUMAN/POLICY AUTHORIZATION. Publication and Conversation are EXECUTION. Conversion and Experiment results are RESULT. Attribution records are EVIDENCE. The whole chain is REPLAY-able, and Learning feeds the next loop.

Nothing in Mission Control may bypass this chain. A mission that executes without authorization is a constitutional violation, not a feature gap.

## 5. Substrate binding (archaeology ground truth, 2026-09-25)

The builder uses the verified substrate. No new authority classes. No new event stores. No new projections without Nolan's explicit approval.

USE:
- Mission runtime plus EventToMissionBridge as the execution spine. The bridge is live ingress with explicit fail-closed tenant threading. Keep as is.
- ping_events via UER.emit() as the event spine. Live tenancy is the namespace convention tenant::<slug>.
- Qdrant retrieval only through retrieval_service with a required tenant, keyed on namespace (the real data key), never tenant_id.

FORBIDDEN:
- repository_events. It is legacy storage that should no longer serve reads (zero live writers, zero rows). Do not add tenant_id to it. Do not read it. Reads converge to the ping_events spine.
- New authority classes for marketing (no MarketingAuthority, no CreatorAuthority, no AttributionAuthority). Marketing is a mission domain, not an authority.
- canonical_events as a live path until it is deliberately revived (dormant, zero rows).

NAMED GAPS (smallest substrate patch each, none FYD-blocking):
- G1: Deploy Lane L (tenant_id on ping_events plus route gates, already in the working tree). Unblocks TenantOS certification.
- G2: Align the Qdrant filter key with the data key (namespace) and require tenant on the authority_search fallback path. Unblocks agent-runtime retrieval certification.
- G3: Thread tenant_id through the EventBridge canonical path only if the canonical_events path is revived. The bridge is currently idle; do not extend an idle bridge preemptively.

## 6. The vertical slice (build order)

Build one vertical slice, in this order. Each stage must close its own loop before the next starts.

Opportunity Radar → Campaign Mission → Content/Creator Workspace → Unified Calendar → Publish/Outreach → Engagement Inbox → Attribution → Learning.

Slice 1 (first build): Opportunity Radar producing one real Opportunity for a real tenant, with supporting Signals and an evidence score, surfaced on the Command Center, failing closed on thin evidence. No publishing in slice 1.

## 7. Five persistent surfaces

**Command Center.** An air-traffic-control board, not a dashboard. Six questions answered at a glance: what is happening, why it matters, what PING recommends, what awaits authorization, what is executing, what produced business. Acceptance: a tenant owner can see every open authorization and every executing mission with its live state in under ten seconds.

**Opportunities.** The ranked queue of evidence-backed chances to act. Each shows its supporting signals, hypothesis, expected value, and evidence score. Acceptance: an opportunity with no supporting observations cannot exist here; it fails closed at formation.

**Creators.** The creator command center (section 8). Acceptance: discovery is tenant-aware and ranks opportunity evidence, never follower count alone.

**Campaigns.** Owner-approved containers: objective, audience, budget policy, window, and the missions inside them. Acceptance: a campaign shows planned vs executed vs attributed, per mission.

**Intelligence.** Listening, competitor benchmarking, trend and AI-search visibility, and the learning ledger. Acceptance: every intelligence claim links to its source signals; every learning links to the experiment or conversions that produced it.

## 8. Creator and influencer command center (first-class subsystem)

The full lifecycle, in order:

Discover → Qualify → Relationship → Outreach → Negotiate → Brief → Approve → Publish → Amplify → Attribute → Pay → Retain → Re-engage.

Discovery is tenant-aware because PING knows the tenant. Example query the system must support: "Find 25 creators within 50 miles of this HVAC company whose audience overlaps homeowners aged 30 to 55, who discuss home improvement or DIY or local living, whose engagement appears authentic, and who have never promoted a competing HVAC company." Discovery consumes the tenant's location, vertical, audience profile, and competitive set as inputs, not as free text the operator retypes.

Ranking: rank opportunity evidence (audience overlap, authenticity signals, local relevance, category exclusivity, past performance), not follower count. A high-follower creator with no supporting evidence must not outrank a low-follower creator with strong evidence.

Stages carry the relationship: outreach is a mission requiring authorization; negotiation terms become part of the Relationship object; brief and publish require approval; pay records terms and fulfillment; retain and re-engage are driven by attributed performance, not recency.

## 9. Opportunity Radar

Fourteen signal types, each ingested as a typed Observation with provenance:

1. Social listening (brand, category, and intent mentions)
2. Competitor posts (frequency, format, engagement shifts)
3. Creator activity (relevant local and vertical creators)
4. Customer questions (from inbox, calls, reviews, Ask FYD)
5. Reviews (rating shifts, recurring themes)
6. Search demand (keyword and question volume)
7. SEO gaps (competitor ranks where the tenant does not)
8. Reddit and community discussion
9. YouTube and TikTok trends
10. Local events
11. Seasonal demand
12. Historical TenantOS performance (what worked for this tenant)
13. CRM and service demand (booking pace, job mix, capacity)
14. AI-search visibility (brand share of voice in AI answers)

Signal → Opportunity formation: an Opportunity forms only when supporting signals cross a defined evidence threshold for the opportunity type. Below threshold, the system records the signals and says nothing. An Opportunity must name its hypothesis, its recommended mission shape, and its evidence score. No evidence, no opportunity.

## 10. Acceptance scenarios

Both must demonstrate the full chain from signal to attributed revenue.

**Scenario A: Instagram Recovery mission.**
Signals: Reels reach down 18%, saves up 31%, competitor short-form posting frequency up 42%. The Radar forms an Opportunity: "educational short-form is outperforming promotional content," with the three signals cited and an evidence score. The recommended mission: create 4 clips from existing customer FAQ material, publish Tue/Thu/Sat/Sun, test two hooks, engage the first 30 minutes, evaluate after 7 days. Owner: Marketing Agent plus human approval. The mission executes only after authorization. Attribution joins the publications to profile visits, DMs, and booked jobs over the 7-day window. Learning records whether the hypothesis held.

**Scenario B: Storm Response mission.**
Signals: hail-related conversation up 340% locally, 47 existing customers inside affected ZIP codes, three local creators posted storm footage, competitors have not published inspection guidance. The Radar forms an Opportunity: "Storm Response organic campaign." The recommended mission: generate the brief, identify the three creators, repurpose existing FAQs into inspection guidance, schedule posts, prepare outreach. Owner authorizes. Execution runs through the mission spine. Attribution joins publications and creator content to inspection calls booked, estimates issued, and jobs won. Learning records the playbook for the next storm.

## 11. Revenue attribution

The requirement: a Reel's value is measured as calls, estimates, jobs, revenue, reviews, referrals, and creator relationships, because TenantOS controls the operational side too.

Attribution joins marketing objects to exactly these operational objects:

- Call (tracked number, DM thread, or link that resolves to a conversation)
- Estimate (issued to the caller, linked to the call)
- Job (won from the estimate, with revenue)
- Review (left after the job, linked to the customer)
- Referral (new customer naming the referrer, linked to the job)
- CreatorRelationship (performance recorded from the conversions above)

Join path: Publication or Conversation → Call → Estimate → Job → revenue, with Review and Referral attached to the Job/Customer, and CreatorRelationship updated from the Conversion records. When any link in the join is missing, attribution says unknown for that step. It never invents a link. "This Reel generated six HVAC calls, four estimates, two jobs, $14,600 revenue, one review, three referral opportunities, and one new creator relationship" is the target sentence, and every number in it must trace to a stored object.

## 12. v0 graduation (PING Social's running engine)

PING Social's own outreach and engagement engine (FB/IG/Threads passes, the intent ledger, the engagement guard, 60 to 120 second pacing) is the manual v0 prototype of Mission Control's execution layer. The spec names what graduates and what stays manual.

GRADUATES into the system:
- The intent ledger becomes mission intents (INTENT recorded before any external action, outcomes close the intent, UNKNOWN_EXECUTION blocks retry until reconciled).
- The engagement guard becomes policy authorization (eligibility rules, caps, pacing, never-re-engage).
- Passes become missions (a pass is a mission with a closed action set).
- Pacing and volume rules become execution policy.

STAYS MANUAL (human judgment, not automated):
- Nolan's approval on new strategies and new target classes.
- Comment voice and copy judgment.
- Escalation decisions (blocks, checkpoints, warnings).
- Account-safety calls. A detected restriction becomes BLOCKED, never an optimization problem.

## 13. Non-goals

- Do not clone Metricool's dashboard or any competitor's UI.
- Do not build 50 competitors' feature sets. One vertical slice, then expand by evidence.
- Do not reimplement proprietary features (SmartLinks, DM automation flows, affiliate payout rails) from scratch. Absorb the pattern; integrate or defer the mechanism.
- Do not create a marketing database separate from the constitutional substrate. Marketing objects live on the same event spine, mission spine, and retrieval path as everything else.
- Do not let the Command Center become a report. If a surface does not produce a recommendation, an authorization, or an attribution, it does not ship.

## 14. Sequencing

FYD product sprint is P0 through the 18:15 MDT checkpoint on 2026-09-25. This spec is banked. Mission Control build starts only on Nolan's explicit go after the checkpoint. No builder work, no spikes, no "quick prototypes" before then.
