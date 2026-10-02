# Connector intel — Support domain (reference platform: Intercom)

Mapped from public docs; implementation stays data-driven. Provider: Intercom.
REST API, base https://api.intercom.io; versioning via Intercom-Version header
(e.g. 2.10).

## OBJECTS
Conversations (state open/closed, source, contacts, teammates, priority,
conversation_parts, custom_attributes), Contacts (users + leads), Tickets,
Admins, Companies, Segments, Tags, Messages, Articles. Records keyed by id
(string); error envelope type error.list with request_id.
Sources: https://github.com/andytoizer/gtm-docs-registry/blob/HEAD/tools/intercom/reference.md ;
https://github.com/airbytehq/airbyte-agent-sdk/blob/HEAD/connectors/intercom/REFERENCE.md

## EVENTS
No generic events API. Push model: webhooks (below). Pull model: conversation
list/search with per_page + starting_after cursors and pages.next pagination;
contact search endpoints. Conversations search by state/created ranges for
incremental polling.
Sources: https://github.com/airbytehq/airbyte-agent-sdk/blob/HEAD/connectors/intercom/REFERENCE.md ;
https://hevodata.com/learn/intercom-webhook-to-redshift/

## CAPABILITIES
Conversation list/retrieve/search; reply (admin reply, note, user reply —
sends real messages to humans); assign; close/open; contact create/update/
search/list; tag attach; company association; message send. Reads first as
the safe path; every write can reach a real person.
Source: https://github.com/andytoizer/gtm-docs-registry/blob/HEAD/tools/intercom/reference.md

## AUTHORIZATION
OAuth 2.0 for apps; REST access-token / Bearer <redacted> for integrations
("OAuth 2.0 or Bearer <redacted>" per registry). Client ID/secret on the app's
Basic Info page. The client_secret doubles as the webhook signing key (see
WEBHOOKS). Narrowest credential policy applies; never log tokens.
Sources: https://github.com/andytoizer/gtm-docs-registry/blob/HEAD/tools/intercom/reference.md ;
https://github.com/hakodev2k/ai-engineering/blob/HEAD/MCP-API/intercom/README.md

## WEBHOOKS
Every notification: {type:"notification_event", id, topic, app_id,
created_at, delivery_attempts, data:{item}}. Topics: conversation.user.created,
conversation.user.replied, conversation.admin.replied,
conversation.admin.assigned, contact.user.created, contact.lead.created,
ticket.created, plus "ping" handshake when saved in Developer Hub. Signature:
X-Hub-Signature header = "sha1=" + hex(HMAC-SHA1(raw body, client_secret));
verify on RAW bytes before parsing, timing-safe compare. Respond 200 within 5s
(or treated as failure); too many errors -> notifications dropped for 15 min.
Sources: https://github.com/hookdeck/webhook-skills/blob/HEAD/skills/intercom-webhooks/SKILL.md ;
https://developers.intercom.com/docs/references/2.0/webhooks/webhook-models
(signed notifications, verbatim doc capture in search result 4)

## POLLING
Conversations list/search + contact search with starting_after cursors and
pages.next as the polling surface; per_page bounded. Webhooks primary for
realtime reply events; polling as reconciliation. Conversations endpoint
accepts type/admin_id/open filters.
Sources: https://github.com/airbytehq/airbyte-agent-sdk/blob/HEAD/connectors/intercom/REFERENCE.md ;
https://hevodata.com/learn/intercom-webhook-to-redshift/

## RATE LIMITS
Documented shape: limits measured per app/workspace, distributed across
10-second windows; headers X-RateLimit-Limit, X-RateLimit-Remaining,
X-RateLimit-Reset; 429 on throttle. Numeric budget is app/plan-specific: do not
hardcode (third-party docs cite 1000/min observed — VERIFY AT BUILD, not a
documented figure). Retry read-only GETs only (bounded), honor Retry-After
then X-RateLimit-Reset; never auto-retry mutations (avoids duplicate customer
replies).
Sources: https://github.com/hakodev2k/ai-engineering/blob/HEAD/MCP-API/intercom/README.md ;
https://cynapse.com/numerics/docs/intercom (numeric figure, third-party)

## IDEMPOTENCY
No native idempotency-key documented in retrieved sources. Dedupe webhooks by
notification id; dedupe conversation replies client-side by conversation id +
state; mutation retry-safety = read-before-write. Followup: verify at build.
Sources: none found — documented as undocumented.

## EFFECTS
Writes send real messages to real people (replies, notes to teammates,
outbound messages), change assignment/SLA state, tag conversations. Reads
side-effect-free. Reply writes are customer-visible and reputation-sensitive.

## REVERSIBILITY
Messages sent cannot be unsent (conversation_parts append-only; closing/
reopening conversations is a reversible state toggle; contacts can be deleted
— recovery semantics not published in retrieved sources, verify at build).
Model sends as irreversible, conversation open/closed as reversible.
Followup: verify contact-deletion recovery at build time.

## PROVENANCE
Stable contact/conversation ids; conversation_parts carry author + timestamps;
created_at/updated_at/waiting_since; notification id + created_at +
delivery_attempts on every webhook; app_id tenant isolation. Lineage-capable.
Sources: https://github.com/smarks26/claude-code-plugins-plus-skills/blob/HEAD/plugins/saas-packs/intercom-pack/skills/intercom-webhooks-events/SKILL.md
(payload shape)
