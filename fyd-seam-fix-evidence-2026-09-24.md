# FYD owner-correction regen seam — fix verification evidence (2026-09-24 ~19:40-20:05 MDT)

Worker task: fix the RED regen seam (`ValueError: unknown op kind 'set_presentation_intent'`).
Branch: `fyd/sprint-integration-2026-09-24` @ `c3b60e5f`. :3101 PID 26729 (never restarted). :3100 untouched.

## Key finding
The fix was ALREADY LANDED in the branch (commit `7d450e22` "land projection dumper 1.2.1",
plus `699146da` journal-order invariant, plus `dc2acca6` FYD-037 pre-flight). No code change
was made by this worker; the work was verification. One new file added (uncommitted):
`tools/fyd-site-projection/test_dump.py` (7 offline unit tests, all pass).

## (a) Code change (as landed, verified)
File: `tools/fyd-site-projection/dump.py`, function `apply_overlays` (op-dispatch ~lines 430-537).
- `set_presentation_intent` branch: strict validation (intentId non-empty str; siteIntent dict
  with str kind; proposal dict with non-empty proposalDigest; approval dict with non-empty
  proposalDigest/approvedBy/approvedAt/note; approval digest == proposal digest; "DEMO OWNER MODE"
  in approval note). Malformed -> ValueError (fail closed). Upsert by intentId, newest journal
  event appended last (journal-order invariant).
- `clear_presentation_intent` branch: validates intentId, removes matching directive.
- Unknown op kinds still `raise ValueError` (line 537) -> dump aborts, projection untouched.
- `dump_site` builds `presentationIntent: {directives[], provenance{kind, note, eventIds[]}}`,
  digest = sha256(canonicalize(block)) -> `meta.presentationIntentDigest`. Graph ops still fold
  into the graph under `graphDigest`. Atomic tmp+rename write.
- Read seam `src/fyd/data/ping-object-source.ts` `validatePresentationIntent` recomputes the
  digest with the same canonicalize and fails closed on mismatch (verified by code read).

## (b) main-journal EACCES finding — NOT reproduced; path unreachable by design
- `FYD_OVERLAY_JOURNAL=main python3 dump.py happy-place` fails closed at the FYD-037 pre-flight:
  `WRONG_JOURNAL: expected overlay journal marker 'ping-main-journal' at
  http://127.0.0.1:8080/health, got None`, exit 2. :8080/health returns 200 healthy JSON with no
  `journal` field. This is the documented HOLD: main journal does not accept FYD_SITE_OVERLAY
  and does not assert the marker until the gateway cutover. Correct posture per docstring.
- Direct repro of the docker probe (bypassing pre-flight): `docker cp` ok, `docker exec node`
  executes the probe (NO EACCES) but dies on `MODULE_NOT_FOUND /app/node_modules/pg` inside
  ping-gateway (container app layout lacks that path). The finally-block `rm` fails with
  "Operation not permitted" (ignored by dump.py; would litter one file per future main run).
- Conclusion: the EACCES is not reproducible in this env. The docker probe path is unreachable
  until the gateway cutover registers the journal marker; even then the probe's pg require path
  must be resolved against the container layout. Needs the cutover first — reported, not improvised.
  No repo file mentions EACCES. My repro litter (/tmp/probe-fyd.js in the container) was removed.

## (c) E2E owner-correction loop on :3101 (happy-place) — all steps GREEN
Baseline: inspect -> directives [pi-stub-001, pi-stub-003] (reorder_sections; unresolved stubs,
pre-existing), appliedIntentIds [], page sha256 95557fb75901...
1. parse "hide the locations section" -> ok, intent hide_section -> siteIntent toggle_section
   {pageSlug home, sectionId home:Locations:3, hidden true}, proposalDigest a61fd86ca6b4...
2. approve (exact proposal round-trip) -> ok, intentId pi-0eaa4fff820090c6,
   eventId fyd-ovl-mugapozh-3cd0b3487446 (journal recorded).
3. `FYD_OVERLAY_JOURNAL=demo python3 dump.py happy-place` -> exit 0, 24 overlays, 3 intents,
   intentDigest 4ca75516ebd9...; recomputed digest MATCH; directive carries the journal eventId.
4. Served page: HTML sha changed 95557fb7 -> b9ce17a2; "Where we work / Adair Village, OR, US"
   Locations section content REMOVED from rendered text (before 9729 chars -> after 9080).
5. inspect readback: appliedIntentIds [pi-0eaa4fff820090c6], home:Locations:3 hidden=True.
6. clear pi-0eaa4fff820090c6 -> ok, eventId fyd-ovl-mugaq8gr-b7910f5ef743; dump -> 25 overlays,
   2 intents, intentDigest 9402166a9cb3... (identical to pre-test baseline digest), digest MATCH.
7. Page HTML sha256 back to 95557fb75901... (byte-identical to baseline). inspect: directives
   back to the 2 stubs, appliedIntentIds [], no hidden sections. Baseline restored.

## (d) Test counts
- New `tools/fyd-site-projection/test_dump.py`: 7/7 pass (unknown-op fail-closed, digest-mismatch
  fail-closed, missing marker fail-closed, set->clear round-trip, re-approve order invariant,
  directive shape, digest determinism).
- Existing jest lane suite `src/fyd/customize/jest.config.cjs`: 5 suites, 94/94 tests pass
  (ts-jest compiles the lane with strict:true, so this also typechecks the TS side).
- dump.py had no prior test suite. tsc on touched files: vacuous (no source files modified).

## (e) 22-dimension checklist (projection/persistence class)
input: strict op validation, malformed -> ValueError, fail closed. contract: op schema in docstring
matches buildDirective emit side; journal row contract preserved. authority: dump.py is the single
projection writer; read seam re-verifies digest. identity: directives keyed by intentId; approval
carries eventId; provenance.eventIds lists journal ids. persistence: atomic tmp+rename; failures
leave the projection untouched. transaction: full doc built in memory, single atomic replace, no
partial writes. retry: deterministic re-runnable (same journal -> same bytes modulo dumpedAt).
restart: offline tool, no daemon state. replay: (timestamp, event_id) order; re-approve moves last
(verified). projection: intents kept OUT of the object graph, separate digest-verified block.
tenant: siteId scoping (SQL WHERE in main path; client-side siteId filter in demo path). privacy:
no PII in the intent layer (demo-owner actor label + fixed marker only). authorization: dump is
read-only vs the journal; approve gated server-side by demo-owner mode + capability. cache: none
in dump.py; page renders from the file per request. search/vector: not reached. serialization:
canonicalize refuses floats (TS/Python parity), recursive key sort, (',',':') separators matching
TS canonicalize; both digests recomputed MATCH in Python and verified by the TS read seam.
UI: not reached (consumer verified via HTML diff). observability: digests/counts on stdout,
typed errors + exit 2 on stderr; eventId/requestId on approve/clear. test: gap was no dump.py
suite -> added test_dump.py (7/7); jest 94/94. deployment: Pig-host paths; :3101 reads the same
OUT_DIR (proven by the page change); no restart needed. rollback: clear = new journal event;
byte-identical page after clear+dump; journal append-only. memory: no cross-run in-memory state.
Patched dimensions: none (landed code already covers all reached dimensions; only added tests).

## (f) Verdict: REGEN GREEN
`FYD_OVERLAY_JOURNAL=demo python3 dump.py happy-place` succeeds; approved presentation-intent
directives flow journal -> projection (digest-verified) -> served page; clear restores baseline
byte-identically; unknown op kinds still abort fail-closed. No commits made; :3101 not restarted;
:3100 and the named stash untouched.
