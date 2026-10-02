# FYD-24H-PRODUCT-PROOF.md

Sprint started 2026-09-24 ~18:15 MDT. Hour-24 checkpoint 2026-09-25 ~18:15 MDT, executed (see VERIFICATION BASIS).
This is THE deliverable. Work authority: WORK-QUEUE.jsonl (34 items).

VERIFICATION BASIS: this revision was compiled 2026-09-25 ~05:30 MDT from
recorded coordinator evidence (2026-09-24 ~19:44 to ~20:25 MDT) and the frozen
mobile proof (2026-09-24 ~20:10 MDT). UPDATE 2026-09-25 ~05:15 MDT: Pig SSH
recovered via the established pigwsl pattern (the earlier "unreachable"
readings were the direct-connect path failing, not the Pig). Live
re-verification completed: :3100 pid 10404 (cwd /home/nolan/projects/ping,
HTTP 200, NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 in live env, started Thu Sep 24
18:59:57, preserved); :3101 pid 26729 and :3102 pid 29835 (both cwd
/home/nolan/build-edge-port, HTTP 200); integration branch
fyd/sprint-integration-2026-09-24 @
6245af11ea8497683ce870c8e43921379fe6bb7d (exact canonical match); served
tree /home/nolan/build-edge-port @
fb520d799184c6bfacc8b6964b672f07b2591c5f (exact match); BUILD_ID
80gQ93GztEoYvvMHeCN0Y (exact match); zero dirty tracked files. Every claim
below carries its last-verified timestamp. Nothing here is asserted from
memory.

HOUR-24 CHECKPOINT 2026-09-25 ~18:15 MDT: single pig_ssh attempt executed.
SSH transport connected and authenticated, but the muse-ssh Windows user
context exposes no WSL distributions, so wsl -u nolan could not run and the
live re-verification batch did not execute. No restarts performed; :3102
untouched. Recorded-evidence basis stands; the freshest live Pig-side
verification remains the triage session 2026-09-25 ~15:47 MDT (see
TRIAGE-INTERIM-20260925.md).

WINDOW-1 2026-09-25 ~18:28 to ~18:45 MDT: Pig transport recovered via the
pigwsl pattern (the muse-ssh no-WSL reading does not apply to that path).
Live re-verification executed: :3100, :3101, :3102 all HTTP 200; branch
fyd/sprint-integration-2026-09-24 @ c93a7ced (Tracks A-H integrated past
6f2dd65e); worktree zero tracked modifications, so the documented 6f2dd65e
checkout restore was correctly skipped; npm run build GREEN (BUILD_EXIT=0);
:3100 restarted only via /home/nolan/start-3100.sh (pid 46786,
NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live in process env); :3101 (pid 62734)
and :3102 (pid 29835, frozen) untouched. Q-P0-04 synthetic PASS (see P0
SAFETY QUEUE). Full evidence in ~/memory/2026-09-25.md under FYD BOUNDED
AUTONOMOUS WINDOW 1.

## CEO METRIC: VERIFIED CAPABILITIES IN ONE RUNNING FYD PRODUCT

A capability counts only when: integrated, merged, canonical gate green,
running product green, replay/proof recorded.

**Count: 2.**

1. Ask FYD evidence-bounded Q&A. Integrated (unit 3 committed 3dfa164d on
   fyd/sprint-integration-2026-09-24). Canonical gates green: ask suite 190/190,
   Q-P0-01 hostile privacy gate green both directions, owner-direction 6/6,
   idempotency hammer 13/13. Running product green: live POST
   /api/fyd/ask/coppersmith-plumbing on :3101 returned supported answers with
   citations resolving to object IDs and the real source URL. Replay recorded:
   curl -X POST http://127.0.0.1:3101/api/fyd/ask/coppersmith-plumbing -H
   'Content-Type: application/json' -d '{"question":"What services do you offer?"}'.
   Last verified 2026-09-24 ~19:44 MDT.
2. Owner correction loop (proposal, approval, journal, regeneration, served
   change, readback, byte-identical restore). RUNNING-GREEN on :3101
   2026-09-24 ~20:25 MDT: parse 200, approve 200 (journal recorded), dump exit 0
   with digest MATCH, served page reflected the approved change, readback
   confirmed, clear 200 restored baseline byte-identically. Committed as
   6b49b0c6. Replay: the :3101 owner-loop sequence above.

