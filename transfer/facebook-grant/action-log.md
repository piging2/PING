# Action Log: Lane B Facebook Adapter

All times America/Denver, 2026-09-20. All actions read-only and bounded.
No access token was printed or persisted at any point.

## Executed bounded action (preference order item a)

`facebook-cli profile info --profile-id 100000536018898`
- Ran 19:32. Verified: returned Nolan Geske's profile.
- Fields confirmed exposed: name, id, vanity_url, bio, birthdate, current_city,
  hometown, education, gender, languages, life_events, profile_picture_url, work.
- Outcome: SUPPORTED, verified. This is the executed bounded real action.
- Provenance: connector retrieved_at 2026-09-20T19:32:41-06:00,
  tool_call_id call_01a0c198048974aca3e2e2cc0b73a311.

## Grant inventory reads (each a single bounded call)

1. `facebook-cli me` (19:32). Verified connected as Nolan Geske,
   fb_user_id 100000536018898. No scope or token-expiry metadata exposed.
2. `facebook-cli timeline fetch --profile-id 100000536018898 --limit 2`
   (19:32). Verified: 2 of Nolan's own posts returned with permalinks and
   timestamps (2026-09-20 and 2026-09-17). Captions summarized, not copied.
3. `facebook-cli feed newsfeed --limit 2` (19:32). Verified: ranked newsfeed
   readable, 2 posts returned.
4. `facebook-cli marketplace my-listings --limit 2` (19:33). Verified:
   Nolan's listings visible, including one active vehicle listing with status,
   price, and creation timestamp.
5. `facebook-cli saved list --limit 2` (19:33). Verified: 2 saved items
   returned with titles, types, permalinks.
6. `facebook-cli groups search` (19:33). Verified: own groups listed with
   descriptions and URLs.
7. `facebook-cli events search --scope connected --limit 2` (19:33).
   Verified: connected events returned with names, times, privacy.
8. `facebook-cli story feed --limit 2` (19:33). Verified: story tray readable.

## Negative findings (evidence, not failures)

- No documented facebook-cli command exists for: posting to a timeline,
  liking/reacting, following, reading managed Page data, or publishing to a
  Page. Reactions are read-summary only. Marketplace and saved-item writes
  exist but require approval or a clear request and were not attempted.
- The post_coach skill (the documented route for managed Pages) is not
  installed in this environment, so Page surfaces are classified UNKNOWN,
  out of this lane.
- Granted scopes and token expiry are not observable through any documented
  command. Classified UNKNOWN. Nothing in the connector output exposed the
  token itself.

## Nothing retried, nothing blocked

No rate limits or denials were hit. No action was retried. No fake
identities were created, no impersonation, no scraping around access
controls, no mass actions of any kind.
