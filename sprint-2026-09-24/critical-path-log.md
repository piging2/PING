# Critical path log

## Recompute: 2026-09-24 ~20:15 MDT (H2) — Nolan's redirect integrated

Trigger: SPRINT-PLAN.md (Nolan 18:31 MDT) replaces lane queues with the 18-item gap list.
Sequencing is now safety -> arrows -> UX -> reliability -> cleanup. Charter hour plan, gates
(H4/H7/H11), hard freeze, scoreboard, and escalation rules still stand.

### Position
- H0-1: edges green (20/20 on :3101). H4 gate passed early.
- Arrows: 9/18 green (2-10 on :3101 scratch). Arrow 1 partial, 11-18 unproven.
- In flight: gallery part-2 writer (site-client ctx.galleryMedia). Bounded; on completion the
  H4-7 polish phase ENDS and capacity pivots to Queue 1 per the sequencing.
- Both H1 falsifier reports invalidated (phantom tree); replaced with direct coordinator
  verification that is stronger than the falsifiers' claims.

### Critical path (safety first)
1. **NOW-5 / Ask FYD field-level privacy gate** (Queue 1, item 1) — LONGEST POLE. Ask FYD is an
   untested second mouth on the same data the renderer already gates. Requires hidden-field
   fixture + public/owner viewer proof across traversal, Ask, search, citations. Directly
   addresses the OPEN TD-002 street-address leak. Port the FYD-Q2 renderer pattern; do not invent
   a new privacy framework (hard freeze).
2. **NOW-8 / changed-source regeneration fixture** (Queue 2, item 9) — LONGEST ARROW POLE.
   Owner-intent survival is the demo's deepest claim and is fully unproven. v1 -> customize ->
   v2 regen -> assert preserved + diff explains; second run idempotent.
3. **NOW-4 / structured generation binding validation** (Queue 2, item 10) — IN_PROGRESS, owner
   unknown. Must locate the owner and land it; injected unsupported claim must fail. If the owner
   cannot be located by H7, the coordinator takes it over rather than letting it drift.
4. Demo integration (hour-24 beats): safety proofs 1-6 + arrow proofs 7-10 evidenced.

### Parallelizable quick wins (do not block the critical path; one writer per unit)
- NOW-3 (dangling evidence_ref -> fail closed): one test. Same ask-pipeline unit as NOW-5 tests;
  sequence after NOW-5's test scaffolding lands to avoid writer collision.
- Task #1 (DEMO_SYNTHETIC): labeling exists; tests + 1 fixture regression.
- NOW-2/HPP: same live ask proof as Coppersmith, one curl + formalization note.
- NOW-1 formalization: mechanics proven; write the minimum contract (doc + validation, no new system).
- NOW-9 (wrong-journal): gateway unit, independent of ask pipeline; parallelizable.
- FYD-028 (wake lock): Pig Windows operational; parallelizable; charter-compliant form (per-run only).

### Blocked / investigate-before-work
- Task #15 (transition-table): determine target store ownership FIRST. If it is the outreach
  engine's status-store, this becomes coordinate-only (redirect: never write there). Do not assign
  a writer until ownership is confirmed.
- NOW-6, G1-G8, O1-O20, 300-row freeze: NOT-IN. No capacity.

### Changed plan
- Gallery part-2 completes the H4-7 phase; no further TRADESMAN polish after it. The three
  candidate follow-ups from coverage (SocialProof emission, per-card media, links_to inertness)
  are BACKLOGED — they are not in the 18-item gap list and the NOT-IN-adjacent polish rule
  ("do not polish before the underlying arrows are proven") keeps them out.
- :3101 rebuild (to make gallery visible) deferred to the H7 gate, when the three-way comparison
  needs a fresh build anyway. Current :3101 build (H4 20/20) stays untouched.
- Next recompute: H4 boundary ~22:15 MDT, with the H4 parent report.

### Risks
- NOW-5 may expose a real Ask privacy hole (TD-002 is already open on the live path). If the
  privacy gate fails, it becomes the P0 fix and preempts the arrows queue per sequencing.
- NOW-8 has no existing scaffold; if the regen fixture proves the pipeline cannot preserve
  customization, that is a broken arrow finding, not a failure — report it as such and timebox
  the fix attempt.

## Recompute: 2026-09-24 ~20:35 MDT (H2.5) — FINAL EXECUTION ORDER integrated

Trigger: Nolan's FINAL EXECUTION ORDER (~18:33 MDT). SPRINT-PLAN.md SUPERSEDED.
WORK-QUEUE.jsonl (26 items) is the work authority. Capacity 70/20/10. Deliverable:
FYD-24H-PRODUCT-PROOF.md (filled with current per-arrow state; binary readiness currently NO,
first broken arrow Q-P0-01).

