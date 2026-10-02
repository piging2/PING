# Sprint baseline — H0 freeze (2026-09-24 ~18:15-18:45 MDT)

Coordinator: integration coordinator (subagent). Clock started ~18:15 MDT.

## Source state

- Main tree `/home/nolan/projects/ping`: HEAD `e474c89b` (fyd-g4), branch `fyd-factory`, DIRTY
  (uncommitted lane mods: package.json, build/[siteId]/page, globals.css, layout, page,
  architecture/hero-evidence-card, blueprint-grid, lenis-provider, scroll-reveal, site-header,
  fyd/boundary/jest.config.cjs, fyd/media/manifests/coppersmith-plumbing.json, ...).
  Served `.next` is pure HEAD + individually committed changes only (per 2026-09-24 recovery).
- Edge worktree `/home/nolan/build-edge-port`: `243fb120` on `fyd/edge-port`, CLEAN.
  Contains the 7-line doorway/aria patch, committed.
- Other worktrees: build-clean `b0cdc3b8`, build-edge-proof detached `e474c89b`,
  build-idem `d6c1b05d`, build-template1 `e4819ce8`, cohort2-pristine/fyd-dehpp-merge-proof/
  fyd-preview-wt/fyd-wave2-clean detached `e48ef710`, fyd-dehpp-wt `eb28d3aa`,
  h1clip-work `f7a5efe4`, ping-bcq-substrate `e48ef710`, ping-constitutional `a69bb68f`,
  ping-deploy-head `0dec40f5` detached. 15 worktrees total.

## Runtime state

- :3100 production: HEALTHY. pid 98122, pure HEAD served, NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1.
  Recovered ~18:02 MDT after ~16 min outage (broad pkill 17:46). BUILD_ID intact.
  Routes: /sites, /sites/coppersmith-plumbing, /sites/happy-place all 200.
  Tailnet 100.79.154.43:3100 verified 200 earlier.
- :3101 scratch: HEALTHY. pid 95701, fyd/edge-port @ 243fb120.
  /sites/coppersmith-plumbing 200. Exact-PID targeting only; no broad pkill.
- Gateway: `ping-gateway:repair-cert-20260924`, up ~51 min, unauthenticated POST /events -> 401.
  `ping-rc-gateway` (rc-4d522a6b) still on :18099 -> 401. `ping-gateway-prev` retained.
- Other containers: qdrant healthy, swarm02-pg/test-pg/gauntlet-pg/rc-postgres/ping-postgres/
  brain-postgres up, redis healthy, ollama up. ping-vault unhealthy (known HOLD, non-blocking).

## Test baseline

- Edge lane: 27/27 (src/fyd/edge/jest.config.cjs). FYD-Q2 hostile included.
- Ask lane: 158/158 (src/fyd/ask/jest.config.cjs) in edge-port tree.
- tsc --noEmit: clean (pre-sprint, edge-port).
- Next build: clean (pre-sprint, edge-port).
- Known failing suites: none in the sprint's lanes. Bare `npx jest` has no TS transform in this
  tree; the per-lane `jest.config.cjs` files are the sanctioned runners.

## Proof artifacts

- Edge hostile mobile proof: 20/20 (Coppersmith 15/15 + HPP expand/traverse/ask smoke),
  fresh headless Windows Chrome, 375x812, real touch. 10 screenshots in
  C:\Users\nolan\edge-proof\shots\ (01-midway through 08-hpp-ask + 99-error + view2).
- Report classification (CURRENT/SUPERSEDED/REGRESSED/UNKNOWN): delegated to reader subagent,
  landing in report-classification-h0.md.

## Journey arrow inventory (18 arrows, north-star order) — updated 19:05 MDT

1. paste/select business -> acquire source: PARTIAL (raw acquisition stored + documented
   2026-09-21; operator paste-URL UI path unproven — H18-20)
2. acquire -> evidence: GREEN (raw bytes -> extraction pipeline proven by regression-corpus
   test: phone extracted as DIRECT_FACT from real stored bytes, rerun 2026-09-24 2/2 pass)
3. evidence -> stable object graph: GREEN (fixture + projection with stable IDs, provenance,
   digests; dumped 2026-09-24 by dumper-1.2.1; served live)
