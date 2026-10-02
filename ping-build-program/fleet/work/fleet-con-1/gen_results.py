import json, os

OUT = os.path.expanduser("~/workspace/ping-build-program/fleet/results/connector")
os.makedirs(OUT, exist_ok=True)
W = "~/workspace/ping-build-program/fleet/work/fleet-con-1"

domains = {
  "crm": ("HubSpot", W+"/crm-hubspot.md"),
  "erp": ("NetSuite", W+"/erp-netsuite.md"),
  "accounting": ("QuickBooks Online", W+"/accounting-qbo.md"),
  "payments": ("Stripe", W+"/payments-stripe.md"),
  "banking": ("Plaid", W+"/banking-plaid.md"),
}
aspects = ["objects","events","capabilities","authorization","webhooks","polling",
           "rate-limits","idempotency","effects","reversibility","provenance"]

summary = {
 # crm
 ("crm","objects"): "HubSpot CRM API v3: uniform /crm/v3/objects/{type} surface for contacts, companies, deals, tickets, line_items, products, quotes, calls, emails, custom objects. PK hs_object_id; properties opt-in; dedup keys email (contacts) / domain (companies). Citations in note.",
 ("crm","events"): "Change events via Webhooks v3 subscriptions (creation/deletion/property-change per object) plus engagements as CRM objects and marketing email-event streams. No generic events API. PING ingests as OBSERVATION.",
 ("crm","capabilities"): "CRUD, batch read/create/update/archive, upsert by unique property, search with filterGroups, property-schema discovery, pipelines/stages, owners, associations, workflow enrollment — all behind granular OAuth scopes.",
 ("crm","authorization"): "OAuth 2.0 public apps with granular scopes (crm.objects.<type>.read/write); private apps use long-lived access tokens. Legacy API keys removed. Effective auth = scopes x portal permissions.",
 ("crm","webhooks"): "Webhooks API v3: up to 1000 subscriptions/app; delivery batches up to 100 events/POST, 10 concurrent, 5s response SLA, ~10 retries over 24h; X-HubSpot-Signature-v3 + timestamp HMAC-SHA256, 5-min replay cutoff; deliveries exempt from API rate limits.",
 ("crm","polling"): "Incremental via hs_lastmodifieddate merge key (Airbyte pattern), after-cursor pagination, search API for filters. Webhooks primary, polling as reconciliation.",
 ("crm","rate-limits"): "Burst per 10s: 100 Free/Starter, 190 Pro/Enterprise, 110 marketplace OAuth; daily per account: 250k/625k/1M; Search API 5 req/s; batch up to 100 records/request. 429 on exceed.",
 ("crm","idempotency"): "No native idempotency-key header. Achieved via unique-property upsert (?idProperty=email) and dedup keys; deals/tickets lack dedup — connector must check-before-create. Shape documented with this limitation.",
 ("crm","effects"): "Writes create/update/archive records and associations, enroll workflows (can send emails), fire webhooks. Reads side-effect-free.",
 ("crm","reversibility"): "DELETE is soft: recycle bin, restorable via HubSpot UI within 90 days (properties+associations+activities recovered). No public API restore endpoint; after 90 days unrecoverable without external backup. Permanent (GDPR) delete is irreversible.",
 ("crm","provenance"): "createdate/lastmodifieddate, propertiesWithHistory (per-version values), hs_object_id, association types, archived flag, hubspot_owner_id, webhook payload timestamps. Lineage-ready.",
 # erp
 ("erp","objects"): "NetSuite SuiteTalk REST: /record/v1/{recordType} CRUD across standard records (customer, invoice, salesOrder, item, vendor, journalEntry...), SuiteQL (POST /query/v1/suiteql, 100k rows max), metadata-catalog for dynamic schema discovery. Sublists/subrecords supported.",
 ("erp","events"): "No generic events API. Change detection via SuiteQL/lastModified polling, saved-search REST reads, native Event Subscriptions (webhooks) with builtin per-call log, or custom SuiteScript User Event Scripts pushing outbound HTTPS.",
 ("erp","capabilities"): "CRUD on most record types, batch add/update/upsert/delete (max 100 records/request), SuiteQL read, saved-search read, metadata discovery, custom RESTlets. Upsert requires external ID field.",
 ("erp","authorization"): "OAuth 2.0 (authorization-code + client-credentials) for REST web services and RESTlets; legacy TBA (OAuth 1.0). Scopes rest_webservices/restlets/suite_analytics; effective auth = scopes x NetSuite role (RBAC delegation). SOAP does not support OAuth 2.0. Tokens ~60 min.",
 ("erp","webhooks"): "Native Event Subscriptions (Setup > Integration): realtime POST to external services on record changes with builtin log (call, payload, response code, errors). Concurrency ~2 handlers shared accounts / ~10 dedicated. DIY alternative: User Event Scripts.",
 ("erp","polling"): "SuiteQL with dateModified filters or saved-search REST reads; batch read caps 100/batch, 1000/request list caps. getIntegrationGovernanceInfo lets clients check headroom before bursting.",
 ("erp","rate-limits"): "Concurrency + frequency governance, account/tier-specific: concurrency pool (~20 typical), per-user RESTlet sublimit (5 concurrent), 60s and 24h windows. REST->429, SOAP->403/faults, RESTlet->400 SSS_REQUEST_LIMIT_EXCEEDED. Numbers are account-specific: detect and back off, never hardcode.",
 ("erp","idempotency"): "No native idempotency-key header documented. Idempotent writes via externalId-based upsert on supported record types. SuiteQL reads naturally idempotent.",
 ("erp","effects"): "Writes create business facts with accounting consequences (postings, order->invoice transforms, inventory moves); User Event Scripts/workflows can fire on save. Reads side-effect-free.",
 ("erp","reversibility"): "NEEDS VERIFICATION: record-type-specific; posted accounting records generally not hard-deletable via API; corrections via reversing/compensating entries, not rollback. Connector must model ERP writes as business-irreversible. Followup to confirm per record type.",
 ("erp","provenance"): "created/lastModified audit fields + creator, SuiteQL-selectable system fields, event-subscription outbound log, SuiteScript execution logs. Lineage-capable.",
 # accounting
 ("accounting","objects"): "QBO entities: Customer, Invoice, Item, Payment, Bill, Vendor, Account, CreditMemo, RefundReceipt, JournalEntry, TaxAgency + report objects (P&L, Balance Sheet, A/R aging). Wrapper {Entity, SyncToken, MetaData{CreateTime,LastUpdatedTime}}. Full + sparse updates.",
 ("accounting","events"): "Event Notifications (webhooks) for create/update/delete/void/merge on ~24 entities; Change Data Capture (GET .../cdc?entities=..&changedSince=.., 30-day window, 1000/request) for sync/backfill/reconnect. Webhook payloads carry entity+operation+company only; follow-up fetch required. CloudEvents payload migration deadline 2026-07-31.",
 ("accounting","capabilities"): "Per-entity CRUD, query-language endpoint, batch (10 payloads/batch), sparse update, CDC, reports. Webhooks only for OAuth2-authorized companies.",
 ("accounting","authorization"): "OAuth 2.0 via Intuit identity platform; scopes like com.intuit.quickbooks.accounting (request smallest set). Access tokens ~60 min; refresh tokens rotate (~100-day window, persist latest).",
 ("accounting","webhooks"): "Register endpoint + entity/event subscriptions in Intuit Developer Portal. POST notifications with verifier-token validation; must respond within 1s (process async). No history backfill; not gap-free: pair with CDC.",
 ("accounting","polling"): "CDC endpoint as the polling surface (changedSince cursor). Query endpoint + LastUpdatedTime filters as secondary. Webhooks primary, CDC the reconciliation layer.",
 ("accounting","rate-limits"): "Official Intuit guidance per realm: 10 concurrent req/s, 500 req/min; batch separately metered 40 batch req/min, 10 payloads/batch; reports metered separately. 429/403 on exceed; respect Retry-After; exponential backoff. Metered API pricing exists (call volume has direct cost).",
 ("accounting","idempotency"): "Native: unique request-id query param replays original response (playback on outages); without it, repeats create duplicates. SyncToken optimistic locking on every write (concurrency-safe; combine with request-id for safe retries).",
 ("accounting","effects"): "Writes post financial facts: invoices create receivables, payments apply (deleting a payment un-applies and restores balance), refunds create RefundReceipts. Reads/query/reports/CDC side-effect-free.",
 ("accounting","reversibility"): "Invoices voidable/deletable pre-payment; payments deletable/voidable with balance restoration; RefundReceipts reversible on delete/void. Post-close corrections require new correcting transactions, never silent edits. Reversal = compensating financial transactions.",
 ("accounting","provenance"): "MetaData (CreateTime, LastUpdatedTime, CreatedByRef, LastModifiedByRef), SyncToken revision chain, stable entity Id, webhook entity+operation+realm+time, CDC change sets. First-class audit trail.",
 # payments
 ("payments","objects"): "Stripe objects: PaymentIntent, Charge, Customer, Invoice, Subscription, Price, Product, BalanceTransaction, Payout, Refund, Dispute, Checkout Session, PaymentMethod, Event, WebhookEndpoint. Uniform shape: id, object, created, livemode, metadata, expandable resources; cursor pagination starting_after/ending_before (max 100/page).",
 ("payments","events"): "First-class /v1/events stream (retained 30 days): id, type (payment_intent.succeeded, charge.refunded, invoice.payment_failed...), data.object snapshot, api_version, livemode. Backfill via /v1/<resource> lists, incremental via /v1/events. Reconciliation-job pattern documented.",
 ("payments","capabilities"): "Full customer/product/price CRUD; PaymentIntent lifecycle (create/confirm/capture/cancel); Checkout Sessions; refunds full/partial; dispute evidence; payouts; subscriptions with proration control; invoice finalize/void/pay; webhook endpoint CRUD; balance reads. GETs side-effect-free.",
 ("payments","authorization"): "Secret keys (sk_live_/sk_test_) via basic-auth username or Bearer; <redacted> with least privilege; publishable keys (pk_) client-side only; webhook endpoint secrets (whsec_) separate; Stripe Connect OAuth for platforms. Never expose secret key client-side.",
 ("payments","webhooks"): "POST Event JSON to HTTPS endpoints; verify via constructEvent on raw body (HMAC-SHA256 over timestamp.payload, whsec_ secret); reject stale (>5 min) signatures; retried with backoff on non-2xx; ack 2xx fast, heavy work async; dedupe by event.id; pin endpoint API version (drift risk vs account default).",
 ("payments","polling"): "List endpoints + /v1/events with created[gte]/starting_after cursors; Estuary list-backfill + events-incremental pattern. Events retained 30 days: poll cadence well inside that window; periodic reconciliation job as drift safety.",
 ("payments","rate-limits"): "Official (docs.stripe.com/rate-limits): global 100 req/s live, 25 req/s sandbox; per-endpoint 25 req/s; tighter buckets: PI 1000 updates/object/hour, subscriptions 10 new invoices/min (20/day), Files 20+20/s, payouts 15 creates/s + 30 concurrent, Connect account create 30/s live (5/s sandbox), Search 20 reads/s. 429 + Stripe-Rate-Limited-Reason header; separate concurrency limits.",
 ("payments","idempotency"): "First-class: Idempotency-Key header (<=255 chars, per account) on POSTs. Same key+params replays original response (Idempotent-Replayed: true, retained >=24h); same key+different params rejected; concurrent duplicates serialized; validation failures not stored (safe to retry same key).",
 ("payments","effects"): "POSTs move money: confirm/capture charges cards, refunds move money back, payouts move funds to bank. All money movement final at network level; reversal only via compensating ops (refund). Test mode side-effect-free against real money (contract-test safe).",
 ("payments","reversibility"): "No un-charge: reversal only via Refund (new BalanceTransaction); disputes are cardholder-initiated (evidence submission only); uncaptured PaymentIntents cancelable (releases hold). Payments writes are business-irreversible: model as append-only events with compensating refunds.",
 ("payments","provenance"): "Immutable id, created, livemode, balance_transaction linkage, metadata map, version-pinned responses; events carry id/type/created/api_version + object snapshot at event time; idempotency replay headers; Sigma/audit logs. Money-movement audit ready.",
 # banking
 ("banking","objects"): "Plaid: Item (connected bank login, the sync unit), Account (checking/savings/credit/loan/investment + balances), Transaction (merchant, amount, pending/posted, Plaid category taxonomy), Identity, Liabilities, Holdings/Securities, Institution. All reads are POSTs with access_token in body.",
 ("banking","events"): "Webhook types: TRANSACTIONS (SYNC_UPDATES_AVAILABLE, INITIAL_UPDATE, HISTORICAL_UPDATE, DEFAULT_UPDATE, TRANSACTIONS_REMOVED), ITEM (ERROR/ITEM_LOGIN_REQUIRED/ITEM_LOCKED, PENDING_EXPIRATION, USER_PERMISSION_REVOKED), AUTH, IDENTITY, HOLDINGS. Notifications only; delivery NOT guaranteed — pair with periodic sync. HMAC-SHA256 verification via /webhook_verification_key/get.",
 ("banking","capabilities"): "Read-only by design: link token create, token exchange, /transactions/sync (cursor incremental), /accounts/get, /accounts/balance/get, /identity/get, /liabilities/get, holdings, institutions search, /item/remove (disconnect). No money movement, no institution writes. Safest family for the contract test kit.",
 ("banking","authorization"): "Three tiers: PLAID-CLIENT-ID + PLAID-SECRET headers (link token create, institutions search, sandbox); access_token per Item in request body (encrypt at rest, password-grade); JWK webhook verification key. Flow: link token -> Plaid Link UI -> public token -> exchange for access token. Secrets never reach client.",
 ("banking","webhooks"): "Endpoint receives {webhook_type, webhook_code, item_id, error?}; SYNC_UPDATES_AVAILABLE triggers /transactions/sync; ITEM_LOGIN_REQUIRED marks reauth needed (Link update mode). Events may arrive out of order: dedupe + order tolerance required; HMAC-SHA256 verify.",
 ("banking","polling"): "/transactions/sync with cursor -> {added[], modified[], removed[], next_cursor, has_more}; persist cursor per sync; up to 24 months history; institutions refresh 1-4x/day. Webhooks-first is documented guidance; periodic reconciliation sync as fallback.",
}

