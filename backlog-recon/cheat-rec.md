## reconciliation-precedence-frozen
DONE_VERIFIED P1 [RECONCILIATION **STATUS:** DONE_VERIFIED **PRIORITY:** 1] reconciliation precedence frozen
WHY: The send-eligibility gate settles eligibility on a fail-closed precedence ladder: (1) canonical structured state, (2) explicit suppression, (3) verified communication history, (4) derived projection, (5) notes/free text advisory only. Any disagreement between the two canonical sources is itself a fail-closed discrepanc
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up (2026-09-21): `~/workspace/outreach/send-eligibility.py` + `test-send-eligibility.py` 17/17 pass; exit codes 0 ELIGIBLE / 1 INELIGIBLE / 2 DIS
ACC: `send-eligibility.py` runs in the engine cron before every outbound action (email wired 2026-09-21; Messenger/meta-ai-ingest still pending, tracked as RECON-EXTEND).

## suppression-not-deletion
DONE_VERIFIED P1 [RECONCILIATION **STATUS:** DONE_VERIFIED **PRIORITY:** 1] suppression not deletion
WHY: Suppression is a hard block recorded in structured state, never a delete. Canyon Creek Electric and Lico's Electric remain SUPPRESSED after the round-105 ladder violation: "no further touches ever," rows retained in JSONL and pipeline.md with errata appended.
EV: `~/workspace/outreach/eligibility-reconciliations.md` (2026-09-22, DISC-20260922133428-1d79eb and DISC-20260922133527-b74d5e); FL-20260921-030 (2026-09-21).
ACC: `grep` the canonical JSONL for both businesses: rows present, suppression_state shows the ladder-violation suppression, zero sends after 2026-09-21 02:21 MDT.

## reconciliation-state-hash-binding
OPEN P2 [RECONCILIATION **STATUS:** OPEN **PRIORITY:** 2] reconciliation state hash binding
WHY: A reconciliation covers a discrepancy only while the structured state hash is unchanged. If the state moves under a reconciliation, the disposition is stale. This binding exists as an assertion in the FL-20260921-030 follow-up but needs mechanical enforcement in the checker (compare state_hash at reconcile time vs at d
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up (2026-09-21): "reconciliation covers a discrepancy only while the structured state hash is unchanged"; `eligibility-discrepancies.jsonl` carri
ACC: checker refuses to mark a discrepancy reconciled when the current state_hash differs from the discrepancy's state_hash; covered by a fixture test.

## discrepancy-reopen-on-contradiction
OPEN P2 [RECONCILIATION **STATUS:** OPEN **PRIORITY:** 2] discrepancy reopen on contradiction
WHY: Reopen on evidence/source/disposition contradiction: notes suggesting outreach while structured state blocks (or asserting completion while structured looks eligible) must emit a fresh DISCREPANCY record rather than being folded into the old one. 10 reconciliations are recorded; the rule needs a standing test that a co
EV: `~/workspace/outreach/eligibility-reconciliations.md` (10 rows, 2026-09-21/22); FL-20260921-030 follow-up test cases (a) and (c) cover stale-note contradictions.
ACC: a fixture where a note asserts "ladder complete" while Gmail shows 1 touch emits a new DISCREPANCY row (not a silent pass, not a send).

## row-count-attestation-gap
OPEN P2 [RECONCILIATION **STATUS:** OPEN **PRIORITY:** 2] row count attestation gap
WHY: The writer rewrote the canonical JSONL twice on 2026-09-22 (07:12/07:14 UTC) with a 16-row delta (318 -> 302) and no row-level backup; attribution is impossible. Closure disposition + independent ingestion evidence cannot be claimed while row-count changes are unaccounted.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260922-001 OBSERVATION (2026-09-22 ~02:00 MDT): "Cause of the 16-row delta is UNKNOWN... Not claimed as deletion."
ACC: engine run emits a row-count reconciliation (before/after count + per-row diff against a snapshot backup) on every rewrite.

## bridge-outage-fingerprint
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] bridge outage fingerprint
WHY: Pig bridge outage signature: egress proxy TCP reachable but CONNECT to 100.79.154.43:22 aborts (`nc: proxy read: Broken pipe`). Distinct from Pig death, commute blackout, and profile poisoning. Bounded retries with backoff, then stop hammering; lane work parks with a resume script.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-072 (2026-09-21, RECOVERED; authoritative window 15:53-16:12 MDT); FL-20260921-007 (2026-09-21, transient bridge failures during 7B push/test).
ACC: documented fingerprint + `transfer-remaining.sh` resume pattern; recorded in AGENTS.md Pig bridge lessons.

## argv-probe-misattribution
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] argv probe misattribution
WHY: emit-observation.py probed `WHERE event_id='fetch'` because the JS bound `process.argv[2]` (literal 'fetch') instead of `process.argv[3]` (the event_id). Five rounds of "canonical-byte fetch failed" were misattributed to Pig unreachability. Lesson: probe bugs produce infrastructure-shaped symptoms; verify the probe rea
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-111 (2026-09-21, HEALED).
ACC: fix in place; batch verification recorded in `meta-ai-verification-round111.jsonl`.

## stale-prose-instruction-regression
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] stale prose instruction regression
WHY: Deprecated `suppression_state` value `in-follow-up-ladder` (FL-20260919-008, HEALED 2026-09-19 with 0 contamination) was reintroduced on 4 JSONL rows because a stale queue file (written 2026-09-17, pre-migration vocabulary) carried the on-acceptance instruction and was executed verbatim on 2026-09-20. Lesson: queue/pro
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260922-001 (2026-09-22, HEALED; residuals (a)/(b) row-count observation still OPEN for the engine).
ACC: 302 rows scanned, 0 stale values; residuals (a)/(b) owned by the engine.

