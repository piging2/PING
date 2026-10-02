# FYD Trace Verification Report — 2026-09-21

**Site:** Happy Place Carpentry LLC (`/sites/happy-place`)
**Branch:** `fyd/sitespec-generator` (repo `/home/nolan/projects/ping`, HEAD `531ac1e`)
**Tracer:** subagent session `96721e7c-1c04-47a3-b7e8-b61b26e240f9`
**Method:** every hop below was executed (curl / sha256sum / SQL / python recompute / file read). Nothing is inferred.

---

## TRACE 1 — "Pergola Design Consultations" (overlay fact, synthetic but real-backend)

HOP: browser HTML bytes contain the fact | id/digest: HTTP 200, 85954 bytes, "Pergola Design Consultations" ×3 | verified-by: `~/workspace/pig/pigwsl-run.sh 'curl -s -o /tmp/hp-page.html -w "HTTP:%{http_code} BYTES:%{size_download}\n" http://127.0.0.1:3100/sites/happy-place && grep -o -i "Pergola Design Consultations" /tmp/hp-page.html | head -3' < /dev/null` (fetched 2026-09-21 ~13:29 MDT; one occurrence is the rendered `<article><h3>` services card, others are the embedded graph JSON)

HOP: read path serves the projection digest-verified, fail-closed | id/digest: n/a (code) | verified-by: `/home/nolan/projects/ping/src/app/sites/happy-place/page.tsx:44-45` (`getPingObjectGraph("happy-place")` → `generateSiteSpec` → validate → `SiteClient`); `/home/nolan/projects/ping/src/fyd/data/ping-object-source.ts:1-80` (checks: file parses; meta.siteId match; every object has non-empty provenance ref; sha256 over canonicalize(graph) must equal meta.graphDigest or refuse to serve)

HOP: projection object carries the fact | id/digest: `website-service-51de038c1defe8bd` | verified-by: `/home/nolan/ping/var/fyd-projections/happy-place.json` `graph.objects[2]` (schema `ping.social.service@1`, title "Pergola Design Consultations", provenance `{kind:"canonical-journal", ref:"ping-event:39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd", derivedAt:"2026-09-21T19:26:26.042Z"}`)

HOP: projection meta links overlay to journal event and digests verify | id/digest: overlayEventIds=`["39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd"]`, graphDigest=`8f4737d846b4e75491b2f8092fabd8d792bb4c896e1e331dd2aac58b38be3607` (recomputed: MATCH), baseDigest=`4638e993ebb17cee24f0e2de6f1a1a9d9d9a5be5ee7183f8f66d5b5bb23d559f` (recomputed: MATCH), fixtureFileDigest=`dbe591a640ef1441d391dc5ac4841a1efba486d5cc5a8ab1c59d48c2b6710295` (sha256sum of fixture file: MATCH), dumpedAt=`2026-09-21T19:26:30.598776+00:00` (4.5 s after the event) | verified-by: python3 canonicalize+sha256 recompute on the Pig (same recursive-key-sort rule as dump.py); `sha256sum /home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`

HOP: journal row in the real demo backend | id/digest: event_id=`39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd`, event_type=`FYD_SITE_OVERLAY`, timestamp=`2026-09-21T19:26:26.042Z`, sequence=`751`, source=`api`, namespace=`core::system`, processed=`false`, payload.ops=`[{op:"add_object",object:{id:"website-service-51de038c1defe8bd",...}}, {op:"add_relationship",relationship:{id:"rel-a9834ffb0c62122f",subject:"website-business-6fa5ebd99d72c4cb",predicate:"provides",object:"website-service-51de038c1defe8bd",...}}]`, siteId=`happy-place` | verified-by: read-only node probe on the Pig via the gateway's pg module (`SELECT event_id, event_type, timestamp, payload FROM ping_events WHERE event_id='39fc…'`, host 127.0.0.1:55433 db `ping-fyd-demo`, password resolved at runtime from `docker inspect ping-test-pg` env, never stored/printed) — returned exactly 1 row; journal payload shows `provenance.ref:"pending-emit"` and `evidenceRef:"pending-emit"`, which dump.py forces to `ping-event:<event_id>` (see `/home/nolan/ping/tools/fyd-site-projection/dump.py:28-45`)

HOP: emit provenance (how the event came to exist) | id/digest: derived oid=`website-service-51de038c1defe8bd`, derived rid=`rel-a9834ffb0c62122f` — both reproduce exactly | verified-by: `python3 -c` sha256 recompute on the Pig using `/home/nolan/ping/tools/fyd-site-projection/emit-overlay.py:92-120` (`add_service_ops`: oid = `"website-service-" + sha256(site+title).hexdigest()[:16]`, rid = `"rel-" + sha256(oid+owner).hexdigest()[:16]`); the script POSTs the envelope to the gateway `/events` (demo: `http://127.0.0.1:18199/events`), and the gateway assigns the event_id. The deterministic ID match plus `source:"api"` plus the `pending-emit` placeholders is the evidence this event was produced by `emit-overlay.py --add-service happy-place "Pergola Design Consultations" "<desc>"`.

**TRACE 1 RESULT: PASS. First broken hop: none.**

---

## TRACE 2 — phone `+15412865190` (real-source base fact)

HOP: browser HTML bytes contain the fact | id/digest: 2 occurrences | verified-by: same `/tmp/hp-page.html` fetch; context: `<a href="tel:+15412865190" class="underline" …>+15412865190</a>` inside the Contact section (`<h2>Contact</h2>`)

HOP: render path for the phone | id/digest: owner object `website-business-6fa5ebd99d72c4cb`, field `phone` | verified-by: `/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts:196-199` (`hasContact` checks `fieldValue(owner,"phone")`; contact section renders the `tel:` link); `src/fyd/components/renderer.tsx:41-77` (`resolveQuery`)

