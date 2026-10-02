# Connector: Google Drive

## Why
Document ingestion: read file metadata + content via the changes feed and files.export.

## Exact scope set (smallest permission set)
| Scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| `https://www.googleapis.com/auth/drive.readonly` | Read file metadata + content (the demonstrated feature) | yes | No Drive access at all; connector stays DISABLED |

No write scopes. No broader drive scope.

## PKCE
Yes. Authorization-code flow with PKCE. `access_type=offline` only if a refresh token is needed for background sync; otherwise online.

## What Nolan must physically do (Google Cloud Console)
1. Pick the Google account whose Drive connects. Recommendation: a dedicated PING service Drive, not his personal Drive.
2. Use the same Google Cloud OAuth client as GBP (separate consent per scope set). No new client needed.
3. Consent to `drive.readonly` when the connect UI redirects him.

What breaks without offline access: background sync stops when the access token expires; the connector reports AUTH_EXPIRED and waits for re-consent rather than silently going stale.

## What the agent does after
Incremental consent on the shared OAuth client; server-side PKCE exchange; `broker.issue()` into lane-L custody; discover() inventory; changes-feed ingestion begins. If the Nango verdict is adopted, the `google` provider entry already covers OAuth; the scope is passed at connect time.

## Personal vs dedicated account
Strongest recommendation in this queue for dedicated. `drive.readonly` on a personal Drive exposes personal files (documents, photos, backups, anything in Drive) to the observation pipeline. A dedicated PING Drive bounds the blast radius to business documents only. Same-scope rule applies either way; the difference is whose files are in scope. Recommendation: dedicated PING Drive. If Nolan picks personal, that is his explicit risk acceptance and must be recorded as such.

## Handle story
Agents get an opaque `cap_` handle from the lane-L broker; refresh token encrypted in custody (envelope encryption, KEK outside the store); agents never see tokens. See lane-l/SECRET-BROKER-DESIGN.md.
