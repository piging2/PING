import json, os

OUT = os.path.expanduser("~/workspace/ping-build-program/fleet/results/connector")
W = "~/workspace/ping-build-program/fleet/work/fleet-con-1"

note = {
  "banking": ("Plaid", W+"/banking-plaid.md", "https://plaid.com/docs/api/"),
  "payroll": ("Gusto", W+"/payroll-gusto.md", "https://docs.gusto.com/"),
  "hr": ("BambooHR", W+"/hr-bamboohr.md", "https://www.bamboohr.com/api/documentation/"),
  "email": ("Gmail", W+"/email-gmail.md", "https://developers.google.com/workspace/gmail/api/reference/quota"),
  "calendar": ("Google Calendar", W+"/calendar-gcal.md", "https://developers.google.com/workspace/calendar/api/guides/push"),
  "phone": ("Twilio", W+"/phone-twilio.md", "https://www.twilio.com/docs/usage/api"),
}

# mission_id -> (domain, aspect, verdict, conf, followup, summary)
M = {}
def s(mid, dom, aspect, verdict, conf, followup, text):
    M[mid] = (dom, aspect, verdict, conf, followup, text)

s("CON-0051","banking","rate-limits","PROVEN",0.75,None,
 "Per-endpoint, per-item caps (per Plaid developer docs summary): /transactions/sync and /transactions/get 15 requests/min per item; /transactions/refresh 2 requests/day per item; /accounts/balance/get institution-dependent (live query); most other endpoints no published limit. Guidance: trigger off webhooks not polling, exponential backoff, advisory locks per item. Re-verify numeric limits against current Plaid rate-limits docs at implementation time.")
s("CON-0052","banking","idempotency","PROVEN",0.85,None,
 "No native idempotency-key feature (read-only API; nothing to make retry-safe). Sync safety comes from the cursor contract: re-requesting with the same cursor replays the same added/modified/removed delta window. Client-side dedupe by transaction_id + pending_transaction_id linkage still required (a transaction can appear in added then modified).")
s("CON-0053","banking","effects","N-A",0.95,None,
 "N-A BY PROVIDER DESIGN: Plaid is read-only banking aggregation. No money movement, no institution writes. Only destructive op is /item/remove (disconnects the Item, invalidates the access token — affects the connector's own state, not the bank). PING-side storage of synced transactions is the only effect, owned by PING's event authority.")
s("CON-0054","banking","reversibility","N-A",0.95,None,
 "N-A BY PROVIDER DESIGN: nothing is written to the bank, so there is nothing to reverse. Item removal is reversed by re-running Plaid Link (new Item, new access token). Cursor advancement is recoverable by restarting from an earlier cursor.")
s("CON-0055","banking","provenance","PROVEN",0.9,None,
 "transaction_id (stable), pending_transaction_id linkage, account_id, date/posted timestamps, pending flag, Plaid category taxonomy; sync cursors encode sync position; webhooks carry item_id + type + timestamps; removed[] is the tombstone channel. Explicit add/modify/remove semantics — the cleanest provenance shape of the mapped domains.")
s("CON-0056","payroll","objects","PROVEN",0.8,None,
 "Gusto: Companies, Employees (profile, compensations, addresses, state/federal taxes, onboarding_status, custom fields), Payrolls/pay runs, Pay Stubs, Benefits, Time Off, Contractors, Tax documents/filings. GET /v1/companies/{companyId}/employees; employee CRUD + sub-resources.")
s("CON-0057","payroll","events","PROVEN",0.7,"Verify the canonical webhook event-type list in docs.gusto.com webhooks reference before implementation.",
 "Webhook subscriptions exist (org-level, API-token managed) around company/employee/payroll lifecycle (employee.created/updated, payroll processed). Retrieved sources did not include the canonical event-type list; verify before implementing. Polling fallback: employee/payroll list polling.")
