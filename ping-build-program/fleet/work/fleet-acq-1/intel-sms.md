# Connector intel - sms domain (reference platform: Twilio Messaging)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Messages (MessageSid, from/to, body, status queued/sent/delivered/failed, direction, price, errorCode), Media (MMS), Short codes / toll-free / 10DLC senders, Messaging Services (sender pools, features).
Sources: https://www.twilio.com/docs/messaging ; https://www.twilio.com/docs/messaging/api

## EVENTS
StatusCallback webhooks per message (sent, delivered, undelivered, failed) with MessageSid, MessageStatus, ErrorCode. Inbound messages POST to the number's webhook URL.
Sources: https://www.twilio.com/docs/messaging

## CAPABILITIES
Send SMS/MMS/WhatsApp (per channel), schedule messages, manage sender identities, opt-out handling (STOP/HELP keywords), link shortening, delivery insights.
Sources: https://www.twilio.com/docs/messaging/api

## AUTHORIZATION
Account SID + Auth Token (HTTP basic); API keys recommended. Messaging Service SIDs scope sender pools per use case.
Sources: https://www.twilio.com/docs/messaging

## WEBHOOKS
Form-encoded POSTs for inbound and status callbacks. X-Twilio-Signature validation (HMAC-SHA1). Respond 200 with empty body or TwiML for replies.
Sources: https://www.twilio.com/docs/messaging

## POLLING
Messages list with date/to/from filters for reconciliation. Delivery receipts via callbacks are primary; polling fills gaps.
Sources: https://www.twilio.com/docs/messaging/api

## RATE-LIMITS
Per-number throughput: long codes ~1 msg/sec (queueing), toll-free and 10DLC higher with registered campaigns; short codes highest. Throughput limits published in Twilio docs.
Sources: https://www.twilio.com/docs/messaging

## IDEMPOTENCY
No idempotency-key on message creation. Messaging Services with smart encoding dedup some cases; safe retry = check recent messages to the same recipient before re-sending.
Sources: https://www.twilio.com/docs/messaging/api

## EFFECTS
Sending messages (billable per segment), opt-out list changes, sender registration. Reads are side-effect-free.
Sources: https://www.twilio.com/docs/messaging

## REVERSIBILITY
Sent messages cannot be recalled. Scheduled messages can be cancelled before send. Opt-outs are reversible by the recipient texting START.
Sources: https://www.twilio.com/docs/messaging/api

## PROVENANCE
MessageSid stable; status callbacks give delivery timeline; errorCode on failures; inbound messages carry From/To/timestamp; segments counted for billing.
Sources: https://www.twilio.com/docs/messaging

