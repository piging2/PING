# Connector intel — Social domain (reference platform: Meta Graph API)

Mapped from public docs; implementation stays data-driven. Provider: Meta.
Base: https://graph.facebook.com (versioned, v26+ in 2026). NOTE: Nolan runs
Facebook engagement via the Pig; this intel maps the public API surface only.
Threads runs on its own host (graph.threads.net).

## OBJECTS
Page, Post (message, link, photo, video; up to 63,206 chars text), Comment,
Photo, Video, Reaction/like, Insight (post + page metrics), Conversation/
Message (Messenger surface, separate product config). IDs are global numeric
strings; field expansion supports nested edges (posts.limit(5){comments...})
with depth/limit caps (nesting 4 deep or limit(500) silently truncates).
Sources: https://github.com/antonyfmunoz/os/blob/HEAD/skills/tools/meta_graph_api/SKILL.md ;
https://github.com/ratimon/openquok-monorepo/blob/HEAD/web/src/content/docs/social-integration/facebook.md

## EVENTS
Webhooks: subscribe to object types (Page, User...) and fields (feed, comments,
reactions, mentions...); on change Meta POSTs JSON {entry:[{id, time,
changes:[{field, value:{verb, object_id...}}]}]}, object}. Payloads are change
HINTS, not full objects — re-query the edge on receipt. Messenger/Instagram
webhooks have slightly different setup. Polling fallback: /{page-id}/posts,
/feed, /comments edges with since/until + cursor pagination.
Sources: https://developers.facebook.com/docs/graph-api/webhooks/ (official) ;
https://github.com/nermalcat69/meta-developer-docs/blob/HEAD/facebook-dev-docs/markdown/docs/graph-api/webhooks.md

## CAPABILITIES
Publish text/link/photo/video posts to a Page (pages_manage_posts), reply to
comments, read posts/comments/reactions, read Insights (read_insights),
Page metadata, lead-gen form access (separate perms). Groups API is mostly
dead since April 2024 (third-party group write requires admin-installed app;
do not promise group automation). Instagram surfaces accept the Page token of
the linked Page.
Sources: https://github.com/ratimon/openquok-monorepo/blob/HEAD/web/src/content/docs/social-integration/facebook.md ;
https://github.com/antonyfmunoz/os/blob/HEAD/skills/tools/meta_graph_api/SKILL.md

## AUTHORIZATION
OAuth via Facebook Login for Business; user access tokens, Page access tokens
(never expire for some flows — treat like root keys), System User tokens for
server-side (do not expire; vault them). Permissions are granular and many
require App Review: pages_manage_posts, pages_read_engagement, read_insights,
publish_video, instagram_manage_comments. Error code 190 = OAuth family;
error_subcode (458/460/463/467) tells the real story.
Sources: https://github.com/antonyfmunoz/os/blob/HEAD/skills/tools/meta_graph_api/SKILL.md ;
https://github.com/anarchistsid/genlab-platform/blob/HEAD/docs/meta-app-review-submission.md

## WEBHOOKS
Configure in App Dashboard (Webhooks product); subscribe Page to fields (feed,
mention, etc.). Verification: GET challenge with hub.verify_token. Delivery
signing: X-Hub-Signature-256 = HMAC-SHA256 of body with app secret — verify on
every POST (standing pattern from implementations). Notifications are hints;
fetch the changed object. Rate-limit-friendly: push consumes no API allowance.
Sources: https://developers.facebook.com/docs/graph-api/webhooks/ ;
https://github.com/yolo404found/facebook-graph-api-service (X-Hub-Signature-256 verification pattern)

## POLLING
/{page-id}/posts, /feed, /{post-id}/comments with since/until and cursor
pagination for backfill and reconciliation behind webhooks. Insights polling
with date presets. Read usage headers every response and back off before 100%.
Source: https://github.com/antonyfmunoz/os/blob/HEAD/skills/tools/meta_graph_api/SKILL.md

## RATE LIMITS
Three header families returned as JSON percentages (call_count, total_cputime,
total_time): X-App-Usage, X-Page-Usage, X-Business-Use-Case-Usage. At 100% the
caller is blocked for about an hour. Read headers on every response; design for
webhooks-first to avoid burn. App Review gates which permissions (and thus
which volume) an app gets. Exact numeric caps are account/app-dependent —
never hardcoded.
Sources: https://github.com/antonyfmunoz/os/blob/HEAD/skills/tools/meta_graph_api/SKILL.md ;
https://developers.facebook.com/docs/graph-api/webhooks/ (webhooks avoid rate limits)

## IDEMPOTENCY
No native idempotency-key on Page post creation in retrieved docs. Retry-safety
is client-side: record the returned post/comment id; on timeout, check the
Page feed for the post before re-POST (duplicate posts are publicly visible).
Comment replies dedupe by returned comment id. Followup: verify current Meta
idempotency guidance at build time.
Sources: CAPABILITIES + POLLING citations; flagged as verify-at-build.

## EFFECTS
Posts publish to a public Page (visible to the world); comments/replies are
public; reactions alter public counts. Publishing is the highest-blast-radius
action in the mapped domains (brand damage, not just money). Reads side-
effect-free. Messenger sends are private but still external.

## REVERSIBILITY
Posts and comments are deletable via API (DELETE /{post-id}, /{comment-id}) —
the most reversible publishing surface mapped. Deletion removes public
visibility but not screenshots/copies (external irreversibility of attention).
Insights data is historical and not editable. Scheduled/unpublished posts can
be cancelled before going live. Followup: verify delete permissions/scopes at
build time.

## PROVENANCE
Global post/comment ids, created_time, from (author page/user), permalink_url,
parent post linkage for comments, edit history where exposed, Insights series
for performance lineage, webhook entry time + field verbs. Strong lineage for
published content; author attribution depends on token/permission scope.
Sources: https://github.com/antonyfmunoz/os/blob/HEAD/skills/tools/meta_graph_api/SKILL.md ;
https://github.com/ratimon/openquok-monorepo/blob/HEAD/web/src/content/docs/social-integration/facebook.md
