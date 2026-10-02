# Connector intel - calendar domain (reference platform: Google Calendar API v3)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Calendars (calendarList entries), Events (eventId/iCalUID, summary, start/end with timeZone, attendees[], recurrence[], reminders, conferenceData, status confirmed/cancelled), ACL rules, colors. Methods: events.list/get/insert/update/patch/delete, calendarList.list.
Sources: https://developers.google.com/workspace/calendar/api/guides/push ; https://developers.google.com/workspace/calendar/api/v3/reference

## EVENTS
Push notifications via watch channels on events or calendarList (X-Goog-Channel-* headers). Sync tokens on events.list give incremental change feeds (deleted entries marked cancelled).
Sources: https://developers.google.com/workspace/calendar/api/guides/push

## CAPABILITIES
Full event CRUD, recurring event instances, attendee management, freebusy queries, ACL management, conference data creation, calendar list management.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## AUTHORIZATION
OAuth 2.0 with Calendar scopes (calendar.readonly, calendar.events, calendar). Service accounts with domain-wide delegation for workspace-wide access.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## WEBHOOKS
events.watch / calendarList.watch create push channels to HTTPS endpoints with token validation. Channels expire (max ~30 days); renew via re-watch. Sync messages on channel start.
Sources: https://developers.google.com/workspace/calendar/api/guides/push

## POLLING
events.list with syncToken for incremental sync; nextSyncToken persisted. Time-window queries with timeMin/timeMax for bounded scans.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## RATE-LIMITS
Per-user rate limits enforced; 403 rateLimitExceeded on excess with exponential backoff recommended. Exact quotas in the Cloud Console; not restated here.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## IDEMPOTENCY
No idempotency-key. events.import with iCalUID gives dedup on import. Updates keyed by eventId are naturally idempotent; check-before-insert on iCalUID for safe retry.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## EFFECTS
Event create/update/delete sends attendee notifications (configurable via sendUpdates). Calendar sharing changes via ACL. Reads are side-effect-free.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## REVERSIBILITY
Deleted events are marked cancelled and retained briefly; no API undelete. Recurring series edits can be reverted by re-applying prior recurrence. Connector should snapshot before bulk edits.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

## PROVENANCE
eventId stable per event; iCalUID stable across calendars; updated timestamp versions changes; recurringEventId links instances to series; creator/organizer attribution.
Sources: https://developers.google.com/workspace/calendar/api/v3/reference