Integrated-green but NOT counted (running-product proof not yet recorded):
write boundary (37c137ff: hostile 13/13, write-boundary 17/17, gateway dedupe
7/7, customize 94/94, tsc clean), acquireUrl SSRF seam (safe-fetch.ts 35/35;
hostile suite against the integrated seam pending, Q-F-01), claim gate
(c3b60e5f: 674 tests green across verifier-holes 11/11, render-path 8/8,
sitespec 100/100, builder 100/100, components 127/127, claim 44/44, ask 190/190,
customize 94/94, tsc clean). Edge real-path doorway: REOPENED, unproven.

Verified product properties (not capabilities under the bar, recorded because
they are real): mobile 5-width matrix 10/10 PASS (frozen :3102, 2026-09-24
~20:10 MDT); object-scroll/back restoration PASS (URL, scroll 600 to 600, focus
all restored exactly).

## INTEGRATED HEAD

- Branch: fyd/sprint-integration-2026-09-24
- Canonical HEAD: 6245af11ea8497683ce870c8e43921379fe6bb7d
  ("fix(fyd): cap ObjectDoorway pill at container width (320px overflow)",
  2026-09-24 20:03 MDT). Verified on Pig WSL 2026-09-24 ~20:04 MDT.
- Served tree for the frozen mobile surface: /home/nolan/build-edge-port @
  fb520d799184c6bfacc8b6964b672f07b2591c5f (product tree identical to the
  canonical revision; the only delta to 6b49b0c6 is the 2-line doorway fix).
  .next BUILD_ID 80gQ93GztEoYvvMHeCN0Y.
- Merge commits on the branch: 3dfa164d (Ask unit 3), 136bf9a6 (edge lane,
  no-ff, one import-hunk resolved as union), 37c137ff (write-boundary 7-commit
  chain, zero conflicts), 6b49b0c6 (owner-loop test_dump.py 7/7).
- Frozen surfaces: :3102 NOLAN VISUAL CHECK READY (mobile-fixed build, verified
  200, 2026-09-24 ~20:04 MDT); :3101 pre-fix integrated build (owner loop proven
  here); :3100 preserved pure-HEAD build, untouched.
- :3100 provenance regression (44 dirty files served since the 18:07 restart)
  was fixed honestly 2026-09-24 ~19:40 MDT: dirty work preserved in named stash
  fyd-sprint-2026-09-24-pre-purehead-dirty-state (662 paths, reversible), pure
  HEAD rebuilt from a clean worktree, restart only via /home/nolan/start-3100.sh.
  Last verified :3100 HTTP 200 2026-09-24 ~21:00 MDT.
- HOUR-24 DRIFT NOTE (not live re-verified at hour-24): the branch has advanced
  past 6245af11. Triage commit 6f2dd65e (16 files, tsc clean, NO PUSH) repaired
  the Q-C-01 call-site breakage that 89c7da78 committed 2026-09-25 10:26 MDT;
  8 risky files quarantined to stashed-lanes/. Tracks A through H completed
  2026-09-25 ~12:08 to ~12:35 MDT with commits 2b1965d8, 5fd6ffa7, ef479105,
  ae1002ad, 77d94ded, 4fc8bab1, d1d80088, d7c886a1, 717252b0, ac3c2eeb; tsc 0
  errors; full build was running ~12:35. Per the triage report the worktree
  currently holds 8 files checked out from stash for experiment 3 (not clean)
  and :3100 is serving the 24-file experimental build. Canonical HEAD, served
  tree, and BUILD_ID above are therefore stale until the next live verification.
- WINDOW-1 RESOLUTION 2026-09-25 ~18:45 MDT (live verified): canonical HEAD is
  now c93a7ced6161ffe2b103ddb506a7bf18a6aee15e (Tracks A-H commits integrated
  on top of the 6f2dd65e triage repair); worktree zero tracked modifications
  (only untracked build/media artifacts); npm run build GREEN (BUILD_EXIT=0);
  :3100 serving the fresh build (pid 46786), restarted only via
  /home/nolan/start-3100.sh with NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live in
  process env; :3101 (pid 62734) and :3102 (pid 29835, frozen) untouched, all
  HTTP 200. The 6245af11 / fb520d79 / 80gQ93GztEoYvvMHeCN0Y identities above
  are superseded; fresh build ID and served-tree commit to be recorded at the
  next checkpoint.

## INTEGRATION ARROWS 52-56 (coordinator report 2026-09-24 ~19:44 MDT)

- Q-I-52 ASK FYD: INTEGRATED-GREEN. Ask suite 190/190, hostile privacy/owner
  gates green, idempotency hammer 13/13. Q-P0-01 hostile gate GREEN both
  directions on the integrated branch (public-direction probes all PASS:
  4 leak paths through the real ask pipeline, hide traversal zero-disclosure,
  conflict suppression, per-binding evidence refs, 5 expansion paths,
  determinism; owner-direction 6/6 PASS: owner SHOW serves full address, visitor
  coarsened, principal separation with no shared cache keys, no
  cross-principal bleed, hide traversal drops family and rels while source keeps
  observations). Zero leaks, nothing patched. TD-002 street-address leak CLOSED
  by this fix.