### Corrections to queue evidence
- Q-J-04's evidence cites the invalidated H1 falsifier verdict. Coordinator direct verification
  supersedes it: acquisition mechanics proven (raw bytes -> @graph extraction -> regression 2/2
  -> projection with digests). Remaining: formalize the minimum contract.
- SPRINT-PLAN items Task #15 (transition-table), #19 (chips), #2 (demo chrome), #10 (review
  card), #5 (audit events), #20 (gateway healthcheck), #7 (env lint) do not appear in
  WORK-QUEUE.jsonl (deduped as KNOWN_PERMANENT/RESOLVED/SUPERSEDED per the order). Not pursued.

### Execution order (first-broken-arrow; do not skip)
1. Q-P0-01 Ask privacy gate (FIRST BROKEN ARROW). Scoped: visitor-answer.ts:184 calls
   applyFieldVisibility(graph, []) — empty decisions; conservative default table coarsens
   address-bearing fields, shows everything else. The probe: hidden-field fixture, public
   viewer asks across traversal/Ask/search/citations -> zero disclosure; owner viewer ->
   disclosed. If the probe finds a hole, fix preempts everything.
2. Q-P0-02 claim binding (dangling-ref + injection probes). Sequence after Q-P0-01's test
   scaffolding (same ask-pipeline unit; one writer at a time).
3. Q-P0-04 wrong-journal guard (gateway unit; parallelizable with 1-2).
4. Q-P0-06 tenant isolation matrix (5 OPEN). Q-P0-03 and Q-P0-05 are lane-owned
   (write-boundary, gateway); coordinator tracks via evidence, does not duplicate.
5. Q-J-01/02/03 width matrix 320/360/375/390/430 (IN_PROGRESS; 375 proven).
6. Q-J-04 contract formalization (mechanics proven; write the minimum contract).
7. Q-J-06 HPP service proof (one live ask + formalization). Q-J-05 five-class proof.
8. Q-J-07 owner loop ('Move emergency plumbing first'; depends on Q-P0-03).
9. Q-J-08 regen fixture (depends on Q-J-07, Q-J-04).

### Falsification lane (20%)
Q-F-02 (XSS/URL hostile suite; carries the known-open javascript: href sink) leads; Q-F-01
(SSRF integrated seam), Q-F-04 (demo honesty), Q-F-03 (ORCA chaos; reaper needs Nolan's
word), Q-F-05 (wake lock). No falsification writer touches the ask-pipeline or generator
while product writers are active there.

### Harvest lane (10%)
Q-H-01 read/falsify/harvest only. Escalate only on P0.

### What stops
- Gallery part-2 writer (in flight): on completion, H4-7 phase ENDS. No SocialProof emission,
  no per-card media, no links_to work — not in the 26.
- :3101 rebuild deferred to H7 (three-way comparison needs a fresh build). Current build
  (H4 20/20) untouched.
- Next recompute: H4 boundary ~22:15 MDT with the H4 parent report.

## Recompute: 2026-09-24 ~19:15 MDT (H1) — Master deliverable + compiler directive absorbed

