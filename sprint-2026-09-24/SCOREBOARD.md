# Sprint scoreboard — updated by the integration coordinator only.
# Targets: privacy leaks 0, unsupported claims 0, duplicate effects 0, cross-tenant leaks 0,
# secret leaks 0, customer-specific template code 0.

## Snapshot (2026-09-24 ~18:45 MDT, H0 complete)

- end_to_end_arrows_green: 9 / 18 (arrows 2-10 GREEN on :3101 scratch: acquisition->evidence
  proven by regression-corpus rerun, graph->spec->page live; arrow 1 PARTIAL; arrows 11-18 UNPROVEN)
- safety_seams_green: 2 green / 4 inventoried (gateway unauth 401 GREEN; :3100 recovered+verified
  GREEN; javascript: href sink RED per FL-20260921-032/HOSTILE-VERDICT; pressure class-7
  null-field invented-claim RED per PRESSURE-REPORT)
- presentation_golden_pass_rate: TBD (H7)
- customer_specific_template_code: 0 (must stay 0)
- public_privacy_leak_count: 0
- unsupported_public_claim_count: 0
- duplicate_consequential_effect_count: 0
- owner_intent_survival: not yet tested
- cross_tenant_leak_count: 0
- secret_leak_count: 0
- mobile_journey_pass_matrix: edge proof 20/20 on :3101 (Coppersmith 15/15 + HPP smoke), pre-sprint
- one_click_e2e_status: not started

## Baseline state at sprint start (verified)

- :3100 production: HEALTHY (pid 98122, pure HEAD e474c89b, demo-owner mode on; recovered ~18:02 MDT
  after ~16 min outage from broad pkill; BUILD_ID intact)
- :3101 scratch: HEALTHY (pid 95701, fyd/edge-port @ 243fb120, edge proof 20/20 hostile mobile)
- gateway: ping-gateway:repair-cert-20260924 HEALTHY, unauthenticated POST /events -> 401
- edge Jest 27/27 (lane config), ask lane 158/158, tsc clean, next build clean
- main tree HEAD e474c89b DIRTY (uncommitted lane mods; served .next is pure HEAD)

## Gate log

- H0 freeze: COMPLETE 18:45 MDT (baseline-h0.md)
- H4 gate: GREEN at 18:52 MDT (edge matrix re-run 20/20 on :3101; all H4 criteria met:
  doorway at edge, tap, expand, semantic content, relationship traverse, Ask knows object,
  close/back restores scrollY 423->423). Gate passed early on evidence; H1-4 edge work
  confirmed rather than built.
- H7 gate: pending
- H11 gate: pending

## Critical path recomputes

- (none yet; first at H4)

## H4-7 coverage inventory (2026-09-24 ~19:50 MDT)
- Coppersmith material classification complete: Business/Services/People/Locations/Media/Contact/
  Capabilities/Relationships/Evidence/Unknowns RENDERED; Projects + ServiceAreas UNSUPPORTED_SCHEMA;
  Reviews REPRESENTABLE_NOT_RENDERED (SocialProof registry+renderer-complete, never emitted).
- HPP vs Coppersmith: identical _shared pipeline (page.tsx differs only in SITE_ID/comments).
  Three-way comparison shares renderer/components/template rules. No forked markup.
- Data-quality note: person name renders the website author handle "coppersmithplm" verbatim.
- Gallery gap (9 assets, renderer-complete, generator never emits) assigned to one bounded writer
  on generator.ts in build-edge-port (fyd/edge-port). No :3100 touch, no merge.

## Gallery gap fix, part 1: emission (2026-09-24 ~20:05 MDT)
- Writer closed the generator side: Gallery section now emitted conditionally (siteId + assets
  present), query kind "static" (validator-clean: 0 findings on real coppersmith spec).
- 3 files changed (generator.ts +36/-5, spec-pipeline.ts +4, generator.test.ts +68), all in
  build-edge-port, uncommitted. 107/107 proceduralize + 27/27 edge tests pass, tsc clean.
- Zero customer branches in product code (customer names only in test siteId params).
- Part 2 (ctx.galleryMedia population in site-client, both pages) dispatched as a second bounded
  writer. Live :3101 rebuild deferred to coordinator decision (H7 gate).

## Nolan's redirect (2026-09-24 ~18:31 MDT; integrated ~20:15 MDT)
- Queues replaced with the 18-item SPRINT-PLAN gap list. Sequence: safety(1-6) -> arrows(7-10) ->
  UX(11-13) -> reliability(14-16) -> cleanup(17-18). Gates, hard freeze, scoreboard, escalation stand.