- Q-I-53 OWNER/PROJECTION: RUNNING-GREEN. Full live loop on :3101 2026-09-24
  ~20:25 MDT (parse, approve, journal, dump digest MATCH, served change,
  readback, byte-identical restore). Unknown op kinds abort fail-closed.
  Main-journal overlay path correctly HOLDs at FYD-037 pre-flight.
- Q-I-54 ACQUIREURL: INTEGRATED. Canonical src/fyd/net/safe-fetch.ts,
  byte-identical across edge/idem trees, committed at HEAD. Suites 35/35 green
  (safe-fetch, budgets, rate-limit). Open: hostile suite against the integrated
  acquisition seam (Q-F-01).
- Q-I-55 EDGE: INTEGRATED-GREEN. Merged as 136bf9a6. Targeted 47/47, full
  ask and customize 211/211, edge 27/27, tsc clean, 18:47 positioning
  byte-intact, 22-dim edge checklist with zero patches. Open: real-path doorway
  proof (Q-J-01 trace writer dispatched 2026-09-24 ~19:15 MDT; no completion
  recorded).
- Q-I-56 WRITE BOUNDARY: INTEGRATED-GREEN. Merged as 37c137ff, zero conflicts.
  Hostile gate 13/13, write-boundary 17/17, gateway dedupe 7/7, customize 94/94,
  tsc clean. 22-dim unknown-effect covered, zero patches. Open: running-product
  proof on :3101.

Queue-file note: WORK-QUEUE.jsonl still shows 52-56 as IN_PROGRESS (read
2026-09-25 ~05:10 MDT). The coordinator's ~19:44 MDT terminal report above is
the fresher authority; the queue file needs a state-reconciliation pass.

## P0 SAFETY QUEUE

- Q-P0-01 privacy/public claim enforcement: GREEN (hostile gate both directions,
  see 52). TD-002 closed.
- Q-P0-02 evidence/why this: GREEN (claim gate c3b60e5f, 674 tests).
- Q-P0-03 approval to journal to projection, unknown external effect: GREEN
  (write-boundary lane merged as 37c137ff: hostile gate 13/13, write-boundary
  17/17, gateway dedupe 7/7, idempotency hammer 13/13; ORCA-side
  duplicate-effect attack tracked under Q-O-01).
- Q-P0-04 approval to journal to projection: GREEN (window-1 synthetic
  2026-09-25 ~18:37 MDT, evidence in ~/memory/2026-09-25.md). DUMP: dump.py
  happy-place with FYD_JOURNAL_GATEWAY_URL pointed at a fake markerless journal
  (HTTP 200, body {}, 127.0.0.1:18771) exited 2 with typed WRONG_JOURNAL and
  /home/nolan/ping/var/fyd-projections/ byte-identical before/after (sha256),
  zero POSTs to the fake journal. EMIT: emitOverlayEvent from the real
  src/fyd/customize/server.ts with FYD_CUSTOMIZE_GATEWAY_URL mispointed threw
  customize: WRONG_JOURNAL before any POST (fake journal log showed only
  GET /). Live demo journal gateway (127.0.0.1:18199) never written. First
  broken arrow is now Q-P0-05.
- Q-P0-05 secret leakage: OPEN, narrowed to one pre-existing item (window-3
  synthetic 2026-09-25 ~19:00 MDT, evidence in ~/memory/2026-09-25.md). Proven:
  canary CANARY-TEST-ONLY-W3-* through the real emitOverlayEvent path to a
  scratch gateway: stdout 0, stderr 0, scratch store 1 (intended durability
  only, destroyed after), live gateway.log 0, live journal 0, scratch gateway
  log 0, bash_history 0, probe script 0; verdict-forgery rejected on the real
  :3101 path (forged digest 409 stale_digest, altered body 409
  proposal_altered, live journal digest unchanged); live journal, gateway.log,
  and all three projections byte-identical before/after (sha256); docker ps
  argv and 3100.log tail canary-free; ephemeral 0600 file and scratch
  artifacts destroyed with absence re-verified. Residual: a credential-shaped
  DATABASE_URL in /home/nolan/.bash_history line 37 (600 perms, mtime Sep 16,
  predates the sprint; never printed or copied). Needs Nolan's word:
  rotate/purge the line or explicitly accept it. First broken arrow remains
  Q-P0-05.