## self-heal-rule-violation-logged
DONE_VERIFIED P2 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2] self heal rule violation logged
WHY: The perfecting pass hit a malformed shell command (exit 2, bash unexpected-EOF), recovered inline, and narrated it without writing the ledger entry — violating its own "ledger entry first, narration second" rule. Retroactive entry created as the reference case. Lesson: the recorder is inside the blast radius; the rule 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260922-002 (2026-09-22, LOGGED).
ACC: retroactive entry exists with evidence quote; future pass reports checked for a ledger entry per self-heal step.

## ladder-violation-structural-fix
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] ladder violation structural fix
WHY: Duplicate 4th-touch emails to Canyon Creek Electric and Lico's Electric (round-105) after completed ladders — caused by trusting stale leads.md notes over verified per-recipient Gmail history and treating a contradictory empty Gmail result as a green light. Fix was structural, not prose: deterministic `send-eligibility
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 (2026-09-21, incident OPEN pending draft-trashing/learnings; structural fix DONE).
ACC: 17/17 checker tests pass; Messenger DM path + meta-ai-ingest extension still pending (RECON-EXTEND, OPEN).

## nohup-session-lifetime-invariant
DONE_VERIFIED P2 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2] nohup session lifetime invariant
WHY: A gateway launched with `nohup ... &` via the bridge died at the next bridge call with no crash: WSL session teardown kills the process group; nohup only guards SIGHUP. Invariant: always `setsid`-detach Pig background services launched via the bridge.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-226 (2026-09-21, CLOSED); reused in FL-20260921-228 (dev server restart).
ACC: invariant stated in the entry; verified persistent across later bridge calls.

## premature-certification-epistemic
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] premature certification epistemic
WHY: `oracle-deployment-84486f056-certification.md` declared ORACLE_RUNTIME_PROVEN: YES with 14 certification gaps still open (no live collision proof, no fanout proof, unassessed CVEs, no distribution manifest/digest, overstated document). The failure was epistemic, not operational: downstream promotion decisions could hav
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260920-023 (2026-09-20, OPEN pending gap closure + new dated certification).
ACC: new dated certification document issued only after all 14 gaps close.

## unauthenticated-tenant-crud
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] unauthenticated tenant crud
WHY: A read-only audit probe `POST /tenants {"tenant_id":"probe"}` (no auth) returned HTTP 200 and created a row in tenant_registry — both a security defect (SEC-001: /tenants CRUD mounted without auth middleware; SEC-002: /mc BI surfaces also public) and a process lesson (read-only audits must probe auth with GET-first or 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260919-AUDIT-001 (2026-09-19, OPEN); `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-001/SEC-002, TEN-002 (dual registries disconnected).
ACC: unauthenticated POST /tenants no longer 200s; read-only-audit probe discipline documented.

## image-baked-event-registry-gap
DONE_VERIFIED P2 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2] image baked event registry gap
WHY: POST of `FYD_SITE_OVERLAY` to the 8080 gateway returned "Unknown event_type": the validator only accepts types in the image-baked `event_registry.json` (233 types), and the repo's generator (the sanctioned source of truth) had never registered the type. Per Nolan's directive, FYD used the repo generator + its own demo 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-231 (2026-09-21, CLOSED for demo path; 8080 registration pending as explicit backlog item).
ACC: demo-gateway emit accepted (event_id 39fc9971...); Happy Place page renders the new service with zero React edits; Coppersmith unchanged.

## stale-anchor-edit-class
DONE_VERIFIED P3 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 3] stale anchor edit class
WHY: Six consecutive anchor mismatches (FL-20260921-ASK1 through ASK6) from editing against stale reads/post-compaction files. Lesson: re-read the anchor immediately before the edit; never trust a pre-compaction draft's line/anchor memory. Process fix, all closed.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-ASK1..ASK6 (2026-09-21, all CLOSED).
ACC: edit scripts assert anchor presence and fail before writing.

## shadow-copy-patch-mislocation
DONE_VERIFIED P2 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 2] shadow copy patch mislocation
WHY: Two shadow-tree injuries in one day: (1) custody patch applied to a Pig-side /tmp copy, not the local file (FL-20260921-018); (2) stale Pig file copy caused a phantom verification failure (FL-20260921-219). Both are the ERGO-002 shadow-tree condition made concrete: when two live copies exist, the agent edits the wrong 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-018, FL-20260921-219 (2026-09-21, both CLOSED).
ACC: both recovered; feeds ergo-shadow-tree-canonical item.

## event-durability-and-collision-fixes
DONE_VERIFIED P1 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 1] event durability and collision fixes
WHY: Two P0 runtime defects, both fail-open: (1) `UnifiedEventRuntime.emit()` returned `{status:'ok'}` with a null pool — ACK without durability (FL-20260920-012); (2) `ON CONFLICT (event_id) DO NOTHING` treated same-ID-different-semantics as a harmless duplicate while handlers received the unpersisted payload (FL-20260920-
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260920-012, FL-20260920-013 (2026-09-20, FIXED in commit ccfef91f3).
ACC: syntax + inspection verified; replay via `git show ccfef91f3`.

## hostile-url-href-sink
OPEN P1 [FAILURE-LEDGER-DERIVED **STATUS:** OPEN **PRIORITY:** 1] hostile url href sink
WHY: The FYD renderer neutralizes hostile HTML text (React escaping) but rendered `javascript:alert(1)` verbatim into `href` attributes for fields.website/socials. React warns; it does not block. Lesson: text-escaping is not URL-sanitizing; href sinks need an explicit scheme allowlist.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-032 (2026-09-21, OPEN, hostile-content probe).
ACC: hostile probe re-run: no `javascript:` (or other non-allowlisted scheme) in any rendered href; allowlist documented.

## pg-bigint-string-normalizer
DONE_VERIFIED P3 [FAILURE-LEDGER-DERIVED **STATUS:** DONE_VERIFIED **PRIORITY:** 3] pg bigint string normalizer
WHY: node-postgres returns BIGINT as string; `typeof v === "number"` checks fell through to null, degrading the follow-attestation sequence evidence (715 -> null) and inexacting the projector-ordering mirror. Fix: `asSequence()` normalizer in readers.ts + attestation gate. Lesson: driver type contracts are part of the evide
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-227 (2026-09-21, CLOSED, sequences 747/748/749 verified flowing).
ACC: attestation responses carry numeric sequence matching the journal row.

## first-external-owner
OPEN P1 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 1] first external owner
WHY: No external business owner has used FYD. The nearest candidate is the pending in-person conversation with Monument View Coffee Shop owners (Grand Junction/Redlands); a meeting-ready research brief was built 2026-09-09 but the conversation has not happened. Architecture does not substitute for this.
EV: `memory/2026-09-09.md#L64, L77, L79` (research brief completed and shared via muse.ai URL; shop's tech footprint: self-hosted WordPress brochure site, no online ordering/booking, POS unknown).
ACC: one external owner identified by name/business with a scheduled FYD conversation.

## first-owner-url-submission
OPEN P1 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 1] first owner url submission
WHY: The core product loop begins when an owner (not the team) submits a URL. No owner-submitted URL exists; all acquisitions so far are team-authorized demo tenants (Happy Place, Coppersmith).
EV: memory 2026-09-22 (FYD backends stay at two until Nolan can personally use both end-to-end); `MEMORY.md` harvest directive (2026-09-22): authorized demo businesses/sources only.
ACC: a URL submitted by an external owner, ingested through the acquisition path, with provenance (source URL + observed_at + digest).

