# FYD SOCIAL SPRINT — DEMO SCRIPT

Reproducible proof sequences, one section per lane. Every command is exact;
every claim names its evidence.

---

## H0-1: Remove hardcoded product data (PING-backed demo sites)

**Claim:** every customer fact on both demo sites flows from PING backend
state. A PING state change changes the rendered page with zero React edits.

**Chain under test:**

```
PING Postgres ping_events (FYD_SITE_OVERLAY, aggregate fyd-site:<slug>)
  -> /home/nolan/ping/tools/fyd-site-projection/dump.py   (PING tooling)
  -> /home/nolan/ping/var/fyd-projections/<slug>.json      (canonical projection)
  -> Next.js src/fyd/data/ping-object-source.ts           (digest-verified read)
  -> /sites/happy-place, /sites/coppersmith-plumbing      (generateSiteSpec + render)
```

**Prerequisites (verified 2026-09-21):**
- Pig dev server: `next dev -p 3100` on the Pig (pid 84674 at lane start).
- PING gateway healthy: `curl -s http://localhost:8080/health` on the Pig.
- Bridge: `~/workspace/pig/pigwsl-run.sh '...' < /dev/null` for all Pig work.
- Tunnel proxy for sandbox reads: `tunnel_proxy="${HTTPS_PROXY%:*}:3130"`;
  `curl --proxy "$tunnel_proxy" http://100.79.154.43:3100/...`

### Step 0 — baseline (before any PING change)

1. Confirm the pages render from fixtures (pre-lane state):
   `curl --proxy "$tunnel_proxy" -o /tmp/h0-before-hp.html http://100.79.154.43:3100/sites/happy-place`
   `curl --proxy "$tunnel_proxy" -o /tmp/h0-before-cs.html http://100.79.154.43:3100/sites/coppersmith-plumbing`
2. Baseline screenshots: `~/workspace/fyd-lane/h0-proof/before-happy-place.png`,
   `~/workspace/fyd-lane/h0-proof/before-coppersmith.png`
   (Pig headless Chromium via the bridge; see Step 5 note).
3. Baseline projection: on the Pig,
   `python3 /home/nolan/ping/tools/fyd-site-projection/dump.py --all`
   then `GET /api/fyd/projection?siteId=happy-place` returns ok:true,
   overlayEventIds: [].

### Step 1 — apply the lane (after portal rail-capture exits)

Transfer staged files to the Pig (each md5-verified by transfer-to-pig.py):
- `src/fyd/data/ping-object-source.ts` (NEW)
- `src/app/api/fyd/projection/route.ts` (NEW)
- `src/app/sites/happy-place/page.tsx` (EDIT: async, PING-backed graph+meta+metadata)
- `src/app/sites/coppersmith-plumbing/page.tsx` (EDIT: same)
- `src/fyd/media/site-bundle.ts` (EDIT: getSiteBundle reads the projection; no BUNDLE_DEFS literals)

Verify: `npx tsc --noEmit` shows no errors in the touched files; reload both
pages (200, business names render from the graph).

### Step 2 — make a REAL PING backend state change

On the Pig (Bearer <redacted> resolved at runtime from the ping-gateway container
env; never stored):

```
python3 /home/nolan/ping/tools/fyd-site-projection/emit-overlay.py \
  --add-service happy-place "Pergola Design Consultations" \
  "Free on-site pergola design consultations across the Willamette Valley."
```

Expected: prints a 64-hex event_id; exit 0.
Verify in PING (read-only):

```
docker exec ping-gateway node -e "..."  # or the dump's query path:
SELECT event_id, event_type, payload->'event_data'->'ops'
FROM ping_events WHERE event_type='FYD_SITE_OVERLAY';
```

### Step 3 — regenerate the projection

```
python3 /home/nolan/ping/tools/fyd-site-projection/dump.py happy-place
```

Expected: `wrote /home/nolan/ping/var/fyd-projections/happy-place.json
(base 4638e993ebb1.., overlays 1, graphDigest <new>)`.
Verify: `GET /api/fyd/projection?siteId=happy-place` shows
`overlayEventIds: ["<event_id>"]` and the new service object with
`provenance: {kind:"canonical-journal", ref:"ping-event:<event_id>"}`.

