# Additional domains — appended to con_gen.INTEL before running
INTEL2 = {}

INTEL2["accounting"] = {
    "provider": "QuickBooks Online",
    "aspects": {
        "objects": ("REST API at https://quickbooks.api.intuit.com/v3/company/{realmId}/. Entities: account, bill, "
                    "billpayment, invoice, payment, creditmemo, customer, vendor, employee, item, purchase, journalentry, "
                    "taxagency, department. Sparse update via sparse=true with Id+SyncToken. Query with SQL-like select.",
                    ["https://developer.intuit.com/app/developer/qbo/docs/develop",
                     "https://medium.com/intuitdev/new-to-intuit-developer-how-to-use-the-quickbooks-online-api-a211e1eabbc7"]),
        "events": ("Webhooks for entity create/update/delete/merge/void delivered to a subscribed endpoint. Verifier token "
                   "validates payloads. Not all entities emit events; check the subscribed entity list.",
                   ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "capabilities": ("CRUD per entity (entity-specific required fields), batch endpoint for bulk ops, query language, "
                         "attachable (file attachments), reports API (read-only P&L, balance sheet, etc.). Realm-scoped.",
                         ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "authorization": ("OAuth 2.0 authorization code; per-realm access tokens with refresh. Scopes include "
                          "com.intuit.quickbooks.accounting. App must be authorized per company (realmId).",
                          ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "webhooks": ("HTTPS endpoint subscription per realm; Intuit signs payloads with a verifier token the app sets. "
                     "Delivery retries on failure; endpoint must respond promptly.",
                     ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "polling": ("Query entities ordered by MetaData.LastUpdatedTime with a stored high-water mark. Change data is "
                    "also available via the CDC (change data capture) query endpoints.",
                    ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "rate-limits": ("Throttling limits are published in Intuit developer documentation (per-minute per-realm request "
                        "quotas); exceeding returns 429. Verify current values in the docs before hard-coding.",
                        ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "idempotency": ("No idempotency-key header. Safe retry via query-before-create on natural keys (e.g. DocNumber) "
                        "and sparse update with SyncToken for optimistic concurrency.",
                        ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "effects": ("Financial writes: invoices, bills, payments, journal entries post to the ledger with audit trail. "
                    "Void vs delete semantics per entity; some entities are void-only.",
                    ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "reversibility": ("Delete removes; void keeps the audit trail (preferred for posted transactions). The audit log "
                          "itself is append-only. Corrections are reversing entries, not history edits.",
                          ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
        "provenance": ("Every entity carries Id (stable per realm), SyncToken (version), MetaData{CreateTime, "
                       "LastUpdatedTime, CreatedByRef}. realmId scopes all identity.",
                       ["https://developer.intuit.com/app/developer/qbo/docs/develop"]),
    }
}

INTEL2["banking"] = {
    "provider": "Plaid",
    "aspects": {
        "objects": ("Item (institution connection), Account (account_id, balances, type), Transaction (transaction_id, "
                    "pending flag), plus Auth, Identity, Investments, Liabilities products. /transactions/sync returns "
                    "added/modified/removed with cursors.",
                    ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "events": ("Webhooks: TRANSACTIONS_SYNC_UPDATE (new sync data), DEFAULT_UPDATE, INITIAL_UPDATE, HOLDINGS_UPDATE, "
                    "plus ITEM_ERROR and per-product events. Payloads carry item_id and environment.",
                    ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "capabilities": ("Link token create, public token exchange, accounts/balances, transactions sync, auth numbers, "
                         "identity, investments, liabilities. Product-gated: enable per product.",
                         ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "authorization": ("Plaid Link (OAuth or credential flow) yields public_token, exchanged server-side for "
                          "access_token. API calls use client_id + secret (or client assertion) with the access_token.",
                          ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "webhooks": ("HTTPS webhook URL per client; Plaid signs with a verification key (JWT). Respond 200 quickly; "
                     "Plaid retries failed deliveries. Webhook codes per product documented in the API reference.",
                     ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "polling": ("transactions/sync with cursor: first call cursor empty, then persist returned cursor; has_more "
                     "drives pagination. Balances via /accounts/balance/get (realtime pull).",
                     ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "rate-limits": ("Per-endpoint, per-item rate limits published in Plaid docs (e.g. transactions endpoints have "
                        "tighter caps). Exceeding returns RATE_LIMIT_EXCEEDED. Verify current values in the docs.",
                        ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "idempotency": ("transactions/sync cursors make sync idempotent (replay same cursor = same delta). No generic "
                        "idempotency-key; transaction_id is stable for dedup of added items.",
                        ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "effects": ("Read-only products have no write effects. Transfer (money movement) products create ledger entries "
                    "with authorization holds; those are the only mutating effects.",
                    ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "reversibility": ("Data products are read-only: nothing to reverse. Item connections can be removed "
                          "(/item/remove), revoking the access_token.",
                          ["https://development.plaid.com", "https://plaid.com/docs/"]),
        "provenance": ("account_id and transaction_id are stable; pending flag marks unsettled; transactions/sync "
                       "removed[] marks deleted. Balances carry as-of timestamps.",
                       ["https://development.plaid.com", "https://plaid.com/docs/"]),
    }
}

INTEL2["payments"] = {
    "provider": "Stripe",
    "aspects": {
        "objects": ("REST at https://api.stripe.com/v1/. Core: PaymentIntent, Charge, Customer, Invoice, Subscription, "
                    "Price, Product, PaymentMethod, Refund, Dispute, BalanceTransaction. Every object has id, object, "
                    "created, livemode, metadata{}.",
                    ["https://docs.stripe.com/api", "https://docs.stripe.com/rate-limits"]),
        "events": ("Event objects (evt_*) for every state change: payment_intent.succeeded, charge.refunded, "
                    "invoice.paid, customer.subscription.deleted, etc. Listed via /v1/events with type filters.",
                    ["https://docs.stripe.com/api/events", "https://docs.stripe.com/rate-limits"]),
        "capabilities": ("Create/confirm/capture PaymentIntents, charges, refunds, invoices, subscriptions, customers, "
                         "payouts, disputes evidence, Sigma queries. Test clocks for time travel in test mode.",
                         ["https://docs.stripe.com/api", "https://docs.stripe.com/rate-limits"]),
        "authorization": ("Secret key (sk_live_/sk_test_) per account; restricted keys with granular permissions; "
                          "OAuth for Connect platforms. Publishable key is client-safe and payment-only.",
                          ["https://docs.stripe.com/security/guide", "https://docs.stripe.com/rate-limits"]),
        "webhooks": ("HTTPS endpoints receive signed Event payloads; verify with Stripe-Signature header and endpoint "
                     "secret (tolerance on timestamp). Retries with exponential backoff for days on non-2xx.",
                     ["https://docs.stripe.com/webhooks", "https://docs.stripe.com/rate-limits"]),
        "polling": ("List endpoints with limit + starting_after cursors; created filters for time windows. /v1/events "
                     "polling is the fallback when webhooks are unavailable.",
                     ["https://docs.stripe.com/api", "https://docs.stripe.com/rate-limits"]),
        "rate-limits": ("Documented rate limits (see the rate-limits page; live-mode defaults with burst allowances). "
                        "Exceeding returns 429. Verify current values in the docs before hard-coding.",
                        ["https://docs.stripe.com/rate-limits"]),
        "idempotency": ("Native Idempotency-Key header on POSTs: same key + same params returns the original response "
                        "without re-executing. Keys are scoped per account and retained 24h.",
                        ["https://docs.stripe.com/api/idempotent_requests", "https://docs.stripe.com/rate-limits"]),
        "effects": ("Money movement: charges, captures, refunds, payouts, subscription billing. Side effects: webhook "
                     "events, invoice emails, dispute windows. Reads are side-effect-free.",
                     ["https://docs.stripe.com/api", "https://docs.stripe.com/rate-limits"]),
        "reversibility": ("Charges reversible via refunds (full/partial); authorizations voidable before capture. "
                          "Refunds and captured payments cannot be 'un-refunded'. Disputes have evidence deadlines.",
                          ["https://docs.stripe.com/api", "https://docs.stripe.com/rate-limits"]),
        "provenance": ("Every object has id + created timestamp; BalanceTransaction links money movement; Event objects "
                       "carry the full before/after via previous_attributes on relevant types; metadata{} is client-set.",
                       ["https://docs.stripe.com/api", "https://docs.stripe.com/rate-limits"]),
    }
}

INTEL2["payroll"] = {
    "provider": "Gusto",
    "aspects": {
        "objects": ("REST at https://api.gusto.com/v1. Companies, employees (uuid), employments, compensations, payrolls, "
                    "pay periods, benefits, time off, contractors. UUID primary keys throughout.",
                    ["https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens",
                     "https://embedded.gusto.com/product/payroll-api"]),
        "events": ("Webhooks for payroll and employee lifecycle events (per Gusto embedded docs). Event catalog is "
                   "product-tier dependent; verify the current list in the docs.",
                   ["https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens"]),
        "capabilities": ("Company/employee CRUD, run payroll, off-cycle payrolls, contractor payments, benefits "
                         "enrollment, time-off policies. Payroll runs are stateful (draft -> submitted -> processed).",
                         ["https://embedded.gusto.com/product/payroll-api"]),
        "authorization": ("OAuth 2.0 for app integrations; API tokens per company. Scopes gate product areas.",
                         ["https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens"]),
        "webhooks": ("HTTPS endpoints receive signed event payloads for subscribed topics. Verify the signing scheme in "
                     "the current docs before implementing verification.",
                     ["https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens"]),
        "polling": ("List endpoints with pagination; payrolls filtered by processed status and date. Track updated_at "
                    "high-water marks per resource.",
                    ["https://embedded.gusto.com/product/payroll-api"]),
        "rate-limits": ("Rate limits published in Gusto developer documentation; exceeding returns 429. Verify current "
                        "values in the docs before hard-coding.",
                        ["https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens"]),
        "idempotency": ("No documented idempotency-key on payroll writes. Payroll state machine (draft first, then "
                        "submit) is the safe pattern: create draft, verify, then submit.",
                        ["https://embedded.gusto.com/product/payroll-api"]),
        "effects": ("Payroll submission moves real money and files taxes. Employee changes affect compliance. Reads are "
                    "side-effect-free.",
                    ["https://embedded.gusto.com/product/payroll-api"]),
        "reversibility": ("Submitted payrolls have cancellation windows; after processing, corrections go through "
                          "subsequent payrolls. Employee records support termination, not deletion of history.",
                          ["https://embedded.gusto.com/product/payroll-api"]),
        "provenance": ("UUIDs stable; versioned API (v2024-03-01); payroll objects carry processed flags and timestamps; "
                       "employee history preserved across employments.",
                       ["https://docs.gusto.com/app-integrations/v2024-03-01/docs/api-tokens"]),
    }
}

INTEL2["calendar"] = {
    "provider": "Google Calendar API v3",
    "aspects": {
        "objects": ("Calendars (calendarList entries), Events (eventId/iCalUID, summary, start/end with timeZone, "
                    "attendees[], recurrence[], reminders, conferenceData, status confirmed/cancelled), ACL rules, "
                    "colors. Methods: events.list/get/insert/update/patch/delete, calendarList.list.",
                    ["https://developers.google.com/workspace/calendar/api/guides/push",
                     "https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "events": ("Push notifications via watch channels on events or calendarList (X-Goog-Channel-* headers). "
                   "Sync tokens on events.list give incremental change feeds (deleted entries marked cancelled).",
                   ["https://developers.google.com/workspace/calendar/api/guides/push"]),
        "capabilities": ("Full event CRUD, recurring event instances, attendee management, freebusy queries, ACL "
                         "management, conference data creation, calendar list management.",
                         ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "authorization": ("OAuth 2.0 with Calendar scopes (calendar.readonly, calendar.events, calendar). Service "
                          "accounts with domain-wide delegation for workspace-wide access.",
                          ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "webhooks": ("events.watch / calendarList.watch create push channels to HTTPS endpoints with token validation. "
                     "Channels expire (max ~30 days); renew via re-watch. Sync messages on channel start.",
                     ["https://developers.google.com/workspace/calendar/api/guides/push"]),
        "polling": ("events.list with syncToken for incremental sync; nextSyncToken persisted. Time-window queries with "
                    "timeMin/timeMax for bounded scans.",
                    ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "rate-limits": ("Per-user rate limits enforced; 403 rateLimitExceeded on excess with exponential backoff "
                        "recommended. Exact quotas in the Cloud Console; not restated here.",
                        ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "idempotency": ("No idempotency-key. events.import with iCalUID gives dedup on import. Updates keyed by eventId "
                        "are naturally idempotent; check-before-insert on iCalUID for safe retry.",
                        ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "effects": ("Event create/update/delete sends attendee notifications (configurable via sendUpdates). Calendar "
                    "sharing changes via ACL. Reads are side-effect-free.",
                    ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "reversibility": ("Deleted events are marked cancelled and retained briefly; no API undelete. Recurring series "
                          "edits can be reverted by re-applying prior recurrence. Connector should snapshot before bulk edits.",
                          ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
        "provenance": ("eventId stable per event; iCalUID stable across calendars; updated timestamp versions changes; "
                       "recurringEventId links instances to series; creator/organizer attribution.",
                       ["https://developers.google.com/workspace/calendar/api/v3/reference"]),
    }
}

INTEL2["email"] = {
    "provider": "Gmail API",
    "aspects": {
        "objects": ("Users.messages (id, threadId, labelIds[], snippet, payload{headers, body, parts}, historyId, "
                    "internalDate), threads, labels, drafts, history records, filters, settings (sendAs, vacation). "
                    "Methods: users.messages.list/get/send/modify/trash/batchModify, users.history.list.",
                    ["https://developers.google.com/workspace/gmail/api/reference/rest",
                     "https://developers.google.com/workspace/gmail/api/reference/quota"]),
        "events": ("History API: users.history.list with startHistoryId returns added/deleted/labelsAdded messages. "
                    "Push via Cloud Pub/Sub watch on the mailbox (users.watch).",
                    ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "capabilities": ("Read/search (q syntax), send (raw RFC2822), drafts CRUD, label management, modify labels, "
                         "trash/untrash, filters, settings. Full-text search with Gmail operators.",
                         ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "authorization": ("OAuth 2.0 with Gmail scopes (gmail.readonly, gmail.send, gmail.modify, gmail.labels). "
                          "Restricted scopes require app verification. Service accounts need domain-wide delegation.",
                          ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "webhooks": ("users.watch creates a push subscription to a Cloud Pub/Sub topic (1 day expiry, renew via "
                     "re-watch). Notifications carry historyId; fetch details via history.list.",
                     ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "polling": ("history.list from a stored historyId for incremental sync; messages.list with q for searches. "
                     "Persist the newest historyId per poll cycle.",
                     ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "rate-limits": ("Per-user quota units documented in the Gmail API quota reference (per-minute and per-day "
                        "limits). 429 on excess; exponential backoff. Verify current values in the docs.",
                        ["https://developers.google.com/workspace/gmail/api/reference/quota"]),
        "idempotency": ("No idempotency-key on send. Drafts give safe composition (create draft, then send). "
                         "Threading via References/In-Reply-To headers; dedup sends client-side by draft id.",
                         ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "effects": ("Sending mail, label changes, trash, filter creation, settings changes (vacation responder, sendAs). "
                    "Reads are side-effect-free (marking read is a label change).",
                    ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "reversibility": ("Trash is recoverable (untrash) for 30 days, then permanent. Sent mail cannot be unsent "
                          "(confidential mode expiry is not recall). Label changes are freely reversible.",
                          ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
        "provenance": ("Message id and threadId are stable; historyId versions mailbox state; internalDate is the "
                       "server receipt time; labelIds show current categorization; RFC Message-ID in headers.",
                       ["https://developers.google.com/workspace/gmail/api/reference/rest"]),
    }
}

INTEL2["hr"] = {
    "provider": "BambooHR",
    "aspects": {
        "objects": ("Employees (employee id, fields like firstName/lastName/jobTitle/department/workEmail/status), "
                    "time off, benefits, reports, applicant tracking. REST at https://api.bamboohr.com/api/gateway.php "
                    "with company subdomain. API key auth.",
                    ["https://documentation.bamboohr.com/docs", "https://documentation.bamboohr.com/reference"]),
        "events": ("Event-based webhooks: employee.created, employee.updated (with changedFields), employee.deleted. "
                   "Field-based (global) webhooks monitor configured fields. Payloads in JSON or form encoding.",
                   ["https://documentation.bamboohr.com/docs/event-based-webhooks",
                    "https://documentation.bamboohr.com/docs/global-webhooks"]),
        "capabilities": ("Employee directory, custom reports, time-off balances/requests, onboarding, performance. "
                         "Write surface is narrower than read; check the API reference per resource.",
                         ["https://documentation.bamboohr.com/docs", "https://documentation.bamboohr.com/reference"]),
        "authorization": ("API key per user (basic auth with key as password). Permissions follow the key owner's "
                          "BambooHR role. Webhook management needs admin.",
                          ["https://documentation.bamboohr.com/docs/getting-started"]),
        "webhooks": ("Event-based (recommended) or field-based payloads POSTed to HTTPS URLs. Signed with SHA-256 HMAC "
                     "(X-BambooHR-Signature + X-BambooHR-Timestamp headers); reject stale timestamps. Global webhooks via "
                     "admin UI; permissioned webhooks via POST /webhooks/.",
                     ["https://documentation.bamboohr.com/docs/event-based-webhooks",
                      "https://documentation.bamboohr.com/docs/global-webhooks"]),
        "polling": ("Employee directory list and custom reports for snapshots; track lastChanged timestamps client-side. "
                    "No cursor-based sync API; reports with changed-since filters are the polling pattern.",
                    ["https://documentation.bamboohr.com/docs", "https://documentation.bamboohr.com/reference"]),
        "rate-limits": ("Rate limits published in BambooHR developer documentation; exceeding returns errors. Verify "
                        "current values in the docs before hard-coding.",
                        ["https://documentation.bamboohr.com/docs"]),
        "idempotency": ("No idempotency-key. Employee updates keyed by employee id are naturally idempotent; "
                         "check-before-create on employee number/email for safe retry.",
                         ["https://documentation.bamboohr.com/docs", "https://documentation.bamboohr.com/reference"]),
        "effects": ("Employee record writes, time-off approvals, webhook configuration. Reads are side-effect-free.",
                    ["https://documentation.bamboohr.com/docs"]),
        "reversibility": ("employee.deleted webhook exists; deleted records are recoverable per BambooHR retention, not "
                          "via API undelete. Field changes are overwritten, not versioned, by the API.",
                          ["https://documentation.bamboohr.com/docs/event-based-webhooks"]),
        "provenance": ("Employee id stable; changedFields on update events names what changed; timestamps on payloads; "
                       "custom reports give as-of snapshots.",
                       ["https://documentation.bamboohr.com/docs/event-based-webhooks"]),
    }
}

INTEL2["phone"] = {
    "provider": "Twilio Voice",
    "aspects": {
        "objects": ("Calls (CallSid, from/to, status queued/ringing/in-progress/completed, direction, duration, price), "
                    "Recordings, Transcriptions, Queues, Conference participants. REST at "
                    "https://api.twilio.com/2010-04-01/Accounts/{sid}. TwiML directs call flow.",
                    ["https://www.twilio.com/docs/voice", "https://www.twilio.com/docs/voice/api"]),
        "events": ("StatusCallback webhooks on call state transitions (initiated, ringing, answered, completed) with "
                   "CallSid/CallStatus/Duration. No events-list API; state via callbacks or Call fetch.",
                   ["https://www.twilio.com/docs/voice"]),
        "capabilities": ("Initiate outbound calls, modify in-progress calls (redirect, hangup), create conferences, "
                         "record, gather DTMF/speech, send TwiML, look up caller info.",
                         ["https://www.twilio.com/docs/voice/api"]),
        "authorization": ("Account SID + Auth Token (HTTP basic). API keys with scoped permissions recommended over "
                          "master token. Subaccounts isolate usage.",
                          ["https://www.twilio.com/docs/voice"]),
        "webhooks": ("Twilio POSTs form-encoded callbacks to configured URLs (voiceUrl, statusCallback). Validate with "
                     "X-Twilio-Signature (HMAC-SHA1 over URL+params). Respond with TwiML or empty 200.",
                     ["https://www.twilio.com/docs/voice"]),
        "polling": ("Calls list with status/date filters and pagination for reconciliation. StatusCallback is primary; "
                    "polling is the fallback for missed callbacks.",
                    ["https://www.twilio.com/docs/voice/api"]),
        "rate-limits": ("Concurrency limits per account (concurrent call paths); REST API rate limits published in Twilio "
                        "docs. Exceeding returns 429/20429. Verify current values in the docs.",
                        ["https://www.twilio.com/docs/voice"]),
        "idempotency": ("No idempotency-key on call creation. Safe retry = list recent calls by from/to window before "
                        "re-creating; in-progress call modification by CallSid is idempotent.",
                        ["https://www.twilio.com/docs/voice/api"]),
        "effects": ("Placing calls (billable), sending callers into TwiML flows, recordings (storage + transcription "
                    "costs), conference creation. Reads are side-effect-free.",
                    ["https://www.twilio.com/docs/voice"]),
        "reversibility": ("In-progress calls can be redirected/hung up. Completed calls, charges, and recordings are "
                          "not reversible (recordings deletable).",
                          ["https://www.twilio.com/docs/voice/api"]),
        "provenance": ("CallSid stable per call; parent/child Sids link legs; recordings carry callSid + timestamps; "
                       "status callbacks give the transition log.",
                       ["https://www.twilio.com/docs/voice"]),
    }
}

INTEL2["sms"] = {
    "provider": "Twilio Messaging",
    "aspects": {
        "objects": ("Messages (MessageSid, from/to, body, status queued/sent/delivered/failed, direction, price, "
                    "errorCode), Media (MMS), Short codes / toll-free / 10DLC senders, Messaging Services (sender pools, "
                    "features).",
                    ["https://www.twilio.com/docs/messaging", "https://www.twilio.com/docs/messaging/api"]),
        "events": ("StatusCallback webhooks per message (sent, delivered, undelivered, failed) with MessageSid, "
                   "MessageStatus, ErrorCode. Inbound messages POST to the number's webhook URL.",
                   ["https://www.twilio.com/docs/messaging"]),
        "capabilities": ("Send SMS/MMS/WhatsApp (per channel), schedule messages, manage sender identities, opt-out "
                         "handling (STOP/HELP keywords), link shortening, delivery insights.",
                         ["https://www.twilio.com/docs/messaging/api"]),
        "authorization": ("Account SID + Auth Token (HTTP basic); API keys recommended. Messaging Service SIDs scope "
                          "sender pools per use case.",
                          ["https://www.twilio.com/docs/messaging"]),
        "webhooks": ("Form-encoded POSTs for inbound and status callbacks. X-Twilio-Signature validation (HMAC-SHA1). "
                     "Respond 200 with empty body or TwiML for replies.",
                     ["https://www.twilio.com/docs/messaging"]),
        "polling": ("Messages list with date/to/from filters for reconciliation. Delivery receipts via callbacks are "
                    "primary; polling fills gaps.",
                    ["https://www.twilio.com/docs/messaging/api"]),
        "rate-limits": ("Per-number throughput: long codes ~1 msg/sec (queueing), toll-free and 10DLC higher with "
                        "registered campaigns; short codes highest. Throughput limits published in Twilio docs.",
                        ["https://www.twilio.com/docs/messaging"]),
        "idempotency": ("No idempotency-key on message creation. Messaging Services with smart encoding dedup some "
                        "cases; safe retry = check recent messages to the same recipient before re-sending.",
                        ["https://www.twilio.com/docs/messaging/api"]),
        "effects": ("Sending messages (billable per segment), opt-out list changes, sender registration. Reads are "
                    "side-effect-free.",
                    ["https://www.twilio.com/docs/messaging"]),
        "reversibility": ("Sent messages cannot be recalled. Scheduled messages can be cancelled before send. Opt-outs "
                          "are reversible by the recipient texting START.",
                          ["https://www.twilio.com/docs/messaging/api"]),
        "provenance": ("MessageSid stable; status callbacks give delivery timeline; errorCode on failures; inbound "
                       "messages carry From/To/timestamp; segments counted for billing.",
                       ["https://www.twilio.com/docs/messaging"]),
    }
}

INTEL2["advertising"] = {
    "provider": "Meta Marketing API",
    "aspects": {
        "objects": ("AdAccount, Campaign, AdSet, Ad, AdCreative, Insights (async reports), CustomAudiences. Graph API "
                    "at https://graph.facebook.com/vXX.X/act_{ad_account_id}/. Nested: campaign -> adset -> ad.",
                    ["https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving",
                     "https://developers.facebook.com/docs/marketing-api"]),
        "events": ("No generic event stream. Insights async jobs poll for completion. Lead Ads have webhook "
                   "subscriptions (page subscribed to leadgen). Change log via object updated_time polling.",
                   ["https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving"]),
        "capabilities": ("Create/update campaigns/adsets/ads/creatives, manage budgets and bids, build custom audiences, "
                         "run insights reports, manage lead forms. Draft vs published states.",
                         ["https://developers.facebook.com/docs/marketing-api"]),
        "authorization": ("OAuth 2.0 with ads_management / ads_read / leads_retrieval scopes. System users and access "
                          "tokens per ad account; Business Manager gates access.",
                          ["https://developers.facebook.com/docs/marketing-api"]),
        "webhooks": ("Webhooks product: page subscriptions for leadgen events (new leads). App dashboard configures "
                     "callback URL; hub.verify_token handshake; X-Hub-Signature-256 validation.",
                     ["https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/retrieving"]),
        "polling": ("Insights async: POST report request, poll for completion, fetch results. Object lists with "
                     "updated_since filters for change detection.",
                     ["https://developers.facebook.com/docs/marketing-api"]),
        "rate-limits": ("Business Use Case rate limiting per app per ad account (ads API tiers). Throttling returns "
                        "error code 80004/17. Verify current values in the docs.",
                        ["https://developers.facebook.com/docs/marketing-api"]),
        "idempotency": ("No idempotency-key. Campaign/ad creates are not naturally idempotent; check-before-create by "
                        "name, or track created IDs client-side.",
                        ["https://developers.facebook.com/docs/marketing-api"]),
        "effects": ("Spending money: budget changes, bid changes, launching/pausing campaigns. Audience creation. "
                    "Reads and draft creates are side-effect-free until published.",
                    ["https://developers.facebook.com/docs/marketing-api"]),
        "reversibility": ("Campaigns/ads pausable and deletable; spend already incurred is not recoverable. Audience "
                          "deletion is permanent.",
                          ["https://developers.facebook.com/docs/marketing-api"]),
        "provenance": ("Object IDs stable; insights carry date_start/date_stop; ad account history logs changes; lead "
                       "payloads carry form and ad IDs.",
                       ["https://developers.facebook.com/docs/marketing-api"]),
    }
}

INTEL2["analytics"] = {
    "provider": "Google Analytics 4",
    "aspects": {
        "objects": ("Properties (properties/{id}), Data Streams, Events (eventName + params), Conversions, Audiences, "
                    "Custom dimensions/metrics. Data API v1: properties/{id}:runReport with dimensions/metrics/dateRanges. "
                    "Admin API for configuration.",
                    ["https://developers.google.com/analytics/devguides/reporting/data/v1",
                     "https://developers.google.com/analytics/devguides/reporting/data/v1/quotas"]),
        "events": ("GA4 is event-based: every hit is an event with parameters. Realtime API for current activity. No "
                   "webhook push; data accessed via Data API queries.",
                   ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "capabilities": ("Run reports (dimensions x metrics), realtime reports, funnel/exploration via UI only, admin "
                         "CRUD (properties, streams, conversions, audiences), measurement protocol for server events.",
                         ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "authorization": ("OAuth 2.0 with analytics.readonly / analytics.edit scopes. Service accounts with property "
                          "access. Measurement Protocol uses API secret.",
                          ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "webhooks": ("No native webhook delivery. Change detection = polling the Data API. Realtime API gives "
                     "minutes-fresh activity for trigger-style use.",
                     ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "polling": ("runReport with dateRanges sliding windows; track last run date client-side. Quota-aware scheduling "
                    "required for frequent polls.",
                    ["https://developers.google.com/analytics/devguides/reporting/data/v1/quotas"]),
        "rate-limits": ("Quota system: tokens per property per day/hour, concurrent requests, per-project limits. "
                        "Documented in the quotas reference; 429 on excess. Verify current values in the docs.",
                        ["https://developers.google.com/analytics/devguides/reporting/data/v1/quotas"]),
        "idempotency": ("Read-only reporting: queries are naturally idempotent. Measurement Protocol events dedup by "
                        "client via event timestamps; no server idempotency key.",
                        ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "effects": ("Reads are side-effect-free. Writes: admin changes (conversions, audiences), measurement-protocol "
                    "event ingestion (appends to the event stream).",
                    ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "reversibility": ("Events once collected cannot be deleted (data deletion requests are the mechanism, with "
                          "limits). Admin entities support delete; audiences are rebuildable.",
                          ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
        "provenance": ("Property ID scopes all data; event timestamps + user_pseudo_id give lineage; Data API responses "
                       "carry row counts and quota metadata; admin API has change history.",
                       ["https://developers.google.com/analytics/devguides/reporting/data/v1"]),
    }
}

INTEL2["chat"] = {
    "provider": "Slack",
    "aspects": {
        "objects": ("Conversations (channels: C*, DMs: D*, MPIM: G*), Messages (ts unique per channel), Users (U*), "
                    "Files, Reactions, Bookmarks, Workflows. Web API at https://slack.com/api/. Message ts = id.",
                    ["https://docs.slack.dev/reference/methods", "https://docs.slack.dev/apis/web-api"]),
        "events": ("Events API: HTTPS POSTs for message.channels, reaction_added, member_joined_channel, etc. Socket "
                    "Mode for websocket delivery without public HTTP. Retry on non-2xx with backoff.",
                    ["https://docs.slack.dev/apis/events-api", "https://docs.slack.dev/apis/web-api"]),
        "capabilities": ("Post/update/delete messages, manage channels, invite users, upload files, add reactions, "
                         "search, manage reminders, run workflows, admin analytics. Granular OAuth scopes per method.",
                         ["https://docs.slack.dev/reference/methods"]),
        "authorization": ("OAuth 2.0 with bot tokens (xoxb-) and user tokens (xoxp-); granular scopes "
                          "(channels:history, chat:write, users:read). Socket Mode uses app-level tokens (xapp-).",
                          ["https://docs.slack.dev/authentication"]),
        "webhooks": ("Events API subscriptions per event type with URL verification challenge. Signing secret "
                     "validates X-Slack-Signature (HMAC-SHA256 over version:timestamp:body). Incoming webhooks for "
                     "simple posting.",
                     ["https://docs.slack.dev/apis/events-api"]),
        "polling": ("conversations.history with cursor + oldest/latest timestamps for incremental read. "
                     "conversations.list with cursor for channel inventory.",
                     ["https://docs.slack.dev/reference/methods"]),
        "rate-limits": ("Tiered rate limits per method (tiers 1-4); x-ratelimit headers on responses; 429 with "
                        "Retry-After. Verify current tiers in the docs.",
                        ["https://docs.slack.dev/apis/web-api/rate-limits"]),
        "idempotency": ("chat.postMessage has no idempotency key; duplicate posts possible on retry. Safe pattern: "
                         "post then reconcile via conversations.history, or use unique message content markers.",
                         ["https://docs.slack.dev/reference/methods/chat.postMessage"]),
        "effects": ("Posting/editing/deleting messages, channel joins/invites, file uploads, workflow triggers. "
                    "Reads are side-effect-free.",
                    ["https://docs.slack.dev/reference/methods"]),
        "reversibility": ("Messages editable/deletable (chat.update/chat.delete) within workspace settings. Channel "
                          "archives reversible; deletions are not. File deletions permanent.",
                          ["https://docs.slack.dev/reference/methods"]),
        "provenance": ("Message ts + channel id is the stable identity; user id on every message; edited flag with "
                       "edit history; file ids stable; event payloads carry team_id and event_ts.",
                       ["https://docs.slack.dev/reference/methods"]),
    }
}

INTEL2["social"] = {
    "provider": "Meta Graph API",
    "aspects": {
        "objects": ("Pages, Posts (page-id_posts), Comments, Photos/Videos, Insights, AdAccounts. Graph API at "
                    "https://graph.facebook.com/vXX.X/{object-id}. Edges: /posts, /comments, /insights, /feed.",
                    ["https://developers.facebook.com/docs/graph-api"]),
        "events": ("Webhooks product: subscriptions to page fields (feed, mention, ratings). App dashboard configures "
                   "callback; hub verification handshake.",
                   ["https://developers.facebook.com/docs/graph-api/webhooks"]),
        "capabilities": ("Read page/post/comment objects, publish posts (pages), reply to comments, read insights, "
                         "manage page settings. Publishing needs pages_manage_posts.",
                         ["https://developers.facebook.com/docs/graph-api"]),
        "authorization": ("OAuth 2.0 with granular permissions (pages_read_engagement, pages_manage_posts, "
                          "pages_read_user_content). Page access tokens via /me/accounts.",
                          ["https://developers.facebook.com/docs/graph-api"]),
        "webhooks": ("HTTPS callback receives signed POSTs (X-Hub-Signature-256, HMAC-SHA256 with app secret). "
                     "Verify hub.verify_token on subscription. Retries on failure.",
                     ["https://developers.facebook.com/docs/graph-api/webhooks"]),
        "polling": ("Edge pagination with cursors (after/before); since/until time filters. Insights edges for metric "
                    "time series.",
                    ["https://developers.facebook.com/docs/graph-api"]),
        "rate-limits": ("Business Use Case rate limiting per app per page/business. Throttling errors on excess. "
                        "Verify current values in the docs.",
                        ["https://developers.facebook.com/docs/graph-api"]),
        "idempotency": ("No idempotency-key on publish. Duplicate posts possible on retry; check-before-publish via "
                        "recent /posts listing.",
                        ["https://developers.facebook.com/docs/graph-api"]),
        "effects": ("Publishing posts/comments (public), page setting changes. Reads are side-effect-free.",
                    ["https://developers.facebook.com/docs/graph-api"]),
        "reversibility": ("Posts/comments deletable via API. Published-then-deleted leaves no tombstone for viewers. "
                          "Insights data immutable.",
                          ["https://developers.facebook.com/docs/graph-api"]),
        "provenance": ("Object IDs stable; created_time on all objects; from{} attribution; insights carry metric "
                       "period boundaries.",
                       ["https://developers.facebook.com/docs/graph-api"]),
    }
}

INTEL2["ecommerce"] = {
    "provider": "Shopify",
    "aspects": {
        "objects": ("Products, Variants, Orders (financial_fulfillment_status), Customers, DraftOrders, Inventory levels, "
                    "Fulfillments, Refunds, Discounts. Admin REST at /admin/api/{version}/ plus GraphQL. Order risk, "
                    "metafields for custom data.",
                    ["https://shopify.dev/docs/api", "https://shopify.dev/docs/api/admin-rest"]),
        "events": ("Shopify webhooks: orders/create, orders/updated, products/update, inventory_levels/update, "
                   "fulfillments/create, refunds/create, customers/create. EventBridge / PubSub delivery options.",
                   ["https://shopify.dev/docs/api/webhooks"]),
        "capabilities": ("Product/order/customer CRUD, draft orders, fulfillments, refunds, discounts, inventory "
                         "adjustment, storefront via Storefront API, checkout via Checkout API.",
                         ["https://shopify.dev/docs/api"]),
        "authorization": ("OAuth 2.0 with granular access scopes (read_products, write_orders). Custom apps get Admin "
                          "API tokens. Webhook HMAC with client secret.",
                          ["https://shopify.dev/docs/api/authentication"]),
        "webhooks": ("HTTPS endpoints subscribed per topic. X-Shopify-Hmac-Sha256 header validation (HMAC-SHA256 of "
                     "raw body with client secret). Retries with backoff on failure.",
                     ["https://shopify.dev/docs/api/webhooks"]),
        "polling": ("REST with since_id / updated_at_min filters and cursor pagination. GraphQL bulk operations for "
                    "large exports. Track last sync timestamp client-side.",
                    ["https://shopify.dev/docs/api/usage"]),
        "rate-limits": ("Leaky-bucket rate limits (REST: 2 req/sec with 40 bucket; GraphQL: cost-based points). 429 "
                        "with Retry-After. Verify current values in the docs.",
                        ["https://shopify.dev/docs/api/usage/rate-limits"]),
        "idempotency": ("No idempotency-key on most writes. Draft orders give safe composition before completion. "
                         "Check-before-create by SKU/handle; orders naturally unique per checkout.",
                         ["https://shopify.dev/docs/api"]),
        "effects": ("Creating orders/discounts/refunds (money movement), inventory adjustments, product publishing, "
                    "customer creation. Reads are side-effect-free.",
                    ["https://shopify.dev/docs/api"]),
        "reversibility": ("Orders cancellable; refunds reversible only by new charges; inventory adjustments are "
                          "audited, not undone; deleted products restorable from trash briefly.",
                          ["https://shopify.dev/docs/api/admin-rest"]),
        "provenance": ("IDs stable per object; admin_graphql_api_id gives global identity; updated_at versions "
                       "changes; webhook payloads carry shop domain + topic + timestamps.",
                       ["https://shopify.dev/docs/api/webhooks"]),
    }
}

INTEL2["field-service"] = {
    "provider": "Jobber",
    "aspects": {
        "objects": ("Clients, Properties, Jobs (lineItems, totals), Visits (scheduled work), Quotes, Invoices, "
                    "Payments, Requests. GraphQL at https://api.getjobber.com/api/graphql with version header "
                    "X-JOBBER-GRAPHQL-VERSION.",
                    ["https://developer.getjobber.com/docs/"]),
        "events": ("Webhook topics: CLIENT_CREATE/UPDATE, JOB_CREATE/UPDATE, INVOICE_UPDATE/PAID, VISIT_COMPLETE/UPDATE. "
                   "Payload shape: { data: { webHookEvent: { topic, appId, accountId, itemId, occurredAt } } }.",
                   ["https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks/"]),
        "capabilities": ("Client/job/visit/quote/invoice CRUD via GraphQL mutations, scheduling visits, completing "
                         "visits, sending invoices, recording payments, closing jobs.",
                         ["https://developer.getjobber.com/docs/"]),
        "authorization": ("OAuth 2.0 (client ID/secret from Developer Center; scopes configured in the app, not passed "
                          "as scope param). Short-lived access tokens with refresh rotation.",
                          ["https://developer.getjobber.com/docs/"]),
        "webhooks": ("Webhook endpoints created via API with URL + topics. Signed HMAC-SHA256 (base64) in "
                     "x-jobber-hmac-sha256 using the OAuth client_secret as key; includes subscription verification "
                     "handshake. At-least-once delivery.",
                     ["https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks/"]),
        "polling": ("GraphQL queries with first/after pagination and sort/filter (e.g. clients sort CREATED_AT DESC, "
                    "invoices filter invoiceStatus). No cursor-based sync feed.",
                    ["https://developer.getjobber.com/docs/"]),
        "rate-limits": ("Rate limits documented in Jobber developer docs (cost-based limits on GraphQL). Verify "
                        "current values in the docs; back off on throttling errors.",
                        ["https://developer.getjobber.com/docs/"]),
        "idempotency": ("No idempotency-key on mutations. Check-before-create by client email/phone; job creates are "
                         "not naturally idempotent. Track created IDs client-side.",
                         ["https://developer.getjobber.com/docs/"]),
        "effects": ("Creating jobs/visits (scheduling real work), sending invoices, recording payments, client "
                    "creation. Reads are side-effect-free.",
                    ["https://developer.getjobber.com/docs/"]),
        "reversibility": ("Visits can be unscheduled; jobs closable; invoices voidable. Payments recorded in error "
                          "need correcting entries; no un-send of sent invoices.",
                          ["https://developer.getjobber.com/docs/"]),
        "provenance": ("Global encoded IDs (Z2lkOi8vSm9iYmVyL...) stable; occurredAt on webhook events; accountId "
                       "scopes multi-account apps; line item history on jobs.",
                       ["https://developer.getjobber.com/docs/"]),
    }
}

INTEL2["inventory"] = {
    "provider": "Cin7 Core (DEAR Inventory)",
    "aspects": {
        "objects": ("Products (SKU, costing method, price tiers), ProductFamilies, Sale/Purchase lists, Stock "
                    "(location quantities), Customers, Suppliers. REST at "
                    "https://inventory.dearsystems.com/externalapi/v2/. JSON only.",
                    ["https://dearinventory.docs.apiary.io/"]),
        "events": ("No native webhook push documented for Core API. Change detection via list endpoints with "
                    "UpdatedDate filters (>, >=). Polling is the integration pattern.",
                    ["https://dearinventory.docs.apiary.io/"]),
        "capabilities": ("Product CRUD, stock queries and adjustments, sale/purchase order lists, customer/supplier "
                         "records, price tiers. Subset of UI functionality; check endpoint help pages.",
                         ["https://dearinventory.docs.apiary.io/"]),
        "authorization": ("Account ID + API Application Key created under Integrations > API in the app. Per-request "
                          "headers; no OAuth.",
                          ["https://dearinventory.docs.apiary.io/#introduction/api-introduction"]),
        "webhooks": ("No webhook delivery in the Core v2 API per current docs. Design integrations around polling "
                     "with UpdatedDate filters.",
                     ["https://dearinventory.docs.apiary.io/"]),
        "polling": ("SaleList/PurchaseList filter UpdatedDate; Products/ProductFamilies filter UpdatedDate (>=). "
                     "Persist last poll timestamp client-side.",
                     ["https://dearinventory.docs.apiary.io/"]),
        "rate-limits": ("API call limits apply per plan; exceeding returns errors. Verify current values in the docs. "
                        "Queue requests and retry on network failure.",
                        ["https://dearinventory.docs.apiary.io/"]),
        "idempotency": ("No idempotency-key. Stock adjustments are additive; safe retry requires check-before-adjust "
                         "or tracking adjustment references client-side.",
                         ["https://dearinventory.docs.apiary.io/"]),
        "effects": ("Stock adjustments (real inventory counts), sale/purchase creation, price changes. Reads are "
                    "side-effect-free.",
                    ["https://dearinventory.docs.apiary.io/"]),
        "reversibility": ("Stock changes are ledger entries, corrected by offsetting adjustments, not deletion. "
                          "Product edits overwrite; no version restore via API.",
                          ["https://dearinventory.docs.apiary.io/"]),
        "provenance": ("Product IDs/SKUs stable; LastModifiedOn versions records; sale/purchase lists carry "
                       "timestamps; location-scoped stock gives per-site lineage.",
                       ["https://dearinventory.docs.apiary.io/"]),
    }
}

INTEL2["pos"] = {
    "provider": "Square",
    "aspects": {
        "objects": ("Payments, Orders (line items, taxes, discounts, fulfillments), Customers, Catalog (items, "
                    "variations, pricing), Locations, Invoices, Refunds, Inventory. REST at "
                    "https://connect.squareup.com/v2/. Money in minor units.",
                    ["https://developer.squareup.com/docs/payments-api/overview",
                     "https://developer.squareup.com/docs/orders-api/what-it-does"]),
        "events": ("Webhooks: payment.created/updated, order.created/updated, refund.created/updated, "
                   "inventory.count.updated, customer.created. Payment data nested under data.object.payment.",
                   ["https://developer.squareup.com/docs/payments-api/webhooks",
                    "https://developer.squareup.com/docs/webhooks/overview"]),
        "capabilities": ("Take payments, manage orders, refunds, invoices, catalog sync, customer profiles, inventory "
                         "counts, gift cards, loyalty. Sandbox for testing.",
                         ["https://developer.squareup.com/docs"]),
        "authorization": ("Personal access tokens for single-merchant; OAuth 2.0 (authorization code grant, scopes "
                          "like PAYMENTS_WRITE) for multi-merchant. Sandbox vs production credentials.",
                          ["https://developer.squareup.com/docs/oauth-api/overview"]),
        "webhooks": ("Subscriptions configured in Developer Dashboard with notification URL. "
                     "x-square-hmacsha256-signature (HMAC-SHA256 of raw body + URL with signature key). Verify before "
                     "parsing. Fulfill only on COMPLETED payments.",
                     ["https://developer.squareup.com/docs/webhooks/overview"]),
        "polling": ("List payments/orders with begin_time/end_time filters and cursors. Webhook-first, poll for "
                     "reconciliation.",
                     ["https://developer.squareup.com/docs/payments-api/overview"]),
        "rate-limits": ("Rate limits per API documented by Square; 429 on excess with backoff. Verify current values "
                        "in the docs.",
                        ["https://developer.squareup.com/docs"]),
        "idempotency": ("idempotency_key REQUIRED on payment/order creation; Square dedups within 24h. Safe retry = "
                        "reuse the same key.",
                        ["https://developer.squareup.com/docs/payments-api/overview"]),
        "effects": ("Charging cards (money movement), refunds, order state changes, inventory decrements, invoice "
                    "sending. Reads are side-effect-free.",
                    ["https://developer.squareup.com/docs/payments-api/overview"]),
        "reversibility": ("Payments refundable (partial/full); completed charges not reversible except by refund. "
                          "Inventory counts correctable; catalog edits versioned in change log.",
                          ["https://developer.squareup.com/docs"]),
        "provenance": ("Payment/order IDs stable; event_id on webhooks for dedup; version fields on objects "
                       "(optimistic concurrency); location_id scopes every transaction.",
                       ["https://developer.squareup.com/docs/webhooks/overview"]),
    }
}

INTEL2["project-mgmt"] = {
    "provider": "Asana",
    "aspects": {
        "objects": ("Workspaces, Projects, Tasks (gid, name, assignee, due dates, custom_fields, stories/comments), "
                    "Sections, Tags, Portfolios, Goals, Users, Attachments. REST v1 at https://app.asana.com/api/1.0/.",
                    ["https://developers.asana.com/"]),
        "events": ("Events API: poll per resource for change streams. Webhooks: create per resource with target URL; "
                   "handshake via ?verify on creation; signed delivery.",
                   ["https://developers.asana.com/docs/webhooks",
                    "https://developers.asana.com/docs/events"]),
        "capabilities": ("Task/project CRUD, sections, custom fields, comments (stories), attachments, portfolios, "
                         "goals, status updates, batch API, search. Rules automation via UI/API.",
                         ["https://developers.asana.com/"]),
        "authorization": ("OAuth 2.0 or Personal Access Tokens (bearer). Scopes per resource. Service accounts for "
                          "server-to-server.",
                          ["https://developers.asana.com/docs/authentication"]),
        "webhooks": ("POST /webhooks with resource gid + target; Asana verifies the target with a handshake. "
                     "X-Hook-Signature (HMAC-SHA256 with client secret) validates delivery. Filter per event type.",
                     ["https://developers.asana.com/docs/webhooks"]),
        "polling": ("GET /events?resource={gid}&sync={token} returns changes + new sync token. Persist sync tokens "
                    "per resource; expired tokens need resync.",
                    ["https://developers.asana.com/docs/events"]),
        "rate-limits": ("Per-minute limits: 1500/min paid domains, 150/min free; 50 concurrent reads/writes; search "
                        "lower (60/min). 429 with Retry-After. Verify current values in the docs.",
                        ["https://developers.asana.com/docs/rate-limits"]),
        "idempotency": ("No idempotency-key. Task creates not naturally idempotent; check-before-create by name in "
                         "project, or track created gids. Updates keyed by gid are idempotent.",
                         ["https://developers.asana.com/"]),
        "effects": ("Creating/assigning tasks (notifications to assignees), project changes, status updates. Reads "
                    "are side-effect-free.",
                    ["https://developers.asana.com/"]),
        "reversibility": ("Tasks/projects deletable (trash, recoverable briefly); completed state togglable; stories "
                          "append-only (comments not editable via API in some plans).",
                          ["https://developers.asana.com/"]),
        "provenance": ("GIDs stable; created_at/modified_at versions; stories give the audit trail per task; "
                       "webhook events carry change details with timestamps.",
                       ["https://developers.asana.com/"]),
    }
}

INTEL2["support"] = {
    "provider": "Zendesk",
    "aspects": {
        "objects": ("Tickets (id, subject, status, priority, requester, assignee, tags, custom_fields), Users, "
                    "Organizations, Groups, Macros, Views, Triggers, Automations, Satisfaction ratings. REST at "
                    "https://{subdomain}.zendesk.com/api/v2/. Cursor pagination.",
                    ["https://developer.zendesk.com", "https://developer.zendesk.com/api-reference/introduction/pagination/"]),
        "events": ("Incremental exports API (/incremental/tickets/cursor) for change streams. Webhooks (signed, "
                   "HMAC) for triggers/automations. Sidekiq-style retry on failure.",
                   ["https://developer.zendesk.com"]),
        "capabilities": ("Ticket CRUD, comments (public/private), assignment, tags, custom fields, macros, views, "
                         "triggers/automations management, user/org management, search.",
                         ["https://developer.zendesk.com"]),
        "authorization": ("API token (email/token basic auth), OAuth 2.0 for apps. Rate limits per plan; token "
                          "permissions follow the user role.",
                          ["https://developer.zendesk.com"]),
        "webhooks": ("Webhooks configured in Admin Center; signed with HMAC secret (X-Zendesk-Webhook-Signature). "
                     "Triggered from triggers/automations with JSON payload.",
                     ["https://developer.zendesk.com"]),
        "polling": ("Incremental ticket export with cursor; persist cursor per poll. start_time filter for bounded "
                    "backfills.",
                    ["https://developer.zendesk.com/api-reference/introduction/pagination/"]),
        "rate-limits": ("Usage limits per plan documented in the API reference (per-minute caps). 429 with "
                        "Retry-After. Verify current values in the docs.",
                        ["https://developer.zendesk.com/api-reference/ticketing/account-configuration/usage_limits/"]),
        "idempotency": ("No idempotency-key on ticket creation. Safe retry = search recent tickets by external_id "
                         "before create; external_id gives client-side dedup.",
                         ["https://developer.zendesk.com"]),
        "effects": ("Creating/updating tickets (customer notifications), assignment changes, macro application. "
                    "Reads are side-effect-free.",
                    ["https://developer.zendesk.com"]),
        "reversibility": ("Tickets closable/deletable; deleted tickets restorable briefly. Comments immutable once "
                          "posted. Merges are not un-mergeable.",
                          ["https://developer.zendesk.com"]),
        "provenance": ("Ticket IDs stable; audits endpoint gives the full change history per ticket; events carry "
                       "timestamps and actor IDs.",
                       ["https://developer.zendesk.com"]),
    }
}

INTEL2["ticketing"] = {
    "provider": "Freshdesk",
    "aspects": {
        "objects": ("Tickets (id, subject, status, priority, source, requester, responder, tags, custom_fields), "
                    "Conversations (replies; initiating message is in the ticket description), Notes, Contacts, "
                    "Companies, Agents, Groups, Solutions. REST v2 at https://{domain}.freshdesk.com/api/v2.",
                    ["https://developers.freshdesk.com/api/"]),
        "events": ("Webhooks via Admin > Workflows > Automations: trigger webhook on ticket create/update with "
                   "configurable JSON payloads (ticket.id, status, subject, contact fields).",
                   ["https://support.freshdesk.com/support/solutions/folders/272646"]),
        "capabilities": ("Ticket CRUD, replies/notes, assignment, priorities, SLAs, canned responses, knowledge base, "
                         "satisfaction surveys, time entries. API available on paid plans.",
                         ["https://developers.freshdesk.com/api/"]),
        "authorization": ("API key (basic auth with key as password). Permissions follow the agent role. Rate limits "
                          "per plan.",
                          ["https://developers.freshdesk.com/api/"]),
        "webhooks": ("Automation-triggered POSTs to configured URLs with ticket placeholders. No platform signature; "
                      "authenticate with a shared secret in headers or URL token.",
                      ["https://support.freshdesk.com/support/solutions/folders/272646"]),
        "polling": ("List tickets with page/per_page and updated_since filters, ordered by updated_at. Persist last "
                    "poll timestamp.",
                    ["https://developers.freshdesk.com/api/#list_all_tickets"]),
        "rate-limits": ("Per-plan rate limits documented in the API reference. 429 on excess; backoff. Verify "
                        "current values in the docs.",
                        ["https://developers.freshdesk.com/api/"]),
        "idempotency": ("No idempotency-key. Safe retry = check recent tickets (same requester + subject window) "
                         "before create.",
                         ["https://developers.freshdesk.com/api/"]),
        "effects": ("Creating tickets/replies (customer notifications), status changes, assignment. Reads are "
                    "side-effect-free.",
                    ["https://developers.freshdesk.com/api/"]),
        "reversibility": ("Tickets deletable (with limits); replies immutable once sent. Status changes freely "
                          "reversible.",
                          ["https://developers.freshdesk.com/api/"]),
        "provenance": ("Ticket IDs stable; conversations carry created_at and user_id; ticket history via activities; "
                       "webhook payloads include ticket.id and timestamps.",
                       ["https://developers.freshdesk.com/api/"]),
    }
}