## what-fyd-got-wrong-first-owner
OPEN P1 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 1] what fyd got wrong first owner
WHY: The honest-failure inventory for a real business is empty. Demo evidence of the correction machinery exists (Ask FYD refusal + evidence classes fixed 2026-09-21; propose->approve owner loop proven on the demo gateway), but nothing has been proven wrong by an owner yet.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 (CLOSED: fallback made reachable, classificationFromProvenance wired, 36/36 + 13/13 tests); FL-20260921-212 failure 2 (immediate-apply semantics rebuilt
ACC: first owner correction recorded as a typed proposal, approved, applied, and verified across generated site, Circle, Ask FYD, and search projection (the 2026-09-21 product proof target).

## time-to-usable-presence
OPEN P2 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 2] time to usable presence
WHY: No baseline exists for URL -> usable presence latency. The five must-win metrics (mobile UX, contact discoverability, service discoverability, performance, trust/correctability) were reaffirmed 2026-09-21 but none are instrumented.
EV: memory 2026-09-21#L1462 (five must-win metrics); memory 2026-09-21#L1033 (performance mobile/contact/services/trust "measure before fixing the first broken customer experience" — no completion evidenc
ACC: measured minutes/hours from owner URL submission to a usable presence for the first external owner, with per-stage timings.

## owner-correction-taxonomy
OPEN P3 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 3] owner correction taxonomy
WHY: Customization requests from a real owner will define the product surface; currently only Nolan's directives exist (structured patches only: add/remove/move section, change variant/binding, feature object, change token/owner copy — 2026-09-22 FYD architecture invariants). The taxonomy must be grown from owner behavior, 
EV: `MEMORY.md` FYD architecture invariants (2026-09-22, Nolan): structured patches only, no arbitrary filesystem mutations; owner approval = strong binding (tenant+actor+base digest+patch digest+approval
ACC: the first 10 real owner requests classified; any request falling outside the structured-patch set is recorded as a taxonomy gap, not shoehorned.

## ask-fyd-usefulness-external
OPEN P2 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 2] ask fyd usefulness external
WHY: Ask FYD is evidence-bounded and refusal-capable in demo (FL-20260921-232), but no external visitor has ever asked it anything. Usefulness = real visitor questions answered from evidence, with unknowns honestly labeled.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 (CLOSED 2026-09-21 ~13:38); memory 2026-09-21#L1492 (Ask FYD must be broad evidence-bounded Q&A; first test "What services does this business offer, and
ACC: 20 real visitor questions logged with evidence-class coverage and refusal rate; zero plausible-filler answers.

## return-usage-and-sharing
OPEN P3 [EXTERNAL USER VALIDATION **STATUS:** OPEN **PRIORITY:** 3] return usage and sharing
WHY: Return usage and willingness to keep/use/share are the only metrics that validate the product. Dogfood metrics (rendered pages, passing probes) measure the engine, not the market. Nothing is instrumented yet.
EV: none exists — that is the finding. Contrast with dogfood evidence below.
ACC: owner returns unprompted within 30 days; owner shares the presence URL or Circle with at least one third party.

## dogfood-happy-place-coppersmith
IN_PROGRESS P1 [DOGFOOD **STATUS:** IN_PROGRESS **PRIORITY:** 1] dogfood happy place coppersmith
WHY: Two real businesses run through acquisition -> object graph -> SiteSpec: Happy Place (15 direct facts, 2 objects, 1 relationship, SiteSpec digest bc4148b9...), Coppersmith (38 facts, 4 objects, 3 relationships, digest 473c9d97...). Both served 200 through the private Tailscale path on port 3100; logo ingestion independ
EV: memory 2026-09-21#L711, L1009, L1148; happyplacecarpentry.com redirects to Google sign-in (junk-source hazard documented in FL-20260921-216).
ACC: both businesses render page + Circle + Ask FYD from the same canonical graph (one-read-model invariant); two-site structural-difference standard met (planner differences, not just string swaps).

