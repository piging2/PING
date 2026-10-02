# Connector intel - advertising domain (reference platform: Meta Marketing API)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
AdAccount, Campaign, AdSet, Ad, AdCreative, Insights (async reports), CustomAudiences. Graph API at https://graph.facebook.com/vXX.X/act_{ad_account_id}/. Nested: campaign -> adset -> ad.
Sources: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving ; https://developers.facebook.com/docs/marketing-api

## EVENTS
No generic event stream. Insights async jobs poll for completion. Lead Ads have webhook subscriptions (page subscribed to leadgen). Change log via object updated_time polling.
Sources: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving

## CAPABILITIES
Create/update campaigns/adsets/ads/creatives, manage budgets and bids, build custom audiences, run insights reports, manage lead forms. Draft vs published states.
Sources: https://developers.facebook.com/docs/marketing-api

## AUTHORIZATION
OAuth 2.0 with ads_management / ads_read / leads_retrieval scopes. System users and access tokens per ad account; Business Manager gates access.
Sources: https://developers.facebook.com/docs/marketing-api

## WEBHOOKS
Webhooks product: page subscriptions for leadgen events (new leads). App dashboard configures callback URL; hub.verify_token handshake; X-Hub-Signature-256 validation.
Sources: https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving

## POLLING
Insights async: POST report request, poll for completion, fetch results. Object lists with updated_since filters for change detection.
Sources: https://developers.facebook.com/docs/marketing-api

## RATE-LIMITS
Business Use Case rate limiting per app per ad account (ads API tiers). Throttling returns error code 80004/17. Verify current values in the docs.
Sources: https://developers.facebook.com/docs/marketing-api

## IDEMPOTENCY
No idempotency-key. Campaign/ad creates are not naturally idempotent; check-before-create by name, or track created IDs client-side.
Sources: https://developers.facebook.com/docs/marketing-api

## EFFECTS
Spending money: budget changes, bid changes, launching/pausing campaigns. Audience creation. Reads and draft creates are side-effect-free until published.
Sources: https://developers.facebook.com/docs/marketing-api

## REVERSIBILITY
Campaigns/ads pausable and deletable; spend already incurred is not recoverable. Audience deletion is permanent.
Sources: https://developers.facebook.com/docs/marketing-api

## PROVENANCE
Object IDs stable; insights carry date_start/date_stop; ad account history logs changes; lead payloads carry form and ad IDs.
Sources: https://developers.facebook.com/docs/marketing-api

