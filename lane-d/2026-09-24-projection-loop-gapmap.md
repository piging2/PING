# LANE D: Projection-Loop P0 — Gap Map + Fix Design

Date: 2026-09-24 ~16:00 MDT. Lane D (owner write → regen → readback).
Method: read-only trace on the Pig (no builds, no writes, no restarts).
Decisions folded in: FYD-Q2 (semantic-fact privacy at read time), ONE-CLICK = operator-first single factory.

## 1. The loop as verified (file:line grounded)

A. APPROVE — `POST /api/fyd/customize` (`src/app/api/fyd/customize/route.ts`,
`handleApprove`): re-derives parse → resolve → propose against the CURRENT
spec, verifies proposal digest + full body, `buildDirective` mints the
deterministic intentId `pi-` + sha256(siteId|proposalDigest)[0:16]
(`src/fyd/customize/server.ts:directiveIdFor`). `emitOverlayEvent`
preflights journal identity (FYD-037) then POSTs `FYD_SITE_OVERLAY` to
`127.0.0.1:18199/events`. Returns 200 `{eventId}` with the note
"Re-run the projection dump".

B. JOURNAL — `tools/fyd-journal-gateway/server.mjs`, append-only JSONL at
`data/fyd-journal/events.jsonl` (NOT Postgres). Live: pid 52289, restarted
14:47 MDT with the request_id-dedup code. 38 events: 19 happy-place +
19 coppersmith-plumbing.

C. REGEN — nothing automatic. THE STALL.

D. PROJECTION — `/home/nolan/ping/var/fyd-projections/<slug>.json`, atomic
tmp+rename writes. Currently in sync: 19/19 journal events present,
`dumpedAt` 2026-09-24T15:55:13.908Z, exactly 45ms after the last approval
(15:55:13.863Z). Caught up only by manual intervention.

E. READ — `getPingObjectGraph` reads the file per request (no cache),
verifies `graphDigest`, `loadCustomizedSite` → `generateSiteSpec` →
`applyPresentationIntent` (directives re-validated at read: proposal digest,
design-system refusal, section re-resolution; unresolved are reported, kept,
never dropped). `/sites/*` pages are dynamic (only favicon/sitemap/robots
prerendered). No restart needed once the file is fresh.

## 2. Stall points

S1 (structural): a journal append invalidates nothing. No trigger exists
anywhere: no cron, no timer, no hook. `grep` for dump invocations finds only
docs.

S2 (tooling — worse than "manual"): the checked-in `dump.py` (v1.0.0 = HEAD)
CANNOT regenerate the live projection:
  (a) no `set_presentation_intent` / `clear_presentation_intent` support
      (the `.bak-20260924-seamfix` copy, v1.1.0, HAS it — the fix existed
      and was lost);
  (b) reads Postgres only, never the live JSONL journal;
  (c) PG demo path auth-broken (docker-inspect password rejected);
  (d) PG content is stale UUID-era rows, including two 2026-09-24 05:46 MDT
      `set_field phone` ops with fake 555 numbers — a PG merge would
      resurrect fake customer data.
  The 09:55 dump used a transient 1.1.0+JSONL build (proven by
  `__pycache__/dump.cpython-314.pyc` strings: `query_overlays_jsonl`,
  "two-store merge"). It was never committed; the file reverted to HEAD at
  10:10 MDT. Manual regen is currently IMPOSSIBLE with checked-in tooling.

S3 (FYD-Q2): hide is presentation-level only (`toggle_section.hidden`,
`deactivate_object` → section `hiddenObjectIds`). No semantic-fact mask
exists. `publicGraph` filters by `visibility` only. The fixture proves the
traversal risk: Business `--located_at-->` Location object with
`fields.address_locality/region/country` ("Adair Village", "OR", "US").
Hiding the Location object in a section does not suppress the FACT; Ask FYD
context compiler, search, and Circle read paths are not verified to share
any mask (audit required).