- Q-P0-06 tenant isolation: OPEN. Invariant: two tenants, hostile proof both
  directions, no cross-tenant reads, writes, or Ask leakage. Matrix: 1 PASS,
  5 OPEN, 2 CONDITIONAL, 1 UNKNOWN. Bridge tenant-laundering repair
  scratch-proven, not integrated.

## JOURNEY ARROWS Q-J-01..12

- Q-J-01 normal mobile object discovery: IN PROGRESS, REOPENED under Nolan's
  18:47 positioning correction. The H4 20/20 green was measured against the old
  narrower criteria and is superseded. Real-path doorway proof required:
  graph to eligibility to contextual selection to projection to MarginObjectLayer
  to browser WITHOUT objectDebug=1; sparse section-anchored objects at extreme
  margins, FIXED with page-anchored feel (scroll moves them out of view, never
  viewport-glued chips); deterministic eligibility rules first. Trace writer
  dispatched 2026-09-24 ~19:15 MDT; positioning correction sent ~19:30 MDT; no
  completion recorded.
- Q-J-02 object open/close/back/focus/scroll state: IN PROGRESS, REOPENED.
  Scroll restoration 423 to 423 was proven under old criteria; reproof rides
  with the doorway chain (overlay holds individual objects, packable; backdrop
  dismissal, Escape, background inertness, focus containment and restoration,
  scroll preservation, Back semantics).
- Q-J-03 relationship traversal: IN PROGRESS, REOPENED. Requires correct
  direction labels (Business <- WORKS_FOR <- Person must not share labels both
  ways), related objects that actually navigate, traversal inside the authorized
  graph with identity preserved (one canonical object, many representations,
  no identity forks).
- Q-J-04 source to acquisition to evidence: OPEN. Mechanics proven on the real
  tree (raw bytes stored 2026-09-21, JSON-LD @graph extraction, regression-corpus
  2/2 asserting phone 970-245-3869 as DIRECT_FACT). Remaining: formalize the
  minimum contract (source identity/digest, provenance, deterministic
  extraction, visibility, acquisition status, temporal identity).
- Q-J-05 object-scoped Ask: OPEN. Basic PASS recorded (live supported answers
  with citations on :3101); all five support classes (SUPPORT/PARTIAL/UNKNOWN/
  CONFLICTED/RESTRICTED) not yet proven; bounded-context invariant not yet
  hostile-proven.
- Q-J-06 evidence/why this: OPEN. Citation chain verified live (object to
  provenance to source URL, mechanically); ClaimBadge data-bound from
  o.fields["claimKind"]; dangling-ref fail-closed covered by Q-P0-02.
- Q-J-07 owner change proposal: OPEN. Scope locked to 'Move emergency plumbing
  first' SitePatch; 8 projection/owner-loop commits staged in lane-d-impl.
- Q-J-08 durable regeneration, re-observation, intent survival: OPEN. NOW-8
  fixture design exists, unproven.
- Q-J-09 genericity: OPEN. Current state: zero customer-specific template code
  (no siteId branches in renderer/edge client; STRATEGY_PINS keyed config with
  inference fallback; customer names only in comments, examples, test params).
  Shared engine YES: HPP and Coppersmith run the identical _shared pipeline.
- Q-J-10 deterministic eligibility, rerun after material change: OPEN.
- Q-J-11 one-click operator wrapper: BLOCKED.
- Q-J-12 real business owner test: BLOCKED. Monument View Coffee Shop owners
  are the authorized candidate; Nolan makes first contact; no autonomous
  contact.

## RELIABILITY / MISC QUEUE

- Q-F-01 SSRF boundary: OPEN (acquireUrl integrated per 54; hostile suite
  against the integrated seam pending).
- Q-F-02 XSS/URL handling: OPEN (javascript: href sink known-open,
  FL-20260921-032).
- Q-F-03 unknown external effect, duplicate effect: RESOLVED per locked CEO
  decision 2026-09-24 ~11:08 MDT (UNKNOWN is PARK/HOLD; lease expiry never turns
  UNKNOWN back into CREATED; timeout is not failed). No escalation needed.
- Q-F-04 no fiction/demo honesty: OPEN.
- Q-F-05 per-run wake lock: OPEN (P2).
- Q-H-01 harvest-only bounded sensor: OPEN (P3).
- Q-P1-01 object-specific media: OPEN.
- Q-P1-02 mobile composition all widths: DONE (10/10 matrix, frozen :3102);
  queue file still OPEN, reconcile.