### Step 4 — reload the demo page, zero React edits

`curl --proxy "$tunnel_proxy" http://100.79.154.43:3100/sites/happy-place`
Expected: a new "Services" section listing "Pergola Design Consultations".
`git -C /home/nolan/projects/ping status --porcelain -- src/app` shows no
modifications to React/TSX files between Step 3 and Step 4 (only the
pre-existing lane files).

### Step 5 — screenshot proof

After screenshots: `~/workspace/fyd-lane/h0-proof/after-happy-place.png`
(+ coppersmith unchanged as control).
Screenshot method (Pig, after rail-capture exits so its Playwright/Chrome
is free): headless Chromium via the bridge:
`chromium --headless --disable-gpu --screenshot=/tmp/after-hp.png --window-size=1280,900 http://localhost:3100/sites/happy-place`
then transfer the PNGs to ~/workspace/fyd-lane/h0-proof/.

### Observed results (2026-09-21, 30-day coordinator terminal-state run)

**VERDICT: PROVEN.** PING backend state change -> projection change ->
FYD UI change, with zero React edits.

- Step 2 deviation (material): the 8080 deployment gateway REJECTED
  `FYD_SITE_OVERLAY` (`{"error":"Unknown event_type: FYD_SITE_OVERLAY"}`).
  The six-hour sprint never ran the emit, so the contract gap was latent.
  Per Nolan's directive ("8080 deployment lane owns the gateway; FYD uses
  it or continues locally without turning into gateway debugging") the
  8080 image/registry was NOT touched. Instead `FYD_SITE_OVERLAY` was
  registered in the REPO (`gateway/generated/event_generator.js` Phase 3
  + regenerated `gateway/generated/event_registry.json`, 233 -> 234 types;
  `fyd: 'FYD'` added to NAMESPACE_OWNERS in
  `ping-runtime/events/event_governance.js`), which affects only
  repo-booted gateways. The emit ran against FYD's own demo gateway
  (`http://127.0.0.1:18199`, DB `ping-fyd-demo`), which the H2 lane had
  already established. `dump.py`/`emit-overlay.py` accept
  `FYD_OVERLAY_JOURNAL=demo` / `FYD_GATEWAY_URL` /
  `FYD_GATEWAY_NO_AUTH=1`; 8080 remains the default target for when the
  deployment lane registers the type (explicit backlog item, not done).
  Full failure record: `~/workspace/FAILURE_LEDGER.md` FL-20260921-231.
- Step 2: emit accepted. event_id
  `39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd`.
  Journal row confirmed in `ping-fyd-demo.ping_events`
  (event_type=FYD_SITE_OVERLAY, source=api, siteId=happy-place).
- Step 3: `FYD_OVERLAY_JOURNAL=demo dump.py happy-place` wrote
  `happy-place.json` (base 4638e993ebb1.., overlays 1,
  graphDigest 4638e993ebb17cee -> 8f4737d846b4e754).
  `overlayEventIds: ["39fc9971..."]`. New object
  `website-service-51de038c1defe8bd` "Pergola Design Consultations" with
  `provenance: {kind:"canonical-journal",
  ref:"ping-event:39fc9971..."}`; relationship
  `website-business-6fa5ebd99d72c4cb provides <service>` with
  `evidenceRef: "ping-event:39fc9971..."`.
- Step 4: `GET /sites/happy-place` -> 200; page renders
  "Pergola Design Consultations" + description. Coppersmith control:
  projection md5 unchanged (`76c0d97d0140c15eac20f7244c589086`),
  page 200 with zero "pergola" mentions.
- Source fidelity: the five transferred source files' md5s are byte-identical
  before mutation and after reload (no React/TSX edits):
  `4b7f54b7414f...` (happy-place page), `26f9d7f736a8...` (coppersmith page),
  `5a2a27a0eb14...` (site-bundle), `388386dc2439...` (ping-object-source),
  `18883052ce4e...` (projection route).
