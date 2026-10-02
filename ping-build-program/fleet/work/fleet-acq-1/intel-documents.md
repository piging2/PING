# Connector intel - documents domain (reference platform: Google Drive API v3)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
files (id, name, mimeType, parents[], owners, permissions, createdTime, modifiedTime), permissions, changes, revisions, comments, drives (shared drives), channels. Methods: files.create/get/update/delete/copy/export/download/generateIds/list/watch, permissions CRUD, changes.list/getStartPageToken.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3 ; https://developers.google.com/workspace/drive/api/reference/rest/v3/files

## EVENTS
changes feed: per-user/per-drive ordered change log consumed with page tokens (getStartPageToken, then changes.list). Push notifications via watch channels on files or changes.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3

## CAPABILITIES
Full file CRUD, multipart and resumable uploads, export of Google Workspace formats to MIME types, copy, trash/emptyTrash, search with the q query language, labels, shared-drive management.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3/files

## AUTHORIZATION
OAuth 2.0 with granular scopes (drive.readonly, drive.file, drive). drive.file limits access to files created or opened by the app.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3

## WEBHOOKS
files.watch and changes.watch create push channels delivering HTTPS POST notifications with X-Goog-Channel-* headers. Channels expire; stop via channels.stop.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3

## POLLING
Incremental sync via the changes feed: store the start page token, call changes.list with pageToken, persist the new token. Search via files.list q for ad-hoc queries.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3

## RATE-LIMITS
Per-user rate limits enforced; exceeding returns 403 rateLimitExceeded. Google recommends exponential backoff. Exact quotas live in the Cloud Console; not restated here.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3

## IDEMPOTENCY
No idempotency-key header. files.generateIds issues client-usable IDs so a retried create can reuse the same ID instead of duplicating. Updates are naturally idempotent.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3/files

## EFFECTS
File content/metadata mutations, permission grants/revocations, trash, permanent delete via emptyTrash, shared-drive membership changes. Reads are side-effect-free.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3/files

## REVERSIBILITY
Delete moves to trash (recoverable via files.update untrashed). emptyTrash and direct delete of trashed files are permanent. Revisions preserve prior content versions for rollback.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3/files

## PROVENANCE
File id is stable across moves/renames. createdTime, modifiedTime, lastModifyingUser, version, and revision history give full lineage. Changes feed records what changed per token.
Sources: https://developers.google.com/workspace/drive/api/reference/rest/v3

