# Connector intel — Analytics domain (reference platform: Google Analytics 4)

Mapped from public docs; implementation stays data-driven. Provider: Google.
Two APIs: Data API (analyticsdata.googleapis.com/v1beta, read-only reporting)
and Admin API (account/property management, some writes).

## OBJECTS
Data API: Report rows keyed by dimensions (date, country, deviceCategory,
pagePath, userAgeBracket...) x metrics (activeUsers, sessions, screenPageViews...);
metadata via getMetadata (dimension/metric catalog); compatibility checks;
audience exports. Per-request caps: max 9 dimensions, 10 metrics, 4 date ranges.
Admin API: Accounts, Properties (properties/{id}), DataStreams, CustomDimensions/
Metrics, Audiences, Conversion events. Report identity: property id + query
spec + date range (no stable row ids — reports are computed).
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas ;
https://github.com/databrickslabs/lakeflow-community-connectors/blob/HEAD/src/databricks/labs/community_connector/sources/google_analytics_aggregated/README.md ;
https://github.com/api-evangelist/google-analytics-4/blob/HEAD/skills/google-analytics-4-run-a-report.md

## EVENTS
NO native webhooks or push for GA4 Data API. Change detection is poll-only:
scheduled runReport/batchRunReports with date-range windows; runRealtimeReport
for the last 30 minutes of activity (subset of processed data). Data latency:
most data processed within 24h; full processing (attribution, session stitching,
conversions) up to 48h — query dates at least 48h in the past for stable numbers.
Sources: https://github.com/relevanceai/relevance-docs/blob/HEAD/integrations/popular-integrations/google-analytics.mdx ;
https://github.com/api-evangelist/google-analytics-4/blob/HEAD/skills/google-analytics-4-run-a-report.md

## CAPABILITIES
runReport, runPivotReport, batchRunReports/batchRunPivotReports, runRealtimeReport,
runFunnelReport (v1alpha), getMetadata, checkCompatibility, createAudienceExports,
runAccessReport. Admin API: property/account/data-stream/audience/conversion
management. NO write path for analytics data itself: Data API is read-only.
Sampling, privacy thresholding, and high-cardinality "(other)" aggregation apply
to large queries.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas ;
https://github.com/databrickslabs/lakeflow-community-connectors/blob/HEAD/src/databricks/labs/community_connector/sources/google_analytics_aggregated/README.md

## AUTHORIZATION
OAuth 2.0 with analytics.readonly (sensitive scope) for reporting; Admin API
needs broader scopes. Service accounts supported directly: add the service-
account email as a property viewer — preferred over token vault for
reporting-only workloads. Property creation requires Administrator on the GA
account. Request smallest scope (standing rule 1).
Source: https://github.com/organized-ai/plugin-marketplace/blob/HEAD/organized-google-wiring/references/API-CATALOGUE.md

## WEBHOOKS
N-A BY PROVIDER DESIGN: GA4 exposes no webhooks/push for reports. All change
detection is scheduled polling (runReport windows, realtime report for recent
activity). Do not design around push; design idempotent windowed pulls.
Sources: EVENTS citations.

## POLLING
Scheduled windowed pulls: runReport with explicit dateRanges (e.g. 7daysAgo to
2daysAgo for stable processed data), limit/offset pagination (this surface does
NOT use pageToken; that is the Admin API pattern), returnPropertyQuota=true to
read budget. Incremental pattern: watermark = last fully-processed date, not
row cursors (rows are computed, not stored records). Historical data is
immutable once processed — no tombstones to handle.
Sources: https://github.com/databrickslabs/lakeflow-community-connectors/blob/HEAD/src/databricks/labs/community_connector/sources/google_analytics_aggregated/google_analytics_aggregated_api_doc.md ;
https://github.com/api-evangelist/google-analytics-4/blob/HEAD/skills/google-analytics-4-run-a-report.md

## RATE LIMITS
Official quota table (developers.google.com, Core category, standard property):
200,000 tokens/day/property, 40,000 tokens/hour/property, 14,000 tokens/project/
property/hour, 10 concurrent requests/property, 10 server errors/project/
property/hour (Analytics 360: 2,000,000 / 400,000 / 140,000 / 50 / 50).
Realtime and Funnel have parallel tables; Chat category separate. Tokens charged
by query complexity, not row count. 429 = RESOURCE_EXHAUSTED: back off and
re-read budget. CRITICAL: 500/503 retries count against the server-errors quota:
cap retries (unbounded retry locks the property out). Branch on error.status
(canonical code), never error.message.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas (official) ;
https://github.com/api-evangelist/google-analytics-4/blob/HEAD/skills/google-analytics-4-run-a-report.md

## IDEMPOTENCY
N-A BY PROVIDER DESIGN for the Data API: read-only, so retries are safe
(no idempotency needed). Admin API has no idempotency key at all (per skill
source): do not carry the read-only retry assumption into Admin writes —
guard with read-before-write checks.
Source: https://github.com/api-evangelist/google-analytics-4/blob/HEAD/skills/google-analytics-4-run-a-report.md

## EFFECTS
Data API: read-only, side-effect-free. Admin API writes (create property,
audiences, conversions) alter GA configuration — no money movement, no external
human impact, but misconfiguration corrupts measurement. Quota burn is the main
operational cost of polling.

## REVERSIBILITY
Reports are computed views: nothing to reverse. Admin config changes (audiences,
custom dimensions, conversions) are editable/deletable via Admin API. Historical
analytics data cannot be rewritten through the API (immutability is the
provider's design, not a limitation to work around).

## PROVENANCE
propertyQuota block in responses (consumed/remaining per day/hour/concurrent)
gives quota lineage; report requests are fully specified by (property id,
dimensions, metrics, date ranges, filters) — re-runnable and deterministic
modulo processing latency and sampling. getMetadata versions the dimension/
metric schema. No row-level ids: lineage is at the query level. Sampling and
thresholding flags must be recorded alongside any number we persist.
Sources: https://github.com/databrickslabs/lakeflow-community-connectors/blob/HEAD/src/databricks/labs/community_connector/sources/google_analytics_aggregated/google_analytics_aggregated_api_doc.md ;
https://developers.google.com/analytics/devguides/reporting/data/v1/quotas
