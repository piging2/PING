# T-17: Forest-wide Projection-Invalidation Search (TASK E)

Date: 2026-09-28 ~19:30 MDT. READ-ONLY lane. No code touched, no commits, no restarts.

## VERDICT

No complete implementation of the generic contract exists anywhere in the reachable forest. The contract (AUTHORIZED TRANSITION → AFFECTED OBJECTS → AFFECTED PROJECTIONS → INVALIDATE → DETERMINISTIC REBUILD → VERIFY → ATOMIC PUBLISH → FRESHNESS PROOF) exists only as distributed, mostly-unwired primitives. Five primitives cover six of the eight stages; the two missing stages are AFFECTED OBJECTS → AFFECTED PROJECTIONS wiring (the only invalidation index found is orphaned in a different lane) and the AUTHORIZED TRANSITION trigger for the FYD path (manual re-dump only, confirmed by TWO_SITE_VERIFICATION and STEP0 archaeology). The smallest honest build is: ADOPT dump.py as the rebuild primitive, ADOPT ping-object-source.ts as the serve-time verify primitive, ADAPT the DependencyIndex register/merge/invalidate contract and the FYD_REGEN_CMD post-append hook, CONVERGE the two projection authorities (file dump vs in-process live graph). REJECT: any approve→shell-out-to-re-dump wiring, the held regen-trigger.ts, MC routes as an invalidation mechanism, and decision-projection invalidation (nothing exists to adopt).

Sandbox caveat, stated once: the frozen canonical tree /home/nolan/projects/ping is NOT mounted in this sandbox (no such path). All findings below are from workspace mirrors: ~/workspace/lane-d-impl (ship-plan staging copy), ~/workspace/fyd-lane, ~/workspace/fyd-build, ~/workspace/.worktrees, and ~/workspace/ping-24h planning artifacts. The landed status of the FYD_REGEN_CMD hook in the canonical tree is therefore UNVERIFIED from this lane; CLASSIFICATION.md independently records tools/fyd-journal-gateway/server.mjs as dirty in the canonical tree with a diff owed at GO.

Contract-stage coverage map (what exists, where):

| Stage | Primitive found | Status |
|---|---|---|
| AUTHORIZED TRANSITION | FYD_REGEN_CMD post-append hook (journal gateway) | ADAPT, landed status unverified |
| AFFECTED OBJECTS → AFFECTED PROJECTIONS | DependencyIndex invalidate/invalidateForChanges/pagesForSections | ADAPT, orphaned in observation lane |
| INVALIDATE | No cache to invalidate on the file path (re-read per request); no invalidation store anywhere | Missing as a mechanism |
| DETERMINISTIC REBUILD | dump.py (canonical JSON, op-validated, fail-closed) | ADOPT |
| VERIFY | dump.py pre-flight WRONG_JOURNAL + op validation; ping-object-source.ts digest re-verify | ADOPT |
| ATOMIC PUBLISH | dump.py tmp+rename (os.replace) | ADOPT |
| FRESHNESS PROOF | meta.overlayEventIds + graphDigest + dumpedAt + dumperVersion | ADOPT, needs a consumer check |

---

## CANDIDATE 1: FYD site projection dump (tools/fyd-site-projection/dump.py)

