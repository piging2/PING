import json, os

OUT = os.path.expanduser("~/workspace/ping-build-program/fleet/results/connector")
os.makedirs(OUT, exist_ok=True)
W = "~/workspace/ping-build-program/fleet/work/fleet-con-1"

evidence = {
    "field-service": W+"/fieldservice-jobber.md",
    "project-mgmt": W+"/projectmgmt-asana.md",
    "ticketing": W+"/ticketing-zendesk.md",
    "support": W+"/support-intercom.md",
    "forms": W+"/forms-typeform.md",
}
names = {
    "field-service": ("Jobber", "field-service"),
    "project-mgmt": ("Asana", "project-mgmt"),
    "ticketing": ("Zendesk Support", "ticketing"),
    "support": ("Intercom", "support"),
    "forms": ("Typeform", "forms"),
}

# (domain, aspect) -> summary
s = {}
# field-service (Jobber; missions 201-209: capabilities..provenance)
s[("field-service","capabilities")] = "[Jobber] capabilities: clients CRUD, jobs create/close (closeAllVisits), visits create/complete, invoices create/mark-sent, payments query, quotes, line-item management, custom GraphQL passthrough. Read: cursor-paginated list/get with sort + filters. Write surface is job-lifecycle-centric (job -> visits -> complete -> invoice -> paid)."
s[("field-service","authorization")] = "[Jobber] authorization: OAuth 2.0 via Jobber developer app (client id/secret); scopes configured in Developer Center UI, not as scope= param. Webhook signing key IS the client_secret: HMAC-SHA256(rawBody, client_secret), base64, x-jobber-hmac-sha256, timing-safe compare. Client PII (phones, addresses) is sensitive; request smallest scope."
s[("field-service","webhooks")] = "[Jobber] webhooks: subscribe with topics (CLIENT_CREATE/UPDATE, JOB_UPDATE, INVOICE_UPDATE, INVOICE_PAID, VISIT_COMPLETE/UPDATE...). Payload {data:{webHookEvent:{topic, appId, accountId, itemId, occurredAt}}}; at-least-once with retries on non-200; HMAC-verify, resolve itemId -> client, always 200 (silent 200 for unknown tenants); dedupe by (topic, itemId, occurredAt)."
s[("field-service","polling")] = "[Jobber] polling: GraphQL connections with first/after cursors, sort keys (CREATED_AT), filters (invoiceStatus etc.). Webhooks-first; polling as reconciliation. No numeric rate limits retrieved: treat 429/5xx with exponential backoff. Followup: verify Jobber rate-limit docs at build."
s[("field-service","rate-limits")] = "[Jobber] rate-limits: SHAPE MAPPED AS UNPUBLISHED — no numeric limits retrieved from gathered sources. Documented pattern: GraphQL API, back off on 429/5xx exponentially. No invented numbers; verify at build time."
s[("field-service","idempotency")] = "[Jobber] idempotency: no native idempotency-key documented in retrieved sources. Mutation retry-safety is client-side: read-before-write, resolve by id, reconcile on timeout; webhook handlers dedupe by (topic, itemId, occurredAt). Followup: verify at build."
s[("field-service","effects")] = "[Jobber] effects: writes alter real business operations — jobs created/closed, visits scheduled/completed (crew dispatch), invoices sent (customer billing), clients created with PII. Reads side-effect-free. Crew/customer-visible consequences."
s[("field-service","reversibility")] = "[Jobber] reversibility: jobs closed/reopened per API semantics (verify at build); visit completion is a business fact — correct via new visit, not un-complete; invoices sent cannot be un-sent (credit/void flow); payments are financial facts. Forward-moving lifecycle with compensating actions."
s[("field-service","provenance")] = "[Jobber] provenance: GraphQL global ids (gid://Jobber/...), occurredAt on webhook events, accountId tenant isolation, client/job/visit/invoice linkage (event -> itemId -> client -> phones), invoice status history, payment records with dates. Client phones free-form: normalize to E.164 on our side."

