# Drop-in Patch: PING Social ActivityPub Projection Adapter (Fedify)

Lane C (Protocol Harvest), 2026-09-20. This patch is INERT BY DEFAULT.
Apply it ONLY when Lane A confirms the native Node website build is green.

## What this is

A flag-gated ActivityPub projection adapter for the PING Social Next.js
website, built on Fedify 2.3.7. It projects PUBLIC PING identities and
objects to the fediverse and turns inbound federation activities into PING
provider observations. Fedify is the wire layer only; it NEVER becomes
canonical persistence. Design: `../fedify-adapter-design.md`.

## Files in this directory

- `ping-federation-adapter.patch`: the patch, unified diff form. Applies
  with `patch -p1` or `git apply`. Verified to apply cleanly 2026-09-20.
- `new-files/`: the same files, readable without applying. Review aid.
- `README.md`: this file.

## Preconditions (all must hold before applying)

1. Native Node website build is GREEN: `npm run build` passes on Node 22+
   with no federation code present. This patch is not a fix for a red build.
2. Next.js version confirmed: @fedify/next 2.3.7 requires Next.js 15.4.6+
   for the Node.js runtime middleware. On Next.js 16, rename middleware.ts
   to proxy.ts and drop `runtime: "nodejs"` from config (see merge note in
   the middleware file).
3. Re-verify the @fedify/* pin at apply time. This patch was written against
   2.3.7 (checked 2026-09-20). Fedify ships fast; check the changelog and
   advisories again. Known fixed issues behind the pin: CVE-2026-34148
   (redirect DoS, fixed 2.1.1), CVE-2026-62857 (NodeInfo SSRF, fixed 2.3.2).
4. FEDIFY_ORIGIN decided: the public https origin actors are minted under
   (e.g. https://ping.social). Pinned in env, never derived from requests.
5. PING gateway contract confirmed with Lane B: the profile read endpoint
   (GET /api/federation/profiles/{identifier}) and the observation endpoint
   (POST /api/observations) the adapter calls. Until those exist, the
   adapter runs on dev fixtures and inbound observations are logged, not
   delivered. That is the documented dev posture, not a stub.
6. middleware.ts merge plan: if the site already has a middleware.ts, merge
   the fedifyWith wrapper per the merge note; there must be exactly one
   middleware.

## Install steps

1. Install dependencies (re-check versions at apply time):
   `npm install -S @fedify/fedify@2.3.7 @fedify/next@2.3.7 @js-temporal/polyfill`
2. From the website repo root: `patch -p1 < ping-federation-adapter.patch`
   (or `git apply`). If middleware.ts already exists, apply with
   `patch -p1 --exclude=middleware.ts` and merge manually per the note.
3. Add to the environment (values are examples; never commit secrets):
   ```
   PING_FEDERATION_ENABLED=0
   FEDIFY_ORIGIN=https://ping.social
   PING_GATEWAY_URL=http://localhost:PORT
   PING_GATEWAY_TOKEN=<bearer token>
   PING_FEDERATION_KEY_DIR=/secure/path/federation-keys   # production only
   PING_FEDERATION_PREVIEW_TOKEN=<random token>           # preview route
   PING_AUTO_ACCEPT_FOLLOWS=0                             # dev testing only
   ```
4. `npm run build` must pass with the patch applied and the flag OFF.
   The flag defaults to OFF: `PING_FEDERATION_ENABLED` unset or anything
   other than `1` means the middleware passes everything through and the
   federation routes return 404.

## Verification steps

Flag OFF (default):
- `/.well-known/webfinger?resource=acct:alice@HOST` returns 404 from our
  route. The rest of the site is unaffected.

Flag ON, dev (PING_FEDERATION_ENABLED=1, no PING_GATEWAY_URL, dev fixtures):
- `npx fedify webfinger acct:alice@HOST` returns a JRD with a self link to
  https://HOST/users/alice.
- `npx fedify lookup https://HOST/users/alice` returns a Person document
  with preferredUsername alice, inbox, outbox, followers, following, liked.
- Preview route: GET /api/federation/preview/alice?key=TOKEN returns the
  same actor JSON the dispatcher projects.
- `npx fedify lookup https://HOST/users/acme-plumbing` returns 404: the
  business fixture has federate=false, so the publicity gate holds.
- `npx fedify lookup https://HOST/users/nobody-at-all` returns 404.
- Inbox: `npx fedify inbox` a Follow to https://HOST/users/alice/inbox;
  the server logs an `activitypub.follow.received` observation as
  not-delivered (no gateway URL). With PING_AUTO_ACCEPT_FOLLOWS=1, an
  Accept is sent back.
- Leak scan: confirm no fixture or response contains email, phone,
  internal PING identity IDs, or non-PUBLIC data. The adapter's
  isProjectable is the enforcement point; review it as security code.

Flag ON, staging (gateway endpoints live):
- Repeat the above against the HTTP profile source: a PUBLIC+federate
  profile projects; PRIVATE, PING_ONLY, and federate=false do not.
- Confirm inbound Follow posts an observation to the gateway and does NOT
  change any projection until the pipeline accepts.

## What this patch does NOT do

- No canonical writes. No PING events in Fedify's KvStore.
- No auto-accept of follows outside dev (PING_AUTO_ACCEPT_FOLLOWS).
- No outbound posting worker; adapter/projectPostCreate is the reviewed
  mapping Lane B's projection worker will call via ctx.sendActivity.
- No production KvStore/MessageQueue; dev uses MemoryKvStore and the
  in-process queue. Production swap is documented in the design doc.
- No business-node federation; the Service projection exists and is gated
  off by default.

## Rollback

Unset PING_FEDERATION_ENABLED (or set to 0) and redeploy: the site behaves
as if federation did not exist. Full removal: revert the patch
(`patch -p1 -R < ping-federation-adapter.patch`) and uninstall the three
packages.
