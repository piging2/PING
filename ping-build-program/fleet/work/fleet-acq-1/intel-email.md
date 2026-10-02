# Connector intel - email domain (reference platform: Gmail API)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Users.messages (id, threadId, labelIds[], snippet, payload{headers, body, parts}, historyId, internalDate), threads, labels, drafts, history records, filters, settings (sendAs, vacation). Methods: users.messages.list/get/send/modify/trash/batchModify, users.history.list.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest ; https://developers.google.com/workspace/gmail/api/reference/quota

## EVENTS
History API: users.history.list with startHistoryId returns added/deleted/labelsAdded messages. Push via Cloud Pub/Sub watch on the mailbox (users.watch).
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## CAPABILITIES
Read/search (q syntax), send (raw RFC2822), drafts CRUD, label management, modify labels, trash/untrash, filters, settings. Full-text search with Gmail operators.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## AUTHORIZATION
OAuth 2.0 with Gmail scopes (gmail.readonly, gmail.send, gmail.modify, gmail.labels). Restricted scopes require app verification. Service accounts need domain-wide delegation.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## WEBHOOKS
users.watch creates a push subscription to a Cloud Pub/Sub topic (1 day expiry, renew via re-watch). Notifications carry historyId; fetch details via history.list.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## POLLING
history.list from a stored historyId for incremental sync; messages.list with q for searches. Persist the newest historyId per poll cycle.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## RATE-LIMITS
Per-user quota units documented in the Gmail API quota reference (per-minute and per-day limits). 429 on excess; exponential backoff. Verify current values in the docs.
Sources: https://developers.google.com/workspace/gmail/api/reference/quota

## IDEMPOTENCY
No idempotency-key on send. Drafts give safe composition (create draft, then send). Threading via References/In-Reply-To headers; dedup sends client-side by draft id.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## EFFECTS
Sending mail, label changes, trash, filter creation, settings changes (vacation responder, sendAs). Reads are side-effect-free (marking read is a label change).
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## REVERSIBILITY
Trash is recoverable (untrash) for 30 days, then permanent. Sent mail cannot be unsent (confidential mode expiry is not recall). Label changes are freely reversible.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

## PROVENANCE
Message id and threadId are stable; historyId versions mailbox state; internalDate is the server receipt time; labelIds show current categorization; RFC Message-ID in headers.
Sources: https://developers.google.com/workspace/gmail/api/reference/rest