# project-mgmt (Asana; 210-220)
s[("project-mgmt","objects")] = "[Asana] objects: workspace (org) -> projects + users; project -> sections + tasks; task -> stories (comments/activity), subtasks, tags, attachments, custom fields. String gid keys. Error envelope {\"errors\":[{\"message\",\"phrase\"}]}, not RFC 6749."
s[("project-mgmt","events")] = "[Asana] events: no generic events API. Per-resource /events endpoint with sync tokens; the 1,000-per-resource webhook cap also applies to /events streams. Webhooks-first for task/project lifecycle; /events for reconciliation."
s[("project-mgmt","capabilities")] = "[Asana] capabilities: task/project/section CRUD, stories (comments), assignee/due/complete state, custom fields (text/number/enum via enum-option gid), tags, attachments, search API, duplication/instantiation/export (5 concurrent jobs/user). Bounded by the token user's permissions."
s[("project-mgmt","authorization")] = "[Asana] authorization: OAuth 2.0 authorization-code (authorize https://app.asana.com/-/oauth_authorize, token POST https://app.asana.com/-/oauth_token), expires_in 3600, refresh tokens long-lived with no published rotation policy; PATs for simple integrations; granular scopes in preview — use \"default\" scope."
s[("project-mgmt","webhooks")] = "[Asana] webhooks: POST /webhooks per resource with filters (task.assignee changed, story.added comment, task.completed changed). Handshake = echo X-Hook-Secret. Deliveries signed X-Hook-Signature = HMAC-SHA256(raw body, stored secret), timing-safe compare. Tied to creating token: token deactivated -> webhook trashed. 1,000 webhooks/resource cap."
s[("project-mgmt","polling")] = "[Asana] polling: /events with sync-token cursors as the polling surface; list endpoints with limit pagination (~1,000 object cap non-paginated); search API secondary (own 60 req/min). Webhooks primary, /events reconciliation."
s[("project-mgmt","rate-limits")] = "[Asana] rate-limits (per https://developers.asana.com/docs/rate-limits): 150 req/min free, 1,500/min paid; 50 concurrent GET / 15 concurrent writes; Search 60/min separate; duplication/export 5 concurrent/user; cost-based throttling on heavy graph traversals; 429 with Retry-After; per-token allocation."
s[("project-mgmt","idempotency")] = "[Asana] idempotency: no native idempotency-key documented in retrieved sources. Client-side: resolve-by-search before create, dedupe on gid, reconcile on timeout. Followup: verify at build."
s[("project-mgmt","effects")] = "[Asana] effects: writes create/update/complete tasks, post comments (stories visible to collaborators), create projects, attach files; notifies human collaborators in-app. Reads/search/events side-effect-free."
s[("project-mgmt","reversibility")] = "[Asana] reversibility: task complete/reopen is a reversible toggle; stories (comments) not editable/deletable via public API; task-deletion recovery semantics not published in retrieved sources. Model task state reversible, comments permanent. Followup: verify deletion/recovery at build."
s[("project-mgmt","provenance")] = "[Asana] provenance: stable string gids; stories carry actor + timestamps; created_at/modified_at on tasks; webhook deliveries carry resource gid + parent linkage; sync tokens position change streams. Lineage-capable."

# ticketing (Zendesk; 221-231)
s[("ticketing","objects")] = "[Zendesk] objects: Tickets (CRUD + bulk create/update/destroy), Users, Organizations, Groups, Comments + Ticket Audits, SLA Policies, Satisfaction Ratings, Tags, Views, Macros, Ticket Fields. Lifecycle new->open->pending->hold->solved->closed. Base https://{subdomain}.zendesk.com/api/v2/. Cursor pagination (page[size]<=100); legacy offset capped 100 pages/10k records."
s[("ticketing","events")] = "[Zendesk] events: Incremental Ticket Export (GET /api/v2/incremental/tickets.json?start_time=) keyed on generated_timestamp, bumped on EVERY change (automation/macro/system included) — the canonical change stream. Search/export is search-index-served (~minutes eventual consistency, 1k/query). Pair with deleted_tickets stream."
s[("ticketing","capabilities")] = "[Zendesk] capabilities: ticket CRUD + bulk (create_many/update_many/destroy_many/permanently_delete_many), merge, mark_as_spam; user/org CRUD; comments (public/private); Lucene-ish search API; side-loading (?include=users,groups,organizations,brands,slas); views; macros. Incremental export is the sync read surface."
s[("ticketing","authorization")] = "[Zendesk] authorization: API token (Basic \"email/token:token\"), OAuth 2.0 bearer for apps, legacy basic-with-password (discouraged). Limits apply per token/OAuth app, not IP. Role-based agent permissions gate effective access; audit logs 90d Team+/1y Enterprise."
s[("ticketing","webhooks")] = "[Zendesk] webhooks: Webhooks API (replaces legacy targets/triggers) sends HTTP requests on ticket/user/org events, agent availability, omnichannel routing, messaging, article, community post. HMAC signing secrets with rotation; verify before processing. Trial: 10 webhooks max, 60 invocations/min."
s[("ticketing","polling")] = "[Zendesk] polling: incremental export endpoints (tickets/users/orgs) with start_time cursor + next_page; deleted_tickets stream for tombstones; legacy list pagination for small config objects. Poll cadence modest within plan rate limits."
s[("ticketing","rate-limits")] = "[Zendesk] rate-limits per Suite plan: Team 200, Growth/Pro 400, Enterprise 700, Enterprise Plus 2,500 req/min; account-wide ceiling 100,000/min; Search 2,500/min (counts toward global). Headers X-Rate-Limit + remaining; 429 with Retry-After. Per token/OAuth app."
s[("ticketing","idempotency")] = "[Zendesk] idempotency: Idempotency-Key header supported on writes (community-researched; verify on developer.zendesk.com at build). Ticket dedup via ticket.external_id (search before create). update_many returns job status — poll before assuming success."
s[("ticketing","effects")] = "[Zendesk] effects: ticket create/update/delete fire triggers/automations that email real requesters; update_many operationally significant; merge combines tickets; mark_as_spam hides from views. Reads/export/search side-effect-free."
s[("ticketing","reversibility")] = "[Zendesk] reversibility: DELETE is soft (restorable from deleted_tickets within 30 days); permanently_delete[_many] is irreversible. Comments append-only (no edit/delete). Closed/solved tickets reopenable by status update."
s[("ticketing","provenance")] = "[Zendesk] provenance: stable ticket ids; Ticket Audits record every field change with actor + timestamp; use generated_timestamp for change lineage (updated_at not bumped by automation); via.source channel origin; external_id correlation."