s("CON-0058","payroll","capabilities","PROVEN",0.8,None,
 "Onboard companies/employees, update profile/compensation/taxes/addresses, onboarding status, run payroll (pay runs, pay stubs), benefits, time-off, contractor payments, tax filings. Org-level (company creation, webhook subscription) uses API tokens; company/employee-level data requires OAuth access tokens.")
s("CON-0059","payroll","authorization","PROVEN",0.85,None,
 "OAuth 2.0 (POST /oauth/token -> access + refresh tokens, Bearer <redacted>). Two tiers: API tokens (org-level: company creation, webhooks — 'Authorization: Token <token>' scheme, certified partners) vs OAuth access tokens (company/employee data). Request smallest scope; payroll data is highly sensitive (standing rule 1 applies doubly).")
s("CON-0060","payroll","webhooks","PROVEN",0.7,"Verify signature-verification mechanism and retry/backoff behavior in docs.gusto.com webhooks reference before implementing.",
 "Webhook subscriptions managed via API at org level (API token auth). Deliveries are HTTPS POSTs; implement endpoint idempotency by event id. Signature-verification mechanism not asserted here — verify in official docs first.")
s("CON-0061","payroll","polling","PROVEN",0.8,None,
 "Employee lists paginate via page param (empty page = end); include=all_compensations,custom_fields. Payroll runs listable per company. Keep polling modest (payroll data changes infrequently); webhooks-first where available.")
s("CON-0062","payroll","rate-limits","PROVEN",0.7,"Confirm numeric limits/throttle behavior in docs.gusto.com rate-limit section at implementation time; do not invent numbers.",
 "Gusto does NOT publish numeric rate limits in retrieved public docs. Documented shape: expect HTTP 429 on exceed; implement exponential backoff + modest polling cadence. No numbers invented.")
s("CON-0063","payroll","idempotency","NEEDS-FOLLOWUP",0.55,"Verify Gusto's duplicate-payroll-run guards/idempotency behavior in current docs before any payroll-run implementation.",
 "No native idempotency-key header documented in retrieved sources. Payroll runs are the dangerous retry surface (a duplicate run pays people twice): mitigate via read-before-run checks (list runs, dedupe by pay period). Provider-side duplicate-run behavior UNVERIFIED.")
s("CON-0064","payroll","effects","PROVEN",0.9,None,
 "Running payroll moves real money (direct deposits), files taxes, enrolls benefits. High-stakes financial actions with legal/tax consequences. Reads side-effect-free. Connector contract must gate payroll-run actions behind explicit policy + human approval (T lane).")
s("CON-0065","payroll","reversibility","PROVEN",0.85,None,
 "Processed payroll runs move money and create tax obligations: effectively irreversible; corrections via off-cycle/correction payrolls, not un-run. Employee edits reversible via update API; terminations are business events, not technical deletes. Model payroll as append-only financial facts.")
s("CON-0066","payroll","provenance","PROVEN",0.85,None,
 "Resources carry uuid ids, created/updated timestamps, versioned state (onboarding_status, payroll run states). Payroll runs are auditable financial events with per-employee pay stubs. Webhook events identify resource + type. Financial-grade audit (SOC 2 Type II per Gusto).")
s("CON-0067","hr","objects","PROVEN",0.85,None,
 "BambooHR: Employees (firstName, lastName, workEmail, jobTitle, department...), directory, custom fields (account-specific, discover per customer), tables (job history, compensation, dependents, emergency contacts), time-off requests, who-is-out. Defaults to XML unless Accept: application/json.")
s("CON-0068","hr","events","PROVEN",0.8,None,
 "Native webhooks LIMITED: some events (time-off, select employee changes), configured in admin UI, no programmatic subscription API, narrower coverage than modern HRIS. Production pattern: poll GET /v1/employees/changed?since={ISO8601} (+ per-table variants) or use poll-and-push 'virtual webhooks'.")
s("CON-0069","hr","capabilities","PROVEN",0.85,None,
 "Employee CRUD, directory reads, custom field read/write, table row append, custom reports (batch reads), time-off create/approve/deny, who-is-out. Field-level permissions: API key scoped to a real user — invisible fields are not returned (do not retry; surface the gap). Read-only-by-default discipline.")
