# Connector intel — Phone/SMS domain (reference platform: Twilio)

Mapped from public docs; implementation stays data-driven. Provider: Twilio.
Base: https://api.twilio.com/2010-04-01 ; auth: HTTP Basic base64(AccountSID:AuthToken);
production guidance: use API keys instead of the master auth token; subaccounts for
multi-tenant isolation.

## OBJECTS
Calls (CallSid, from/to, status queued/ringing/in-progress/completed/failed,
duration, price), Messages (MessageSid, from/to/body/numSegments, status
queued/sending/sent/delivered/undelivered/failed, error_code, price), PhoneNumbers,
Recordings, Conferences, Queues, Messaging Services (sender pools), Verify
Services, Usage records. All resources carry SIDs (AC/CA/SM/PN/...) as stable ids
and date_created/date_updated timestamps. Phone numbers in E.164.
Sources: https://github.com/terrizoaguimor/bysocios-claude-skills/blob/HEAD/skills/twilio/SKILL.md ;
https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md

## EVENTS
No events-list API. Inbound: Twilio POSTs form-encoded webhooks to your URL on
incoming SMS/voice (MessageSid/CallSid, From, To, Body, etc.). Status callbacks:
set statusCallback on message/call creation to receive delivery/outcome webhooks
(don't rely on synchronous status after create). Respond with TwiML (XML) to
control calls in real time (<Say>, <Gather>, <Dial>, <Hangup>). Verify API has
its own verification-check lifecycle.
Sources: https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md ;
https://github.com/pb-207/hermes-community-hub/blob/HEAD/skills/api-integration/twilio-communications/SKILL.md

## CAPABILITIES
Send SMS/MMS (messages.create), place calls (calls.create with TwiML URL or
inline TwiML), buy/configure phone numbers, build IVRs via TwiML, record calls,
create conferences, Verify OTP (use Verify API, not hand-rolled OTP), Lookup
(number validation), usage/cost reporting per subaccount. Read: fetch/list on
all resources.
Sources: https://github.com/terrizoaguimor/bysocios-claude-skills/blob/HEAD/skills/twilio/SKILL.md ;
https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md

## AUTHORIZATION
Account SID + Auth Token via HTTP Basic; API keys (separate key/secret) for
production least-privilege; subaccounts give per-customer credential isolation
and per-subaccount usage accounting. Auth token is the webhook-signing secret —
never in client code, never in logs. Webhook validation via RequestValidator
(HMAC-SHA1 over full URL + sorted POST params, compared to X-Twilio-Signature).
Sources: https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md

## WEBHOOKS
Inbound SMS/voice POSTs to configured URLs; statusCallback URLs for delivery
receipts and call completion. Validate EVERY webhook with RequestValidator
(X-Twilio-Signature) — the only CSRF defense; never disable in production.
Respond fast (TwiML or 200); never block on business logic. Handle opt-out
keywords (STOP/HELP) — compliance requirement. Log every MessageSid/CallSid.
Sources: https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md ;
https://github.com/oneearlybird-ai/deepvibes-audit-book/blob/HEAD/docs/book/sections/Q-third-party-twilio-communications-integration.md
(toll-fraud/SMS-pumping and stutter-loop attack notes — relevant to lane K/J)

## POLLING
List endpoints with date filters (DateSent, StartTime) + PageSize/PageToken for
backfill and reconciliation (messages.list, calls.list). No cursor webhooks for
history: poll list endpoints for audit/reconciliation. statusCallback is primary
for delivery state; polling is the reconciliation backstop.

## RATE LIMITS
Throughput is per-sender-type: SMS 1 msg/sec per long code (US), toll-free
3/sec, short code 100/sec; use Messaging Services with sender pools for scale.
API request defaults ~100 req/sec / 10,000/hr depending on account; voice ~100
concurrent calls default. Rate-limit errors: 20429 (voice), 30429 (messaging).
Limits vary by account/region/number type — read them from the account, never
hardcode. Exponential backoff with jitter.
Sources: https://github.com/pb-207/hermes-community-hub/blob/HEAD/skills/api-integration/twilio-communications/SKILL.md
(20429/30429 codes, SMS 80 MPS default, API 100 rps) ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md
(per-number throughput table) ;
https://github.com/terrizoaguimor/bysocios-claude-skills/blob/HEAD/skills/twilio/SKILL.md

## IDEMPOTENCY
No native idempotency-key header on messages.create/calls.create. Inbound
webhook dedupe by MessageSid/CallSid (unique constraint in processed-webhooks
table — documented pattern). Outbound retry-safety: record the Sid returned by
create and reconcile by listing; do NOT blindly re-POST on timeout without
checking (a timed-out create may have succeeded). Verify API is idempotent by
design for OTP flows (use it instead of hand-rolled codes).
Sources: https://github.com/tdimino/claude-code-minoan/blob/HEAD/skills/integration-automation/twilio-api/SKILL.md
(MessageSid unique-constraint idempotency pattern) ; search result 2/3 rate-limit sections

## EFFECTS
Every send/place costs money and reaches a real human: SMS delivery, voice
calls (toll-fraud/SMS-pumping attack surface — aggressive user-level rate
limiting required on any customer-facing send path), number purchases (monthly
fees), recordings (storage + consent-law implications). Webhook handlers must
have stutter/loop controls (adversary can spam inbound to burn money).
Reads/list/fetch side-effect-free.
Source: https://github.com/oneearlybird-ai/deepvibes-audit-book/blob/HEAD/docs/book/sections/Q-third-party-twilio-communications-integration.md

## REVERSIBILITY
Sent SMS cannot be unsent; placed calls cannot be un-placed. The only
compensating actions are new outbound messages/calls (e.g. correction text) —
themselves costly and customer-visible. Recordings can be deleted. Number
releases are reversible only by re-purchase (number may be gone). Connector
contract: voice/SMS sends are irreversible external actions with direct cost;
gate behind policy + approval + per-user rate limits (anti-toll-fraud).
Sources: EFFECTS citations.

## PROVENANCE
MessageSid/CallSid per action (stable, loggable), error_code on failures
(non-null = delivery failure), status timeline via statusCallback events,
date_created/updated, price per message/call (cost attribution), subaccount
isolation for per-customer audit, Usage API for billing reconciliation. Redact
phone numbers in logs (PII).
Sources: https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md
