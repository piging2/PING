# Connector intel - analytics domain (reference platform: Google Analytics 4)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Properties (properties/{id}), Data Streams, Events (eventName + params), Conversions, Audiences, Custom dimensions/metrics. Data API v1: properties/{id}:runReport with dimensions/metrics/dateRanges. Admin API for configuration.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1 ; https://developers.google.com/analytics/devguides/reporting/data/v1/quotas

## EVENTS
GA4 is event-based: every hit is an event with parameters. Realtime API for current activity. No webhook push; data accessed via Data API queries.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## CAPABILITIES
Run reports (dimensions x metrics), realtime reports, funnel/exploration via UI only, admin CRUD (properties, streams, conversions, audiences), measurement protocol for server events.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## AUTHORIZATION
OAuth 2.0 with analytics.readonly / analytics.edit scopes. Service accounts with property access. Measurement Protocol uses API secret.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## WEBHOOKS
No native webhook delivery. Change detection = polling the Data API. Realtime API gives minutes-fresh activity for trigger-style use.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## POLLING
runReport with dateRanges sliding windows; track last run date client-side. Quota-aware scheduling required for frequent polls.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas

## RATE-LIMITS
Quota system: tokens per property per day/hour, concurrent requests, per-project limits. Documented in the quotas reference; 429 on excess. Verify current values in the docs.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas

## IDEMPOTENCY
Read-only reporting: queries are naturally idempotent. Measurement Protocol events dedup by client via event timestamps; no server idempotency key.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## EFFECTS
Reads are side-effect-free. Writes: admin changes (conversions, audiences), measurement-protocol event ingestion (appends to the event stream).
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## REVERSIBILITY
Events once collected cannot be deleted (data deletion requests are the mechanism, with limits). Admin entities support delete; audiences are rebuildable.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

## PROVENANCE
Property ID scopes all data; event timestamps + user_pseudo_id give lineage; Data API responses carry row counts and quota metadata; admin API has change history.
Sources: https://developers.google.com/analytics/devguides/reporting/data/v1