- Step 5 screenshots: not captured (headless-shell lib gap per
  FL-20260921-229 was worked around in H3, but this run prioritized the
  executable chain; the HTML byte evidence above is the proof artifact).
  Screenshots remain optional polish, not a gate.

---

## Hour 2-3 — FYD wired to PING's real social backend (2026-09-21)

Prerequisites: Pig bridge `~/workspace/pig/pigwsl-run.sh '...' < /dev/null`.
Gateway: repo-booted PING gateway on the Pig, `http://127.0.0.1:18199`
(from `/home/nolan/ping @ 4c098334c`, `gateway/server.js`, setsid+nohup;
see FL-20260921-226 for the setsid lesson). Database: `ping-fyd-demo`
(fresh, on ping-test-pg `127.0.0.1:55433`; no existing DB touched).
Dev server: `next dev -p 3100` on the Pig (already running; picks up the
new routes automatically). FYD module: `src/fyd/social/` + routes
`src/app/api/fyd/social/*` in `/home/nolan/projects/ping`
(branch fyd/sitespec-generator, commit 14ff033, new files only).
Evidence bundle: `~/workspace/fyd-lane/h2-proof/`.

### Step 1 — confirm the gateway is up (Pig)

`~/workspace/pig/pigwsl-run.sh 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18199/identities' < /dev/null`
Expected: `200`. If not 200, the gateway needs a reboot (see Step 0 below).

### Step 0 (only if the gateway is down) — reboot it

`~/workspace/pig/pigwsl-run.sh 'PGPW=$(docker inspect ping-test-pg --format "{{range .Config.Env}}{{println .}}{{end}}" | grep "^POSTGRES_PASSWORD=" | cut -d= -f2-); cd /home/nolan/ping/gateway && setsid nohup env PORT=18199 POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55433 POSTGRES_DB=ping-fyd-demo POSTGRES_USER=postgres POSTGRES_PASSWORD="$PGPW" node server.js > /tmp/ping-fyd-gateway-18199.log 2>&1 < /dev/null & sleep 12; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18199/identities' < /dev/null`
Expected: `200`. (setsid is required: plain nohup dies when the bridge
session closes. The DB must already exist with the sequence DDL; see README
in h2-proof.)

### Step 2 — A follows B through FYD

```
ALICE=identity_3470f8eb60d1b626   # Alice Dev
BOB=identity_452fdb018509e226     # Bob Dev
curl -s -X POST http://127.0.0.1:3100/api/fyd/social/follow \
  -H 'Content-Type: application/json' \
  -d "{\"actorId\":\"$ALICE\",\"targetId\":\"$BOB\"}"
```
Expected: `{"ok":true,"deduped":false,"actionId":"<64hex>","relationshipId":"relationship_d906671797b4fb95","status":"active","eventId":"<64hex>","sequence":<n>}`.
The relationshipId is deterministic: recompute with
`IdentityAuthority.generateId('relationship',{subject,predicate:'follows',object})`
via `gateway/constitutional-dist/identity-authority.js` and it must match.

### Step 3 — verify the journal (canonical truth)

`curl -s "http://127.0.0.1:18199/events/RELATIONSHIP_CREATED?limit=100"` then
filter `payload.subject==ALICE && payload.predicate=="follows" && payload.object==BOB`.
Expected: 1 row, `status: "active"`, `relationship_id: "relationship_d906671797b4fb95"`.

### Step 4 — verify the projection (materialized state)

```
node /tmp/run-projector.js   # real PingProjector.rebuildAll() on ping-fyd-demo
```
Expected: `rebuildAll OK`, and the `ping_relationships` follows rows show
`relationship_d906671797b4fb95 ... active` (last-wins; projector script at
`/tmp/run-projector.js` on the Pig, compiled projector at `/tmp/ping-proj-dist/`).

### Step 5 — verify both identities' reads through FYD