- SOURCE: ~/workspace/lane-d-impl/tools/fyd-site-projection/dump.py, repo HEAD 310ce509d3ae1c3bf7b6bae250ae2f74bee65777, file sha256 c7cc075cadbd849b5f88f87ab75f4a43f001e9c42c3b72dd2397598f003b640c. DUMPER_VERSION fyd-projection-dump@1.3.0. Mirrors at ~/workspace/fyd-lane/dump.py, ~/workspace/.worktrees/gap1-f1/fyd-lane/dump.py, ~/workspace/.worktrees/gap2-provenance/fyd-lane/dump.py.
- SEMANTIC UNIT: deterministic projection rebuild + atomic publish + freshness proof (stages 4-8 of the contract).
- WHAT IT ALREADY SOLVES: BASE mechanically extracted from the committed machine-generated fixture TS (byte-deterministic, baseDigest recorded); overlays from the journal applied in (timestamp, event_id) order with strict op validation (set_field, add_object, add_relationship, deactivate_object, set_presentation_intent, clear_presentation_intent); unknown op kinds abort the whole dump; FYD-037 journal identity pre-flight fails closed with typed WRONG_JOURNAL (exit 2, nothing written); atomic publish via tempfile.mkstemp + os.replace so readers never see a partial file; freshness meta (dumpedAt, dumperVersion, baseDigest, fixtureFileDigest, overlayEventIds[], graphDigest, presentationIntentDigest, privacyMaskDigest). FYD_PROJECTION_OUT_DIR env override routes dumps to scratch for CI/hostile gates. The privacy-mask derivation (FYD-Q2 three-layer rule) rides along.
- TESTS: STEP0_REGEN_SEAM notes test_dump.py exists in the canonical tree (not executed by that lane); dump determinism evidenced by stable base graphDigest across dumps and TWO_SITE_VERIFICATION. No test file found in this sandbox's mirrors.
- REACHABILITY: manual only. Confirmed: zero cron entries, zero workflow references, zero imports or shell-outs from src/ (STEP0_REGEN_SEAM verified; DEMO-SCRIPT.md invokes it by hand). The served /sites pages re-read the dumped file per request, so the only missing link is the trigger.
- DEPENDENCY COST: Python stdlib only (hashlib, json, urllib); the main-journal read path shells to docker for the overlay query. No new dependencies.
- AUTHORITY ASSUMPTIONS: the journal is the canonical truth plane; the projection is derived truth that may honestly lag. Fail-closed everywhere: a bad journal, a bad op, or a bad identity means no write, and the previous projection keeps serving (this IS the last-good mechanism; no separate candidate/staging promotion code exists anywhere in the forest).
- VERDICT: ADOPT. This is the rebuild primitive. FYD approve-to-redump is consumer #1 of the generic seam, not a special case: do not propose wiring approve to shell out to re-dump.

## CANDIDATE 2: FYD_REGEN_CMD post-append hook (tools/fyd-journal-gateway/server.mjs)