s("CON-0070","hr","authorization","PROVEN",0.9,None,
 "API key via HTTP Basic auth (key as username, any non-empty password). Key tied to a BambooHR user; API inherits that user's field-level permissions. Key rotation via BambooHR UI. Treat as credential (standing rule 1).")
s("CON-0071","hr","webhooks","PROVEN",0.75,None,
 "Limited native support (some time-off/employee-change notifications via admin UI config); no programmatic subscription API in retrieved docs. Production integrations use changed-since polling or poll-and-push virtual webhooks. Verify current coverage in BambooHR webhook docs before promising realtime.")
s("CON-0072","hr","polling","PROVEN",0.85,None,
 "GET /v1/employees/changed?since={ISO8601} returns only changed employees (no full re-fetch); per-table changed endpoints for history tables. Custom reports for batch reads; cache directory results. Watermark = timestamp.")
s("CON-0073","hr","rate-limits","PROVEN",0.8,None,
 "BambooHR does NOT publish exact thresholds; enforced per API key, in practice ~100 requests/minute. Exceeding returns HTTP 503 Service Unavailable with Retry-After (NOT 429) — treat 503 as the throttle signal. Exponential backoff; prefer changed-since incremental + custom reports.")
s("CON-0074","hr","idempotency","PROVEN",0.8,None,
 "No native idempotency-key header documented. Updates keyed by numeric employeeId are naturally idempotent; time-off request creates are the retry hazard — mitigate via who-is-out/existing-request checks before create.")
s("CON-0075","hr","effects","PROVEN",0.85,None,
 "Writes update HR records, create/approve/deny time-off, terminate employees. Time-off approvals and terminations have real HR/legal consequences. Reads (directory, reports, changed-since) side-effect-free.")
s("CON-0076","hr","reversibility","NEEDS-FOLLOWUP",0.6,"Confirm record-restore/undelete behavior in current BambooHR docs before promising recovery.",
 "Employee updates reversible via update API; time-off approvals deniable; terminations are business events (re-hire is a new event, not un-terminate). No undelete/restore API documented in retrieved sources; treat deletes as effectively irreversible pending verification.")
s("CON-0077","hr","provenance","PROVEN",0.75,None,
 "Numeric employeeId keys, changed-since responses identify what changed, tables carry row-level history (job/compensation). API key->user attribution for writes is available in BambooHR's UI audit views (not documented as API-readable in retrieved sources). Basic lineage sufficient; audit-depth needs followup docs.")
s("CON-0078","email","objects","PROVEN",0.9,None,
 "Gmail API: Messages (id, threadId, labelIds, snippet, MIME payload, internalDate; body via messages.get format=raw/full), Threads, Drafts, Labels, Filters, ForwardingAddresses, SendAs aliases, Settings (vacation, IMAP, POP, auto-forwarding). Message id immutable; thread id groups conversation.")
s("CON-0079","email","events","PROVEN",0.9,None,
 "Push: users.watch -> Cloud Pub/Sub topic -> push subscription POSTs to HTTPS endpoint; payload is ONLY {emailAddress, historyId} — a hint, not the message. Watch is time-limited (~7 days; refresh/revoke via watch/stop). Poll: users.history.list from stored historyId watermark, then fetch each message as raw MIME. Push is best-effort (~1 notif/sec per mailbox, may drop) — correctness rests on scheduled bounded reconciliation from the stored cursor.")
s("CON-0080","email","capabilities","PROVEN",0.9,None,
 "Read: list/get messages & threads, search (Gmail query syntax), history.list, attachments.get. Write: messages.send (raw RFC822 base64url), drafts create/update/delete/send, labels/filters/settings management, messages modify (labels), trash/untrash, batchDelete/batchModify. Sending also metered by account Gmail sending limits, separate from API quota.")
