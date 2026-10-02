# Facebook Grant Inventory

Lane B, 2026-09-20. Source of truth: `/opt/hatch/skills/facebook-cli/SKILL.md`.
Undocumented commands do not exist. All discovery below is read-only and bounded.

## Grant facts (verified 2026-09-20, America/Denver)

- provider: facebook
- account name: Nolan Geske
- provider_subject_id (opaque): 100000536018898
- connector agent_fbid: 1668283294715662 (connector session identifier, not a secret)
- vanity handle observed: facebook.com/nolan.geske
- granted scopes: UNKNOWN. The connector exposes no scope metadata through any
  documented command. Do not assume which OAuth permissions back this session.
- token expiry: UNKNOWN. Not observable through documented commands.
- access token: never printed, never persisted. It is a private secret reference only.

## Available read surfaces (each verified with a bounded live call)

| Surface | Command | Result |
|---|---|---|
| Own identity | `facebook-cli me` | SUPPORTED, verified. Returns name, fb_user_id, profile pic. |
| Profile fields | `profile info --profile-id 100000536018898` | SUPPORTED, verified. Exposed fields: name, id, vanity_url, bio, birthdate, current_city, hometown, education, gender, languages, life_events, profile_picture_url, work. Field values are summarized in the action log, not copied verbatim. |
| Own timeline posts | `timeline fetch --profile-id 100000536018898 --limit 2` | SUPPORTED, verified. Nolan's own posts readable with captions, permalinks, timestamps. |
| Ranked newsfeed | `feed newsfeed --limit 2` | SUPPORTED, verified. |
| Story tray | `story feed --limit 2` | SUPPORTED, verified. |
| Groups | `groups search` | SUPPORTED, verified. Own groups listed with metadata. |
| Events | `events search --scope connected --limit 2` | SUPPORTED, verified. |
| Saved items | `saved list --limit 2` | SUPPORTED, verified. |
| Own Marketplace listings | `marketplace my-listings --limit 2` | SUPPORTED, verified. Nolan's listings visible with status, price, timestamps. |

## Documented but not exercised (per skill file)

| Surface | Status |
|---|---|
| Read post by ID/URL | SUPPORTED (documented) |
| Read post comments (paginated) | SUPPORTED (documented) |
| Read post reaction summary | SUPPORTED (documented, summary only, no reactor list) |
| Friend lookup/search | SUPPORTED (documented) |
| Friends-only feed | SUPPORTED (documented) |
| Group details/posts, event details | SUPPORTED (documented) |
| Marketplace search, listing details, seller info | SUPPORTED (documented) |
| Decode share link | SUPPORTED (documented) |

## Documented write surfaces (NOT exercised; each requires approval or a clear request)

| Surface | Status |
|---|---|
| Marketplace listing create/edit/delete/publish | REQUIRES_REVIEW. Documented, but public-facing writes that prompt for approval per skill rules. Not attempted in this lane. |
| Saved add/remove, saved-collection create | REQUIRES_REVIEW. Documented as auto-allowed only from a clear user request. Not attempted. |

## Classification of desired actions

| Desired action | Classification | Evidence |
|---|---|---|
| Read Nolan profile fields | SUPPORTED | Verified live 2026-09-20. Field list above. |
| Read Nolan posts | SUPPORTED | Verified live via own timeline fetch. |
| Post as Nolan | UNSUPPORTED | No documented facebook-cli command posts to a timeline. The skill is read-only except Marketplace and saved-item writes. FACEBOOK_POST_AS_NOLAN = UNSUPPORTED_BY_CURRENT_GRANT. |
| Like/react | UNSUPPORTED | Reactions endpoint is read-summary only. No documented like/react write. FACEBOOK_LIKE = UNSUPPORTED_BY_CURRENT_GRANT. |
| Follow | UNSUPPORTED | No documented follow command. FACEBOOK_FOLLOW = UNSUPPORTED_BY_CURRENT_GRANT. |
| Read Page data | UNKNOWN | Skill routes managed Pages to post_coach, which is not installed in this environment (/opt/hatch/skills has no post_coach). Out of this lane's documented surface. |
| Publish to Page | UNKNOWN | Same as above. Out of lane. |

## What this means for the sprint

The connected grant is a read-capable adapter for Nolan's own Facebook presence.
It cannot like, follow, or post. Those social actions must live on PING-native
objects (P1 likes, follows, replies), exactly matching the architecture: PING
owns the semantics, Facebook is one rented projection surface. The missing
like/follow/post writes are useful evidence, not blockers. Lane A continues on
PING native objects.
