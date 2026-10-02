# Connector intel - support domain (reference platform: Zendesk)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Tickets (id, subject, status, priority, requester, assignee, tags, custom_fields), Users, Organizations, Groups, Macros, Views, Triggers, Automations, Satisfaction ratings. REST at https://{subdomain}.zendesk.com/api/v2/. Cursor pagination.
Sources: https://developer.zendesk.com ; https://developer.zendesk.com/api-reference/introduction/pagination/

## EVENTS
Incremental exports API (/incremental/tickets/cursor) for change streams. Webhooks (signed, HMAC) for triggers/automations. Sidekiq-style retry on failure.
Sources: https://developer.zendesk.com

## CAPABILITIES
Ticket CRUD, comments (public/private), assignment, tags, custom fields, macros, views, triggers/automations management, user/org management, search.
Sources: https://developer.zendesk.com

## AUTHORIZATION
API token (email/token basic auth), OAuth 2.0 for apps. Rate limits per plan; token permissions follow the user role.
Sources: https://developer.zendesk.com

## WEBHOOKS
Webhooks configured in Admin Center; signed with HMAC secret (X-Zendesk-Webhook-Signature). Triggered from triggers/automations with JSON payload.
Sources: https://developer.zendesk.com

## POLLING
Incremental ticket export with cursor; persist cursor per poll. start_time filter for bounded backfills.
Sources: https://developer.zendesk.com/api-reference/introduction/pagination/

## RATE-LIMITS
Usage limits per plan documented in the API reference (per-minute caps). 429 with Retry-After. Verify current values in the docs.
Sources: https://developer.zendesk.com/api-reference/ticketing/account-configuration/usage_limits/

## IDEMPOTENCY
No idempotency-key on ticket creation. Safe retry = search recent tickets by external_id before create; external_id gives client-side dedup.
Sources: https://developer.zendesk.com

## EFFECTS
Creating/updating tickets (customer notifications), assignment changes, macro application. Reads are side-effect-free.
Sources: https://developer.zendesk.com

## REVERSIBILITY
Tickets closable/deletable; deleted tickets restorable briefly. Comments immutable once posted. Merges are not un-mergeable.
Sources: https://developer.zendesk.com

## PROVENANCE
Ticket IDs stable; audits endpoint gives the full change history per ticket; events carry timestamps and actor IDs.
Sources: https://developer.zendesk.com

