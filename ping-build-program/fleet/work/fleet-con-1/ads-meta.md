# Connector intel — Advertising domain (reference platform: Meta Marketing API)

Mapped from public docs; implementation stays data-driven. Provider: Meta.
Base: https://graph.facebook.com (versioned, v25.0/v26 in 2026). Ad accounts
addressed as act_<AD_ACCOUNT_ID>.

## OBJECTS
AdAccount (act_*), Campaign, AdSet, Ad, AdCreative (object_story_spec with
page_id + link_data/image_hash/CTA; or object_story_id "{PAGE_ID}_{POST_ID}"
for dark posts from existing page posts), CustomAudience / LookalikeAudience,
LeadGen forms + Leads, Insights (metrics: impressions, spend, clicks, actions;
breakdowns), Automated Rules, Pixels/datasets (Conversions API). Batch API:
up to 50 sub-requests per call (30 MB payload limit); dependent requests can
reference earlier results ({result=create-campaign:$.id}).
Sources: https://github.com/andredezzy/maccing/blob/HEAD/skills/growth/meta/meta-ads/references/api-and-campaigns.md ;
https://github.com/up2stay/meta-mcp (77-tool surface incl. catalogs, CAPI, rules)

## EVENTS
Two push surfaces: (1) Webhooks for lead ads: subscribe to the leadgen field;
new leads POSTed to your endpoint (retrieval also via bulk read). (2) Ads
endpoint notifications (v25.0 added 88 ads notifications — event-driven
alternative to polling delivery status; push consumes no rate-limit allowance).
Async Insights jobs report completion via polling the job status. Polling
fallback: /act_<id>/insights with date ranges; campaign/adset/ad edges for
status.
Sources: http://ppc.land/meta-drops-polling-for-webhooks-as-ads-endpoint-gains-88-notifications/ ;
https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving

## CAPABILITIES
Full CRUD on campaigns/ad sets/ads/creatives; copy with settings; budget
scheduling; automated rules (pause low performers, adjust budgets, notify);
audience creation (custom/lookalike/saved) + targeting validation + reach
estimation; Insights sync + async (large queries async-only; some breakdowns
restricted to async); ad preview generation; media upload (image_hash, video);
Conversions API server events; activity audit logs.
Sources: https://github.com/up2stay/meta-mcp ;
https://github.com/andredezzy/maccing/blob/HEAD/skills/growth/meta/meta-ads/references/api-and-campaigns.md

## AUTHORIZATION
Permissions: ads_read (insights, accounts, CAPI), ads_management (create/manage
campaigns/ad sets/ads/creatives/audiences/pixels), business_management,
pages_show_list/pages_read_engagement (page-backed creatives), leads_retrieval
(leads), catalog_management. Advanced/Full Marketing API access tier typically
requires App Review. System User tokens for server-side (non-expiring; vault).
Grant minimum needed; spend-bearing writes deserve their own token/scope
discipline.
Sources: https://github.com/kobaranteguh/adflow/blob/HEAD/docs/api/MARKETING.md
(verified against Meta App Review 2026-09-12) ;
https://github.com/beexly/autonomous-revenue-engine/blob/HEAD/ops/META_INTEGRATIONS.md

## WEBHOOKS
leadgen field webhooks for lead ads (needs pages_manage_metadata +
leads_retrieval; Page admin lead-access configuration via Leads Access Manager).
Ads endpoint notifications (v25.0) push delivery/config change events. Verify
deliveries with X-Hub-Signature-256; notifications are hints — re-query the
object. Lead retrieval rate limit: 200 x 24 x (leads created in past 90 days)
calls per 24h per Page.
Sources: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving ;
http://ppc.land/meta-drops-polling-for-webhooks-as-ads-endpoint-gains-88-notifications/

## POLLING
Insights polling with date ranges/breakdowns for dashboards; async job status
polling for large queries; campaign/adset/ad edge polling for effective_status.
Polling burns BUC points on every call regardless of whether anything changed —
webhooks-first for delivery status, polling for analytics. Batch up to 50
sub-requests to cut call count.
Sources: https://github.com/andredezzy/maccing/blob/HEAD/skills/growth/meta/meta-ads/references/api-and-campaigns.md ;
http://ppc.land/meta-drops-polling-for-webhooks-as-ads-endpoint-gains-88-notifications/

## RATE LIMITS
Business Use Case (BUC) system, per ad account per use case: Development tier
60 points max score, 300s decay, 300s block; Standard tier 9,000 points, 300s
decay, 60s block. Read call = 1 point, write call = 3 points, heavy Insights
queries more. Monitor X-Business-Use-Case-Usage and x-fb-ads-insights-throttle
headers. Errors: 613 rate limit exceeded, 80004 rate limit reached, 100/200
param/permission, 803 not found. Exponential backoff (1s/2s/4s/8s); distribute
calls evenly; batch; async for large Insights.
Source: https://github.com/andredezzy/maccing/blob/HEAD/skills/growth/meta/meta-ads/references/api-and-campaigns.md

## IDEMPOTENCY
No native idempotency-key on campaign/ad creation in retrieved docs. Retry-
safety is client-side: name-based pre-checks (list campaigns/adsets by name
before create), record returned ids, reconcile on timeout before re-POST.
Batch API executes sub-requests in order with per-op results — use dependent
references instead of separate calls to avoid partial creation. Followup:
verify current Meta idempotency guidance at build time.
Sources: https://github.com/andredezzy/maccing/blob/HEAD/skills/growth/meta/meta-ads/references/api-and-campaigns.md ;
flagged as verify-at-build.

## EFFECTS
Writes spend REAL MONEY: campaigns deliver and charge the ad account;
audiences target real people; automated rules pause/adjust budgets on their
own; lead forms collect PII. A misconfigured campaign can burn budget in
minutes. Reads (insights, delivery estimates) side-effect-free. Connector
contract: all spend-bearing writes behind explicit policy + human approval
(T lane), with budget caps enforced client-side.

## REVERSIBILITY
Campaigns/ad sets/ads can be paused or deleted — delivery stops, but SPEND IS
NOT RECOVERABLE. Deleted objects are generally not restorable (recreate from
recorded spec). Audience changes are reversible by editing targeting. Lead data
collected cannot be un-collected. Model: delivery is stoppable, money is sunk.
Followup: verify object-restore availability in current docs at build time.

## PROVENANCE
Global ids for account/campaign/adset/ad/creative; effective_status +
configured_status; Insights time series (spend, impressions, actions) as the
financial audit trail; activity audit logs (who changed what, when);
ad creative object_story linkage (dark posts accumulate engagement on one
post id); lead ids with form + campaign attribution. Strong money-movement
lineage.
Sources: https://github.com/up2stay/meta-mcp (audit logs, insights) ;
https://github.com/andredezzy/maccing/blob/HEAD/skills/growth/meta/meta-ads/references/api-and-campaigns.md