- Q-P1-03 PING site improvement: OPEN (committed sprint item; the 52-56
  convergence hold is satisfied as of the 2026-09-25 ~05:45 MDT backlog audit.
  Dispatch pending coordinator capacity and Pig SSH recovery; P0 safety items
  Q-P0-04..06 preempt per work authority order). Before-state evidence,
  ingestion, preview, critics, and plan all PENDING. Committed, tracked, not
  deferred.

## TENANTOS: INCOMPLETE (terminal, 2026-09-24 ~19:40 MDT)

Branch fyd/tenantos-integration-2026-09-24 @ e0d2868e2. Hostile tenant-spoof
ingress suite 15/15 green; boundary suite 22/27 (5 pre-existing environmental
failures, A/B proven); namespace 7/7, leases green; locked boundary held
(TenantOS must not absorb identity, missions, objects, FYD, events,
capabilities, social, or agents). NOT green: QDRANT gate PARTIAL (one global
Qdrant config, no per-tenant parameterization, no authz at creation; live JS
path uses QdrantAdapter REST outside any authority), POSTGRES untested, EVENT
PRIVACY partial, zero live tenants, nothing deployed. Merge proposal
tenantos-main-merge-proposal.md is REVIEW-REQUIRED, not a merge. FIRST
REMAINING GAP Q-T-01: per-tenant vector tenancy is product design (get_client()
serves one global Qdrant config; a second tenant's vectors land in shared
collections with no isolation), not a safe mechanical fix. Needs Nolan's call.

## ORCA: FAIL (terminal verdict, 2026-09-24)

Independent audit verified all 5 claimed commits, 5 event IDs, and test counts
(5/5, 9/9, 64/64 re-green). Real WorkOrder execution PASS, autonomous
follow-up PASS, timeout-to-retry PASS (A5-era), durable blocked orders 12/12
PASS, lease-expiry PASS. TERMINAL FAIL for two reasons: (1)
reconcileRunningWorkOrder's coordinator-crash window automatically re-dispatches
a RUNNING work order with a dead dispatcher and no rendezvous, an automatic
retry after an unknown outcome (A6 FAIL never overturned by a green witnessed
proof); (2) H5 HOLD semantics exist only as uncommitted worktree state, the
committed HEAD still has A5-era timeout-retry, so a reset loses HOLD. FIRST
REMAINING GAP Q-O-01: extend H5 across the crash window (mark dispatch-lost
work orders OUTCOME_UNKNOWN and blocked) and prove it with a witnessed
SIGKILL-during-dispatch restart. Needs Nolan's word (another worker was
mid-testing in the same worktree; adjacent mission-layer reaper gap needs his
design call). ORCA not deleted; no second execution authority created. Full
evidence: orca-terminal-verdict.md.

## VISITOR PROOF

- HPP: PASS (rendered on :3101, 200; Ask returned honest lack-of-evidence in
  lane tests).
- TRADESMAN(HPP): OPEN (shared pipeline proven; no dedicated side-by-side
  proof).
- TRADESMAN(COPPERSMITH): PASS (identical _shared pipeline; page.tsx differs
  only in SITE_ID/comments; no forked markup).
- Mobile matrix 320/360/375/390/430: PASS, 10/10 (frozen :3102, 2026-09-24
  ~20:10 MDT; 320px doorway-pill overflow found and fixed with a 2-line
  renderer change, re-proven 3/3 at 320 plus spot checks; screenshots in
  evidence/mobile/).
- #418 INVALIDATION 2026-09-25 ~15:56 MDT: the 10/10 matrix stands for the
  frozen :3102 surface only. Triage proved React #418 RED on both HPP and
  Coppersmith site pages at all five widths (1280/1440/1920/375/390), in
  regular and fresh-incognito contexts, across the clean 6f2dd65e tree, the
  clean tree plus the two quarantined fixes, and the full 24-file dirty tree.
  The 15:05 lane closure (761bd086) is invalid; root cause is OPEN and
  diagnosis is a separate work item. Homepage clean; peek containment PASS at
  1440; CLS 0.0 measured.
- Object interaction: REOPENED (old 20/20 measured against superseded
  criteria; real-path doorway proof pending, Q-J-01).
- Relationships: REOPENED (old 7/7 same caveat; correct-direction and
  real-navigation proof pending, Q-J-03).
- Ask: PASS (Coppersmith live on :3101; HPP pending formal proof).
- Evidence: PASS basic (citation chain verified live).

## OWNER PROOF

- Request: PASS (owner-loop live on :3101, 2026-09-24 ~20:25 MDT).
- Proposal: PASS (same).
- Approval: PASS (approve 200, journal recorded).
- Journal: PASS (dump exit 0, digest MATCH).
- Regen: PASS (served page reflected the approved change).
- Refresh: PASS (readback confirmed).
- Re-observation: OPEN (depends on Q-J-08).
- Intent survival: OPEN (depends on Q-J-07 and Q-J-08).
- Restore: PASS (clear 200 restored baseline byte-identically).