S4 (idempotency, main tree / HEAD): `emitOverlayEvent` sends no `request_id`
(0 occurrences in main tree and HEAD). Gateway dedup exists but can never
fire for the customize path on :3100. Double-approve pre-regen → 2 journal
events, same intentId → dump upserts → 1 directive (projection-effect
idempotent; journal accumulates dup rows). Post-regen double-approve →
422 `no_op` ("already first/hidden/..."). Dropped response after accept →
`emitOverlayEvent` throws → API 502 "NOT recorded", which may be FALSE.
Honesty bug: must be UNKNOWN with same-request retry.
NOTE: build-idem already implements request_id emit + retry-once +
`idempotency_conflict` (server.ts:133-227, route.ts:22-26,282-300,406-445).
Lane D must build on it, not duplicate it.

S5 (UX/process): the approve response literally instructs "Re-run the
projection dump".

## 3. Fix design (smallest; Q2 + one-click folded in)

Law check: no new service/daemon/queue/authority. The journal is the
invalidation authority; the projection is a pure function of
(fixture, journal); the reader applies intent at read time.

D1. One journal of record: the JSONL demo gateway, read via its own
contract `GET /events/FYD_SITE_OVERLAY`. No PG merge, ever (fake-555
evidence). When :8080 registers FYD_SITE_OVERLAY (FL-20260921-231
unblocks), the journal moves and the hook moves with it; the dump keeps
one read path.

D2. Repair the dump (`/home/nolan/ping/tools/fyd-site-projection/dump.py`):
restore v1.1.0 presentation-intent op support (from the .bak) + the
JSONL-gateway read (from the transient build, minus the merge). Keep:
atomic tmp+rename, fail-closed on unknown ops, digest discipline,
`overlayEventIds` + `presentationIntentDigest` in meta. Commit it.

D3. Auto-regen hook in the journal gateway (post-append, FYD_SITE_OVERLAY
only): after a successful append, spawn the dump for
`event_data.siteId`, serialized per site, timeout-bounded, command via
env `FYD_REGEN_CMD`. Journal accept is the source of truth: regen failure
never fails the 200; the response carries
`projection: {status: regenerated|failed, error?}` as information.
A bounded mechanism inside the existing process, not a new service.

D4. Approve API closes the click: `handleApprove`/`handleClear` await the
journal round-trip (which now includes regen), then verify readback by
polling the projection file until `meta.overlayEventIds` contains the
`event_id` (bounded ~5s), and return
`{eventId, intentId, visible: true}`. Delete the "re-run the dump" note.
The UI re-fetches after 200 and sees the change. No optimistic UI:
`visible:true` only after the projection bytes contain the event.

D5. Idempotency: adopt build-idem's request_id path (no duplication).
Deterministic ids: `fyd-approve:<intentId>`,
`fyd-clear:<siteId>:<intentId>`. Double-failure → honest UNKNOWN
("may or may not have been recorded; retry the same approval"),
never 502 "NOT recorded".

D6. FYD-Q2 read-time privacy:
  - Hide directives already flow journal → projection block. Derive a
    privacy mask = normalized hidden facts + source directive ids,
    versioned in meta (`privacyMaskDigest`).
  - One enforcement function, `applyFactPrivacy`, at the public boundary:
    suppress any object field/title/description and any relationship
    traversal whose normalized value matches a hidden fact. Evidence stays
    in journal/graph/projection bytes (HIDE does not delete); the mask
    applies at READ, every read.
  - Funnel: renderer (`publicGraph`), Ask FYD context compiler, search,
    Circle, public agent context. Verification: hide "Adair Village, OR"
    → assert zero disclosure via Business→located_at→Location.address and
    via direct field reads, on every surface. Observed world, owner
    intent, and generated presentation stay distinct layers.
  - Regen invalidation covers hide directives automatically (same journal,
    same hook).