- SOURCE: ~/workspace/lane-d-impl/tools/fyd-journal-gateway/server.mjs, same repo HEAD 310ce509, file sha256 4f9717d6258ef53c0453cfb4afd73785b70fd568fe640c. Lines 140-200 (triggerRegen/runRegen), call site ~line 270.
- SEMANTIC UNIT: authorized-transition trigger (stage 1 of the contract).
- WHAT IT ALREADY SOLVES: when FYD_REGEN_CMD is set, runs it after a FYD_SITE_OVERLAY event is journaled. Disabled by default. Fires only for FYD_SITE_OVERLAY. Per-site serialization via a promise queue (one site's regens run in journal order; different sites concurrently). Bounded: 60s timeout, 1MB output cap. Site id passed via FYD_REGEN_SITE_ID env, never interpolated into a shell string by the module. Fire-and-forget after the POST response: regen failure is logged, never rolls back the append, never changes the POST status (approval stays committed regardless, derived truth may honestly lag).
- TESTS: none found.
- REACHABILITY: present in the lane-d-impl ship-plan copy. Landed status in the canonical frozen tree UNVERIFIED from this sandbox (CLASSIFICATION.md unit 8 lists server.mjs as modified in the canonical dirty tree with a diff owed at GO).
- DEPENDENCY COST: zero new dependencies (Node child_process.execFile already in use).
- AUTHORITY ASSUMPTIONS: the hook is informational, not authoritative; the journal append is the committed transition. Operator configures the command; the module does not name dump.py.
- VERDICT: ADAPT. Verify the landed state at GO (diff against this copy), then close the two gaps this lane found: (a) the hook is fire-and-forget with no freshness proof, so nothing verifies the post-regen file's overlayEventIds contains the journaled event; (b) the hook names no command, so the generic seam still needs the AFFECTED OBJECTS → AFFECTED PROJECTIONS mapping to decide what to rebuild. This hook is the transition trigger, not the whole seam.

## CANDIDATE 3: DependencyIndex register/merge/invalidate (src/fyd/refresh/dependency-index.ts)

- SOURCE: ~/workspace/fyd-build/src/fyd/refresh/dependency-index.ts, repo HEAD 841825c49fb3c41a36e13b21056793e04105bd0c, file sha256 14bb0e7bc23a8984300b0279bf3185b385dfff1f2aa52cf275d16e8ac01bdb23. Same file in ~/workspace/.worktrees/gap2-fydbuild (same lane). Driver: run-t2.ts (line 61: index.invalidateForChanges(changes)).
- SEMANTIC UNIT: AFFECTED OBJECTS → AFFECTED PROJECTIONS → INVALIDATE as a pure function (stages 2-3).
- WHAT IT ALREADY SOLVES: the register/merge/invalidate contract. register(objectId, sectionIds) builds a forward and reverse index; merge() lets the SiteSpec generator push its real section map over the seed; invalidate(objectId) returns exactly the registered sections; invalidateForChanges(changeRecords) maps affected objects to sections; pagesForSections(sections) turns invalidated sections into pages to regenerate. The contract comment is explicit: "Changing one object invalidates only its registered sections, never the whole site."
- TESTS: __tests__/dependency-index.test.ts, 7 tests, all scoped to the contract (one service invalidates only its sections; business change does not invalidate service sections; unknown object invalidates nothing; reverse lookup; merge extension; invalidateForChanges mapping; register dedupe).
- REACHABILITY: orphaned. It belongs to the temporal-observation lane (website re-observation → snapshot diff → conflict detection). run-t2.ts is a manual `npx tsx` runner that only PRINTS the invalidation report ("Prints a JSON report to stdout. No journal writes."). Nothing in the approve→serve flow consults it. The happyPlaceSeedIndex and PAGE_SECTIONS are proof-site specific.
- DEPENDENCY COST: TypeScript, zero dependencies.
- AUTHORITY ASSUMPTIONS: the SiteSpec generator lane owns the real section registry and pushes it through merge(); the seed is a placeholder.
- VERDICT: ADAPT. Harvest the register/merge/invalidate/pagesForSections contract as the affected-projection mapping for the generic seam; discard the proof-site seed and PAGE_SECTIONS (or re-seed per site). This is the only invalidation index in the forest; everything else rebuilds whole projections.

## CANDIDATE 4: serve-time verify seam (src/fyd/data/ping-object-source.ts)

- SOURCE: ~/workspace/lane-d-impl/src/fyd/data/ping-object-source.ts, same repo HEAD 310ce509, file sha256 8fb0e502f11b69e5ff3e51dd1d314622819bef836ba452389d9f49afa6a25a05. Mirrors in fyd-lane/stage-repo, lane-c/work, and several product-lane trees.
- SEMANTIC UNIT: serve-time VERIFY (stage 6, read side).
- WHAT IT ALREADY SOLVES: reads /home/nolan/ping/var/fyd-projections/<siteId>.json on EVERY call (zero caching, zero unstable_cache); parseAndVerify recomputes sha256(canonicalize(graph)) and the presentation-intent digest and fails closed on mismatch; missing file is a hard throw ("refusing to serve stale data"). The /api/fyd/projection BFF route serves 503 on missing/tampered projection with force-dynamic.
- TESTS: not enumerated in this lane; the fail-closed behavior is asserted by the hostile gates (fyd-hostile-gate.mjs) which run against scratch stacks.
- REACHABILITY: reached by all /sites pages via spec-pipeline.ts compileSiteSpecWithIntent, by /api/fyd/projection, and by the customize approve derive step.
- DEPENDENCY COST: none beyond the existing TS codebase.
- AUTHORITY ASSUMPTIONS: the dumped file plus its digests are the verification contract between the dumper and the server.
- VERDICT: ADOPT. This is the read-side half of the VERIFY stage and the reason atomic publish is safe: a torn or foreign write fails closed instead of rendering.

## CANDIDATE 5: in-process live projection (src/fyd/data/fyd-tenant-graph.ts)

- SOURCE: ~/workspace/lane-d-impl/src/fyd/data/fyd-tenant-graph.ts, same repo HEAD 310ce509, file sha256 32a1c7d265d395c9e1e382a36a6f410129296b0b7956494e1a89cd93ba08eca7.
- SEMANTIC UNIT: projection with no invalidation need (rebuild per call).
- WHAT IT ALREADY SOLVES: rebuilds fixture base + live journal overlays on every call; "deliberately no cache: Ask FYD re-reads on every serve, so a newly journaled overlay is visible to the next question immediately." Faithful port of dump.py's apply_overlays (same op kinds, same strictness); digest-pinned at both layers via FYD_TENANT_PINS. Reached by the Ask FYD pipeline, /api/mc routes, scoped-stores, site-bundle. NOT reached by /sites pages.
- REACHABILITY: live on the Ask path.
- VERDICT: CONVERGE. STEP0_REGEN_SEAM already framed the choice: route the /sites compile seam through this live projection (eliminating the dump from the served path, one projection authority) versus keeping the file dump + trigger. Either way, do not maintain two projection authorities indefinitely. The invalidation seam is only needed for the file-dump authority; the live projection needs none.

## CANDIDATE 6: MC projection layer (/api/mc/* routes)

- SOURCE: per laneA-orca-mc and laneB14 FOREST_MAP C10: /api/mc routes in the canonical tree (dirty batch: 7 new untracked route dirs + mc-dispatch-identity.ts + mc-tenant-gate.ts); mission-control Python repo holds the mission model. Second repo /home/nolan/workspace not accessible from this sandbox.
- SEMANTIC UNIT: read-through serving projection.
- WHAT IT ALREADY SOLVES: routes project the journal to the operator surface and own no mission state. The laneA verdict: keep the TS routes as pure projection, the Python model as the state owner.
- WHAT IT DOES NOT SOLVE: no invalidation, no refresh trigger, no staleness tracking, no affected-object mapping. Known defects: RUNNING hardcoded for inprogress dirs, "RECONCILIATION IN PROGRESS" with no reconciler, no HOLD projection.
- VERDICT: REJECT as an invalidation mechanism. It is a consumer of the generic seam (MC journal updates are listed as a consumer in the gap doc), not a source of machinery.

## CANDIDATE 7: decision-record projections

- SOURCE: ~/workspace/fyd-intel/jev-decisions.jsonl (9 records), ~/workspace/ping-24h/lanes/lane11-decision-fabric/raw/shadow-decisions-2026-09-28.json (6 samples), jev/shadow-recorder branch (second repo, not accessible).
- SEMANTIC UNIT: none implemented. Decisions are produced in code (authorizeWorkOrder, reconcileGate, verifyResultEnvelope) but not journaled and not projected; the U10 round-trip is still open.
- VERDICT: REJECT. Nothing exists to adopt. Decision-record projections are a future consumer of the generic seam, listed as such in the gap doc.

## REJECTED / NOT FOUND

- regen-trigger.ts (held convergence attempt): UNVERIFIED, read-only reference only. T-17's own searched list already records "do not adopt without proof." REJECT until a replay proves it.
- Approve→shell-out-to-re-dump: explicitly forbidden by the task, the gap doc ("Do NOT special-case approve→re-dump"), and CLASSIFICATION.md. REJECT.
- pub-sub / subscriber-notify for projections: does not exist. Grep over lane-d-impl/src/fyd and the worktrees found only unrelated email subscriber tagging. The FYD_REGEN_CMD hook is the closest event-driven primitive. NOT FOUND as a mechanism.
- LAST-GOOD / candidate promotion code: NOT FOUND as explicit machinery. The last-good semantic exists only as policy plus mechanism-by-construction: dump.py's atomic rename means the previous verified projection keeps serving on any mid-rebuild failure, and SPRINT_100H_QUESTIONS.md Q39 plus prelaunch/00-TOP-10-UNKNOWNS.md record "atomic publish; last good version always serves" as the default safe posture. No staging directory, no candidate/manifest promotion code exists in the forest. If the generic seam wants an explicit candidate stage, that is BUILD, not harvest.
- revalidate / unstable_cache / Next.js cache invalidation for FYD projections: does not exist anywhere in src/ or tools/ (STEP0_REGEN_SEAM verified). The file path needs no cache invalidation because reads are per-request; the live-graph path needs none because it rebuilds per call.
- Second repo (/home/nolan/workspace, 40+ branches incl. jev/shadow-recorder, mc/approval-request): not accessible from this sandbox; the T-17 task names "all 38 worktrees + second repo" as the search scope, so this is a known coverage gap for a follow-up lane with Pig access.

## EXISTING IMPLEMENTATIONS SEARCHED (machine-visible)

{"register":"03#18","task":"T-17/E-PROJECTION-SEARCH","locations":[
{"path":"~/workspace/lane-d-impl/tools/fyd-site-projection/dump.py","sha256":"c7cc075cadbd849b5f88f87ab75f4a43f001e9c42c3b72dd2397598f003b640c","repo_head":"310ce509d3ae1c3bf7b6bae250ae2f74bee65777","verdict":"ADOPT (rebuild+atomic publish+freshness meta)"},
{"path":"~/workspace/lane-d-impl/tools/fyd-journal-gateway/server.mjs (FYD_REGEN_CMD hook)","sha256":"4f9717d6258ef53c0453cfb4afd73785b70fd568fe640c","repo_head":"310ce509d3ae1c3bf7b6bae250ae2f74bee65777","verdict":"ADAPT (transition trigger; landed status in canonical UNVERIFIED)"},
{"path":"~/workspace/fyd-build/src/fyd/refresh/dependency-index.ts","sha256":"14bb0e7bc23a8984300b0279bf3185b385dfff1f2aa52cf275d16e8ac01bdb23","repo_head":"841825c49fb3c41a36e13b21056793e04105bd0c","verdict":"ADAPT (register/merge/invalidate contract; orphaned in observation lane)"},
{"path":"~/workspace/lane-d-impl/src/fyd/data/ping-object-source.ts","sha256":"8fb0e502f11b69e5ff3e51dd1d314622819bef836ba452389d9f49afa6a25a05","repo_head":"310ce509d3ae1c3bf7b6bae250ae2f74bee65777","verdict":"ADOPT (serve-time verify)"},
{"path":"~/workspace/lane-d-impl/src/fyd/data/fyd-tenant-graph.ts","sha256":"32a1c7d265d395c9e1e382a36a6f410129296b0b7956494e1a89cd93ba08eca7","repo_head":"310ce509d3ae1c3bf7b6bae250ae2f74bee65777","verdict":"CONVERGE (one projection authority question)"},
{"path":"/api/mc/* routes (canonical dirty tree)","verdict":"REJECT as mechanism; consumer of the seam"},
{"path":"decision-record projections","verdict":"REJECT; nothing exists (future consumer)"},
{"path":"regen-trigger.ts (held attempt)","verdict":"REJECT; UNVERIFIED"},
{"path":"pub-sub for projections","verdict":"NOT FOUND"},
{"path":"LAST-GOOD/candidate promotion code","verdict":"NOT FOUND; policy+atomic-rename only"},
{"path":"second repo /home/nolan/workspace","verdict":"NOT SEARCHED; not mounted in sandbox"}],
"winner":"none complete; adopt+adapt set above, convergence owner to be named"}

## Commands run (evidence)

- sha256sum on the five key files (hashes above).
- git rev-parse / git log on ~/workspace/lane-d-impl (310ce509d3ae1c3bf7b6bae250ae2f74bee65777) and ~/workspace/fyd-build (841825c49fb3c41a36e13b21056793e04105bd0c; dependency-index.ts last touched in 2292f48).
- Full read of lane-d-impl/tools/fyd-site-projection/dump.py (618 lines) and the FYD_REGEN_CMD hook block in server.mjs.
- Full read of fyd-build/src/fyd/refresh/dependency-index.ts and the run-t2.ts driver lines around the invalidate call.
- Greps: "invalidat" over ping-24h (lane reports only); "regen.trigger|regen_trigger|regenTrigger|regen-hook|regen_hook" over ~/workspace (only planning docs hit); "invalidate|revalidate|unstable_cache" over ~/workspace/.worktrees (only the fyd-build refresh lane); "last.good|lastgood|LAST_GOOD|lastGood" over ping-24h (policy docs only, plus an unrelated forkscout tag); "fyd-site-projection/dump.py" invocations over ~/workspace (DEMO-SCRIPT.md and trace reports, all manual); crontab and /etc/cron for dump/projection (none); "subscriber|notify(" in lane-d-impl/src/fyd (none).
- Reads of the binding docs: prelaunch/10-FYD-GAPS-AS-EVIDENCE.md (Gap 1 names the generic contract and its consumers), prelaunch/05-FIRST-20-READY-TASKS.md T-17 (the searched list this lane extends), forest-convergence/STEP0_REGEN_SEAM.md (approve→serve archaeology), CLASSIFICATION.md unit 8, CONVERGENCE_MATRIX.md Phase 6 item 16, laneB14 FOREST_MAP.md C3/C10, laneA-orca-mc report.

## Recommended next step for the convergence owner

Name the projection authority (U5). The minimal seam that honors every verdict above: keep dump.py byte-identical as the rebuild primitive; define the generic seam as transition event → DependencyIndex-style affected-projection map → per-projection rebuild via the dump entrypoint → post-rebuild freshness check (overlayEventIds contains the transition's event id) → atomic publish (already in the dumper) → serve-time digest verify (already in the read seam); drive it from the FYD_REGEN_CMD-style post-append hook generalized beyond FYD_SITE_OVERLAY. FYD approve/clear becomes consumer #1 by emitting its already-journaled transition into that seam instead of shelling to a dump. The one open design question is the file-dump vs live-graph authority (Candidate 5); do not build the seam twice.