## SAFETY PROOF

- Privacy: PASS (Q-P0-01 hostile gate green both directions; TD-002 closed).
- Claim binding: PASS (Q-P0-02, c3b60e5f, 674 tests).
- XSS/URL handling: OPEN (Q-F-02, javascript: href sink known-open).
- SSRF boundary: PARTIAL (safe-fetch.ts integrated, 35/35; hostile suite
  against the integrated seam pending, Q-F-01).
- Tenant isolation: OPEN (Q-P0-06; matrix 1 PASS, 5 OPEN, 2 CONDITIONAL,
  1 UNKNOWN).
- Secret leakage: OPEN, narrowed (Q-P0-05; window-3 proved zero leakage from
  all sprint activity, verdict-forgery rejected, zero mutation; residual is one
  pre-existing credential-shaped line in /home/nolan/.bash_history from Sep 16,
  needs Nolan's word on rotate/purge/accept).
- Unknown/idempotency: PASS on branch (idempotency hammer 13/13, gateway
  dedupe 7/7, 22-dim unknown-effect covered); Q-P0-04 journal-marker invariant
  remains the open narrower case.

## GENERICITY PROOF

Customer-specific production branches: 0 (target 0). Shared engine: YES.

## ACQUISITION CHAIN (Q-J-04)

The H1 falsifier verdicts were INVALIDATED (phantom tree). Direct coordinator
verification on the real tree proves the mechanics: raw bytes stored 2026-09-21
(index.html 117,898 bytes plus rss/sitemap) with honest RUN-NOTES.md; JSON-LD
@graph extraction implemented (structured-data.ts:167); regression-corpus test
asserts phone 970-245-3869 as DIRECT_FACT (2/2, rerun 2026-09-24); projection
dumped 2026-09-24 by dumper-1.2.1 with baseDigest/graphDigest/fixtureFileDigest.
Remaining: formalize the minimum contract. No second acquisition system.

## BACKLOG CONVERGENCE (fully audited and reconciled 2026-09-25 ~05:45 MDT;
pre-audit backup: WORK-QUEUE.jsonl.bak-20260925-0545)

- STARTING ACTIVE GAPS: 26 (6 P0, 12 J, 2 P1, 5 F, 1 H).
- ADDED DURING SPRINT: 8 (Q-I-52..56 integration arrows, Q-T-01, Q-O-01,
  Q-P1-03). ADDED IN THE AUDIT: 2 (Q-F-06, Q-F-07, real failures that were
  missing from the queue). Total tracked: 36.
- GREEN: 10. Q-P0-01, Q-P0-02, Q-P0-03 (via 56), Q-P1-02 (mobile matrix),
  Q-I-52, Q-I-53, Q-I-54, Q-I-55, Q-I-56 (all coordinator-verified;
  queue states reconciled in the audit), Q-P0-04 (window-1 synthetic
  2026-09-25 ~18:37 MDT).
- RESOLVED: 1. Q-F-03 (UNKNOWN is PARK/HOLD, locked CEO decision
  2026-09-24 ~11:08 MDT, no escalation needed).
- OPEN: 20, of which the next safety blockers are Q-P0-05 (first broken
  arrow), Q-P0-06.
- IN PROGRESS: 3, genuinely in flight: Q-J-01, Q-J-02, Q-J-03 (reopened
  real-path doorway chain; trace writer dispatched, no completion recorded).
- BLOCKED: 2 (Q-J-11, Q-J-12; journey deps still open). Q-P1-03 moved
  OPEN: the 52-56 convergence hold is satisfied; dispatch pending
  coordinator capacity and Pig SSH recovery.
- KNOWN PERMANENT: 0 declared. TenantOS INCOMPLETE and ORCA FAIL are terminal
  verdicts with named first gaps (Q-T-01, Q-O-01), not permanent deferrals;
  both need Nolan's design calls.
- REOPENED: 3 (edge arrows J-01/J-02/J-03 under the 18:47 positioning
  correction).
- STALE FIELDS REFRESHED IN THE AUDIT: Q-J-04 (falsifier verdict invalidated,
  mechanics re-verified on the real tree), Q-J-05 (ask integrated, 190/190),
  Q-J-06 (citation chain verified live on :3101), Q-J-07 (owner loop
  running-green, committed 6b49b0c6), Q-F-01 (acquireUrl never existed;
  canonical safe-fetch.ts integrated), Q-O-01 (terminal verdict FAIL).