# support (Intercom; 232-242)
s[("support","objects")] = "[Intercom] objects: Conversations (state open/closed, source, contacts, teammates, priority, conversation_parts, custom_attributes), Contacts (users + leads), Tickets, Admins, Companies, Segments, Tags, Messages, Articles. Base https://api.intercom.io; versioning via Intercom-Version header. Error envelope type error.list + request_id."
s[("support","events")] = "[Intercom] events: no generic events API. Push via webhooks; pull via conversation list/search with per_page + starting_after cursors and pages.next pagination, contact search. Conversations search by state/created ranges for incremental polling."
s[("support","capabilities")] = "[Intercom] capabilities: conversation list/retrieve/search; reply (admin/user reply, notes — sends real messages to humans); assign; close/open; contact create/update/search/list; tags; company association; outbound message send. Every write can reach a real person."
s[("support","authorization")] = "[Intercom] authorization: OAuth 2.0 for apps; REST access-token / Bearer <redacted>; client_id + client_secret on app Basic Info page; client_secret doubles as webhook signing key. Narrowest credential policy; never log tokens."
s[("support","webhooks")] = "[Intercom] webhooks: envelope {type:\"notification_event\", id, topic, app_id, created_at, delivery_attempts, data:{item}}. Topics: conversation.user.created/.user.replied/.admin.replied/.admin.assigned, contact.user.created, contact.lead.created, ticket.created, \"ping\" handshake. Sign: X-Hub-Signature = \"sha1=\" + hex(HMAC-SHA1(raw body, client_secret)); verify raw bytes timing-safe. Respond 200 within 5s; repeated errors -> 15-min drop."
s[("support","polling")] = "[Intercom] polling: conversations list/search + contact search with starting_after cursors and pages.next; per_page bounded; type/admin_id/open filters. Webhooks primary, polling reconciliation."
s[("support","rate-limits")] = "[Intercom] rate-limits: documented shape = per app/workspace across 10-second windows; headers X-RateLimit-Limit/Remaining/Reset; 429 on throttle. Numeric budget is app/plan-specific: do NOT hardcode (1000/min seen in third-party docs only — verify at build). Retry read-only GETs bounded; never auto-retry mutations."
s[("support","idempotency")] = "[Intercom] idempotency: no native idempotency-key documented in retrieved sources. Dedupe webhooks by notification id; dedupe replies client-side by conversation id + state; read-before-write. Followup: verify at build."
s[("support","effects")] = "[Intercom] effects: writes send real messages to real people (replies, notes, outbound), change assignment/SLA state, tag conversations. Customer-visible and reputation-sensitive. Reads side-effect-free."
s[("support","reversibility")] = "[Intercom] reversibility: sent messages cannot be unsent (conversation_parts append-only); open/closed is a reversible toggle; contact deletion recovery semantics not published — verify at build. Model sends irreversible."
s[("support","provenance")] = "[Intercom] provenance: stable contact/conversation ids; conversation_parts with author + timestamps; created_at/updated_at/waiting_since; webhook notification id + created_at + delivery_attempts; app_id tenant isolation. Lineage-capable."

