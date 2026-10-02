# Connector intel - chat domain (reference platform: Slack)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Conversations (channels: C*, DMs: D*, MPIM: G*), Messages (ts unique per channel), Users (U*), Files, Reactions, Bookmarks, Workflows. Web API at https://slack.com/api/. Message ts = id.
Sources: https://docs.slack.dev/reference/methods ; https://docs.slack.dev/apis/web-api

## EVENTS
Events API: HTTPS POSTs for message.channels, reaction_added, member_joined_channel, etc. Socket Mode for websocket delivery without public HTTP. Retry on non-2xx with backoff.
Sources: https://docs.slack.dev/apis/events-api ; https://docs.slack.dev/apis/web-api

## CAPABILITIES
Post/update/delete messages, manage channels, invite users, upload files, add reactions, search, manage reminders, run workflows, admin analytics. Granular OAuth scopes per method.
Sources: https://docs.slack.dev/reference/methods

## AUTHORIZATION
OAuth 2.0 with bot tokens (xoxb-) and user tokens (xoxp-); granular scopes (channels:history, chat:write, users:read). Socket Mode uses app-level tokens (xapp-).
Sources: https://docs.slack.dev/authentication

## WEBHOOKS
Events API subscriptions per event type with URL verification challenge. Signing secret validates X-Slack-Signature (HMAC-SHA256 over version:timestamp:body). Incoming webhooks for simple posting.
Sources: https://docs.slack.dev/apis/events-api

## POLLING
conversations.history with cursor + oldest/latest timestamps for incremental read. conversations.list with cursor for channel inventory.
Sources: https://docs.slack.dev/reference/methods

## RATE-LIMITS
Tiered rate limits per method (tiers 1-4); x-ratelimit headers on responses; 429 with Retry-After. Verify current tiers in the docs.
Sources: https://docs.slack.dev/apis/web-api/rate-limits

## IDEMPOTENCY
chat.postMessage has no idempotency key; duplicate posts possible on retry. Safe pattern: post then reconcile via conversations.history, or use unique message content markers.
Sources: https://docs.slack.dev/reference/methods/chat.postMessage

## EFFECTS
Posting/editing/deleting messages, channel joins/invites, file uploads, workflow triggers. Reads are side-effect-free.
Sources: https://docs.slack.dev/reference/methods

## REVERSIBILITY
Messages editable/deletable (chat.update/chat.delete) within workspace settings. Channel archives reversible; deletions are not. File deletions permanent.
Sources: https://docs.slack.dev/reference/methods

## PROVENANCE
Message ts + channel id is the stable identity; user id on every message; edited flag with edit history; file ids stable; event payloads carry team_id and event_ts.
Sources: https://docs.slack.dev/reference/methods