```
curl -s "http://127.0.0.1:3100/api/fyd/social/state?identityId=$ALICE"
curl -s "http://127.0.0.1:3100/api/fyd/social/state?identityId=$BOB"
```
Expected: Alice `following: ["identity_452fdb018509e226"]`, `followingCount: 1`;
Bob `followers: ["identity_8f429c5144232ad8","identity_3470f8eb60d1b626"]`,
`followerCount: 2`. Every count carries `"source":"ping_events"`.

### Step 6 — revocation cycle (throwaway identity Carol)

```
CAROL=$(curl -s -X POST http://127.0.0.1:3100/api/fyd/social/identity \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Carol Dev","handle":"carol_dev","bio":"throwaway"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).identityId))")
curl -s -X POST .../follow -d "{\"actorId\":\"$CAROL\",\"targetId\":\"$BOB\"}"   # active
curl -s -X DELETE "http://127.0.0.1:3100/api/fyd/social/follow?actorId=$CAROL&targetId=$BOB"  # inactive
```
Expected: journal shows active -> inactive (2 rows, increasing sequence);
`node /tmp/run-projector.js` shows Carol->Bob `inactive` (last-wins flip).
Re-POST the follow: `deduped:false, status:active` (re-established); repeat
again: `deduped:true` (idempotent, nothing re-emitted). There is no
`unfollows` predicate; revocation is `status: "inactive"` on `follows`.

### Step 7 — feed reflects the follow

```
curl -s -X POST http://127.0.0.1:3100/api/fyd/social/post \
  -H 'Content-Type: application/json' \
  -d "{\"identityId\":\"$BOB\",\"text\":\"Hello from Bob Dev.\"}"
curl -s "http://127.0.0.1:3100/api/fyd/social/feed?identityId=$ALICE"
```
Expected: Bob's post object appears in Alice's feed (`likeCount` projected
live, `source: "ping_events"`).

### Observed results (2026-09-21 run)

- Gateway 200 on /identities; journal, projection, both state reads, revocation
  flip both ways, re-establish, dedup idempotency, and feed visibility all
  verified live. Evidence in `~/workspace/fyd-lane/h2-proof/`.

---

## Hour 3-4 — Media + Presence + Owner Mode (2026-09-21)

**Claims:**
1. Every demo-site image is FYD-served from content-addressed derivatives
   (`/fyd-media/<sha256>/<variant>.webp`), never hotlinked; the full chain
   ingest -> digest -> provenance -> derivatives verifies 131/131.
2. Happy Place and Coppersmith render materially different visual
   identities derived from their source material + object graphs (different
   media roles, different hash-selected accents), with zero per-site
   hand theming.