- NEW: 10 added total (8 during the sprint, 2 in the audit), all tracked above.
- HOUR-24 NOTE: the 05:45 audit counts above stand as the reconciled baseline.
  Movement since: Tracks A-H integrated (commits under INTEGRATED HEAD); #418
  closure invalidated (regression, root cause open, diagnosis is a separate work
  item); Q-C-01 breakage repaired via 6f2dd65e with 8 files quarantined;
  window-1 closed Q-P0-04 (GREEN 10, OPEN 20); window-3 proved Q-P0-05's
  sprint-provable surface (zero leakage, forgery rejected, zero mutation),
  leaving one pre-existing .bash_history line for Nolan's word. Full recount
  deferred to the next live-verified checkpoint.

## REAL FAILURES

1. 2026-09-24 ~19:00 MDT: two falsifier subagents reported headline verdicts
   against a phantom tree that does not exist on the Pig. Both reports
   invalidated; coordinator re-verified directly. Lesson: subagents must ground
   their environment (verify paths exist) before reporting.
2. TD-002 street-address leak on the live Ask path: found 2026-09-23, CLOSED
   2026-09-24 via the Q-P0-01 field-visibility fix (hostile gate green both
   directions).
3. FL-20260924-201: tangential question incorrectly labeled "supported":
   OPEN, now tracked as Q-F-06 in the backlog (added in the 2026-09-25
   ~05:45 MDT audit).
4. javascript: href sink on /o object-page capability: known-open
   (FL-20260921-032).
5. Pressure class 7 (null/malformed fields crash or render invented copy):
   known-open, now tracked as Q-F-07 in the backlog (added in the 2026-09-25
   ~05:45 MDT audit).
6. 2026-09-24 ~17:46 MDT (pre-sprint): broad pkill -f next-server caused ~16-min
   :3100 outage. Recovered via /home/nolan/start-3100.sh. Never repeat.
7. 2026-09-24 20:03 MDT: 320px horizontal overflow (doorway pill 339px) found
   during the mobile matrix. Fixed with a 2-line renderer change
   (maxWidth 100%, boxSizing border-box), re-proven 10/10. Frozen as NOLAN
   VISUAL CHECK READY on :3102.
8. Pig SSH "unreachable since 2026-09-24 23:49 MDT" was a false reading: the
   direct-connect path was blocked by local egress, but the established
   pigwsl pattern (ssh -F ~/.ssh/pig-config pigwsl via hatch-egress-proxy:3130)
   connects instantly. Recovered 2026-09-25 ~05:12 MDT; live identities
   re-verified (see VERIFICATION BASIS). No reboot, no browser disturbance,
   read-only checks only.

## REAL USER READINESS

NO.

The product has 2 fully verified capabilities in one running product, with 3
more integrated-green awaiting running-product proof. Since the 05:15
verification the branch advanced (triage commit 6f2dd65e unpushed, Tracks A-H
commits, full build), the worktree is not clean, and :3100 is serving an
experimental build per the triage report. React #418 is RED on both site pages
at all five widths with root cause open. The exact first broken arrow is now
Q-P0-05, narrowed to a single pre-existing item: window-3 proved zero leakage
from all sprint activity, verdict-forgery rejected, and zero mutation, but a
credential-shaped DATABASE_URL sits in /home/nolan/.bash_history line 37
(mtime Sep 16, predates the sprint). It needs Nolan's word: rotate/purge the
line or explicitly accept it. Until that decision lands, the safety story has
a known hole, so no real business owner test (Q-J-12) can be authorized.
Behind it: Q-P0-06 (tenant isolation matrix), Q-F-02 (XSS sink), the reopened
edge doorway proof (Q-J-01..03), and the #418 root-cause diagnosis.

## SINGLE NEXT FRONTIER

Q-P0-05: close the narrowed residual. Window-3 proved everything provable by
the sprint (zero leakage, forgery rejected, zero mutation); the single
remaining item is Nolan's word on the pre-existing credential-shaped
DATABASE_URL in /home/nolan/.bash_history line 37: rotate/purge the line, or
explicitly accept it. Surface the decision; do not touch the line
autonomously. Then Q-P0-06 (tenant isolation matrix). Nothing later in the
queue starts until Q-P0-05..06 are green or explicitly deferred with Nolan's
approval.

## SINGLE NEXT FRONTIER

Q-P0-04: run the synthetic misconfigured gateway URL test and prove that
emit/dump to a journal lacking the overlay marker fails closed with typed
WRONG_JOURNAL and zero writes. Nothing later in the queue starts until
Q-P0-04..06 are green or explicitly deferred with Nolan's approval.

