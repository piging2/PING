# Connector intel — Email domain (reference platform: Gmail API)

Mapped from public docs; implementation stays data-driven. Provider: Google.
Base: https://gmail.googleapis.com ; OAuth 2.0 scopes (gmail.readonly,
gmail.modify, gmail.send, ...). NOTE: Nolan's gmail skill exists in this
environment — the connector intel describes the public API surface only.

## OBJECTS
Messages (id, threadId, labelIds, snippet, payload MIME parts, internalDate,
sizeEstimate; body via messages.get format=raw/full), Threads, Drafts, Labels,
Filters, ForwardingAddresses, SendAs aliases, Settings (vacation, IMAP, POP,
auto-forwarding). Message identity: message id (immutable per message); thread
id groups conversation.
Source: https://developers.google.com/workspace/gmail/api/reference/rest
(users.messages/drafts/threads/labels/settings resources)

## EVENTS
Two mechanisms: (1) Push: users.watch registers a mailbox to publish to a
Cloud Pub/Sub topic; push subscription POSTs to your HTTPS endpoint. Payload
is ONLY {emailAddress, historyId} (base64url in message.data) — a hint, not the
message. Watch is time-limited (~7 days; refresh via users.watch again;
users.stop to stop). (2) Poll: users.history.list from a stored historyId
watermark discovers exactly which messages changed; then fetch each as raw MIME.
Push is best-effort: notifications rate-limited to ~1/second per watched mailbox
and may be dropped/delayed under load — correctness must rest on scheduled
bounded reconciliation from the stored cursor, never on push alone.
Sources: https://github.com/helpthread/helpthread/blob/HEAD/specs/mail/gmail-push.md ;
https://github.com/langgenius/dify-official-plugins/blob/HEAD/triggers/gmail_trigger/README.md
(watch lifecycle: create/refresh ~7d/stop; historyId checkpoint handling)

## CAPABILITIES
Read: list/get messages & threads, search (Gmail query syntax), history.list,
attachments.get. Write: messages.send (raw RFC822 MIME base64url), drafts
create/update/delete/send, labels/filters/settings management, messages
modify (add/remove labels), trash/untrash, batchDelete/batchModify. Sending is
also metered by the account's Gmail sending limits (separate from API quota).
Sources: https://developers.google.com/workspace/gmail/api/reference/rest ;
https://developers.google.com/workspace/gmail/api/reference/quota (per-method costs)

## AUTHORIZATION
OAuth 2.0 via Google Cloud project; granular scopes (gmail.readonly,
gmail.modify, gmail.send, gmail.compose, gmail.labels, gmail.settings.*).
Request the smallest scope (standing rule 1). Workspace domain-wide delegation
or per-user consent; users.stop/watch need appropriate scopes. Never request
full-mailbox scopes for a send-only feature.
Source: https://developers.google.com/workspace/gmail/api/reference/rest

## WEBHOOKS
users.watch -> Cloud Pub/Sub topic -> push subscription to HTTPS endpoint.
Endpoint must be HTTPS; Pub/Sub push requires domain verification in GCP.
Message data = {emailAddress, historyId}; authenticate the push (OIDC token on
push subscription), resolve mailbox, reconcile from stored historyId cursor.
~1 notification/sec per mailbox max; not guaranteed.
Sources: https://github.com/helpthread/helpthread/blob/HEAD/specs/mail/gmail-push.md ;
https://github.com/langgenius/dify-official-plugins/blob/HEAD/triggers/gmail_trigger/README.md

## POLLING
users.history.list(startHistoryId=stored cursor) returns added/modified/deleted
messages and label changes; advance cursor to the latest historyId after each
successful pass. messages.list with q= (Gmail search syntax) + pageToken for
backfill. Bounded reconciliation runs are the correctness backstop behind push.
Source: https://github.com/helpthread/helpthread/blob/HEAD/specs/mail/gmail-push.md ;
https://developers.google.com/workspace/gmail/api/reference/rest

## RATE LIMITS
Quota units, per developers.google.com quota reference: per-project
1,200,000 units/min; per-user 15,000 units/min. Per-method costs:
messages.send 100, drafts.send 100, messages.get/list/modify 5,
history.list 2, threads.get 10, watch 100, batchModify 50. Exceeding returns
rateLimitExceeded / userRateLimitExceeded. Exponential backoff on 429/5xx.
Note: daily SENDING is additionally capped by the Gmail account's sending limits
(Workspace tiers), independent of API quota.
Source: https://developers.google.com/workspace/gmail/api/reference/quota (official)

## IDEMPOTENCY
No native idempotency-key header on messages.send. Duplicate-send prevention is
client-side: dedupe by internal request id before send; the standard safe
pattern is create-draft-then-send (draft id is stable and sendable once) or a
client-side sent-log keyed by logical operation. Reads/history are naturally
idempotent (historyId cursor replays deterministically).
Sources: CAPABILITIES citations (drafts.send semantics); polling citations.

## EFFECTS
messages.send/drafts.send DELIVERS email to real recipients (external,
irreversible side effect). trash/delete removes messages (trash is recoverable
for 30 days via untrash; delete is permanent). modify changes labels (affects
user's mailbox organization). batchModify/batchDelete scale these effects.
Reads side-effect-free.

## REVERSIBILITY
Sent email cannot be unsent (Gmail "undo send" is a UI delay, not API recall;
API sends are final). Trash is reversible within 30 days (messages.untrash);
messages.delete and drafts.delete are permanent. Filter/settings changes are
reversible via update APIs. Connector contract: treat every send as an
irreversible external action; gate sends behind policy + approval.

## PROVENANCE
Message id + threadId (stable), internalDate, labelIds, historyId watermarks,
RFC822 headers (Message-ID, In-Reply-To, References) for threading, raw MIME
fetch for byte-exact evidence. Drafts carry stable draft ids. history.list
provides add/remove/modify change records. Lineage-ready: message -> thread ->
history watermark.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest ;
https://github.com/helpthread/helpthread/blob/HEAD/specs/mail/gmail-push.md