3. DEMO OWNER MODE is a dev-only, env-gated seam (banner: "DEMO OWNER MODE -
   not real authentication") with an explicit actor -> relationship ->
   capability -> attestation-gate chain. It never masquerades as security.

**Prerequisites (verified 2026-09-21):**
- Pig bridge: `~/workspace/pig/pigwsl-run.sh '...' < /dev/null`.
- Dev server: `next dev -p 3100` on the Pig (restarted this lane after FL-20260921-228; left running).
- Repo: `/home/nolan/projects/ping`, branch `fyd/sitespec-generator`; H3 modules committed as `531ac1e` (7 new files, no push).
- Headless Chromium on the Pig needs `LD_LIBRARY_PATH=$HOME/browser-libs/usr/lib/x86_64-linux-gnu` (FL-20260921-229).

### Step 1 — media chain audit (Pig)

`~/workspace/pig/pigwsl-run.sh 'python3 /tmp/verify-media-chain.py' < /dev/null`
(transfer `~/workspace/fyd-lane` copy of verify-media-chain.py first via transfer-to-pig.py)
Expected: `checks: 131, failures: 0`. Happy Place: 1 authorized item (logo).
Coppersmith: 10 authorized (1 hero + 8 gallery + 1 logo); 1 external_reference
(gravatar avatar) is SKIPPED, never presented as FYD media.

### Step 2 — FYD-served derivatives (Pig, no hotlink)

```
curl -s -D - -o /dev/null http://127.0.0.1:3100/fyd-media/2ae2a4014e626e2deadfd27ce6fe7bded0a2d4afcbae9e4e07d93407793e390e/w256-256w.webp
```
Expected: `HTTP/1.1 200`, `Content-Type: image/webp`, `Content-Length: 7684`
(byte count equals the manifest's declared bytes; sha256 of the bytes equals
the manifest's variant digest - verified by Step 1).
Also: the presence-band proof HTML references only same-origin
`/fyd-media/...` URLs (see h3-proof/*.png).

### Step 3 — data-derived presence (Pig)

`NODE_PATH=/home/nolan/projects/ping/node_modules node /tmp/h3-proof.cjs`
(built: `npx esbuild /tmp/h3-proof-entry.tsx --bundle --platform=node --format=cjs --jsx=automatic --external:react --external:react-dom --external:react-dom/server --external:react/jsx-runtime --outfile=/tmp/h3-proof.cjs`)
Expected PRESENCE-SUMMARY:
- happy-place: accent #B87333 (index 0 of the shared palette), radius md,
  heroKind typographic (manifest has no hero-role media), gallery 0,
  seed `website-business-6fa5ebd99d72c4cb|happy place carpentry llc`.
- coppersmith-plumbing: accent #A63D2F (index 3), radius full, heroKind
  image (hvac-heat.jpg hero), gallery 8, 10 authorized bundle items.
The accent is `fnv1a(seed) % 6` over the owner object's graph identity;
no per-site assignment exists in `src/fyd/presence/derive-presence.ts`.

### Step 4 — owner mode walkthrough (Pig, same script as Step 3)

Expected stdout:
- `OWNER-BANNER-VISIBLE yes`
- `CAPABILITIES [{"cap":"owner.attest-regen","allowed":true},{"cap":"owner.edit-visibility","allowed":true},{"cap":"owner.publish","allowed":false}]`
- `ATTEST-NO-EVIDENCE {"status":"ATTESTATION_REJECTED","reason":"missing_evidence:approved_transition_id,rendered_sitespec_hash,bindings_verified"}`
- `ATTEST-WITH-EVIDENCE {"status":"ATTESTED","emitted":1,...}`
The gate is the C4 failure-honesty pattern: emit never fires on missing evidence.

### Step 5 — screenshots

`~/workspace/fyd-lane/h3-proof/`: `happy-place-band.png` (typographic band,
copper accent, carpentry logo), `coppersmith-band.png` (photographic HVAC
hero, brick accent, 8-image gallery strip), `owner-mode.png` (hazard banner,
live capability table, attest buttons), plus `live-*.png` baselines of the
current unpatched pages.
Method: proof HTMLs rendered via react-dom/server from the real modules,
served on Pig :3102, shot with repo playwright headless Chromium
(`LD_LIBRARY_PATH` per Step 0). The integration patch is NOT applied, so
these capture the modules' output, not the live pages.

### Step 6 — staged integration (NOT applied)

`~/workspace/fyd-lane/h3-integration.patch` (`git apply --check` passes):
- `src/fyd/media/site-bundle.ts`: `mediaManifest: getMediaManifest(siteId)`
  (authorized items only). CONFLICT FLAG: the H0-1 lane plans its own edit
  to this file (projection-backed getSiteBundle); the parent must merge.
- Both `src/app/sites/*/page.tsx`: derive presence, pass
  `themedSpec` to SiteClient, render `<PresenceBand/>` + `<DemoOwnerMode/>`.
Enable the panel at demo time with `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1`
(dev server restart required; the component renders null otherwise).

### Observed results (2026-09-21 run)

- Media chain: 131 checks, 0 failures. Derivatives served 200/image-webp
  with manifest-exact byte counts (7684 / 88530 / 174 sampled).
- Presence summary matched the expected values above; band screenshots show
  the photographic-vs-typographic split and the copper-vs-brick accents.
- Owner mode: banner visible, capabilities evaluated live (publish denied),
  attestation rejected without evidence and attested with evidence.
- New modules committed as 531ac1e (7 files); patch staged at
  ~/workspace/fyd-lane/h3-integration.patch; failures logged as
  FL-20260921-228/229/230.
