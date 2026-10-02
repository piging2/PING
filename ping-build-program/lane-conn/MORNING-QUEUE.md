# MORNING-QUEUE.md — credential / account requests for Nolan (CONN-BUSINESS)

Standing decision: no live credentials tonight; nothing was connected.
Everything below is a request, not an action taken. Nolan picks which real
account gets connected; agents never connect anything.

## GBP live path (winner connector)

1. **Google Cloud project + GBP API approval** (longest lead item in the
   wave). Needs: a Google account that owns/manages a Google Business
   Profile verified and active for 60+ days, a representative business
   website on that profile, then Google's "Application for Basic API Access"
   form. Until approved, all Business Profile API quotas are 0 QPM
   (the spike stays DISABLED with GOOGLE_GBP_ACCESS_PENDING; it never
   probes). Start this clock first.
2. **OAuth client + consent (PKCE).** After approval: OAuth 2.0 client,
   consent screen requesting exactly
   `https://www.googleapis.com/auth/business.manage` (smallest permission
   set for the demonstrated feature: read locations + read reviews). No
   write scopes, no speculative scopes. Refresh token stored in the Secure
   Vault via the lane-L secret broker (agents get capability handles, never
   tokens). The connector uses the authorization-code flow with PKCE per
   current OAuth guidance.
3. **Reviews-leg expectation setting.** The reviews list endpoint is a
   producer-restricted legacy surface; approval may not grant it (observed
   403 SERVICE_DISABLED on approved projects). The connector is already
   designed to degrade the reviews leg to UNKNOWN while locations keep
   working. If the morning probe confirms the 403, that is a designed
   state, not a bug.
4. **Pub/Sub topic (push leg, later).** Only after items 1-2 work: a Cloud
   Pub/Sub topic granting `mybusiness-api-pubsub@system.gserviceaccount.com`
   the Publisher role, plus a push subscription to an HTTPS endpoint.
   Poll backfill remains mandatory (Google never redelivers).

## Next-3 connectors (queued in priority order)

5. **Square sandbox app** (no real account, no money involved): a Square
   developer sandbox application + test credentials. This is the cheapest
   live end-to-end proof available and needs nothing of Nolan's beyond
   creating the sandbox app.
6. **Yelp Fusion trial key + plan decision**: a Yelp developer app key for
   evaluation, plus Nolan's call on plan tier (trial is evaluation-only per
   Yelp ToS; production needs a paid tier, 30k calls/month default).
7. **Jobber partner conversation**: Jobber's API is partner-gated. Nolan's
   call whether to start the partner application, or fall back to
   Housecall Pro (smaller API, account-gated).
8. **Meta App Review application** (for the Pages identity leg): a Meta app
   with App Review for `pages_read_engagement`, `pages_read_user_content`,
   `pages_show_list`. Also a live probe of whether Page
   Reviews/Recommendations endpoints still function (vendor-reported 501
   since Graph API v22.0, unconfirmed).

## Explicitly NOT requested

- No write scopes on any provider (v1 connectors are read-only; write needs
  a separate elevated grant that is DENIED by default).
- No credential values in chat, files, memory, or logs; only vault refs.
- No speculative OAuth scopes beyond what the demonstrated feature needs.
- Nothing connected tonight; the spike ran fixture-only.
