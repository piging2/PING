# Connector intel - social domain (reference platform: Meta Graph API)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Pages, Posts (page-id_posts), Comments, Photos/Videos, Insights, AdAccounts. Graph API at https://graph.facebook.com/vXX.X/{object-id}. Edges: /posts, /comments, /insights, /feed.
Sources: https://developers.facebook.com/docs/graph-api

## EVENTS
Webhooks product: subscriptions to page fields (feed, mention, ratings). App dashboard configures callback; hub verification handshake.
Sources: https://developers.facebook.com/docs/graph-api/webhooks

## CAPABILITIES
Read page/post/comment objects, publish posts (pages), reply to comments, read insights, manage page settings. Publishing needs pages_manage_posts.
Sources: https://developers.facebook.com/docs/graph-api

## AUTHORIZATION
OAuth 2.0 with granular permissions (pages_read_engagement, pages_manage_posts, pages_read_user_content). Page access tokens via /me/accounts.
Sources: https://developers.facebook.com/docs/graph-api

## WEBHOOKS
HTTPS callback receives signed POSTs (X-Hub-Signature-256, HMAC-SHA256 with app secret). Verify hub.verify_token on subscription. Retries on failure.
Sources: https://developers.facebook.com/docs/graph-api/webhooks

## POLLING
Edge pagination with cursors (after/before); since/until time filters. Insights edges for metric time series.
Sources: https://developers.facebook.com/docs/graph-api

## RATE-LIMITS
Business Use Case rate limiting per app per page/business. Throttling errors on excess. Verify current values in the docs.
Sources: https://developers.facebook.com/docs/graph-api

## IDEMPOTENCY
No idempotency-key on publish. Duplicate posts possible on retry; check-before-publish via recent /posts listing.
Sources: https://developers.facebook.com/docs/graph-api

## EFFECTS
Publishing posts/comments (public), page setting changes. Reads are side-effect-free.
Sources: https://developers.facebook.com/docs/graph-api

## REVERSIBILITY
Posts/comments deletable via API. Published-then-deleted leaves no tombstone for viewers. Insights data immutable.
Sources: https://developers.facebook.com/docs/graph-api

## PROVENANCE
Object IDs stable; created_time on all objects; from{} attribution; insights carry metric period boundaries.
Sources: https://developers.facebook.com/docs/graph-api