4. graph -> TRADESMAN: GREEN (generator spec from graph; page renders 20 object markers live)
5. TRADESMAN -> beautiful mobile site: GREEN on :3101 (20/20: readable, no overflow, 44px targets)
6. site -> functional edge objects: GREEN on :3101 (20/20)
7. edge -> open object: GREEN on :3101
8. open -> traverse relationship: GREEN on :3101
9. traverse -> Ask FYD: GREEN on :3101 (live ask API verified: supported + citations)
10. Ask -> inspect why/evidence: GREEN on :3101 (citations resolve object -> provenance -> source URL)
11. owner requests change: UNPROVEN
12. change -> review: UNPROVEN
13. review -> approve: UNPROVEN
14. approve -> journal: UNPROVEN
15. journal -> regen: UNPROVEN
16. regen -> browser reflects change: UNPROVEN
17. source re-observed: UNPROVEN
18. owner intent survives: UNPROVEN

Scoreboard: end_to_end_arrows_green 9/18 (arrows 2-10 on :3101 scratch).

## First broken arrow

Arrows 1-4 (acquisition -> evidence -> graph -> TRADESMAN) are the earliest unproven segment
and the deepest objective's head. H1-4 plan: (a) re-run edge matrix to confirm H4 gate green
on current :3101; (b) trace the real Coppersmith acquisition->evidence->graph->SiteSpec path
and find the first link that does not mechanically resolve. That trace is the sprint's first
attack.

## Queues — WORK-QUEUE.jsonl (Nolan's FINAL EXECUTION ORDER 2026-09-24 ~18:33 MDT; work authority)