## dogfood-not-customer-validation
DONE_VERIFIED P1 [DOGFOOD **STATUS:** DONE_VERIFIED **PRIORITY:** 1] dogfood not customer validation
WHY: Standing boundary: dogfood validates engine breadth; it is not equivalent to external customer validation. Nolan froze "FYD backends stay at two until Nolan can personally use both end-to-end through the private preview, Ask FYD, owner mode, Circle -> Node, and customization" (2026-09-22). Do not cite dogfood numbers a
EV: `MEMORY.md` (2026-09-22, Nolan's call); memory 2026-09-21#L1425 (demo journal FYD_OVERLAY_JOURNAL=demo; base layer mechanically derived from committed fixture TS — derivation input, not event-sourced)
ACC: no product claim uses dogfood evidence as customer evidence.

## one-canonical-read-model
IN_PROGRESS P1 [DOGFOOD **STATUS:** IN_PROGRESS **PRIORITY:** 1] one canonical read model
WHY: Frozen product invariant (2026-09-21 ~14:30 MDT, Nolan's law): ONE canonical read model feeds Page, Circle, ObjectView, Ask FYD, search, agents, and future protocol projections. Fixtures are test inputs only; no production fixture fallback; unavailable data = FAIL HONESTLY / SHOW UNKNOWN. Proven 2026-09-21: service web
EV: memory URI `MEMORY.md#L174` (FYD Product Invariant); `~/workspace/FAILURE_LEDGER.md` FL-20260921-233 (OPEN: ObjectView/Circle still read hardcoded fixture graphs — the first broken boundary).
ACC: FL-20260921-233 closed; Circle and Ask FYD read the same projection; no fixture read path in production code.

## nolan-presence-dogfood
DONE_VERIFIED P3 [DOGFOOD **STATUS:** DONE_VERIFIED **PRIORITY:** 3] nolan presence dogfood
WHY: Nolan's own presence (PING Social homepage: 14-section narrative incl. continuity, TenantOS, build journal, roadmap, newsletter, contact; /technology overhaul preserving honest status language) is the personal-presence dogfood instance. The one-snippet Circle embed exists for putting a circle on any website.
EV: memory 2026-09-16#L964; memory 2026-09-21#L1130 (Circle: collapsed ~48px, expansion ~208px; 'My Circles' margin panel grouped by trade; one-snippet embed).
ACC: embed snippet works on a third-party page without PING JS on the host.

## bounded-authorized-automation
DONE_VERIFIED P1 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 1] bounded authorized automation
WHY: Standing architectural principle (2026-09-14, Nolan's correction): respect platform constraints, use bounded authorized automation, fail closed when platform behavior indicates a restriction. A detected restriction becomes BLOCKED, never an optimization problem. Caps and pacing are implementations of bounded automation
EV: `~/workspace/AGENTS.md` (Platform automation principle); `~/workspace/FAILURE_LEDGER.md` doctrine (2026-09-19): "Classify. Use the lane's classifier; a detected restriction becomes BLOCKED... Never ex
ACC: any lane encountering a restriction transitions to BLOCKED with evidence, never retries-into-it.

## capability-deny-semantics
DONE_VERIFIED P2 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2] capability deny semantics
WHY: Capability gates give deterministic deny semantics: e.g., instagram-browser-automation status BROWSER_WEDGE on the ig-profile Chrome -> DEPENDENCY_FAILURE, zero actions, schedule stays enabled (FL-20260921-218). Threads comment path fail-closed correctly (nothing published) when the composer has no Post button (FL-2026
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-218, FL-20260921-213, FL-20260919-003 (39 intents QUARANTINED at UNKNOWN_EXECUTION, never retried).
ACC: capability wedge => no actions attempted, no re-fires, schedule preserved.

## evidence-graded-claims
DONE_VERIFIED P2 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2] evidence graded claims
WHY: Every finding about a prospect's stack or presence is graded CONFIRMED / STRONG INDICATION / WEAK INDICATION / UNKNOWN — never assumed. This is the portable machinery: the same grading gates Ask FYD citations (DIRECT_FACT / website_statement / owner_authorship) and FYD service extraction (DIRECT STRUCTURED > DIRECT PAG
EV: `MEMORY.md` (stack research grading rule); `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 fix (classificationFromProvenance); memory 2026-09-21#L1425 (service extraction evidence preference, never co
ACC: no stack/pitch/answer claim appears without a grade; unknowns render as UNKNOWN, never as healthy.

## send-eligibility-precedence
DONE_VERIFIED P1 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 1] send eligibility precedence
WHY: Never decide send eligibility from free-form notes when structured pipeline state exists. Precedence: canonical structured state > explicit suppression > verified communication history > derived projection > notes/free text; notes never resurrect a completed sequence. On disagreement, fail closed: do not send, emit the
EV: `MEMORY.md` (2026-09-21, Nolan's boundary); `~/workspace/FAILURE_LEDGER.md` FL-20260921-030 follow-up; eligibility-reconciliations.md (stale planning notes "predate the ladder-violation suppression; c
ACC: checker implements the precedence; 17/17 tests.

## rate-volume-bounds-in-skill
DONE_VERIFIED P2 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2] rate volume bounds in skill
WHY: Rate/volume bounds are owned by the deterministic skill: cold email cap 10/UTC day (verified against Gmail-accepted count, never in-memory counts); Facebook heavy ceiling 75 likes + 20 comments per pass every 3h with human pacing 45-90s; trust-rebuild reduced caps after locks; halved caps after any action block. The sk
EV: `~/workspace/AGENTS.md` (cold email cap; engagement cadences); FL-20260921-218 (target_per_day NOT halved on infra failure — caps react to account signals, not infrastructure).
ACC: caps enforced by the skill; every like/comment logged; action-block => instant stop + halved caps next pass.

## unknown-execution-non-reconciliation
DONE_VERIFIED P2 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** DONE_VERIFIED **PRIORITY:** 2] unknown execution non reconciliation
WHY: UNKNOWN_EXECUTION is a real terminal-ish state: reconcile can only assert EXECUTED or NOT_ATTEMPTED, and with zero per-action evidence neither is provable. The 60 stranded Facebook intents were deliberately left unreconciled; the refuse filter prevents future double-actions on those exact (account, action, url) tuples.
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260920-015 (2026-09-20); FL-20260919-003 (39 intents QUARANTINED); memory 2026-09-21#L1425: "an agent recommendation never becomes a human decision; a dispatched e
ACC: intents with zero evidence remain UNKNOWN_EXECUTION and are refused as future candidates.

## durable-cursor-bounded-batch
PROVE P2 [OUTREACH-RUNTIME LESSONS PLATFORM-ONLY **STATUS:** PROVE **PRIORITY:** 2] durable cursor bounded batch
WHY: Recorded architectural lesson (not built): 2,000 actions cannot be one opaque browser pass. Required future shape: ACTION PLAN -> bounded batches -> durable cursor -> idempotency -> per-action receipt -> UNKNOWN handling -> reconciliation. A sleeping machine must cost at most the current bounded action. Most pieces exi
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-107C note (line ~2355, 2026-09-21).
ACC: a worker loop exists that survives host sleep and resumes from a durable cursor with per-action receipts; campaign engine implementation NOT authorized until then.

## ergo-shadow-tree-canonical
OPEN P1 [REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 1] ergo shadow tree canonical
WHY: `~/ping/` and `~/ping-gateway-src/` contain divergent copies of `unified_event_runtime.js`; tests use one, docs point to the other. The audit calls it the lane's highest-leverage trap. Concrete injuries already recorded (FL-20260921-018, FL-20260921-219). Recommendation: do not ask Nolan to pick a canonical tree; resol
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-002; `~/workspace/FAILURE_LEDGER.md` FL-20260921-018, FL-20260921-219.
ACC: one canonical copy named; all other copies labeled DERIVATIVE with a pointer; no test or doc references the shadow copy.

## ergo-supersession-metadata
OPEN P2 [REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 2] ergo supersession metadata
WHY: Multiple architecture documents name incompatible event authorities and none are marked superseded; agents cannot determine which authority is current without oral history. Same class: the constitutional-convergence branch vs. main vs. worktree copies.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-001.
ACC: every architecture doc carries a status header (CURRENT / SUPERSEDED-BY <doc> / HISTORICAL); the event-authority question resolves to one doc.

## ergo-doc-currency-guide
OPEN P2 [REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 2] ergo doc currency guide
WHY: `~/ping/` holds 390 Markdown files, 65 audit files, 46 reports with no currency/deprecation guide; archaeology dominates orientation time. Nolan's artifact policy exists (KEEP / ARCHIVE / DELETE classes; docs move into WSL; repo's canonical docs structure preferred over parallel invention) but the guide itself is not i
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-005; memory 2026-09-15#L389 (artifact/storage policy).
ACC: a currency guide exists at the docs root; KEEP/ARCHIVE/DELETE triage applied to the 390 files.

## ergo-misleading-entrypoints
OPEN P3 [REPOSITORY ERGONOMICS **STATUS:** OPEN **PRIORITY:** 3] ergo misleading entrypoints
WHY: `simple_server.js`, underscore-prefixed tests, and duplicate launchers create misleading entrypoints and skipped tests. Six gateway launch paths use three PostgreSQL defaults; some contain hardcoded environment-specific paths and secret values. Source boot paths resolve `GENERATION_MANIFEST.yaml` and `database/canonica
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-009, ERGO-004, ERGO-003; `~/workspace/FAILURE_LEDGER.md` FL-20260920-018 (missing SQL files in distribution), FL-20260920-019 (missing GENERA
ACC: one documented launch path per deployment target; skipped tests either fixed or deleted; boot resolves every file it references.

## ergo-distribution-closure
IN_PROGRESS P2 [REPOSITORY ERGONOMICS **STATUS:** IN_PROGRESS **PRIORITY:** 2] ergo distribution closure
WHY: Distribution images have repeatedly shipped incomplete: missing runtime deps (Dockerfile only COPYed gateway/, breaking ../../ping-runtime imports), missing `database/` SQL, missing GENERATION_MANIFEST.yaml, tree-sitter native build failure in Alpine, missing @types/node breaking tsc in pristine containers. Lesson: pro
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260920-014 (FIXED 8b42c1b01), FL-20260920-017, FL-20260920-018, FL-20260920-019, FL-20260921-027, FL-20260921-023 (prefer repo's own tsc).
ACC: a closure proof (built image contains every boot-resolved file; tsc passes in the pristine container) gates every candidate.

## ergo-round-script-schema-drift
DONE_VERIFIED P3 [REPOSITORY ERGONOMICS **STATUS:** DONE_VERIFIED **PRIORITY:** 3] ergo round script schema drift
WHY: Round-specific merge scripts duplicate schemas and validation logic instead of using the existing schema as one authority (ERGO-007); `jsonl-merge-round31.py:114` hardcoded the deprecated suppression value and, while not the cause of FL-20260922-001, was a loaded gun until annotated DEPRECATED. Lesson: one-shot scripts
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` ERGO-007; `~/workspace/FAILURE_LEDGER.md` FL-20260922-001 residual (c) CLOSED 2026-09-22 ~08:00 MDT.
ACC: the script carries a DEPRECATED ONE-SHOT header; `ast.parse` verified.

## ergo-worktree-reachability
DONE_VERIFIED P3 [REPOSITORY ERGONOMICS **STATUS:** DONE_VERIFIED **PRIORITY:** 3] ergo worktree reachability
WHY: Convergence worktrees (`/home/nolan/worktrees/constitutional-convergence`) were unreachable from subagent sandboxes, hard-blocking lanes (FL-20260919-P08-LANE3-001, FL-20260919-P04-LANE2-001, FL-20260919-P0-LANE1-001). Lesson: lane briefs must assert worktree reachability as a precondition; reconstruction-from-sandbox 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260919-P08-LANE3-001, FL-20260919-P04-LANE2-001, FL-20260919-P0-LANE1-001 (2026-09-19).
ACC: lane preconditions include a reachability probe; blocked lanes park with evidence instead of improvising.

## opt-business-websites
IN_PROGRESS P1 [FUTURE BUSINESS OPTIONALITY **STATUS:** IN_PROGRESS **PRIORITY:** 1] opt business websites
WHY: Core FYD loop (URL -> object graph -> SiteSpec -> renderer -> owner customization) is the product under construction on two demo tenants. Website revamp angle is already a Nolan-approved pitch (very non-technical owners with weak websites only; TenantOS pipeline; portfolio proof https://happy-place-platform.vercel.app/
EV: `MEMORY.md` (2026-09-11 website revamp angle); FYD harvest directive (2026-09-22).
ACC: first external owner end-to-end.

## opt-creator-presences-newsletters
DEFERRED P3 [FUTURE BUSINESS OPTIONALITY **STATUS:** DEFERRED **PRIORITY:** 3] opt creator presences newsletters
WHY: Personal/creator presences and newsletters are named in the optionality set; the PING Social homepage narrative already covers a newsletter section and the pig mascot system exists, but neither is a live product surface.
EV: memory 2026-09-16#L964 (homepage 14-section narrative incl. newsletter); `MEMORY.md` (PING pig mascot hard rule 2026-09-14).
ACC: deferred until an owner or Nolan asks.

## opt-social-graph-circles-nodes
HARVEST P2 [FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 2] opt social graph circles nodes
WHY: Circles exist in demo (collapsed ~48px, expansion ~208px, 'My Circles' margin panel grouped by trade, one-snippet embed). Circle -> Node is in Nolan's end-to-end acceptance for the two backends. Social relationships (Circle/Node), cross-network following where supported, and embeddable Circles are the social layer; Rel
EV: memory 2026-09-21#L1130; memory 2026-09-22#L355 (required next proof: primary Business Circle from the same canonical graph; no fabricated visual density); `MEMORY.md` (2026-09-22: backends stay at tw
ACC: Related Circles render from real relationships; embed snippet proven on a third-party page.

## opt-commerce-services-appointments
DEFERRED P3 [FUTURE BUSINESS OPTIONALITY **STATUS:** DEFERRED **PRIORITY:** 3] opt commerce services appointments
WHY: Commerce, services, appointments, lead capture, reviews, campaigns are named future surfaces. Primitives exist on the outreach side (review-triggered outreach; speed-to-lead EXP-003; 48-hour stale-estimate follow-up EXP-002; post-job review requests EXP-001) but all are blocked on one provider-binding decision (sms_int
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` EXP-001..004, EXP-007, shared bottleneck note; `MEMORY.md` (Monument View: no online ordering/booking — the demand is real).
ACC: deferred; the provider capability investigation is the authorized next step, not the build.

## opt-business-intelligence
HARVEST P2 [FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 2] opt business intelligence
WHY: BI surfaces exist but are immature or exposed: /mc lead/invoice/at-risk surfaces are public (SEC-002); 72 group-scan files could rank group yield but selection is hardcoded (COMP-001); 102/305 prospect rows have stack signals and 117/305 have primary opportunities with no segment aggregation feeding the playbook (COMP-
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` SEC-002, COMP-001, COMP-003; `~/workspace/skills/competitive-signal-pass/SKILL.md`.
ACC: BI reads are authenticated and tenant-scoped; segment aggregation feeds the playbook deterministically.

## opt-protocol-projections-identity
HARVEST P2 [FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 2] opt protocol projections identity
WHY: FYD is N inputs -> graph -> M outputs: website, Circle, Ask FYD, feed, ActivityPub, ATProto, MCP, campaigns, future interfaces (memory 2026-09-21#L1414). Portable identity rule: FYD wraps existing PING identity semantics, extracts only dependency-light primitives, never forks a second user system (memory 2026-09-21#L15
EV: memory 2026-09-21#L1414, L1577; `MEMORY.md` one-read-model invariant (feeds "future protocol projections").
ACC: a second projection (feed or MCP) renders from the same canonical graph with no new truth source.

## opt-agent-swarms-bounded
HARVEST P3 [FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 3] opt agent swarms bounded
WHY: Agent swarms under bounded capability are named optionality; the ORCA autonomy lane is the live experiment. Its Phase 0 evidence shows the failure shapes swarms must survive: A6 restart duplicated task 1 under a new work_order_id (in-memory workorder lifetime), two distinct canonical WORKER_FAILED events for one logica
EV: `~/workspace/evidence-binding.md` (findings 1-2, branch feature/orca-autonomy @ 0b8acadfc).
ACC: a restarted swarm never double-executes a logical task (idempotent work-order identity across restarts).

## opt-developer-api-ecosystem
HARVEST P3 [FUTURE BUSINESS OPTIONALITY **STATUS:** HARVEST **PRIORITY:** 3] opt developer api ecosystem
WHY: The `ping-gateway-exterior-agent-integration` goal exists; the 8080 deployment lane owns the gateway. But exterior surfaces are currently unauthenticated in places (SEC-001/SEC-002, TEN-001 caller-asserted namespaces, TEN-003 principal loss across hops: `req.authenticatedAgent` consumed by almost nothing). No developer
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` TEN-001/002/003, SEC-001/002; `~/workspace/FAILURE_LEDGER.md` FL-20260921-231 (deployment lane owns 8080).
ACC: exterior API with authenticated principals bound into event metadata; tenant isolation proven by the authorized cross-principal bleed falsification test.

## perf-no-latency-slos
OPEN P1 [PERFORMANCE **STATUS:** OPEN **PRIORITY:** 1] perf no latency slos
WHY: No measured numbers exist for URL->presence latency, crawl latency, proceduralization time, SiteSpec generation time, render latency, Ask FYD latency, or mobile performance. The five must-win metrics name performance but it is uninstrumented; "measure mobile, contact, services, performance, and trust before fixing the 
EV: memory 2026-09-21#L1462; memory 2026-09-21#L1033.
ACC: per-stage latency table for both demo tenants, published as a dated artifact; budgets set from the table, not from aspiration.

## perf-intelligence-budget
PROVE P2 [PERFORMANCE **STATUS:** PROVE **PRIORITY:** 2] perf intelligence budget
WHY: Goal: generous intelligence where it earns value, not unnecessary LLM calls. Positive evidence: Ask FYD's topic-gating fails closed instead of spending inference on filler; the proceduralizer's source-coverage diagnostic is deterministic (memory 2026-09-21#L681). Negative evidence: Meta AI duplicate verification load w
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-001; memory 2026-09-21#L681.
ACC: an intelligence-spend ledger per lane (calls, cost driver, value earned); duplicate-verification rate trending down via the content-addressed cache.

## perf-mobile-first-proof
OPEN P2 [PERFORMANCE **STATUS:** OPEN **PRIORITY:** 2] perf mobile first proof
WHY: Mobile is a must-win metric and the renderer has two open mobile defects: Happy Place/Coppersmith hero clipping at 375x812 (FL-20260921-033, root cause narrowed to composed-page intrinsic-width interaction; headless Chrome clamps layout viewport to 500px minimum on Windows per FL-20260921-SITE3, which contaminates mobi
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-033 (+diagnosis update), FL-20260921-031 (OPEN), FL-20260921-SITE3.
ACC: both tenants render clean at 375x812 with a proof method that accounts for the 500px headless clamp (real device or corrected viewport).

## perf-incremental-refresh-cache
OPEN P3 [PERFORMANCE **STATUS:** OPEN **PRIORITY:** 3] perf incremental refresh cache
WHY: Incremental refresh, cache hit rates, and verification caching are unmeasured. The source-change pipeline is specified (SOURCE T2 -> OBJECT DIFF -> DEPENDENCY IMPACT -> GENERATED BASE UPDATE -> REAPPLY OWNER OVERRIDES -> VALIDATE -> RENDER, 2026-09-22 invariants) but its refresh latency and override-preservation are un
EV: `MEMORY.md` FYD architecture invariants (2026-09-22); memory 2026-09-21#L1492.
ACC: measured refresh latency for a source change with owner overrides preserved; cache hit rates reported.

## cost-verification-cache
OPEN P2 [COST **STATUS:** OPEN **PRIORITY:** 2] cost verification cache
WHY: Meta AI duplicate verification load was 63-72% in audited rounds (13/18, 13/22, 12/19 duplicates). A content-addressed verification cache would cut most of it. This is the largest measured intelligence-cost sink.
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-001.
ACC: duplicate verification rate measured per round and trending down after the cache lands.

## cost-artifact-hygiene
OPEN P3 [COST **STATUS:** OPEN **PRIORITY:** 3] cost artifact hygiene
WHY: Measured dead weight: `~/workspace/tmp-diag/` ~706 MB completed diagnostics (COST-002); paused voice venv ~434 MB (COST-003); generated orchestration artifacts ~104 MB dated 2026-07-21 (COST-005); PING content inbox ~56 MB rejected generations (COST-006). Cleanup is authorized only with ownership proven; the tmp-diag a
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-002/003/005/006.
ACC: each set either deleted with ownership evidence or explicitly retained with a reason; no silent accumulation.

## cost-idle-fleet-ownership
DEFERRED P3 [COST **STATUS:** DEFERRED **PRIORITY:** 3] cost idle fleet ownership
WHY: ~10-container Pig fleet mostly idle with duplicated brain-*/ping-* data services (COST-004). The audit deliberately withheld the shutdown recommendation: shutting down shared services is destructive and hard to reverse without proven ownership and need. Do not delete merely because something looks unused; ownership fir
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` COST-004; `~/workspace/FAILURE_LEDGER.md` FL-20260919-RCA-008 (surgical order: active writer proven and contained, zero leak, no migration target)
ACC: ownership proven per container before any shutdown; shared data services never stopped without a migration target.

## cost-media-cache-rights
PROVE P2 [COST **STATUS:** PROVE **PRIORITY:** 2] cost media cache rights
WHY: FYD media architecture: download + digest + derivative, hotlink as fallback only; downloaded bytes are NOT canonical business truth; the media record answers where-from/when-observed/what-bytes; never imply copyright ownership by caching; unclear provenance = retain reference only, never silent republish (2026-09-22 ha
EV: `MEMORY.md` FYD harvest directive media decision (2026-09-22); memory 2026-09-21#L1148 (logo ingestion verified, webp derivatives on disk).
ACC: every cached derivative carries source URL + observed_at + digest + rights classification; junk-source captures (Google sign-in page) rejected by visual verification.

## local-first-desktop-vision
DEFERRED P3 [LOCAL-FIRST/DESKTOP **STATUS:** DEFERRED **PRIORITY:** 3] local first desktop vision
WHY: Future Windows product named in the lane framing: Identity Vault, Object Store, Relationship Graph, Private Context, Feed Projection, Capability Runtime, Agent Runtime, protocol adapters. No memory evidence of Tauri/WebView2 selection or key-custody design beyond the dev-key-custody check. Track only; no build authoriz
EV: task lane framing (vision component list); `~/workspace/FAILURE_LEDGER.md` FL-20260921-016 (dev-key-custody git-ignored check); memory 2026-09-19#L1743 (`ping-vault` container unhealthy, root cause un
ACC: deferred; a Tauri/WebView2/key-custody decision appears only when the product needs it.

## local-key-custody-hygiene
OPEN P2 [LOCAL-FIRST/DESKTOP **STATUS:** OPEN **PRIORITY:** 2] local key custody hygiene
WHY: Key custody is already load-bearing: Bearer tokens resolved at runtime from the ping-gateway container env, never stored (tandem); rotation record shows 4 distinct historical PG passwords and SCRAM-verifier comparison done in-memory, never in argv (FL-20260920-022 rotation record). But `ping-vault` is unhealthy with un
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260920-022 + rotation record (2026-09-21); memory 2026-09-19#L1743.
ACC: vault healthy or formally decommissioned; no live credential reachable via a second stale copy.

## search-qdrant-truthfulness
OPEN P1 [SEARCH/KNOWLEDGE **STATUS:** OPEN **PRIORITY:** 1] search qdrant truthfulness
WHY: Semantic search is down: Qdrant unreachable from the gateway (Docker Desktop host port-forward reset every HTTP request; later `ping-qdrant` unhealthy, root cause undiagnosed); embedding init wrapped in try/catch -> null. Current "hybrid search" is PostgreSQL keyword search wearing a hybrid label (P1 names-overclaim-me
EV: `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` PERS-001; `~/workspace/FAILURE_LEDGER.md` FL-20260919-005 (HEALED on Pig dev gateway via docker restart — Oracle was never affected, a different i
ACC: `/health` reports qdrant+embedding healthy from the deployed gateway's network namespace; or the "hybrid" label is removed everywhere.

## search-postgres-fallback-honesty
DONE_VERIFIED P2 [SEARCH/KNOWLEDGE **STATUS:** DONE_VERIFIED **PRIORITY:** 2] search postgres fallback honesty
WHY: Until Qdrant is healthy, Postgres keyword search is the honest fallback — labeled as keyword search, not hybrid. The 2026-09-13 read-only probes proved the working surface: POST /knowledge/search (keyword works), GET /knowledge/nodes filterable, event traversal L1 (EAB 8-deep chain). Lesson: presented truth must equal 
EV: memory 2026-09-13#L725 (read-only live probes: 1,875 events, knowledge graph 134 nodes all candidate, 0 edges; semanticHits 0).
ACC: every search surface states its actual mechanism; no "semantic" claim without vectors.

## search-knowledge-graph-edges
OPEN P2 [SEARCH/KNOWLEDGE **STATUS:** OPEN **PRIORITY:** 2] search knowledge graph edges
WHY: The knowledge graph has 134 nodes, 0 edges, all status candidate; KnowledgePromoter is wired but zero approval inputs have ever arrived (all 68 nodes remain candidate per the audit). The compiler pipeline (raw -> snapshot -> artifact -> evidence -> observation -> fact -> claim -> relationship -> knowledge object -> ver
EV: memory 2026-09-13#L725; `~/workspace/PING_BEYOND_BACKLOG_AUDIT_2026-09-19.md` LOOP-002 (approval path complete and idle; approval genuinely affects ranking when present).
ACC: first non-test relationship edge materialized with evidence; first approval promotes a node out of candidate.

## search-ask-fyd-retrieval-gaps
OPEN P2 [SEARCH/KNOWLEDGE **STATUS:** OPEN **PRIORITY:** 2] search ask fyd retrieval gaps
WHY: Ask FYD retrieval is evidence-bounded with per-claim classes (FL-20260921-232 CLOSED), but residuals remain: GENERIC_WORDS topic stoplist is heuristic; contact/location/review branches are not topic-gated (surgical scope). Ask FYD must answer UNKNOWN when evidence is insufficient and must never fill from model priors. 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-232 (residuals noted); memory 2026-09-21#L681 (proceduralizer coverage diagnostic); `MEMORY.md` ask-fyd-evidence-gap (ask-fyd-evidence-gap.md in fyd-lane).
ACC: all branches topic-gated or explicitly classified heuristic; 20-question visitor test (ask-fyd-usefulness-external) with zero filler.

## search-object-relationship-evidence
PROVE P2 [SEARCH/KNOWLEDGE **STATUS:** PROVE **PRIORITY:** 2] search object relationship evidence
WHY: Object search, relationship search, and evidence search must all read the one canonical model. Current state: Circle/ObjectView read hardcoded fixtures (FL-20260921-233 OPEN) while Ask FYD and pages read the PING-backed projection — the same divergence that would corrupt all three search surfaces. Related Circles must 
EV: `~/workspace/FAILURE_LEDGER.md` FL-20260921-233; memory 2026-09-22#L355.
ACC: object/relationship/evidence search return identical business facts as the page, Circle, and Ask FYD for both demo tenants.