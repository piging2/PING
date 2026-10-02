# Connector intel - forms domain (reference platform: Google Forms API)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Form (formId, info{title, documentTitle, description}, items[], settings, linkedSheetId, revisionId), FormResponse (responseId, answers keyed by questionId, lastSubmittedTime), Watch (id, eventType, target Pub/Sub topic, expireTime, state). Methods: forms.create (title only; add items via batchUpdate), forms.get/update/batchUpdate, forms.responses.list/get, forms.watches.create/list/delete/renew.
Sources: https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list ; https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses

## EVENTS
Change events via Watches on eventType SCHEMA (form structure) or RESPONSES (new submissions). Delivery to a Cloud Pub/Sub topic. Limit: one watch per event type per form per invoker (max two).
Sources: https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list

## CAPABILITIES
Create/get/update forms, batchUpdate items, list/get responses, manage watches. Responses are read-only through the API; submission happens through the form UI.
Sources: https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses

## AUTHORIZATION
OAuth 2.0 with Google API scopes for Forms (body and responses, read and read/write variants). Standard Google credential flow; no API-key-only access for response data.
Sources: https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses

## WEBHOOKS
Watches push notifications to Cloud Pub/Sub. Watch expires after 7 days; renew extends 7 days. Error state (e.g. SUSPENDED) surfaces on the watch resource.
Sources: https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list

## POLLING
forms.responses.list with filter 'timestamp > N' (RFC3339), pageSize (default up to 5000), pageToken for pagination. Incremental sync by tracking the newest timestamp seen.
Sources: https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list

## RATE-LIMITS
Subject to Google Cloud API quotas for the Forms API; exact per-method quotas are set in the Cloud Console and not restated here. Exceeding quota returns standard quota errors; use backoff.
Sources: https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list

## IDEMPOTENCY
No idempotency-key on write methods. batchUpdate carries revisionId for optimistic concurrency (write fails if the form changed). Safe retry = read-before-write via forms.get.
Sources: https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses

## EFFECTS
Write effects: form structure mutations (items, settings). Response writes are end-user driven through the form UI, not the API. Watch management affects notification delivery.
Sources: https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses

## REVERSIBILITY
Form edits via batchUpdate are reversible by re-applying the prior item set. No documented API undelete for forms. Responses cannot be deleted or altered through the API.
Sources: https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses

## PROVENANCE
responseId is stable per submission; lastSubmittedTime orders the stream; respondent email present only if the form collects it. Form revisionId versions structure changes.
Sources: https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list