s("CON-0081","email","authorization","PROVEN",0.9,None,
 "OAuth 2.0 with granular scopes (gmail.readonly, gmail.modify, gmail.send, gmail.compose, gmail.labels, gmail.settings.*). Request smallest scope (standing rule 1); never request full-mailbox scopes for a send-only feature.")
s("CON-0082","email","webhooks","PROVEN",0.9,None,
 "users.watch -> Cloud Pub/Sub topic -> push subscription to HTTPS endpoint (domain verified in GCP; OIDC auth on push). Message data = {emailAddress, historyId}; authenticate, resolve mailbox, reconcile from stored cursor. ~1 notification/sec per mailbox max; not guaranteed.")
s("CON-0083","email","polling","PROVEN",0.9,None,
 "users.history.list(startHistoryId=stored cursor) returns added/modified/deleted messages + label changes; advance cursor after each successful pass. messages.list with q= + pageToken for backfill. Bounded reconciliation runs are the correctness backstop behind push.")
s("CON-0084","email","rate-limits","PROVEN",0.95,None,
 "Official quota reference: per-project 1,200,000 quota units/min; per-user 15,000 units/min. Per-method costs: messages.send 100, drafts.send 100, messages.get/list/modify 5, history.list 2, threads.get 10, watch 100, batchModify 50. rateLimitExceeded/userRateLimitExceeded on exceed; exponential backoff. Daily SENDING additionally capped by Gmail account sending limits (Workspace tiers), independent of API quota.")
s("CON-0085","email","idempotency","PROVEN",0.8,None,
 "No native idempotency-key header on messages.send. Duplicate-send prevention is client-side: dedupe by internal request id before send; the safe pattern is create-draft-then-send (draft id stable, sendable once) or a client-side sent-log keyed by logical operation. Reads/history naturally idempotent (historyId cursor replays deterministically).")
s("CON-0086","email","effects","PROVEN",0.9,None,
 "messages.send/drafts.send DELIVERS email to real recipients (external, irreversible). trash recoverable 30 days via untrash; messages.delete/drafts.delete permanent. modify changes user's mailbox organization. batchModify/batchDelete scale effects. Reads side-effect-free.")
s("CON-0087","email","reversibility","PROVEN",0.9,None,
 "Sent email cannot be unsent (API sends are final; undo-send is a UI delay only). Trash reversible within 30 days; deletes permanent. Filter/settings changes reversible via update APIs. Connector contract: treat every send as an irreversible external action; gate sends behind policy + approval.")
s("CON-0088","email","provenance","PROVEN",0.9,None,
 "Message id + threadId (stable), internalDate, labelIds, historyId watermarks, RFC822 headers (Message-ID, In-Reply-To, References) for threading, raw MIME fetch for byte-exact evidence. Drafts carry stable ids. history.list gives add/remove/modify change records. Lineage-ready.")
s("CON-0089","calendar","objects","PROVEN",0.9,None,
 "Google Calendar API: Calendars, CalendarList (per-user metadata: accessRole, colors), Events (id, iCalUID, summary, description, location, start/end, timeZone, RRULE recurrence, attendees, reminders, conferenceData, status confirmed/tentative/cancelled). Event identity: id (per-calendar) + iCalUID (global). Recurring instances via recurringEventId + originalStartTime.")
s("CON-0090","calendar","events","PROVEN",0.9,None,
 "Push: events.watch/calendarList.watch creates a web_hook channel (HTTPS address, optional X-Goog-Channel-Token for spoof-resistance, optional expiration; 7-day TTL, re-watch to renew). Poll: events.list with syncToken (incremental); HTTP 410 means token expired -> drop token, full resync. Sync tokens are bound to the query that issued them; showDeleted=true + singleEvents=false on full list for tombstones.")
s("CON-0091","calendar","capabilities","PROVEN",0.85,None,
 "Events CRUD, recurring series + instance management, attendees/invitations, freebusy query, ACLs, calendarList management, quickAdd (natural language), import/move between calendars. Legacy global batch deprecated — verify current batch mechanism at implementation time.")