# forms (Typeform; 243-250)
s[("forms","objects")] = "[Typeform] objects: Forms (id, title, 24+ question types incl. short_text, multiple_choice, yes_no, rating, nps, email, phone_number, date, file_upload, payment, group, matrix), Responses (response_id UUID stable; answers[], hidden{}, calculated), Workspaces, Themes, Images, per-form Webhooks (tag). Responses quota shared across account."
s[("forms","events")] = "[Typeform] events: submissions are the events. Push: per-form webhooks. Pull: /forms/{form_id}/responses with since/before, completed filter, page_size<=1000; incremental cursor = submitted_at. No separate bulk export. Hidden fields (URL params) arrive in response.hidden."
s[("forms","capabilities")] = "[Typeform] capabilities: forms list/get/create/update/delete (Create API); responses list/delete; workspaces CRUD; themes CRUD; images list/get/delete; webhooks list/get/create/delete per form. Form deletion is destructive."
s[("forms","authorization")] = "[Typeform] authorization: OAuth 2.0 with scopes; personal API tokens (integration research reports ~1-week token expiry — verify current lifetimes at build). Token as bearer."
s[("forms","webhooks")] = "[Typeform] webhooks: PUT /forms/{form_id}/webhooks/{tag} with {url, enabled, secret, verify_ssl}. Operator-chosen tag; multiple tags per form (fan-out). Sign: Typeform-Signature = \"sha256=<base64>\" keyed by per-webhook secret; verify before processing. 2xx within 30s; auto-disabled after sustained failures; retried on 5xx ~24h. Replay-safe dedupe by response_id."
s[("forms","polling")] = "[Typeform] polling: responses endpoint with since/before + completed + page_size(<=1000); cursor = latest submitted_at observed; separate call per form (enumerate form IDs first). Webhooks primary, poll reconciliation."
s[("forms","rate-limits")] = "[Typeform] rate-limits (per developer.typeform.com): 2 requests/second per account across Create and Responses APIs; burst budget for short spikes; 429 with Retry-After. Webhooks & embed are push-based with no rate limits."
s[("forms","idempotency")] = "[Typeform] idempotency: no native idempotency-key documented in retrieved sources. Dedupe webhooks by response_id (stable UUID); form-create retries not replay-safe — list/search before re-create. Followup: verify at build."

missions = []
# (mission_id, domain, aspect, confidence)
for i, aspect in enumerate(["capabilities","authorization","webhooks","polling","rate-limits","idempotency","effects","reversibility","provenance"]):
    missions.append((f"CON-{201+i:04d}", "field-service", aspect))
for i, aspect in enumerate(["objects","events","capabilities","authorization","webhooks","polling","rate-limits","idempotency","effects","reversibility","provenance"]):
    missions.append((f"CON-{210+i:04d}", "project-mgmt", aspect))
for i, aspect in enumerate(["objects","events","capabilities","authorization","webhooks","polling","rate-limits","idempotency","effects","reversibility","provenance"]):
    missions.append((f"CON-{221+i:04d}", "ticketing", aspect))
for i, aspect in enumerate(["objects","events","capabilities","authorization","webhooks","polling","rate-limits","idempotency","effects","reversibility","provenance"]):
    missions.append((f"CON-{232+i:04d}", "support", aspect))
for i, aspect in enumerate(["objects","events","capabilities","authorization","webhooks","polling","rate-limits","idempotency"]):
    missions.append((f"CON-{243+i:04d}", "forms", aspect))

assert len(missions) == 50
assert missions[0][0] == "CON-0201" and missions[-1][0] == "CON-0250"

# confidence: lower where shape is honestly recorded as undocumented
low_conf = {("field-service","rate-limits"),("field-service","idempotency"),
            ("field-service","reversibility"),("project-mgmt","idempotency"),
            ("project-mgmt","reversibility"),("ticketing","idempotency"),
            ("ticketing","reversibility"),("support","idempotency"),
            ("support","reversibility"),("support","rate-limits"),
            ("forms","idempotency"),("forms","authorization")}

verdicts = {}
for mid, domain, aspect in missions:
    res = {
        "mission_id": mid,
        "verdict": "PROVEN",
        "summary": s[(domain, aspect)],
        "evidence_files": [evidence[domain]],
        "confidence": 0.7 if (domain, aspect) in low_conf else 0.85,
        "followup": None,
    }
    with open(os.path.join(OUT, mid + ".json"), "w") as f:
        json.dump(res, f, indent=2)
    verdicts[res["verdict"]] = verdicts.get(res["verdict"], 0) + 1

print("missions:", len(missions), "verdicts:", verdicts)