D7. One-click factory seam: the factory is
URL/sources → acquisition → evidence → object graph → SiteSpec →
renderer → private preview → critics → owner-review package.
The regen path (D2+D3) is the factory's projection step; the approve
path (D4) is its owner-review step; both survive one-click with zero
manual glue. Principal/capability boundary: formalize
`resolvePrincipal(req)` → operator|owner in front of the existing
`demoDenied`/`evaluateCapability` edge, so future owner self-serve swaps
the principal with no second factory and no second onboarding pipeline.
Critics run against the masked public graph (Q2 covers the factory's QA).

## 4. Idempotency attack (current → designed)

- Same approve repeatedly, pre-regen: today N events / 1 directive
  (upsert by intentId); with D5 → 1 event (`deduped:true`).
- Concurrent approves: gateway check→append→index is synchronous
  (no awaits) → same request_id converges; different proposals →
  journal-ordered deterministic dump.
- Dropped response after accept: today 502 "NOT recorded" (possibly
  false); with D5 → retry same request_id → `deduped:true` proves the
  original; double-failure → honest UNKNOWN.
- Gateway restart mid-flight: requestIndex rebuilt from JSONL at startup
  (first record wins); journal + projection are files. Verified in code.
- Approve → clear → re-approve same text: deterministic intentId →
  clear removes pi-X, re-approve re-adds pi-X. One logical intent.

## 5. Owner intent survival

Intent lives in the append-only journal. Projection = pure function of
(fixture, journal in timestamp+event_id order). "Move emergency plumbing
first" → approve → regen → directive in block → readback applies.
Source re-observation → fixture changes → dump re-extracts base
(`baseDigest` changes) → directives re-applied from journal in order and
re-validated at read (apply-layer: digest re-check, section
re-resolution; unresolved → reported, kept, not dropped). Intent
survives; source truth untouched (directives never merged into the graph;
provenance refs intact). Restart → files persist; next read re-verifies.

## 6. Proof results (read-only, verified 2026-09-24)

P1. Loop traced end to end with file:line evidence; the only structural
    gap is journal → regen.
P2. Projection in sync (19/19) solely because of a manual dump 45ms after
    the last approval. The gap is live, not theoretical.
P3. Checked-in dump.py cannot regenerate the live projection (v1.0.0,
    PG-only, no intent ops, PG auth broken, PG stale + fake 555 rows).
    Manual regen is broken, not just manual.
P4. Read path is per-request and dynamic; no restart needed after a fresh
    dump.
P5. Gateway request_id dedup is live in the running process; the customize
    path does not send request_id (main tree + HEAD).
P6. build-idem already implements the client-side request_id/retry/
    idempotency_conflict — coordination required, no duplicate work.
P7. Q2 traversal risk is concrete in the fixture shape; no semantic mask
    exists today.

## 7. Ownership request

Request: writer ownership of `/home/nolan/build-idem` (unclaimed; carries
the write-boundary work this design builds on) for LANE D implementation.
Concrete plan once granted:
  1. Port v1.1.0 intent-op support + JSONL-gateway read into dump.py;
     commit on the lane branch.
  2. Gateway post-append regen hook (env-gated, bounded, per-site
     serialized) + projection status in POST /events response.
  3. Adopt build-idem's request_id path in approve/clear handlers;
     replace the "re-run the dump" note with verified readback.
  4. `applyFactPrivacy` + funnel all public surfaces + zero-disclosure
     traversal tests (Q2).
  5. Hostile loop suite on the scratch stack: approve→auto-regen→readback
     latency, double-approve, drop-response retry, concurrent approves,
     gateway restart mid-flight, hide→traversal probe, fixture
     re-observation → intent survival.
  6. Formalize `resolvePrincipal` for the one-click factory (no behavior
     change to the operator flow).
No production :3100 or live-projection mutation without orchestrator
approval; scratch stack only until proven.

## 8. Successor

On ownership grant: implement D1–D7 on the build-idem scratch stack, run
the hostile loop suite, then hand the orchestrator a verified
approve→regen→readback demonstration plus Q2 traversal test results.
If denied: this design is implementable by another lane as written; the
one open reconciliation is confirming no live writer depends on the stale
PG demo rows before switching the dump to JSONL-only.

State changes today: none (read-only). Trivial leftover: `/tmp/qmain-laned.cjs`
probe script inside the ping-gateway container (`rm` returned "Operation not
permitted"); harmless 1KB temp file.
