# Connector intel — SMS domain (reference platform: Twilio Messaging)

Mapped from public docs; implementation stays data-driven. Provider: Twilio.
Focuses on the messaging surface (voice is covered in phone-twilio.md).

## OBJECTS
Messages (MessageSid, from/to, body, numSegments, status queued/sending/sent/
delivered/undelivered/failed, error_code, price, date_created/updated),
Messaging Services (sender pools: multiple numbers/short codes behind one
ServiceSid; sticky sender, geomatch, fallback), Phone Numbers, Short Codes,
Toll-Free Numbers, A2P 10DLC: Brands, Campaigns, Campaign use-case registration,
Opt-out keyword lists (STOP/HELP/START/UNSTOP managed per number). Error codes
as first-class objects: 21610 (unsubscribed recipient), 30007 (carrier spam
filter), 30034 (10DLC unregistered), 20429/30429 (rate limits).
Sources: https://github.com/terrizoaguimor/bysocios-claude-skills/blob/HEAD/skills/twilio/SKILL.md ;
https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md

## EVENTS
Inbound SMS POSTed to the number's webhook URL (MessageSid, From, To, Body,
NumSegments). Status callbacks (statusCallback URL on create) deliver
queued->sending->sent->delivered/undelivered/failed transitions; delivery is
async and carrier-dependent — never treat the create response as final. Opt-out
keywords (STOP etc.) arrive as inbound messages and must be honored
(carrier/TCPA compliance, automatic handling available). Long-lived campaigns
use Messaging Services with per-number callbacks consolidated.
Sources: https://github.com/pb-207/hermes-community-hub/blob/HEAD/skills/api-integration/twilio-communications/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md

## CAPABILITIES
Send SMS/MMS (messages.create with from/to/body, or messagingServiceSid),
schedule send (sendAt + scheduleType, where supported), buy/configure numbers,
create Messaging Services and sender pools, register A2P 10DLC brands/campaigns,
verify toll-free numbers, manage opt-out lists, fetch delivery/error detail,
usage/cost reporting. MMS via mediaUrl. Scheduling and number management are
the non-obvious extra writes beyond send.
Sources: https://github.com/terrizoaguimor/bysocios-claude-skills/blob/HEAD/skills/twilio/SKILL.md

## AUTHORIZATION
Account SID + Auth Token via HTTP Basic; API keys for production least-
privilege; subaccounts isolate per-customer senders, costs, and opt-out state.
10DLC brand/campaign registration is a separate trust/identity step (The
Campaign Registry) — unverified traffic is throttled or blocked by carriers.
Auth token is also the webhook-signing secret; never in client code or logs.
Sources: https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md

## WEBHOOKS
Inbound-message webhook per number / messaging service; statusCallback per
message for delivery receipts. Validate EVERY webhook with RequestValidator
(X-Twilio-Signature HMAC-SHA1 over full URL + sorted params) — the only CSRF
defense; never disabled in production. Ack 200 fast; never block on business
logic. Handle opt-out keywords and delivery-failure webhooks (error_code)
as first-class events.
Sources: https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md

## POLLING
messages.list with DateSent filters + PageSize/PageToken for backfill and
reconciliation (missed status callbacks). Usage records for cost reconciliation.
No event-history API: list endpoints are the only audit backstop. Polling
cadence should be modest; statusCallback is primary for delivery state.
Sources: https://github.com/tdimino/claude-code-minoan/blob/HEAD/skills/integration-automation/twilio-api/SKILL.md

## RATE LIMITS
Send throughput is per-sender-type: US long code 1 msg/sec per number,
toll-free 3/sec, short code 100/sec (carrier-enforced, separate from API
limits). Messaging Services distribute across sender pools for scale. API
request limits ~100 req/sec / 10,000/hr depending on account; 20429 (voice) /
30429 (messaging) on exceed. A2P 10DLC throughput additionally gated by
campaign trust score. Backoff with jitter on 429/503.
Sources: https://github.com/pb-207/hermes-community-hub/blob/HEAD/skills/api-integration/twilio-communications/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md

## IDEMPOTENCY
No native idempotency-key header on messages.create. Inbound webhook dedupe by
MessageSid (unique constraint in processed-webhooks table — documented pattern).
Outbound retry-safety: record the Sid returned by create; on timeout, reconcile
by listing before re-POST (a timed-out create may have succeeded). Scheduled
messages can be cancelled/updated before sendAt (partial mitigation). Verify API
is idempotent by design for OTP flows — prefer it over hand-rolled codes.
Sources: https://github.com/tdimino/claude-code-minoan/blob/HEAD/skills/integration-automation/twilio-api/SKILL.md

## EFFECTS
Every send reaches a real human and costs money (per segment, per destination).
Unregistered 10DLC or spam-filtered traffic fails (30007/30034) — compliance
failures are themselves costly. Opt-out violations carry TCPA liability.
Reads/list/fetch side-effect-free.

## REVERSIBILITY
Sent SMS cannot be unsent or recalled. The only compensating action is a new
outbound message (correction text) — itself costly and customer-visible.
Scheduled (not-yet-sent) messages can be cancelled. Recordings/logs deletable.
Connector contract: SMS sends are irreversible, cost-bearing, compliance-
sensitive external actions; gate behind policy + approval + per-user rate
limits (anti toll-fraud/SMS-pumping).

## PROVENANCE
MessageSid per send (stable, loggable), status timeline via statusCallback
events, error_code on failures (non-null = delivery failure; 21610/30007/
30034 encode the compliance story), numSegments + price (cost attribution),
date_created/updated, MessagingServiceSid (which pool sent it), subaccount
isolation for per-customer audit, Usage API for billing reconciliation.
Redact phone numbers in logs (PII).
Sources: https://github.com/paulpas/agent-skill-router/blob/HEAD/skills/coding/twilio-api/SKILL.md ;
https://github.com/repairyourtech/cfsa-antigravity/blob/HEAD/.pi/skill-library/stack/notifications/twilio/SKILL.md