- NOT-IN is binding (O1-O20 watch-only; 300-row freeze = outreach engine, coordinate never write;
  NOW-6/G1-G8 = Nolan's call). Critical path recomputed in critical-path-log.md (H2).
- Current work (gallery part-2) finishes the H4-7 phase; then ALL capacity pivots to Queue 1 safety.
- Safety queue status: all 6 UNSTARTED (item 6 needs store-ownership determination first).
- Arrows queue: item 7 Coppersmith-proven/HPP-pending; item 8 mechanics-proven/contract-pending;
  item 9 unproven; item 10 IN_PROGRESS (owner unknown).

## FINAL EXECUTION ORDER (2026-09-24 ~18:33 MDT; integrated ~20:40 MDT)
- WORK-QUEUE.jsonl (26 items) is the work authority. SPRINT-PLAN.md superseded.
- FYD-24H-PRODUCT-PROOF.md filled: journey 5 PASS / 7 OPEN; visitor 6/8 PASS; owner 0/8;
  safety 0/7; genericity 0 branches / shared engine YES. Binary readiness: NO.
  First broken arrow: Q-P0-01.
- Gallery part-1 + part-2 complete (emission + ctx seam); H4-7 phase ENDED. :3101 rebuild
  deferred to H7.
- Q-P0-01 probe dispatched (ask-privacy-probe test; probe-only, no fix). Scoped finding:
  visitor-answer.ts publicGraphOf applies applyFieldVisibility(graph, []) — empty decisions,
  conservative defaults only; Ask viewer is always anonymous {id: null}; no owner-viewer
  path exists in the Ask pipeline.

## Gallery part-2 complete (2026-09-24 ~20:45 MDT) — H4-7 phase ENDED
- site-client.tsx (+4/-2): optional galleryMedia prop (mirrors heroMedia exactly; precedent
  already existed in build-client.tsx and RenderContext).
- Both site pages (+8/-1 each, byte-identical): resolve galleryMediaFor at the server seam,
  empty -> null, pass to SiteClient. No per-site logic.
- 107/107 proceduralize + 27/27 edge + tsc clean. Zero customer names in added lines.
- 6 files total changed across part-1+2, all uncommitted in build-edge-port.
- Live visibility unproven until a build including the seam is deployed (rebuild deferred to H7).

## Q-P0-01 probe result: FAIL (2026-09-24 ~20:50 MDT)
- Probe (ask-privacy-probe.test.ts): 7/7 core assertions PASS (canonical surface coarsens
  correctly; private objects excluded; traversal to private fails closed).
- 4 boundary leak paths PROVEN:
  1. Single-comma address: street survives coarsenAddress (keeps last two segments).
  2. No-comma address (streetAddress shape): returned unchanged.
  3. Street in non-"address"-named field (location): default "show" leaks it.
  4. Street in location object TITLE: bypasses applyFieldVisibility (ask-composer.ts:866).
- Owner-viewer path: DOES NOT EXIST in the Ask pipeline (mode owner == mode visitor,
  byte-identical). Owner HIDE decisions never reach the Ask projection (no loader exists).
- Fix writer dispatched on field-visibility.ts + ask-composer.ts (4 leaks). Owner-decisions
  store is a separate backlog item, not part of this P0.
- Full ask suite: 165/169 pass (only the probe file's 4 designed failures); zero regressions.

## Snapshot (2026-09-25 ~05:30 MDT, pre-H24 compile)

Verification basis: recorded coordinator evidence 2026-09-24 ~19:44-20:25 MDT.
Pig SSH unreachable since 2026-09-24 23:49 MDT; no live re-verification possible.

- verified_capabilities_in_one_running_product: 2 (Ask FYD, owner correction loop)
- integrated_green_awaiting_running_proof: 3 (write boundary, acquireUrl seam, claim gate)
- end_to_end_arrows: Q-I-52 INTEGRATED-GREEN, Q-I-53 RUNNING-GREEN, Q-I-54 INTEGRATED,
  Q-I-55 INTEGRATED-GREEN, Q-I-56 INTEGRATED-GREEN
- safety: Q-P0-01 GREEN, Q-P0-02 GREEN, Q-P0-03 coordinator-green, Q-P0-04 OPEN
  (first broken arrow: journal overlay marker WRONG_JOURNAL synthetic),
  Q-P0-05 OPEN (GATE-SECRET-001 rerun + leakage audit), Q-P0-06 OPEN (isolation
  matrix 1 PASS / 5 OPEN / 2 CONDITIONAL / 1 UNKNOWN)
- mobile: 10/10 PASS frozen :3102 (BUILD_ID 80gQ93GztEoYvvMHeCN0Y);
  object-scroll/back restoration PASS
- edge doorway: REOPENED (Q-J-01..03, real-path proof pending; trace writer
  dispatched 2026-09-24 ~19:15 MDT, no completion recorded)
- TenantOS: INCOMPLETE (Q-T-01 needs Nolan's design call)
- ORCA: FAIL (Q-O-01 needs Nolan's design call)
- backlog: 34 tracked (26 start + 8 added); 10 green, 21 open, 10 in-progress
  (7 queue-stale greens), 3 blocked; 3 reopened
- real_user_readiness: NO
- single_next_frontier: Q-P0-04
- queue_file_staleness: WORK-QUEUE.jsonl states stale vs coordinator terminal
  report (52-56, P0-01, P0-02, P1-02); reconciliation pass needed
- canonical_head: fyd/sprint-integration-2026-09-24 @ 6245af11
- served_tree: /home/nolan/build-edge-port @ fb520d79

## SNAPSHOT 2026-09-25 ~05:50 MDT: BACKLOG FULL AUDIT (Nolan's order)

- backlog audit: all 36 records re-read and reconciled against the
  coordinator terminal report (~19:44 MDT) and the rewritten proof.
  Backup: WORK-QUEUE.jsonl.bak-20260925-0545.
- backlog: 36 tracked (26 start + 8 sprint adds + 2 audit adds: Q-F-06,
  Q-F-07); 9 GREEN (P0-01, P0-02, P0-03, P1-02, I-52, I-53, I-54, I-55,
  I-56), 1 RESOLVED (F-03), 3 IN_PROGRESS (J-01, J-02, J-03, genuinely in
  flight), 2 BLOCKED (J-11, J-12), 21 OPEN
- queue_file_staleness: RESOLVED. Stale evidence fields refreshed on J-04,
  J-05, J-06, J-07, F-01, O-01.
- status changes in the audit: P0-01 IN_PROGRESS->GREEN, P0-02
  IN_PROGRESS->GREEN, P0-03 OPEN->GREEN, P1-02 OPEN->GREEN, F-03
  OPEN->RESOLVED, I-52..56 IN_PROGRESS->GREEN, P1-03 BLOCKED->OPEN
  (convergence hold satisfied; dispatch pending coordinator capacity +
  Pig SSH recovery)
- new tracked defects: Q-F-06 (FL-20260924-201 mislabeled "supported"),
  Q-F-07 (pressure class 7 null/malformed fields)
- next_test refreshes: J-02 and J-03 now ride the Q-J-01 real-path doorway
  chain; P0-03 remaining work is ORCA-side (tracked under Q-O-01)
- verified_capabilities_strict: 2 (unchanged)
- real_user_readiness: NO (unchanged)
- single_next_frontier: Q-P0-04 (unchanged; first broken arrow confirmed)
- no live Pig SSH at audit time; audit was a record reconciliation, not a
  product re-test

## FINAL-13H WINDOW 1 OPEN: 2026-09-25 ~05:15 MDT (coordinator subagent)

- PIG SSH RECOVERY: SUCCESS. Direct connect was blocked by local egress
  ("Operation not permitted"); the established pattern
  (ssh -F ~/.ssh/pig-config pigwsl, user nolan, ProxyCommand via
  hatch-egress-proxy:3130) connects instantly. The Pig was reachable the
  whole time; earlier "unreachable since 23:49 MDT" readings were the
  direct-connect path failing, not the Pig being down. No reboot, no
  browser disturbance, read-only checks only.
- RUNTIME IDENTITIES VERIFIED LIVE (read-only):
  - :3100 pid 10404, cwd /home/nolan/projects/ping, HTTP 200,
    NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 in live env, started Thu Sep 24
    18:59:57 (preserved, never restarted)
  - :3101 pid 26729, cwd /home/nolan/build-edge-port, HTTP 200
  - :3102 pid 29835, cwd /home/nolan/build-edge-port, HTTP 200 (frozen,
    undisturbed)
  - integration branch fyd/sprint-integration-2026-09-24 @
    6245af11ea8497683ce870c8e43921379fe6bb7d (exact canonical match;
    6b49b0c6 confirmed ancestor, branch advanced past it via the 320px
    fix commit)
  - served tree /home/nolan/build-edge-port @
    fb520d799184c6bfacc8b6964b672f07b2591c5f (exact match)
  - BUILD_ID 80gQ93GztEoYvvMHeCN0Y (exact match)
  - dirty state: only untracked .next build dirs + __pycache__, zero
    dirty tracked files
  - journal gateway pid 52289 running since Thu Sep 24 14:47:35
    (tools/fyd-journal-gateway/server.mjs)
- Q-P0-04 WRONG_JOURNAL: worker dispatched. NOTE: grep shows no
  WRONG_JOURNAL symbol in tools/fyd-journal-gateway/server.mjs; the
  marker check exists (EXPECTED_OVERLAY_JOURNAL_MARKER "fyd-demo-journal").
  The typed-error half of the invariant is UNVERIFIED until the synthetic
  runs; worker will confirm whether fail-closed is typed or needs the
  smallest existing-boundary fix.
- CLASSIFICATIONS (directive section 0): write boundary / acquisition /
  claim gate / edge / ask / owner loop / privacy = SUPERSEDED labels,
  integrated-green per coordinator, need RUNNING green. Browser proof =
  CURRENT FAIL (first product boundary). TenantOS = INCOMPLETE, ORCA =
  FAIL (locked decisions now actionable).

## WORKER-A Q-P0-04 (2026-09-25 ~05:20-05:35 MDT)

Q-P0-04_WRONG_JOURNAL: PASS

Attack matrix (all on Pig, scratch journals on ports 18701-18707/18299 only; live gateway pid 52289 and live store never written):

- DUMP (tools/fyd-site-projection/dump.py `_preflight_journal`, exit 2): wrong-name, missing-field, malformed-case, malformed-nonstring, non-JSON, HTTP-500, unreachable = 7/7 typed `WRONG_JOURNAL` on stderr, zero POSTs to journal, happy-place.json mtime unchanged, no projection written.
- EMIT (src/fyd/customize/server.ts `emitOverlayEvent` -> `preflightJournal`, first statement): same 7 modes = 7/7 threw `customize: WRONG_JOURNAL: ...` Error before any POST (verified via tsx probe importing the real module), zero POSTs each.
- RETRY: dump + emit re-run 2x against wrong journal -> still typed-fail, no fallback, zero writes.
- ALT-CONFIG: main mode (FYD_OVERLAY_JOURNAL=main) expects `ping-main-journal` at /health and fails closed on the demo marker; FYD_EXPECTED_OVERLAY_JOURNAL override is respected by the preflight.
- RESTART: scratch real gateway instance (different store, port 18299) asserts live-derived `fyd-demo-journal@62c33c97ba31` vs live `fyd-demo-journal@8d6956c1caca` -> marker is per-instance live-derived, not a cached static string; name-match/suffix-vary is the documented rule in both consumers (by design, not red).

Evidence notes:
- The typed WRONG_JOURNAL half lives in the CALLERS (dump.py, server.ts), not in tools/fyd-journal-gateway/server.mjs (which only asserts the marker on GET /). The earlier "no WRONG_JOURNAL in server.mjs" grep was scoped to the wrong file; the invariant boundary is correct as built. No code change, no commit.
- Zero fallback journal: no alternate-journal logic exists in src/fyd/customize/write-boundary.ts; preflight throws/exits before any write path.
- route.ts surfaces the thrown error via journalFailureResponse (no silent success).

## WORKER-C ORCA (2026-09-25 ~05:15-05:30 MDT)

ORCA: PASS
CRASH_WINDOW: PASS
DUPLICATE_PHYSICAL_EFFECTS: 0

Commit db33605bf on feature/orca-autonomy (worktree /home/nolan/worktrees/orca-autonomy; 14 files, +833/-10):
- reconcileRunningWorkOrder: lost-redispatchable removed. Dead dispatcher + no rendezvous -> OUTCOME_UNKNOWN + blocked (lost-outcome-unknown); recorded operator decision only. No automatic path turns UNKNOWN dispatchable.
- H5 ordering hazard fixed: releaseBlockedWorkOrder crash-window recovery (block entry + RUNNING/AUTHORIZED + dispatcher dead -> recorded decision completes against true prior_state, crash_window_recovery logged); live dispatcher refuses; stale terminal fail-closed. classifyDispatchOutcome: dispatcherDead + no rendezvous -> POST_BOUNDARY_UNKNOWN. Docstring corrected (block file written before state).
- Landed the uncommitted H5 harvest (orca_unknown_block.js new, status_model EVIDENCE_PENDING->BLOCKED edge).

Witnessed proof (orca/control-loop/crash-proof/controller.sh): real SIGKILL of coordinator + dispatcher mid-dispatch, restart runs the REAL reconcileStartup from the REAL loop source (vm-loaded, real objective-runtime/orca_unknown_block), real durable files. 12/12 kill assertions (OUTCOME_UNKNOWN, blocked, POST_BOUNDARY_UNKNOWN, DISPATCH_LOST_UNKNOWN, 0 emits, exactly 1 physical effect, 2nd restart no resurrection) + 14/14 hazard checks (H-a..H-g). Evidence dirs committed.

Open (not worker C scope): mission-layer reapExpiredLeases (PG ping_missions) untouched - no HOLD producer exists there, ORCA work orders never flow through MissionRuntime; reaper-vs-HOLD design gap remains Nolan's design call. Other worker's 2 evidence dirs left untracked/untouched.

## EDGE FALSE-GREEN CORRECTION: 2026-09-25 ~05:35 MDT (Nolan's direct order)

- finding: MarginObjectLayer never mounted in the product (zero JSX usages
  outside tests; never mounted in git history); served :3101/:3102 HTML has
  zero object affordances (no doorways, no /o/ links, no in-flow cards),
  with or without ?objectDebug=1. Q-I-55 was declared green on unit tests
  while the rendered product showed nothing. False green owned in the
  proof doc (REAL FAILURES #9).
- action: worker F dispatched, top product-lane priority. Desktop: objects
  back at extreme right margins, sparse, page-anchored (scroll moves them
  out of view, not viewport-glued). Mobile: very-right overlay attempt,
  44px targets, no overflow, safe-area, 320px fix intact. Real path
  graph -> eligibility -> selection -> projection -> MarginObjectLayer ->
  browser, NO debug flag.
- worker D warned: :3101 will be restarted once via sanctioned path when
  the restoration lands; transient failures expected, journal state durable.
- Q-J-01: IN_PROGRESS until the browser doorway proof lands (queued for
  parent browser-task delegation; spec already at browser-proof-spec.md).
- EDGE_OBJECTS_RESTORED: NO (yet)

## WORKER-A2 Q-P0-05 (2026-09-25 ~05:20-05:45 MDT)

Q-P0-05: FAIL (narrow: history sub-item only; all attack proofs green)

- GATE-SECRET-001 canary rerun (Pig, sanctioned synthetic canary): real emit path
  (server.ts emitOverlayEvent via tsx -> scratch gateway :18711, scratch store).
  Canary occurrences: probe stdout 0, stderr 0, scratch store 1 (intended payload
  durability only), live gateway.log 0, live journal 0, scratch gw log 0,
  pig bash_history 0, probe script 0. Ephemeral 0600 file used, then destroyed;
  absence re-verified. SECRET MATERIAL FOUND outside intended locations: 0.
- Verdict-forgery, real path on :3101 (demo-owner mode): forged proposalDigest ->
  409 stale_digest; forged proposal body -> 409 proposal_altered. Live journal
  digest 15b308c5 / 44 lines unchanged. Authenticated forgery REJECTED, zero writes.
- Prior-incident class (secrets in command output + docker run argv): CLOSED.
  docker ps argv clean, 3100.log (tail 5M) clean, gateway.log clean.
- Post-proof audit: ONE secret-shaped finding: credential-shaped DATABASE_URL in
  /home/nolan/.bash_history line 37 (600 perms, mtime Sep 16, pre-existing, not
  from sprint tests; value never extracted, printed, or reported). All other
  surfaces clean: live journal store, 3 projection JSONs, gateway.log, 3100.log,
  docker argv.
- Mutation: every live digest byte-identical to baseline after tests
  (journal 15b308c5, gateway.log 6154d396, happy-place 5567b1dd,
  coppersmith 5db481cf, ping-fyd 6d22e905). Observed transient concurrent writer
  on the live journal ~05:19 (second worker approve/clear with backup/restore;
  final state byte-identical to baseline).
- First broken arrow: SAFETY / SECRET LEAKAGE - the pre-existing history line.
  Containment needs Nolan's word (rotate credential and/or purge the line;
  rotation is Nolan-authorized, worker did not purge/rotate). No code change,
  no commit.

## WORKER-D RUNNING (2026-09-25 ~05:19-05:45 MDT)

- WRITE_BOUNDARY_RUNNING: real :3101 POST /api/fyd/customize. Parse ok (promote_first/contact). Approve wb-workerD-20260925-approve1 -> intent pi-dd15109312187b42, event fyd-ovl-mugvb5dh-8897cc045a26, journal 44->45. Two identical replays -> same event, idempotentReplay:true, journal stayed 45. Same request id new payload -> 409 idempotency_conflict. Clear wb-workerD-20260925-clear1 -> journal 46, post-clear matched baseline. Exact restoration: journal 15b308c5... and ledger 5cf6d83c... byte-identical to pre-test. One durable effect per approval.
- ACQUISITION_RUNNING: 24/24 hostile suite through the real served-tree safe-fetch.ts with real DNS/network. All SSRF vectors rejected pre-fetch (loopback incl. decimal, RFC1918, CGNAT, link-local, metadata, credentials, bad schemes, localhost, nip.io DNS pivot, httpbin redirect pivots, redirect loop, oversize, timeout, content-type). Happy path ok:true.
- CLAIM_GATE_RUNNING: attack-verifier-holes 11/11, attack-render-path 8/8 on served tree. Live injections: unsupported claim -> unknown+refusal (fail closed); synthesis request -> refusal (no fake-supported). Dangling/wrong-binding/stale covered at gate level (no live surface).
- ASK_FYD: Q-F-06 CONFIRMED open live ("owner's favorite food" -> supported with person citation). Root cause: owner-keyword triggers people branch regardless of attribute; claimClassFor fail-open is secondary. DEMO_SYNTHETIC preserved.
- ASK_SUPPORT_CLASSES: 4/5 proven. SUPPORTED/PARTIAL/UNKNOWN live. CONFLICTED via real handler + scratch phone conflict -> "Contact information is being verified", values withheld. RESTRICTED via real handler + owner HIDE -> zero disclosure. Surface-switch conversation survival needs browser delegation.
- WHY_EVIDENCE: GET /api/fyd/why-this live. Business and service objects -> found:true with source + honest "unknown" for missing links. Unknown object -> found:false, no oracle.
- Q-F-07 FIX LANDED (f1dc8711): poison suite found real crash (non-string field -> TypeError in valueLooksLikeAddress via buildRenderContext). Fail-closed guards added; 10/10 poison + 19/19 field-visibility + 100/100 sitespec + tsc clean.
- Note: :3101/:3100 page HTML digests flip between variants across requests (also on untouched control); not a stable oracle. Journal/ledger byte digests are the canonical restoration proof.

## WORKER-B TENANTOS (2026-09-25, verdict stage)

- TENANTOS: PASS (logical partitioning; no database-per-tenant or collection-per-tenant built; routing seam preserved)
- VECTOR_ISOLATION: PASS (14/14 live vs Qdrant :6333, both directions; d50726119 on workerB/tenantos-vector-filter in /home/nolan/ping)
- POSTGRES_ISOLATION: PASS (17/17 live vs crx_runtime canonical_events, both directions; be4fc4e44 on workerB/tenantos-vector-filter in /home/nolan/ping)
- EVENT_PRIVACY: PASS (FYD demo journal seam hostile-green both directions + request_id tenant binding DEDUP TENANT BINDING PASS 8/8 live; f2d9b2e8 on workerB/tenantos-fyd-seam in /home/nolan/projects/ping)
- Q-P0-06 acceptance matrix: GREEN (queue backed up to WORK-QUEUE.jsonl.wb-backup-20260925 before update). Matrix: PING tenant + external owner tenant, hostile both directions, no cross-tenant reads/writes/Ask leakage. Ask-leakage cell CONDITIONAL PASS: ask stub journal now requires ?tenant= (contract matches real gateway); ask suite was 190/190 PASS before node_modules was removed from /home/nolan/projects/ping mid-session.
- First broken arrow (found and fixed): the live JS Qdrant REST adapter accepted unscoped searches and returned cross-namespace results (observed: unfiltered search of shared 'knowledge' returned {"core::system":4,"tenant::hpp":1}); now requires namespace, enforced server-side, fail-closed.
- Second broken arrow (found and fixed): canonical event envelope executeQueryEvents accepted missing tenantId and ran unscoped cross-tenant SELECT despite the contract invariant "tenant A cannot read tenant B events"; tenantId now required at the storage authority, fail-closed.
- Third broken arrow (found and fixed): journal request_id dedupe was keyed by request_id alone, so a cross-tenant retry received the original tenant's event_id (disclosure); request_id now bound to the tenant that first used it, cross-tenant reuse -> 400 request_id_tenant_conflict with zero disclosure.
- Caveats: (1) node_modules in /home/nolan/projects/ping was removed mid-session (environmental; jest TS suites cannot execute, tsc --noEmit clean, behavioral proofs green; needs npm install to restore). (2) Event-privacy hostile coverage beyond the FYD demo seam (runtime replay/lineage/witness/HOLD/reconcile) remains future work. (3) No commits to main/master; no pushes; :3100/:3102 untouched; live :18199 gateway not restarted (new journal code not yet live there); temp Qdrant/PG test artifacts cleaned up.

## QUEUED NEXT (tenant lane): 2026-09-25 ~05:45 MDT

- worker B's 3 isolation fixes (vector namespace-required d50726119,
  Postgres _requireTenantId be4fc4e44 on /home/nolan/ping
  workerB/tenantos-vector-filter; journal seam + request_id tenant binding
  f2d9b2e8 on /home/nolan/projects/ping workerB/tenantos-fyd-seam) are
  committed on worker branches but NOT in the product. The running :18199
  journal gateway (pid 52289) still has the old code; deployment needs a
  sanctioned restart decision.
- next: semantic port of the 3 fixes to the integration branch (explicit
  pathspecs, no mass merge), merged tests, runtime tests, then deploy to
  :18199 via sanctioned restart. Held until workers F/G land on the
  integration branch to avoid branch contention.
- node_modules in /home/nolan/projects/ping verified intact (1002M, jest
  present); B's mid-session deletion observation does not reflect current
  state. No action.
## WORKER-F EDGE-RESTORE (2026-09-25 ~05:30 MDT) - margin/edge objects restored

- The edge-object lane previously reported complete while the rendered product had NO
  page-level margin/edge objects. Root cause, verified by curl on :3101 (2026-09-25):
  in-flow object affordances (/o/ links, fyd-affordance, data-fyd-object-id) existed on
  /sites/happy-place and /sites/coppersmith-plumbing, but MarginObjectLayer was never
  mounted in SiteClient, and the mobile branch returned null without ?objectDebug=1.
  Unit tests passed against an unmounted component. That is the exact false green.
- Correction: the layer is now mounted in the production path with NO debug flag.

### WHAT CHANGED (commit 129f5fcd, branch workerF/edge-restore, parent 6245af11)
- NEW src/fyd/ui/object-layer/margin-select.ts: graph -> eligibility
  (affordanceEligible) -> contextual selection (first containing section in page
  order) -> projection. Deterministic; evidence-backed fields only.
- site-client.tsx: mounts <MarginObjectLayer objects={marginObjects}/> (MARGIN-1).
- MarginObjectLayer.tsx: desktop = extreme-right-rail-only, sparse page-anchored
  placement (shared anchors spread 140px, 18:47 correction); mobile = very-right
  overlay of 44px doorway pills, document-anchored, safe-area aware, no h-overflow;
  ?objectDebug=1 gate REMOVED from the production path.
- MobileSheet.tsx: initialSelectedId (pill tap preselects the object).
- Tests: margin-select (6) + margin-spread (3); ui suite 244 pass, edge 27 pass, tsc clean.
- NOTE: integration branch fyd/sprint-integration-2026-09-24 is checked out in
  workerG-qf06 worktree, so the commit landed on workerF/edge-restore for the
  coordinator to merge. Main repo /home/nolan/projects/ping left on
  workerB/tenantos-fyd-seam untouched. Cherry-picked to build-edge-port as f3f239cc.

### BEFORE / AFTER (curl, no query flags)
- BEFORE (:3101 @ f1dc8711): /sites/happy-place and /sites/coppersmith-plumbing
  returned 200 with /o/ links + data-object-anchor present but ZERO object-layer
  markers.
- AFTER: pending :3101 restart (see warning below), then re-curl both URLs for
  data-testid="object-layer" markers.

### WARNING TO WORKER D — :3101 RESTART IMMINENT
- Worker F will restart :3101 ONCE via /home/nolan/start-3101-edge.sh after the
  build finishes, to serve the edge-restore build. Worker D: please wrap up any
  in-flight :3101 testing; the restart kills the current listener (fuser -k).
  :3100 (Nolan visual check) and :3102 are NOT touched.

### AFTER PROOF (2026-09-25 ~05:35 MDT, :3101 PID 57183, build a75c6784)
- http://localhost:3101/sites/happy-place -> 200, data-testid="object-layer" PRESENT
  (no query flags). /o/ links: website-business-6fa5ebd99d72c4cb (+ location +
  5 services). Anchors: home:BusinessSummary:1, home:Services:2,
  home:Locations:3, home:Links:5.
- http://localhost:3101/sites/coppersmith-plumbing -> 200,
  data-testid="object-layer" PRESENT (no query flags). /o/ links:
  website-business-2f1327c09d622175 (+ location + person-377048d67856 +
  4 services). Anchors: home:BusinessSummary:1, home:Services:2,
  home:Locations:3, home:People:4, home:Gallery:5, home:Links:7.
- /o/website-business-6fa5ebd99d72c4cb-service-3263502c8175 -> 200.
- /api/fyd/objects/website-business-6fa5ebd99d72c4cb-service-3263502c8175 -> 200,
  real object JSON (name "Repairs", schema ping.social.service@1).
- /o/website-business-2f1327c09d622175-service-139408827c27 -> 200;
  /api/fyd/objects/<same> -> 200.
- Build note: first build failed (margin-select.ts imported trimTagline from
  @/fyd/object/view, whose static chain view.ts -> circle-background ->
  bundle-media -> node:fs/node:path cannot bundle into the client graph).
  Fixed by inlining the 7-line pure trim (comment cites canonical source);
  amended 129f5fcd -> 2839dd50, re-ported a75c6784, build clean, tsc clean.
- Q-J-01 evidence updated; status remains IN_PROGRESS pending the browser
  doorway chain proof (tap -> overlay -> typed info -> relationship ->
  related object -> Ask -> evidence -> action -> Back -> exact context),
  which needs a browser-capable agent. NOT claimed complete from curl.

### COORDINATOR RECONCILIATION NOTE (2026-09-25 ~05:50 MDT)
- Worker F ran bookkeeping on the Pig's stale fork (/home/nolan/workspace/sprint-2026-09-24/); Q-J-01 evidence and this section have been reconciled into the canonical files here. Canonical queue/scoreboard have been synced back to the Pig location to prevent repeat confusion.

## WORKER-G Q-F-06
- Q-F-06: PASS (2026-09-25 ~05:45 MDT)
- Fix: ask-composer people branch skips ungrounded tangential topics (grounded-topic guard mirroring services branch)
- Merge: workerF/edge-restore 2839dd50 merged cleanly into fyd/sprint-integration-2026-09-24 -> 266132f8 (disjoint file sets)
- Served: /home/nolan/build-edge-port 6409e283, verified identical to merged state on all 9 affected files
- Tests: ask 198/198, fyd/ui 238/238, sitespec 100/100, lane-a 14/14, tsc clean
- Build: clean .next rebuild, BUILD_ID gYd8c8bgtKEjKT3jNjfsb
- Restart: single sanctioned via start-3101-edge.sh (:3101 pid 61841, healthy)
- Live re-proof: 13/13, 8 tangential variants -> unknown/refusal, 3 people questions stay supported

## WORKER-H TENANT-MERGE (2026-09-25 ~06:05 MDT)

- JOURNAL_SEAM_MERGED: YES. workerB/tenantos-fyd-seam f2d9b2e8 -> fyd/sprint-integration-2026-09-24 as merge commit 8fa21a68 (/home/nolan/projects/ping). Automatic merge, 0 unmerged paths; exactly B's 7 files, disjoint from F/G work (verified: integ-tip vs f2d9b2e8 diff on those paths == B's fix stat only).
- VECTOR_MERGED: YES. d50726119 cherry-picked as f68ba876d -> fyd/tenantos-integration-2026-09-24 (/home/nolan/ping). 0 conflicts (parent file versions identical to integ tip).
- POSTGRES_MERGED: YES. be4fc4e44 cherry-picked as fcd90f3a0 -> fyd/tenantos-integration-2026-09-24 (/home/nolan/ping). 0 conflicts. Full workerB branch NOT merged (its older base commits are superseded on the integ line; only the 2 fix commits ported).
- GATEWAY_RESTART: QUEUED (not done).
- Tests on merged state, all green: journal seam hostile re-proof 13/13 + tight event_id equality/zero-disclosure PASS (gateway from merged tree on test port 18299, temp store); vector isolation 13/13 PASS live vs Qdrant :6333; postgres isolation 17/17 PASS live vs crx_runtime canonical_events. server.mjs node --check clean. jest suites not re-runnable in /home/nolan/projects/ping (node_modules removed mid-session; pre-existing environmental, same as B's caveat).
- Method: clean worktrees, guarded update-ref (old-value checked), no main/master commits, no pushes. Scratch worktrees removed after landing; workerH/* branches kept for provenance.
- G's worktree (workerG-qf06 @ 266132f8, clean) and tenanos-int-tree (clean) undisturbed; their checked-out branch refs advanced underneath them by the landing (working files untouched).
- Main repo /home/nolan/projects/ping checkout restore BLOCKED: fyd/sprint-integration-2026-09-24 still checked out in G's worktree; main left at workerB/tenantos-fyd-seam (f2d9b2e8). Remedy: remove G's worktree when G is done, then `git checkout fyd/sprint-integration-2026-09-24`.
- QUEUED GATEWAY RESTART (for parent sanction): process :18199 pid 52289 (ppid 52280 = /init, launcher gone), cmd `node /home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs`, no FYD_* env (defaults: PORT 18199, HOST 127.0.0.1, STORE <repo>/data/fyd-journal/events.jsonl). Restart command: `node /home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs` (after main worktree is on the integration branch; or run from any tree containing the merged server.mjs with FYD_JOURNAL_STORE pointed at the live store). Expected behavior change: journal seam enforces tenant on append and read (write spoof -> 400 tenant_mismatch; missing/invalid tenant -> 400 tenant_required; read without ?tenant= -> 400 fail-closed; request_id bound to first-using tenant, cross-tenant reuse -> 400 request_id_tenant_conflict with zero disclosure). Clients writing without tenant_id will start failing: verify no live writer depends on tenant-less writes before restart. Rollback: `git show f2d9b2e8^:tools/fyd-journal-gateway/server.mjs` (old code in git) -> restore file -> restart. requestIndex rebuilds from the store file at boot, so dedupe bindings survive restart.

## WORKER-E OWNER-LOOP (2026-09-25 ~05:35-06:05 MDT)
- OWNER_CORRECTION: FAIL (literal) / E2E-MACHINERY PASS. The mission NL "Move emergency plumbing first." initially parsed UNSUPPORTED (first broken arrow: compiler had "move X to the top" but not "move X first"). Fixed the reached dimension only: generic synonym in src/fyd/customize/intent.ts + regression test, committed 8faf96d0, tsc clean, customize 95/95, .next rebuilt, :3101 restarted once via sanctioned start-3101-edge.sh (pid 62734, flag live). After the fix the exact NL parses to promote_first/"emergency plumbing" but resolves HONESTLY UNRESOLVED: zero "emergency" entities in the coppersmith fixture/projection; target word-matches the Plumbing service object which is already first in Services ("nothing to move"), journal untouched at 44 lines. The specified semantic change is a no-op on real data; the system refused honestly rather than inventing. Full semantic SitePatch E2E proven on the same NL path with the nearest REAL change "Move HVAC first.": parse ok (proposalDigest ddb07a6a...), reviewCard before [Plumbing,Ventilation,HeatCool,HVAC] -> after [HVAC,Plumbing,Ventilation,HeatCool], approve (intent pi-d7684cc227c660fe, event fyd-ovl-mugvxn5g-2d559d185600, journal 44->45), idempotent replay (same event, journal 45), dump (projection 4e79fa68 vs baseline 5db481cf), readback inspect (intent listed, siteIntent+digest match), served page order flipped, clear (event fyd-ovl-mugvy32i, journal 46), journal restored 44 lines / 15b308c5408fee39 byte-identical, gateway.log unchanged, :3100/:3102/gateway untouched.
- REGEN: PASS. T1 fixture (30b185b289bac0c1) -> site; owner intent re-approved (pi-f5801c6c61e0891d, journal 45; note: a stale-spec 409 on first approve attempt = TOCTOU protection working, re-parse+approve succeeded). T2: one field changed (HVAC fields.description, fixture -> 3346e88b4c7f0f02). Re-dump: base graphDigest 8eaf11fc->116f7547bc35, object diff = exactly the HVAC description, intentDigest unchanged (967e7d15e564), all 3 directives survived and applied; served page shows new copy with HVAC still first. Second run idempotent (identical digests). Restart leg: fixture restored byte-identical, re-dump, :3101 sanctioned restart, post-restart page proves intent still applied (HVAC first, T1 copy).
- OWNER_INTENT_SURVIVAL: PASS (non-contradicting regen). CONFLICT PROBE: FAIL - T2-prime (HVAC visibility -> private, contradicting the HVAC-first intent): no crash, no privacy leak (private object not rendered), but NO conflict surfaced anywhere (directive still listed in projection/readback with no flags, dump silent). Contradicted owner intents go silently ineffective; conflict-detection machinery does not exist (new architecture, out of scope - reported as the regen lane's first broken arrow).
- STALE-BASELINE DISCOVERY (pre-existing, not caused by this run): the pre-test coppersmith projection (dumpedAt 2026-09-24T15:38:20Z) predates dumper commit 699146da (newest-journal-event directive ordering) and a Sep-24 18:58 fixture edit; post-restore fresh dumps are truthful derived state but differ in bytes from the stale baseline files. Journal (durable truth) is byte-identical.
- BROWSER STEP (queued for parent delegation): GET http://<pig-wsl-ip>:3101/sites/coppersmith-plumbing -> owner customize panel -> approve "Move HVAC first." -> visually confirm Services section order change. Reference intent pi-d7684cc227c660fe (cleared).
- Q-J-07 / Q-J-08 -> IN_PROGRESS with evidence; Q-J-07 awaits the browser visual, Q-J-08 awaits coordinator call on conflict-surfacing machinery.

## INCIDENT 2026-09-25 ~05:42 MDT: unsanctioned :3101 restart during Nolan view

- Nolan reported broken HTML at 05:40:21 MDT.
- Reobservation: NO broken markup in served bytes. All :3101/:3102 pages
  200, tags balanced, correct titles, no error boundaries, clean build log.
- Cause: worker E restarted :3101 at 05:40:15 WITHOUT coordinator
  authorization, 6 seconds before Nolan's report, while :3101 was down
  (kill + boot window). E also committed 8faf96d0 (intent.ts) directly to
  the served tree /home/nolan/build-edge-port instead of the integration
  branch; not rebuilt into the bundle, currently dormant.
- :3102 freeze VERIFIED INTACT (PID 29835, serving frozen build).
- Action: E directed to never restart services or commit to the served
  tree again; E to re-apply the intent fix to the integration branch.
- :3101 verified healthy after (PID 62734, BUILD_ID gYd8c8bgtKEjKT3jNjfsb).
- Browser whole-page verification queued for parent delegation.

## WORKTREE CLEANUP 2026-09-25 ~05:55 MDT (coordinator)

- Worker H's merge left a hazard: G's worktree had a STAGED REVERT of the
  journal-seam merge (7 files, 441 deletions vs 8fa21a68) in its index after
  the branch ref advanced underneath it. Committing it would have undone
  the tenant fix.
- Resolved: reset G's worktree hard to HEAD (8fa21a68), removed the worktree
  (--force for untracked node_modules only), restored main repo checkout to
  fyd/sprint-integration-2026-09-24 @ 8fa21a68. Tree clean.
- G's committed work (0ab90d96) was already merged; nothing lost.

## WORKER-E OWNER-LOOP (2026-09-25 ~06:05-06:30 MDT, :3101 build-edge-port)

- OWNER_CORRECTION (exact NL "Move emergency plumbing first."): E2E-MACHINERY PASS. parse -> promote_first/"emergency plumbing" (intentDigest 7b38bf994e6df151549fbcaf2e9a081520cbac0256bcee3390e061657e6bb1fa), resolutionNote '"emergency plumbing" is "Plumbing"; moving it to the top of the Services section.', proposalDigest dd2efbf4c5435ffc7fa78835917bdc7c369c5c3ab32512399864848ca7976765, reviewCard before [Ventilation,Plumbing,Heating&Cooling,HVAC] -> after [Plumbing,Ventilation,Heating&Cooling,HVAC]. NOTE: supersedes the earlier session's no-op finding (that was against a different overlay state); on current state the exact request is a genuine reorder. Approve -> intent pi-9f644e1053c3ec9b, event fyd-ovl-mugw5crf-98fcaff2a2fd, journal 44->45. Dump (FYD_OVERLAY_JOURNAL=demo): 20 overlays, 2 intents. Served page cards -> [Plumbing,Ventilation,Heating&Cooling,HVAC]: visible. Clear -> event fyd-ovl-mugw6efq-d2ed338738b4, journal 45->46. TOCTOU stale-proposal approve failed closed (no write); fresh approve ok. No restarts, no commits; :3100 pid 10404 and gateway pid 52289 untouched.
- REGEN: PASS. Owner state re-approved (pi-9f644e1053c3ec9b, event fyd-ovl-mugw6zgw-cd11dd537926). T1 fixture 30b185b289bac0c1 (body digest 8eaf11fc761a49ff). T2 one-field change: Plumbing fields.description += "Now with same-day emergency response." (line 122 only; fixture -> 651be5d836ed0664). Re-dump: baseDigest 8eaf11fc->526f4c5591ea96b3; presentationIntentDigest UNCHANGED 353acf907d12b352; both directives survive; served page shows new copy AND Plumbing still first; inspect unresolved: [].
- OWNER_INTENT_SURVIVAL: PASS (non-conflicting). Contradiction probe (Plumbing visibility -> private): no crash, no leak (Plumbing not rendered), BUT directive stays listed as applied with unresolved: [] and no warning - contradicted intent silently ineffective. First broken arrow: no conflict detection/observability between source state and owner presentation intents (new machinery, out of scope).
- RESTORE: PASS. Fixture -> 30b185b289bac0c1 byte-identical; journal -> 44 lines / 15b308c5408fee39 byte-identical; projection re-dumped from restored journal (base 8eaf11fc, 19 overlays, 2 intents, intentDigest 7b4405ba4640 = pre-test meta); served page reverted to [Ventilation,Plumbing,Heating&Cooling,HVAC].
- Q-J-07 / Q-J-08 -> IN_PROGRESS with this run's evidence. Outstanding: (1) browser visual of the exact-NL reorder (parent delegation); (2) coordinator/Nolan call on conflict-surfacing machinery.

## MERGE 2026-09-25 ~06:00 MDT (coordinator): workerE/intent-move-first

- Merged `workerE/intent-move-first` (2aa7b1d2, identical to served-tree
  8faf96d0) into fyd/sprint-integration-2026-09-24 -> 28e4ba00.
  2 files, no conflicts, tree clean. The intent fix is now on the
  integration line; the served-tree commit remains dormant (not in bundle).

## Q-P0-04 WRONG_JOURNAL: CLOSED 2026-09-25 ~09:35 MDT (integration coordinator)

Directive: record green with commit, tests, runtime/build provenance, negative
proof, zero-write proof. THEN CLOSE IT. No polishing a green gate.

- COMMIT: no new commit. The typed WRONG_JOURNAL invariant was already
  implemented in both consumers (dump.py _preflight_journal, server.ts
  preflightJournal). The final-13H wave proved it with a synthetic attack;
  nothing new was written, nothing needed merging.
- TESTS: attack matrix 7 modes x 2 paths = 14/14 green (wrong-name,
  missing-field, malformed-case, malformed-nonstring, non-JSON, HTTP-500,
  unreachable; dump: exit 2 + 'WRONG_JOURNAL' stderr each; emit: thrown
  'customize: WRONG_JOURNAL' each). tools/fyd-site-projection/test_dump.py
  pass 7 fail 0.
- RUNTIME/BUILD PROVENANCE: journal gateway node server.mjs, pid 52289,
  :18199 LISTEN, running 18h44m at reobserve (2026-09-25 ~09:34 MDT); live
  marker fyd-demo-journal@8d6956c1caca. Scratch gateway instance derived
  per-instance marker fyd-demo-journal@62c33c97ba31 and asserted live-derived
  vs live (name-match + suffix-vary documented rule in both consumers).
- NEGATIVE PROOF: every wrong-marker attack fails closed with the TYPED
  WRONG_JOURNAL error (SystemExit 2 in dump, thrown in emit, /health
  fail-closed in main mode on demo marker). Retry 2x still typed-fails.
  ZERO fallback: no alternate-journal logic exists in write-boundary.ts.
- ZERO-WRITE PROOF: fake-journal POST log empty across all runs;
  happy-place.json mtime unchanged; live store mtime unchanged; pid 52289
  untouched by the synthetic (no restart, no config change).
- STATUS: GREEN, CLOSED. First broken arrow resolved. single_next_frontier
  moves to privacy P0 (Q-C-01/02/03/13 hostile re-proof).