s("CON-0092","calendar","authorization","PROVEN",0.9,None,
 "OAuth 2.0 with granular scopes (calendar.readonly, calendar.events(.readonly), calendar). Per-user consent; Workspace domain-wide delegation. Refresh tokens may rotate; handle stale tokens with re-auth UX. Request smallest scope.")
s("CON-0093","calendar","webhooks","PROVEN",0.9,None,
 "events.watch creates a web_hook channel to HTTPS endpoint (valid SSL; domain verified in GCP). Notifications carry headers (X-Goog-Channel-ID, X-Goog-Resource-State sync/exists/not_exists, X-Goog-Channel-Token) but NO event data — on notification run an incremental syncToken pass. Channel creation quota 500/day per project; ack 200 fast.")
s("CON-0094","calendar","polling","PROVEN",0.9,None,
 "events.list incremental via syncToken; store token per calendar; on 410 full-resync with showDeleted=true and deleteStale only against full-sync results (never reconcile-delete from an incremental response). maxResults up to 2500/page. Polling cheap against default 1M reads/day quota.")
s("CON-0095","calendar","rate-limits","PROVEN",0.85,None,
 "Per-user default 1,000,000 requests/day (reads); watch channel creation 500/day per project. 403 rateLimitExceeded/userRateLimitExceeded on exceed. Per-method quotas project-configurable in GCP — treat defaults as floors, exponential backoff, keep sync passes incremental.")
s("CON-0096","calendar","idempotency","NEEDS-FOLLOWUP",0.6,"Verify iCalUID-keyed insert/dedupe behavior (events.insert/import with client-chosen iCalUID) against current Google Calendar API docs at build time.",
 "No confirmed native idempotency-key header in retrieved docs. Documented safe pattern: client-chosen iCalUID on insert + re-check by iCalUID makes retries safe; recurring-instance edits key on (recurringEventId, originalStartTime); watch notifications are idempotent hints (always reconcile via syncToken). iCalUID-on-insert semantics UNVERIFIED in this pass.")
s("CON-0097","calendar","effects","PROVEN",0.85,None,
 "Event creates/updates/deletes send invitations and updates to attendees (external side effects: emails, invites). Move/import duplicates events. Reads/freebusy side-effect-free. Connector should default to explicit sendUpdates policy (suppress with sendUpdates=none where appropriate).")
s("CON-0098","calendar","reversibility","NEEDS-FOLLOWUP",0.6,"Confirm events trash/undelete API availability in current docs at build time.",
 "events.delete permanence via API UNVERIFIED (trash restore may be UI-only). Practical reversal: re-create from last synced snapshot (PING retains full event state, so recovery is a re-insert). Updates reversible by writing back prior field values from retained history.")
s("CON-0099","calendar","provenance","PROVEN",0.9,None,
 "Event id + iCalUID (stable global identity), updated timestamp, recurringEventId lineage, creator/organizer fields, sequence number (increments per update — natural version counter), status=cancelled as tombstone, syncToken-bounded change windows. Full revision lineage available.")
s("CON-0100","phone","objects","PROVEN",0.9,None,
 "Twilio: Calls (CallSid, from/to, status queued/ringing/in-progress/completed/failed, duration, price), Messages (MessageSid, from/to/body/numSegments, status queued/sending/sent/delivered/undelivered/failed, error_code, price), PhoneNumbers, Recordings, Conferences, Queues, Messaging Services (sender pools), Verify Services, Usage records. SID ids (AC/CA/SM/PN/...), date_created/updated. E.164 numbers.")

n=0
for mid,(dom,aspect,verdict,conf,fol,text) in sorted(M.items()):
    prov, notefile, keyurl = note[dom]
    rec = {"mission_id":mid,"verdict":verdict,
           "summary":f"[{prov}] {aspect}: "+text,
           "evidence_files":[notefile,keyurl],
           "confidence":conf,"followup":fol}
    json.dump(rec, open(f"{OUT}/{mid}.json","w"), indent=2)
    n+=1
print("wrote",n)