key_urls = {
 "crm": "https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines",
 "erp": "https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html",
 "accounting": "http://help.developer.intuit.com/s/article/QuickBooks-Online-API-Best-Practices",
 "payments": "https://docs.stripe.com/rate-limits",
 "banking": "https://plaid.com/docs/api/",
}

n = 0
for domain in ["crm","erp","accounting","payments"]:
    prov, note = domains[domain]
    for aspect in aspects:
        n += 1
        mid = f"CON-{n:04d}"
        v, conf, fol = "PROVEN", 0.85, None
        if (domain,aspect)==("erp","reversibility"):
            v, conf = "NEEDS-FOLLOWUP", 0.6
            fol = "Verify per-record-type reversibility (delete constraints, reversing-entry requirements) against docs.oracle.com record help before any ERP write implementation."
        rec = {
          "mission_id": mid,
          "verdict": v,
          "summary": f"[{prov}] {aspect}: " + summary[(domain,aspect)],
          "evidence_files": [note, key_urls[domain]],
          "confidence": conf,
          "followup": fol,
        }
        json.dump(rec, open(f"{OUT}/{mid}.json","w"), indent=2)
for aspect in aspects[:6]:
    n += 1
    mid = f"CON-{n:04d}"
    prov, note = domains["banking"]
    rec = {
      "mission_id": mid,
      "verdict": "PROVEN",
      "summary": f"[{prov}] {aspect}: " + summary[("banking",aspect)],
      "evidence_files": [note, key_urls["banking"]],
      "confidence": 0.85,
      "followup": None,
    }
    json.dump(rec, open(f"{OUT}/{mid}.json","w"), indent=2)
print("wrote", n)
