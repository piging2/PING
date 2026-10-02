# Connector intel — Calendar domain (reference platform: Google Calendar API)

Mapped from public docs; implementation stays data-driven. Provider: Google.
Base: https://www.googleapis.com/calendar/v3 ; OAuth 2.0 scopes
(calendar.readonly, calendar.events, calendar).

## OBJECTS
Calendars, CalendarList (per-user metadata: accessRole, colors), Events
(id, iCalUID, summary, description, location, start/end dateTime or date,
timeZone, recurrence RRULE, attendees, reminders, conferenceData/hangoutLink,
status confirmed/tentative/cancelled, transparency, visibility). Event identity:
id (per-calendar) + iCalUID (global). Recurring series: singleEvents=false keeps
the rule; instances addressable via recurringEventId + originalStartTime.
ACLs and colors and settings are secondary resources.
Sources: https://github.com/nikgraf/calendar/blob/HEAD/docs/google-sync-and-testing.md ;
https://developers.google.com/workspace/calendar/api/guides/push

## EVENTS
Two mechanisms: (1) Push: events.watch / calendarList.watch creates a
notification channel (type web_hook, HTTPS address, optional channel token
sent as X-Goog-Channel-Token for spoof-resistance, optional expiration).
Channel TTL default 7 days; re-watch to renew. (2) Poll: events.list with
syncToken — incremental, returns only changed events; HTTP 410 means the token
expired: drop token and full-resync. A sync token is bound to the query that
issued it (timeMin-bound tokens cannot be widened later); showDeleted=true +
singleEvents=false on the full list for tombstones.
Sources: https://developers.google.com/workspace/calendar/api/guides/push (official) ;
https://github.com/brandonwie/brandonwie.dev/blob/HEAD/src/content/posts/en/google/google-calendar-sync-strategies.md
(syncToken semantics, full-vs-incremental asymmetry) ;
https://github.com/nikgraf/calendar/blob/HEAD/docs/google-sync-and-testing.md

## CAPABILITIES
Events CRUD, recurring series + instance management, attendees/invitations,
freebusy query, ACLs, calendarList management, colors, quickAdd (natural
language), import/move of events between calendars. Batch endpoint exists
(legacy global batch is deprecated — verify current batch mechanism at
implementation time). quickAdd and import are the only non-obvious write paths.
Sources: https://github.com/llm-crafter/llm-crafter/blob/HEAD/docs/examples/google-calendar-tool.md

## AUTHORIZATION
OAuth 2.0 with granular scopes: calendar.readonly, calendar.events(.readonly),
calendar (full). Per-user consent; domain-wide delegation for Workspace admins.
Refresh tokens may rotate; re-auth UX must handle stale tokens. Request smallest
scope (standing rule 1).
Source: https://github.com/nikgraf/calendar/blob/HEAD/docs/google-sync-and-testing.md
(403 insufficient-scope handling pattern)

## WEBHOOKS
events.watch creates a web_hook channel to your HTTPS endpoint (valid SSL
required; domain must be verified in Google Cloud Console). Notifications carry
headers (X-Goog-Channel-ID, X-Goog-Resource-State sync/exists/not_exists,
X-Goog-Channel-Token) but NO event data — on notification, run an incremental
syncToken pass. Channel creation quota: 500/day per project (rotate sanely;
7-day TTL, not 1-hour). Respond 200 quickly.
Sources: https://developers.google.com/workspace/calendar/api/guides/push (official) ;
https://github.com/memrynote/memry/blob/HEAD/docs/superpowers/specs/2026-04-18-google-calendar-phase-2-design.md
(500/day channel quota, domain verification requirement)

## POLLING
events.list incremental via syncToken; store token per calendar; on 410, full
resync with showDeleted=true and deleteStale only against the full-sync result
(never reconcile-delete from an incremental response). maxResults up to 2500 per
page (page token pagination). Polling cadence is cheap against the per-user
quota (default 1,000,000 reads/day).
Sources: https://github.com/brandonwie/brandonwie.dev/blob/HEAD/src/content/posts/en/google/google-calendar-sync-strategies.md ;
https://github.com/actionauto-devteam/suprah-backend/blob/HEAD/docs/appointments-google-calendar.md

## RATE LIMITS
Per-user quota: default 1,000,000 requests/day (reads); watch channel creation
500/day per project. Usage-limit errors return 403 rateLimitExceeded /
userRateLimitExceeded. Exact per-method quotas are project-configurable in GCP;
treat published defaults as floors, implement exponential backoff, and keep
sync passes incremental (a 50k-event calendar is ~20 requests at maxResults=2500).
Sources: https://github.com/memrynote/memry/blob/HEAD/docs/superpowers/specs/2026-04-18-google-calendar-phase-2-design.md ;
https://github.com/nikgraf/calendar/blob/HEAD/docs/google-sync-and-testing.md

## IDEMPOTENCY
Native-ish: events support client-generated id on insert? In practice the
documented safe pattern is iCalUID: creating with a client-chosen iCalUID and
re-checking by iCalUID makes retries safe (import endpoint keys on iCalUID).
Recurring-instance edits key on (recurringEventId, originalStartTime). Watch
notifications are idempotent hints (always reconcile via syncToken, never apply
directly). Verify iCalUID-on-insert behavior against current docs at build time.
Source: https://github.com/therahulgoel/ios-system-design/blob/HEAD/docs/google-calendar.md
(offline creations use UUID as idempotency key); flagged as verify-at-build.

## EFFECTS
Event creates/updates/deletes send invitations and updates to attendees
(external side effects: emails, calendar invites). Move/import duplicate
events across calendars. Reads/freebusy side-effect-free. Attendee notifications
can be suppressed with sendUpdates=none on writes — connector should default to
explicit sendUpdates policy.

## REVERSIBILITY
Deleted events go to trash: recoverable via undelete semantics? Google Calendar
API events.delete is permanent for the API (trash restore is UI-only in most
cases) — verify at build time. Practical reversal: re-create from the last
synced snapshot (we keep full event state in PING, so recovery is a re-insert).
Updates are reversible by writing back prior field values (we retain history via
sync). Followup: confirm trash/undelete API availability in current docs.

## PROVENANCE
Event id + iCalUID (stable global identity), updated timestamp, recurringEventId
lineage, creator/organizer fields, sequence number (increments per update —
natural version counter), status cancelled as tombstone, syncToken-bounded
change windows. Sequence + updated + id give full revision lineage.
Sources: https://github.com/nikgraf/calendar/blob/HEAD/docs/google-sync-and-testing.md ;
https://github.com/brandonwie/brandonwie.dev/blob/HEAD/src/content/posts/en/google/google-calendar-sync-strategies.md
