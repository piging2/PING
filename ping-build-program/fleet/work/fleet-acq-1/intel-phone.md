# Connector intel - phone domain (reference platform: Twilio Voice)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Calls (CallSid, from/to, status queued/ringing/in-progress/completed, direction, duration, price), Recordings, Transcriptions, Queues, Conference participants. REST at https://api.twilio.com/2010-04-01/Accounts/{sid}. TwiML directs call flow.
Sources: https://www.twilio.com/docs/voice ; https://www.twilio.com/docs/voice/api

## EVENTS
StatusCallback webhooks on call state transitions (initiated, ringing, answered, completed) with CallSid/CallStatus/Duration. No events-list API; state via callbacks or Call fetch.
Sources: https://www.twilio.com/docs/voice

## CAPABILITIES
Initiate outbound calls, modify in-progress calls (redirect, hangup), create conferences, record, gather DTMF/speech, send TwiML, look up caller info.
Sources: https://www.twilio.com/docs/voice/api

## AUTHORIZATION
Account SID + Auth Token (HTTP basic). API keys with scoped permissions recommended over master token. Subaccounts isolate usage.
Sources: https://www.twilio.com/docs/voice

## WEBHOOKS
Twilio POSTs form-encoded callbacks to configured URLs (voiceUrl, statusCallback). Validate with X-Twilio-Signature (HMAC-SHA1 over URL+params). Respond with TwiML or empty 200.
Sources: https://www.twilio.com/docs/voice

## POLLING
Calls list with status/date filters and pagination for reconciliation. StatusCallback is primary; polling is the fallback for missed callbacks.
Sources: https://www.twilio.com/docs/voice/api

## RATE-LIMITS
Concurrency limits per account (concurrent call paths); REST API rate limits published in Twilio docs. Exceeding returns 429/20429. Verify current values in the docs.
Sources: https://www.twilio.com/docs/voice

## IDEMPOTENCY
No idempotency-key on call creation. Safe retry = list recent calls by from/to window before re-creating; in-progress call modification by CallSid is idempotent.
Sources: https://www.twilio.com/docs/voice/api

## EFFECTS
Placing calls (billable), sending callers into TwiML flows, recordings (storage + transcription costs), conference creation. Reads are side-effect-free.
Sources: https://www.twilio.com/docs/voice

## REVERSIBILITY
In-progress calls can be redirected/hung up. Completed calls, charges, and recordings are not reversible (recordings deletable).
Sources: https://www.twilio.com/docs/voice/api

## PROVENANCE
CallSid stable per call; parent/child Sids link legs; recordings carry callSid + timestamps; status callbacks give the transition log.
Sources: https://www.twilio.com/docs/voice