## OWNER PACKAGE

Monument View Coffee Shop owner-ready package prepared automatically; contact
NOT made. Private preview scheme (draft, pending green journey), 9
evidence-graded claims (owners' names UNKNOWN), smallest-strong claim path
(domain-email first, DNS fallback, operator-verified labeled), 8-step
plain-language owner journey, Nolan-voice contact draft with product-test
disclosure, one-sentence authorization request, explicit authorization gate.
File: owner-package-monument-view.md. No contact without Nolan's explicit
go-ahead.

## DEMO PATHS AND REPLAY

- Visitor: http://localhost:3101/sites/happy-place and
  /sites/coppersmith-plumbing (pre-fix integrated build @ 6b49b0c6);
  mobile-frozen surface http://localhost:3102 (build @ fb520d79, BUILD_ID
  80gQ93GztEoYvvMHeCN0Y).
- Ask: curl -X POST http://127.0.0.1:3101/api/fyd/ask/coppersmith-plumbing -H
  'Content-Type: application/json' -d '{"question":"What services do you offer?"}'
- Owner loop: the :3101 sequence proven 2026-09-24 ~20:25 MDT (parse 200,
  approve 200, dump digest MATCH, served change, readback, clear 200
  byte-identical restore).
- Mobile: screenshots evidence/mobile/w{320,360,375,390,430}-{happy-place,fyd}.png
  plus w320 fixcheck runs; object-scroll.png for the back-restoration proof.
- :3100 preserved (pure HEAD, demo-owner mode on). :3102 left running for
  Nolan's visual check.
9. 2026-09-25 ~05:35 MDT: FALSE GREEN owned. The edge-object lane (Q-I-55)
   was declared INTEGRATED-GREEN on unit tests (edge 27/27, targeted 47/47)
   while the rendered product showed ZERO object affordances:
   MarginObjectLayer.tsx was never mounted anywhere in the product (zero JSX
   usages outside tests, never mounted in git history), and the served
   homepages on :3101/:3102 contained no margin objects, no doorways, no /o/
   links, no in-flow cards, with or without ?objectDebug=1. Test-green was
   called complete while the product surface had no objects. Nolan's
   correction stands: restore the objects at the very right on desktop
   (sparse, page-anchored, scroll moves them out of view) and attempt the
   very-right overlay on mobile. Worker F dispatched for the wiring
   restoration; Q-J-01 stays IN_PROGRESS until the real-path doorway proof
   lands in an actual browser.
10. 2026-09-25 ~05:42 MDT: INCIDENT, owned. Nolan reported broken HTML
    at 05:40:21. Reobservation of the actual bytes found NO broken markup:
    all :3101 and :3102 pages return 200 with balanced tags, correct titles,
    no error boundaries, no undefined/NaN in rendered text, clean build log.
    :3102 freeze intact (PID 29835, still serving the frozen build).
    Root cause of what Nolan saw: worker E restarted :3101 at 05:40:15 MDT
    WITHOUT authorization (E also committed 8faf96d0 directly to the served
    tree instead of the integration branch; the commit was not rebuilt into
    the bundle so it is dormant). Nolan's report lands 6 seconds into the
    restart window, when :3101 was down (fuser -k, then npm start still
    booting). The site was not rendering broken HTML; it was unreachable
    during an unsanctioned bounce. E has been directed: no more restarts,
    no more served-tree commits, re-apply the intent fix to the integration
    branch. :3101 verified healthy after (PID 62734, all pages 200).
    Browser-side verification (whole page, console errors) still queued for
    parent delegation; not claimed from curl.
11. 2026-09-25 ~15:56 MDT: React #418 lane closure INVALIDATED. #418 RED on
    both site pages at all five widths across three builds; the 15:05
    verification ran against a different build. Root cause OPEN; diagnosis is
    a separate work item.
12. 2026-09-25 10:26 MDT: commit 89c7da78 swept the Q-C-01 lane's uncommitted
    spec-pipeline rework into its own commit without call-site updates,
    leaving HEAD red; 87671a5f's production-build-compiles claim was made with
    the dirty tree present. Repaired by triage commit 6f2dd65e (16 files, tsc
    clean, no push); 8 risky files quarantined to stashed-lanes/.
13. 2026-09-25 ~15:40 MDT onward: Pig SSH transport down (egress proxy broken
    pipe per the triage report). Hour-24 check at ~18:15 MDT: pig_ssh transport
    connects and authenticates, but the muse-ssh Windows user has no WSL
    distributions installed, so the WSL execution bridge is unavailable through
    that path and the live re-verification batch did not run.
