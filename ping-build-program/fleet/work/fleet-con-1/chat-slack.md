# Connector intel — Chat domain (reference platform: Slack)

Mapped from public docs; implementation stays data-driven. Provider: Slack.
Base: https://slack.com/api ; auth: OAuth 2.0 bearer tokens.

## OBJECTS
Conversations (channels: public/private/IM/MPIM; id C.../D.../G..., name,
is_member, topic, purpose), Messages (ts timestamp-id, thread_ts, text, blocks
(Block Kit, 50-block limit), attachments, files, reactions, edited metadata,
bot_id/app_id for bot messages), Users (id, name, profile), Files, Reactions,
User groups, Reminders. Message identity: (channel id, ts). Note: chat.postMessage
returns HTTP 200 even on errors — must check response JSON "ok": false.
Sources: https://github.com/fyralisinc/saas-api-mocks (real response shapes) ;
https://github.com/hiqs-labs/aegis-sleuth-slackbot/blob/HEAD/docs/slack-api-rate-limits-reference.md ;
https://github.com/socketdev/socket-python-cli/blob/HEAD/session.md (200-on-error, 1 msg/sec/channel)

## EVENTS
Two delivery modes: (1) Events API: subscribe to bot events (message.channels,
message.groups, message.im, message.mpim, app_mention, reaction_added/removed,
member_joined_channel, member_left_channel, file_shared, channel_created...);
Slack POSTs signed JSON to your Request URL. (2) Socket Mode: websocket
connection using an app-level token (xapp-, connections:write scope); no public
URL needed; not available for Marketplace-distributed apps. Throughput limit on
Socket Mode ~37,000 events/hour. Events API delivery ~30,000/hour/workspace
(unlikely to bind). Delivery includes retry attempts flagged by
X-Slack-Retry-Num / X-Slack-Retry-Reason — handlers must be idempotent.
Sources: https://github.com/beyondeye/aitasks/blob/HEAD/aidocs/chat/slack_app_setup.md ;
https://github.com/nerdsane/temperpaw/blob/HEAD/docs/adrs/0010-slack-socket-mode-transport.md ;
https://medium.com/slack-developer-blog/handling-rate-limits-with-slacks-apis-f6f8a63bdbdc

## CAPABILITIES
chat.postMessage / chat.update / chat.delete, conversations.list/info/history/
replies/members, users.list/info, files.upload, reactions.add/remove,
pins, reminders, usergroups, search.messages (USER token + search:read scope
only — NOT a bot-token capability). chat:write posts; chat:write.public posts
to public channels without joining; chat:write.customize customizes username/icon.
History scopes (channels:history etc.) needed for backfill; files:read for
attachments.
Sources: https://github.com/beyondeye/aitasks/blob/HEAD/aidocs/chat/slack_app_setup.md ;
https://github.com/hiqs-labs/aegis-sleuth-slackbot/blob/HEAD/docs/slack-api-rate-limits-reference.md

## AUTHORIZATION
OAuth 2.0: bot tokens (xoxb-) carry granular scopes (chat:write,
channels:history, users:read...); app-level tokens (xapp-, connections:write)
only for Socket Mode; user tokens (xoxp-) for user-context ops like search.
Request smallest scope set (standing rule 1). Incoming webhooks are the dumb-
pipe alternative (single channel, no app, no reads). Tokens are secrets.
Sources: https://github.com/beyondeye/aitasks/blob/HEAD/aidocs/chat/slack_app_setup.md ;
https://github.com/terryspov/claudeclaw-plus/blob/HEAD/src/adapters/slack/README.md

## WEBHOOKS
Events API: Slack signs each request (X-Slack-Signature = HMAC-SHA256 of
v0=<timestamp>:<body> with signing secret; check X-Slack-Request-Timestamp
freshness). URL verification challenge on subscription setup (respond with
challenge). Retries with X-Slack-Retry-Num/Reason — dedupe by event_id. Socket
Mode replaces webhooks with the websocket (no signature needed, token-auth).
Ack within 3 seconds; do slow work async.
Sources: https://github.com/terryspov/claudeclaw-plus/blob/HEAD/src/adapters/slack/README.md
(signature validation as test surface) ;
https://medium.com/@rosgluk/slack-integration-patterns-for-alerts-and-workflows-939d6ac012ef

## POLLING
conversations.history (channel, latest/oldest ts bounds, limit) with cursor
pagination for backfill; conversations.replies for threads; conversations.list
for channel inventory. Polling is the reconciliation backstop behind Events API/
Socket Mode; adaptive cadence (faster when activity detected). Search API is
user-token-only — do not design bot search around it.
Sources: https://github.com/fyralisinc/saas-api-mocks (cursor pagination shapes) ;
https://github.com/hiqs-labs/aegis-sleuth-slackbot/blob/HEAD/docs/slack-api-rate-limits-reference.md

## RATE LIMITS
Tiered per-method per-workspace: Tier 1 ~1+/min (large queries), Tier 2 ~20+/min
(most writes), Tier 3 ~50+/min (most reads), Tier 4 ~100+/min (special cases).
chat.postMessage special tier: 1 message/second per channel, "several hundred"/
min workspace-wide with generous burst. Response headers: X-RateLimit-Limit /
-Remaining / -Reset; 429 carries Retry-After (seconds). Honor Retry-After,
exponential backoff with jitter, centralize delivery in a dispatcher, queue
outbound during 429. Socket Mode ~37k events/hr.
Sources: https://github.com/terryspov/claudeclaw-plus/blob/HEAD/src/adapters/slack/README.md ;
https://github.com/hiqs-labs/aegis-sleuth-slackbot/blob/HEAD/docs/slack-api-rate-limits-reference.md ;
https://github.com/nerdsane/temperpaw/blob/HEAD/docs/adrs/0010-slack-socket-mode-transport.md ;
https://medium.com/slack-developer-blog/handling-rate-limits-with-slacks-apis-f6f8a63bdbdc

## IDEMPOTENCY
No native idempotency-key on chat.postMessage in retrieved docs. Retry-safety is
client-side: (channel, ts) is the stable message identity — record the ts from
a successful post before retrying; on timeout, list recent history to check
whether the post landed before re-posting. Event deliveries dedupe by event_id
(retries carry X-Slack-Retry-Num). Followup: verify current Slack idempotency
guidance at build time (docs.slack.dev rate-limits/idempotency sections).
Sources: EVENTS + RATE LIMITS citations; flagged as verify-at-build.

## EFFECTS
chat.postMessage reaches real humans in channels/DMs (notification-worthy);
chat.update edits visibly (shows "edited"); reactions/pins alter shared state.
files.upload stores content. Reads side-effect-free. High-volume posting hits
the 1/sec/channel limit fast — queue.

## REVERSIBILITY
chat.delete removes a message (bot can delete its own; deleting others needs
broader scopes/admin). chat.update edits text/blocks. Deleted messages are NOT
recoverable via API (no trash). Channel joins/leaves reversible. File uploads
deletable. Followup: verify delete scope requirements and retention behavior in
current docs at build time.

## PROVENANCE
(channel id, ts) stable identity; thread_ts lineage; user/bot_id attribution;
edited metadata (user + ts); team_id; event_id on deliveries; Enterprise Grid
audit-logs API for admin-grade action history (verify availability for plan at
build). Reactions and file_shares carry actor ids. Sufficient for
SOURCE -> OBSERVATION -> EVIDENCE lineage on messages.
Sources: https://github.com/beyondeye/aitasks/blob/HEAD/aidocs/chat/slack_app_setup.md ;
https://github.com/fyralisinc/saas-api-mocks