26 items, machine-readable. SPRINT-PLAN.md is SUPERSEDED. Order: Q-P0-01..06 safety preempts,
then Q-J-01..12 in arrow order, then P1/P2 (Q-P1-01/02), then falsification (Q-F-01..05),
then harvest (Q-H-01). Capacity: 70% FYD product critical path / 20% security-reliability
falsification / 10% harvest. Harvest lanes READ/FALSIFY/HARVEST only; rebalance only on P0.
NOT-IN: O1-O20 deep arch (watch only); 300-row freeze/status-store (outreach engine, coordinate
never write); NOW-6, G1-G8 (Nolan's call); charter HARD FREEZE list.

### SAFETY (Q-P0-01..06) — preempts everything
- Q-P0-01 PRIVACY / PUBLIC CLAIM ENFORCEMENT [P0, H conf]: Ask FYD field-level privacy gate.
  Invariant: public viewer cannot reach hidden address via traversal/Ask/search/citations/
  alternate projections; owner viewer can. Next: hostile traversal + Ask probe, both directions.
  STATUS: OPEN. FIRST BROKEN ARROW.
- Q-P0-02 EVIDENCE / WHY THIS [P0, H]: every public factual claim bound to evidence or
  classified GENERATED/OWNER-PROVIDED/DERIVED/UNKNOWN; dangling evidence_ref fails closed.
  Next: injected unsupported claim probe; dangling-ref answer marked unsupported.
  STATUS: OPEN (happy path proven live; injection/dangling unproven).
- Q-P0-03 APPROVAL->JOURNAL->PROJECTION; UNKNOWN EXTERNAL EFFECT [P0, M]: duplicate approval
  never double-applies; timeout != failed; UNKNOWN -> HOLD + RECONCILE, never blind retry.
  Evidence: write-boundary lane (d6c1b05d). Next: double-approval + killed-writer synthetic.
  STATUS: OPEN. (Lane-owned; coordinator tracks, does not duplicate.)
- Q-P0-04 APPROVAL->JOURNAL->PROJECTION [P0, H]: emit/dump to journal lacking overlay marker
  fails closed with typed WRONG_JOURNAL, zero writes. Gap reproduced 2026-09-23. Next:
  synthetic misconfigured gateway URL. STATUS: OPEN.
- Q-P0-05 SAFETY / SECRET LEAKAGE [P0, M]: zero secret values in logs/artifacts/argv/history;
  verdict-forgery rejected; zero unexpected journal/projection mutation. Prior incident:
  secrets printed into command output + docker argv. Next: rerun GATE-SECRET-001 with
  sanctioned injection + post-proof leakage audit. STATUS: OPEN.
- Q-P0-06 PRIVACY / PUBLIC CLAIM ENFORCEMENT [P0, M]: tenant isolation. Matrix 1 PASS, 5 OPEN,
  2 CONDITIONAL, 1 UNKNOWN. Bridge tenant-laundering repair scratch-proven, not integrated.
  Next: isolation matrix both directions, PING tenant + external owner tenant. STATUS: OPEN.

### JOURNEY (Q-J-01..12) — in arrow order
- Q-J-01 NORMAL MOBILE OBJECT DISCOVERY [P0, H]: IN_PROGRESS. 20/20 at 375x812 (243fb120).
  Next: width matrix 320/360/375/390/430 + automated visitor testing, then Nolan's bounded
  phone checkpoint.
- Q-J-02 OBJECT OPEN/CLOSE/BACK/FOCUS/SCROLL [P0, H]: IN_PROGRESS. Scroll 423->423, dialog
  contract, rotation preserved. Next: width matrix rotation + back-nav sweep.
- Q-J-03 RELATIONSHIP TRAVERSAL [P0, H]: IN_PROGRESS. 7 objects reachable; coverage inventory
  done. Next: H4 gate (done); full traversal proof stands.
- Q-J-04 SOURCE->ACQUISITION->EVIDENCE [P0, M]: OPEN. NOTE: queue evidence cites the
  invalidated falsifier verdict; coordinator direct verification proves the mechanics
  (raw bytes -> @graph extraction -> regression 2/2 -> projection with digests). Remaining:
  formalize the minimum contract; no second acquisition system. G2: identity = entity.
- Q-J-05 OBJECT-SCOPED ASK FYD [P1, M]: OPEN. Ask lane 179 tests green (lane-e-ask worktree,
  uncommitted). HPP Ask honest lack-of-evidence. Next: H11 gate, all five support classes +
  citation existence. Depends on Q-J-06, Q-J-04.
- Q-J-06 EVIDENCE / WHY THIS [P1, M]: OPEN. Coppersmith proven live (services + citations ->
  real URLs). Next: HPP service query; every binding resolves. Depends on Q-J-04.
- Q-J-07 OWNER CHANGE PROPOSAL; APPROVAL->JOURNAL->PROJECTION [P1, M]: OPEN. 8 commits staged
  in lane-d-impl. Scope: 'Move emergency plumbing first' SitePatch. Next: H13-16 owner loop;
  journal shows exactly one applied effect. Depends on Q-P0-03.
- Q-J-08 DURABLE REGENERATION; SOURCE REOBSERVATION; OWNER INTENT SURVIVAL [P1, M]: OPEN.
  NOW-8 fixture design exists. LOCK: ObjectGraph+OwnerState+SiteSpec+ViewerContext+
  RendererVersion -> deterministic semantic render. Next: H16 full cycle. Depends on
  Q-J-07, Q-J-04.
- Q-J-09 GENERICITY [P1, H]: OPEN (continuous). Invariant: customer-specific production
  branches = 0. Coordinator no-hardcode search 2026-09-24: PASS (0 branches). Next: grep
  audit after every material product change; H7 no-hardcode proof.
- Q-J-10 DETERMINISTIC ELIGIBILITY; RERUN AFTER MATERIAL CHANGE [P1, M]: OPEN. TRADESMAN
  shared impl in progress (H4-7 gallery work). Next: side-by-side after each material change;
  machine critics before human eyes. Depends on Q-J-08.
- Q-J-11 ONE-CLICK OPERATOR WRAPPER [P1, M]: BLOCKED. Depends on Q-J-01/03/05/07.
- Q-J-12 REAL BUSINESS OWNER TEST [P1, H]: BLOCKED. 8 deps. Monument View Coffee Shop owners
  authorized candidate, authorization-gated. Binary readiness gate.

### P1/P2
- Q-P1-01 OBJECT-SPECIFIC MEDIA [P1, M]: OPEN. Use PING media capability first
  (acquire->digest->provenance->derivatives->binding->delivery). Next: H7-9 proof.
- Q-P1-02 MOBILE COMPOSITION ALL WIDTHS [P1, H]: OPEN. 375x812 proven; matrix pending.
  Depends on Q-J-01.

### FALSIFICATION (20% capacity) (Q-F-01..05)
- Q-F-01 SSRF BOUNDARY [P1, H]: OPEN. acquireUrl hardened 58/58, not integrated. Next:
  hostile SSRF suite on the integrated seam.
- Q-F-02 XSS / URL HANDLING [P1, M]: OPEN. Public surfaces render owner/business content;
  untested adversarially. (Carries the known-open javascript: href sink, FL-20260921-032.)
  Next: XSS/URL hostile suite on public render surfaces.
- Q-F-03 UNKNOWN EXTERNAL EFFECT; DUPLICATE EFFECT [P1, H]: OPEN. ORCA second-effect risk
  reproduced; UNKNOWN/HOLD reaper contradiction needs Nolan's design word. Next: ORCA
  UNKNOWN/HOLD chaos + duplicate-effect attack synthetic.
- Q-F-04 NO FICTION / DEMO HONESTY [P1, H]: OPEN. HPP overlay must classify DEMO_SYNTHETIC;
  Ask cites demo additions as demo, never fact. Next: demo-classification tests + 1 fixture
  regression.
- Q-F-05 PER-RUN WAKE LOCK [P2, H]: OPEN. FYD-028: scoped per-run lock (keep-awake-start.sh
  decoupled). Next: powercfg /requests held during run, released after.

### HARVEST (10% capacity) (Q-H-01)
- Q-H-01 HARVEST ONLY [P3, H]: OPEN (continuous). TenantOS, Git ingestion, PING archaeology,
  builder harvest: READ/FALSIFY/TEST/HARVEST/DELETE-DUPLICATION/FIX-P0-P1 only. Escalate
  only on P0 discovery.

### Known-open findings carried (not in WORK-QUEUE; not lost)
- Pressure class 7: null/malformed fields CRASH or render invented copy ("About null").
- TD-002 street-address leak (OPEN, live Ask path) — feeds Q-P0-01.
- FL-20260924-201 tangential "supported" non-refusal (OPEN) — feeds Q-P0-02.
- Idempotency bound: exactly-once only under serialized dispatch or real per-op lock — feeds
  Q-P0-03.
- Gateway credential incident (secrets in command output/argv): containment pending — feeds Q-P0-05.

## Report classification (H0-1, 18 reports / last 48h)

Full file: report-classification-h0.md. Counts: CURRENT 14, SUPERSEDED 2, REGRESSED 1, UNKNOWN 1.
- REGRESSED: ":3100 serving pure HEAD e474c89b" (14:22 MDT claim). Precise current state:
  served .next is pure HEAD + individually committed changes only (per 2026-09-24 recovery
  procedure and CEO directive). The strict "pure HEAD" wording is what regressed, not the
  integrity posture. No uncommitted lane code is served.
- UNKNOWN: hide-unfeature live-browser viewport verification dispatched but never reported.
  Relevant to H11-13 privacy proof; treat as unproven.
- SUPERSEDED: four-frontier merge VERIFIED SUCCESS (HEAD moved past); W-CORRECT 09-23
  owner-loop proof replaced by landed dumper-1.2.1 E2E (2026-09-24), which remains the
  canonical owner-loop proof (approve -> journal -> regen -> served -> byte-identical revert).

## Merge-relevant finding (for H7 / coordinator evidence)

- :3100 (pure HEAD) served HTML contains ZERO edge markers (no fyd-edge-item,
  no data-fyd-object-id). :3101 (edge-port) has 20 data-fyd-object-id + 4 fyd-edge-item.
  The edge experience is absent from the served tree; merging edge-port is a real feature
  merge, not a no-op. Merge requires evidence that :3100's existing test surface
  (canonical 195/195, renderer tests) does not regress. NO MERGE yet per charter.

## No-hardcode search (H7 prep, 2026-09-24 ~19:15 MDT, edge-port @ 243fb120)

Searched src/ for customer-name mentions in product code (excluding __tests__ and JSON):
- `renderer.tsx:235`, `ask-fyd-widget.tsx:32`: "happy-place" appears only in comments as an
  example slug. Benign.
- `strategy-for-site.ts:33-36`: `STRATEGY_PINS = {"ping-fyd": "TECHNOLOGY",
  "coppersmith-plumbing": "TRADES"}`. Keyed operating parameter, NOT a render branch:
  owner intent overrides, unknown tenants fall through to `inferStrategy(graph)`, and
  inference derives TRADES from "Service objects + Location objects" (infer-strategy.ts:9,115)
  which matches Coppersmith's graph — the pin is redundant, not load-bearing.
- `fyd-tenant-graph.ts:55-56,104-105`: site-ID-keyed fixture graph map (data layer tenant routing).
- `preview/pipeline.ts:147`: `HOMEPAGE_CIRCLE_SITE_IDS` demo list. Config, not a branch.
- Zero `siteId ===` / `siteSlug ===` branches in `renderer.tsx` or `edge/client.ts`.
- Lineage/media/builder hits are tooling, fixtures, or comments.

VERDICT: no customer-specific template branches in the render path. Scoreboard
customer_specific_template_code stays 0.

- :3100 (pure HEAD) served HTML contains ZERO edge markers (no fyd-edge-item,
  no data-fyd-object-id). :3101 (edge-port) has 20 data-fyd-object-id + 4 fyd-edge-item.
  The edge experience is absent from the served tree; merging edge-port is a real feature
  merge, not a no-op. Merge requires evidence that :3100's existing test surface
  (canonical 195/195, renderer tests) does not regress. NO MERGE yet per charter.