HOP: projection object/field | id/digest: `website-business-6fa5ebd99d72c4cb`, `fields.phone="+15412865190"` | verified-by: `/home/nolan/ping/var/fyd-projections/happy-place.json` `graph.objects[0]` (provenance `{kind:"website-derived", ref:"website-ingestion:https://happy-place-platform.vercel.app/", derivedAt:"2026-09-21T13:50:00Z"}`)

HOP: fixture object id + header | id/digest: same id `website-business-6fa5ebd99d72c4cb`, fixture line 35 `"phone": "+15412865190"` | verified-by: `/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts:1-21` (header: "MACHINE-GENERATED, not hand-written"; Script `/home/nolan/fyd-proof-run/regen.ts`; pin `2026-09-21T13:50:00Z`; pipeline commit `556c56f9bb67cb88bdac1aeb2dea6139763b5f10` — commit exists: `git log` on Pig shows `556c56f fyd(proceduralize): note unified located_at predicate in architecture doc`; Source `https://happy-place-platform.vercel.app/`; source digest `76766d18a3f054e1e545124d0cfc9f5d48e242d1b7c746e9ebc5dbf555936d78`)

HOP: pinned raw bytes (the actual acquisition artifact) | id/digest: sha256 `76766d18a3f054e1e545124d0cfc9f5d48e242d1b7c746e9ebc5dbf555936d78` — MATCHES fixture header source digest; file is 139,618 bytes; contains `"telephone":"+15412865190"` (2 occurrences, inside the LocalBusiness JSON-LD block) | verified-by: `sha256sum` + `grep -o -m1 'telephone[^,}]*'` on `/home/nolan/projects/ping/src/fyd/proceduralize/raw/happy-place-platform/index.html`

HOP: acquisition documentation | id/digest: n/a (prose) | verified-by: `/home/nolan/projects/ping/src/fyd/proceduralize/raw/README.md` — Source `https://happy-place-platform.vercel.app/`; Acquired 2026-09-21 (HTTP 200, 139,618 bytes); "Nolan's own portfolio proof asset … Used with his standing permission"; structured data: one `LocalBusiness` JSON-LD block with telephone `+15412865190`; "Never hand-edit these bytes"

HOP: extraction step that turned source bytes into the field | id/digest: mapping `telephone → phone` | verified-by: `/home/nolan/projects/ping/src/fyd/proceduralize/structured-data.ts:332` (`LITERAL_FACTS` maps schema.org `telephone` to pipeline field `phone`); the fixture was produced by `runExtractionPipeline` (imported in `/home/nolan/fyd-proof-run/regen.ts` from `@/fyd/proceduralize/proceduralizer`) over the pinned raw bytes

**TRACE 2 RESULT: PASS. First broken hop: none.** (Note: the fixture carries no per-field evidence spans — provenance is per-object via the header + raw-byte digest, which is intact, not broken.)

---

## TRACE 3 — relationship "Happy Place provides Pergola Design Consultations"

HOP: rendered services section | id/digest: `<article …><h3 …>Pergola Design Consultations</h3>` card in the Services section | verified-by: `/tmp/hp-page.html` context extract on the Pig; `/home/nolan/projects/ping/src/fyd/proceduralize/generator.ts:61-67` (role map `service: ["provides","offers"]`), `:226-233` (`servicesPage` emits section `"Services"` with `roleQuery(g.owner.id,"service")`); `src/fyd/components/renderer.tsx:56-77` (`resolveQuery` kind `"related"` walks `graph.relationships` matching subject/predicate/status and resolves target objects)

HOP: relationship object in the projection | id/digest: `rel-a9834ffb0c62122f` | verified-by: `/home/nolan/ping/var/fyd-projections/happy-place.json` `graph.relationships[1]`: `{subject:"website-business-6fa5ebd99d72c4cb", predicate:"provides", object:"website-service-51de038c1defe8bd", status:"active", evidenceRef:"ping-event:39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd"}`. It is the ONLY relationship whose object is the service (the other, `rel-9b5d8035b2d8f54e`, is `located_at` on the location object), so the rendered card is unambiguously sourced from this relationship.

HOP: relationship evidence → source | id/digest: evidenceRef → journal event `39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd` | verified-by: same journal row as Trace 1 (payload.ops[1] `add_relationship`, evidenceRef `"pending-emit"` in the journal, forced to `ping-event:<event_id>` by dump.py per its documented overlay-op contract)

**TRACE 3 RESULT: PASS. First broken hop: none.**

---

## Notes / caveats (verified, not assumed)

- `meta.eventSequences: [65, 83]` is a STATIC spec-compile pin in `dump.py` SITES config (`/home/nolan/ping/tools/fyd-site-projection/dump.py:83`, "copied from fyd-proof-run/regen.ts SITES"), not the journal row's sequence (which is `751`). Do not read it as journal evidence.
- `meta.generatedAt: 2026-09-21T12:00:00.000Z` is likewise a static pin.
- The base fixture contains NO service objects at all (only 3 ids: business, location, and the `located_at` relationship) — the rendered Services section currently lists only the overlay service.
- Emit attribution for Trace 1 hop 6 rests on: exact deterministic reproduction of both IDs from `emit-overlay.py:add_service_ops`, `source:"api"` on the row, and the `pending-emit` placeholders. The actual emit invocation was not observed live (it occurred 2026-09-21 13:26:26 MDT, before this session).
- DB credential (demo PG password) was resolved transiently from the `ping-test-pg` container env per the established pattern, used only for the read-only SELECT, and is not recorded anywhere in this report.