Triggers: MASTER-EXECUTION-DELIVERABLE.md (~18:41, 77 sections + priority rationale)
and NEVER-DONE-PRODUCT-COMPILER-DIRECTIVE.md (~18:43, continuation). Delta supplements
written: [master-deliverable-deltas.md](sandbox://workspace/sprint-2026-09-24/master-deliverable-deltas.md),
[never-done-compiler-deltas.md](sandbox://workspace/sprint-2026-09-24/never-done-compiler-deltas.md).
Execution graph stands; law added: hour 24 is a checkpoint, not the product.

### Orders changed
1. **Edge REOPENED** (was H4 green at ~18:52). Nolan's final order rules the earlier
   20/20 green was measured against narrower criteria. Pass definition is now the
   real-path doorway: graph -> eligibility -> contextual selection -> projection ->
   MarginObjectLayer -> browser WITHOUT objectDebug=1, completing tap -> expand ->
   typed info -> relationship (correct direction) -> related object -> Ask
   (object-scoped) -> evidence -> action -> back -> exact context. FYD-24H-PRODUCT-PROOF.md
   arrows 1-3 reclassified REOPENED. Trace writer dispatched ~19:15 MDT; Q-J-01
   next_test rewritten (real-path doorway proof + deterministic packer semantics).
2. **Integration debt law** in force: test-green != product. All reports now record
   integration state (lane-local/staged/committed-unmerged/merged/running-in-product).
   Debt ledger: Ask FYD lane 179 tests green (uncommitted), 8 staged lane-d-impl
   commits, acquireUrl 58/58 hostile (unintegrated), idempotency tip d6c1b05d,
   fyd/edge-port unmerged, TenantOS wave branches unmerged. No new feature branches
   without a convergence slot.
3. **Q-H-01 bounded sensor**: daily git ingestion = sensor lane feeding TESTED
   RECOMMENDATIONS only; harvest manifest required; novelty must not preempt
   convergence. Ecosystem signals (patterns not copies): OpenPage, Object UI,
   Tambo, VoxelSite.
4. **Never-done operating rule** on all worker briefs: green gate -> record ->
   advance frontier; every worker ends with VERIFIED FRONTIER / FIRST BROKEN
   BOUNDARY / NEXT HIGHEST-LEVERAGE TEST and runs it if safe/authorized/reversible/
   in-scope. Real-user readiness still NO; binary first broken arrow stays Q-P0-01.

### Critical path (safety first, unchanged priority law)
1. Q-P0-01 privacy fix writer (in flight, 4 leaks; acceptance includes 11/11 probe,
   full Ask 169/169, proceduralize 107/107, tsc clean, no :3100).
2. Q-J-01 edge real-path trace writer (dispatched ~19:15 MDT): diagnose live :3101
   first, then fix in source; deterministic eligibility + packer per directive;
   rebuild :3101 at H7 unless blocking.
3. Q-P0-02..06, Q-F-01..05, Q-H-01 continue in capacity split 70/20/10.
- Never-done metric tracked from now: time-to-"FYD already understands my business"
  (T0..T7). Primary frontier after safety: edge doorway chain.

## Recompute: 2026-09-24 ~19:35 MDT — Nolan's two binding corrections

1. **Object positioning corrected** (supersedes compact-pack framing): LESS compact,
   LESS clustered; very far apart fine; anchored near contextual page sections at
   extreme margins; FIXED with page-anchored feel (scroll moves them out of view,
   not viewport-glued chips); prettier; center untouched. Correction sent to the
   Q-J-01 trace writer (~19:30 MDT, pending application); recorded in
   FYD-24H-PRODUCT-PROOF.md, WORK-QUEUE.jsonl Q-J-01, never-done-compiler-deltas.md.
   Section-contextual placement and deterministic eligibility stay.

2. **PING site improvement = committed sprint item Q-P1-03** (queue now 27 items).
   Nolan asked four times; 2026-09-24 ~18:47 binding: visible, demonstrable
   improvement inside this sprint, improvement plan + before/after evidence in the
   proof doc, no quiet deferral. Per section 27/H21: ingest current PING presence
   (root / of /home/nolan/projects/ping, hand-built "PING: Continuity
   infrastructure for AI agents") as a customer of the canonical factory ->
   private preview -> critics. Improvement writer dispatched ~19:35 MDT. Rules:
   no :3100 touch, no publish, read-only on the production tree, outputs to
   sprint-2026-09-24/ping-site/, no PING-specific renderer, generic gaps reported
   (not self-fixed) with minimal repro. Proof doc carries the committed section
   with before/after slots.

### Critical path update
1. Q-P0-01 privacy: fix writer COMPLETE lane-local (11/11 probe, 169/169 Ask,
   107/107 proceduralize, tsc clean). Owner-viewer half of invariant OPEN
   (publicGraphOf hardcodes [] decisions) — Q-P0-01 cannot go fully green yet.
2. Q-J-01 edge real-path: trace writer running with corrected positioning brief.
3. Q-P1-03 PING site: improvement writer dispatched; before/after evidence due in
   proof doc before H24.
- :3101 build predates all current source work; H7 rebuild decision pending.

## Recompute: 2026-09-24 ~19:45 MDT — FYD convergence mode + continuous convergence order

Triggers: FYD-CONVERGENCE-MODE.md (~18:48) + CONTINUOUS-CONVERGENCE-ORDER.md (~18:49,
73 sections). Supplements: convergence-mode-deltas.md, continuous-convergence-deltas.md.
Clock NOT restarted; queue NOT replaced (now 32 items: 26 + Q-P1-03 + Q-I-52..56).

### Orders changed
1. **No new lanes/branches** until integration throughput catches up. Q-P1-03 PING-site
   writer HELD -> BLOCKED behind Q-I-52..56 (committed, tracked, dogfood through the
   integrated compiler). Running Q-J-01 trace writer continues (pre-convergence lane);
   its output feeds Q-I-55.
2. **P0 = converge 52–56**, smallest valid delta each, no blind merge, no wiping dirty
   work, no architecture rewrite; authority collisions resolved by choosing one
   authority + harvesting loser's tests. Bar: merged + canonical test green + real
   product path green + replay/proof.
3. **Object scroll final**: sticky within bounded content region (in-flow entry ->
   contextual sticky -> full exit with region); no HUD; spaced; premium native;
   progressive disclosure (no provenance dump on default surface). Sent to trace
   writer (~19:40 MDT, pending application).
4. **Dev entrypoint done**: /home/nolan/fyd-dev-ready.sh (read-only, verified): FYD DEV
   READY + Happy Place/Coppersmith routes + Ask API route presence + projection source
   + HEAD SHAs (projects/ping e474c89b/fyd-factory; build-edge-port 243fb120/fyd/edge-port).
   :3100 UP, :3101 UP.
5. **Read-only convergence pass dispatched** (~19:50 MDT): classify old claims
   CURRENT/SUPERSEDED/REGRESSED/UNMERGED/DORMANT/LIVE/UNKNOWN across worktrees,
   branches, dirty state, containers, :3100, gateway, tests, deployment provenance,
   queue, proof doc, authorities, acquisition, git ingestion, PING/FYD models,
   TenantOS seams, ORCA. Includes EDGE DONOR SEARCH (~2 days back; reuse mechanism,
   don't rebuild). No patching during the pass.
6. **Integrate continuously** per semantic unit; H22 = harvest gate, not first
   integration. Successor frontier ordered and queued (evidence freshness -> Why This
   -> regen provenance -> determinism -> rel vocabulary -> dropped rels -> entity
   resolution -> acquisition -> Ask -> projection policy -> SiteSpec validation ->
   read model -> URL safety -> FYD-037 -> transition table -> citations -> PING
   arch -> TenantOS -> git -> infra -> Copilot -> 1002 cull). Nothing dispatched.
7. Phone checkpoint stays exactly one; escalation narrow; re-resolve old "your call"
   items against current evidence before escalating.

### Critical path
1. Read-only pass (in flight) -> donor findings -> trace writer -> Q-I-55 input.
2. Q-I-52 Ask convergence (carries lane-local P0-01 privacy fix; owner-viewer half open).
3. Q-I-53/54/56 per protocol after reobservation.
- CEO metric: verified capabilities in ONE running FYD product. Next report uses
  Nolan's INTEGRATED HEAD format.

## Addendum: 2026-09-24 ~19:55 MDT — Q-J-01 trace writer completed

Edge real-path trace writer (f63491e2) completed. Addendum received: Windows-side
`playwright-core` exists at `C:/Users/nolan/node_modules/playwright-core` on the Pig,
usable by the portable Windows node
(`C:/Users/nolan/.local/share/pigi/node-v22.23.2-win-x64/node.exe`) for the delegated
375x812 rendered doorway proof. This is the sanctioned path for the H4/mobile real-path
doorway proof (Q-I-55 "real product path green" evidence). Full trace findings feed
the Q-I-55 smallest-valid-delta integration input.
Still running: read-only convergence pass reader (e5d74b53) — donor search + claim
classification.

## Recompute: 2026-09-24 ~19:55 MDT — read-only convergence pass complete + coordinator reobservation

Source: convergence-pass-2026-09-24.md (reader) + coordinator's own reobservation.
Classifications accepted unless noted.

### Accepted classifications
- 52 lane-e-ask: CURRENT (8 modified files uncommitted, detached worktree; "179 tests"
  report-only, not re-verified). 53 "8 staged commits": UNKNOWN as commits — no
  lane-d-impl branch exists; actual source is /home/nolan/workspace/lane-d/ Sep-21
  patch scripts + staging/ tree (src/fyd/customize/*, owner-mode, customize API route).
  54 acquireUrl: CURRENT as unintegrated (no code in any tree). 55 fyd/edge-port:
  CURRENT (2 commits unmerged + 9 dirty files: 6 gallery + 3 P0-01 privacy + probe;
  trace writer made no source changes). 56 d6c1b05d: tip CURRENT; "deployed file-wise"
  SUPERSEDED by 18:07 :3100 restart. TenantOS 10 branches: DORMANT (Wave-3 freeze).
  Template/HPP/builder: DORMANT (template-001-hpp-clone @ e4819ce8 clean). H4 20/20
  edge: SUPERSEDED by 18:47 positioning. Gateway: LIVE (repair-cert-20260924, digest
  pinned, ~1h). Falsifier invalidations: CURRENT. UNKNOWN/HOLD reaper "your call":
  RESOLVED by Nolan's 11:08 locked decision (no escalation). H21 stays HELD.

### Coordinator corrections to the pass
- Reader's "Q-P0-01 privacy fix at /home/nolan/ping p1/tenant-spoof-ingress-fix" is a
  MISCLASSIFICATION: that branch's 5 modified files are Python runtime workers
  (qdrant_projection_worker etc.), unrelated to the Ask FYD TypeScript privacy fix.
  The real P0-01 fix is in build-edge-port/fyd/edge-port (field-visibility.ts,
  ask-composer.ts, field-visibility tests + probe). Corrected in queue evidence.
- :3100 "serves pure HEAD": REGRESSED as a verifiable claim. Served tree now has 19
  modified + 25 untracked files, including src/app/page.tsx (PING root), layout,
  middleware, site-header, owner-mode/gate.ts, media manifests. The RUNNING build is
  still the clean .next (BUILD_ID HFAN1gTqjafnSp9tnZg5x; `next start` does not rebuild),
  so the serving surface is likely unaffected — but the boundary is now procedural:
  NOBODY runs `next build` in this tree, or the dirty sources bake in. src/lib/secrets/
  is a code module (secret-broker.ts + tests), not leaked material.

### Edge donor (found, recoverable)
fyd-frontier-mobile-objects: 1265aa15 (mobile object experience prove+fix:
object-overlay.tsx +249, renderer.tsx +113, mobile-objects.test.ts 224 lines) and
1d05f7fd (open-full-object bypasses overlay interception). Already ported into
fyd/edge-port (ancestor YES); fragment copy at /home/nolan/workspace/mobile-objects-lane.
Donor commits are from today (earlier granular history squashed into 4d0ddf7b).
55 integration: harvest overlay/bypass mechanics WITHOUT reverting 18:47 positioning.

### Windows playwright-core (from trace writer addendum)
C:/Users/nolan/node_modules/playwright-core + portable node — sanctioned path for the
delegated 375x812 rendered doorway proof (55 "real product path green").

### Next highest-leverage test
Q-P0-01 hostile privacy gate rerun in build-edge-port (probe + full Ask suite),
in flight ~19:55 to confirm still green after concurrent tree work. Then: 52
integration (carries P0-01 delta), 53 sourcing from lane-d/staging, 54/56, 55.

## Recompute: 2026-09-24 ~19:55 MDT — CEO decisions locked and folded in

Nolan locked binding CEO decisions (~18:53 MDT; full text in ~/AGENTS.md "CEO
decisions, FYD 24h sprint"; highlights in ~/MEMORY.md). They SUPERSEDE the
question backlog. No design question batches to Nolan during the sprint.

### Folded into sprint state
- Queue updates (5 items): Q-P1-03 += first-interaction acceptance (URL -> under-
  standing -> generated presence -> Ask FYD -> change by talking; private preview
  first, no publish). Q-P1-01 += media constraints (observed/authorized first;
  never generate fake storefronts/employees/jobs/products; missing media never
  blocks; provenance fields: source URL, digest, observed_at, type, provenance,
  transformation). Q-F-04 += attribution ("Built with FYD"; never "verified" when
  merely observed; OBSERVED/OWNER-CONFIRMED/VERIFIED/INFERRED/GENERATED distinct).
  Q-J-11 += factory operator-only until two-tenant + external-owner loop. Q-J-12
  += Monument View NO autonomous contact; prepare flow, wait for green journey.
- Proof doc: VERIFIED CUSTOMER JOURNEY header block now carries the priority stack
  (discoverability > contact/action > mobile usability > trust/factual accuracy >
  performance > visual novelty), the ugly-but-green rule, Ask evidence-boundedness,
  attribution, compiler framing, plumber UX.
- New record: ceo-decisions-deltas.md (all 20 decisions + where each landed +
  exact escalation gates).
- Checked: no Postgres rotation item in queue (no stale prose to suppress; the 4
  "rotation" mentions are benign). No new lanes; convergence mode already holds.
  Copilot YES/NO bounds recorded for the successor-frontier wiring-gap item.
  Owner claim ladder (DNS TXT > HTTPS well-known > domain email > Google OAuth
  optional) binds Q-I-53. Demo-owner mode on :3100 is the standing accepted
  instance (labeled, non-production). Post-24h bounded windows recorded.

### Defaults when uncertain (binding)
Reversible, provenance-preserving, owner-controlled, deterministic where possible,
AI-assisted where valuable, provider-independent, projection-based, easy to
delete or replace.

### Escalation gates (CEO, exact)
External contact, public publishing, money, destructive unknown-data deletion,
credential exposure/rotation ambiguity, irreversible migration, material
privacy/security change. Nothing else.
