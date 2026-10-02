# Q30 LEARNING FORENSICS — 2026-10-01 ~18:24 MDT (READ-ONLY)

Worker: LEARNING SWARM (read-only forensics). No code changed. No LearningAuthority created.

## Verdict on Nolan's first-pass claim (Q30 = PARTIAL)

**The claim UNDERSTATES the record.** At least 8 learnings meet the full
OBSERVATION → EVIDENCE → DECISION → SOFTWARE/POLICY CHANGE → BEFORE/AFTER METRIC bar,
most with exact SHAs. Q30 is not PARTIAL for lack of evidence; it is SUBSTANTIATED
with a capture-mechanism weakness (see "Missing learning infrastructure" below).

## Proven chains

### L-01 — @graph / JSON-LD silent zero-node extraction → array-first extractGraph
- OBSERVATION: `jsonld.flatten()` resolves to a JSON-LD ARRAY of nodes; `extractGraph()`
  only handled `{"@graph": [...]}` and single-node objects, so it returned [] for every
  successful expansion. Extraction silently produced zero nodes and zero facts, no error.
- EVIDENCE: Pig `/home/nolan/workspace/FAILURE_LEDGER.md` lines 2093-2095 (verbatim WHAT/RECOVERY);
  `~/memory/2026-09-21.md:373,567`; `~/workspace/fyd-autonomy/scratch/failures.md` #1.
- DECISION: probe the library's actual return shape before writing the consumer; accept
  arrays first, then @graph, then single-node.
- SOFTWARE CHANGE: `src/fyd/proceduralize/structured-data.ts`, `extractGraph()` (lines 162-170
  at ddee0d5d) — `if (Array.isArray(flattened)) return flattened` first. Parent commit's
  `proceduralizer.ts` still had the old `flattenJsonLd` dot-path flattener (line 186), replaced
  by the pipeline in this commit.
- SHA: `ddee0d5d` (Pig repo /home/nolan/projects/ping), "fyd(proceduralize):
  semantics-preserving JSON-LD extraction pipeline", Mon Sep 21 06:46:35 2026 -0600.
- METRIC: before = 0 nodes / 0 facts (silent); after = 11 nodes visited, telephone
  970-245-3869 extracted, 61/61 tests green (commit message); failures.md records the
  repair verified as Coppersmith 7 nodes → 38 facts; FAILURE_LEDGER records a one-node
  probe confirming NODES: 1 FACTS: 1.

### L-02 — module-global nondeterminism (projectCounter) → deterministic project IDs
- OBSERVATION: business IDs derived from mutable module-level `projectCounter`
  (commit 750c40e era, branch fyd/sitespec-generator).
- DECISION: identities derive from canonical input JSON; time caller-injected, never ambient.
- SOFTWARE CHANGE + SHA: `750c40ee` (Pig /home/nolan/projects/ping),
  "FYD sitespec: finish schema-namespace map; deterministic project ids".
- METRIC: 7/7 suites, 50/50 tests including 5 new pre-failing tests (per failures.md #2).

### L-03 — 320px overflow → deterministic min-w-0 CSS rule
- OBSERVATION: document.scrollWidth=331 at 320px viewport on the committed build; owner =
  Ask FYD "Design tokens" proposal rows flex (label.flex + input.flex-1 min-width:auto +
  44px button). Earlier 375px failure was dirty-worktree WIP, reproduced in neither clean
  parent — explicitly NOT counted as a product bug.
- EVIDENCE: FAILURE_LEDGER.md FL-20260921-033; failures.md #4.
- SOFTWARE CHANGE + SHA: `8a99742` (workspace repo /home/hatch/workspace),
  "fyd(mobile): prevent 320px overflow in Ask FYD design-token row" — one class `min-w-0`.
- METRIC: before scrollW=331 > 320; after 320x568 PASS scrollW=305, 375x812 PASS scrollW=360,
  1280x800 PASS; zero overflowing elements on Happy Place + Coppersmith.

### L-04 — 375px status-strip overflow → min-w-0 rules + 44px touch targets
- OBSERVATION: status cards overflowed 10px at 375px viewport; tap targets 16-18px.
- SOFTWARE CHANGE + SHA: `0842872` (workspace repo), "wave2 ping template: fix 375px
  status-strip overflow, 44px touch targets" — min-w-0 on scroll-reveal motion.div and
  status-card text column; inline-block 44px tap areas on mobile.
- METRIC: before = 10px overflow at 375px; after = desktop-1280 / mobile-375 / mobile-390
  all PASS with zero overflow, zero console/page errors, zero undersized targets (browser proof
  recorded in commit message).

### L-05 — reconciliation ignored closure dispositions → closure-aware gap lifecycle
- OBSERVATION: `reconcile.py` ignored closure dispositions (r2-closure-20260920.md,
  r3-closure-20260920.md); 10 R2 + 7 R3 gaps re-escalated across 3+ reports.
- EVIDENCE: `~/memory/2026-09-20.md`, `~/memory/2026-09-21.md`; failures.md #6.
- DECISION: gap detector must consume closure dispositions; suppression stays auditable and
  reopenable, never silent deletion.
- SOFTWARE/POLICY CHANGE: closure-aware reconciliation + lifecycle state machine
  OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED. Living files:
  `~/workspace/tandem/reconcile.py` (run_lifecycle), `~/workspace/tandem/reconciliation/gap-lifecycle.json`
  (states + transitions + disposition citations, still updated — last_seen 2026-10-01),
  `~/workspace/tandem/test-gap-lifecycle.py` (isolated proof, temp dirs only).
- SHA: NONE — files are untracked in the workspace repo (git status shows tandem scratch
  untracked). Chain proven by files + metrics, not by SHA.
- METRIC: 17 actionable → 2 + 15 KNOWN_PERMANENT; 13/13 lifecycle tests; idempotent rerun.

### L-06 — og:description naming a foreign business → deterministic void rule
- OBSERVATION: falsification found kimsautopart.com emitting an og:description naming a
  DIFFERENT business than the page (praised "A&D Auto Parts", title "Kims - Kims Auto Parts").
  A wrong description is a false claim; a missing description is honest.
- SOFTWARE CHANGE + SHA: `6c0e626d` (Pig /home/nolan/projects/ping),
  "FYD understand fix phase 2: name-vs-description sanity (void foreign descriptions)" —
  exported rule `descriptionNamesForeignBusiness(description, pageTitle)`, voiding only,
  nothing invented or rewritten; JSON-LD descriptions untouched.
- METRIC: `__tests__/description-void.test.ts`, 11 tests incl. the verbatim Kim's mismatch
  and Elevation/Bin707/Wicked Wrench keep-cases.

### L-07 — blog authors minting person cards → person role gate
- OBSERVATION: falsification found `project()` minting ping.social.person@1 cards for ANY
  Person-typed entity with a collapsed "title" field: blog authors ("Admin") and headline-only
  nodes ("Welcome to our blog") became person cards with team-member framing; no
  business<->person edge ever minted.
- SOFTWARE CHANGE + SHA: `28fd14fa` (Pig /home/nolan/projects/ping),
  "FYD understand fix phase 3: person role gate" — Person projects only with job_title OR
  person-role relationship (builder's exact ROLE_PREDICATES.person set); skipped persons are
  a deliberate policy exclusion with entity facts retained for inspection.
- METRIC: `__tests__/person-role-gate.test.ts`, 10 tests (Admin/headline suppression,
  employee/founder/jobTitle retention, works_for edge).

### L-08 — javascript: URL sink → resolveSafeLink trust-boundary gate
- OBSERVATION: renderer escaped hostile HTML text but rendered javascript:alert(1)/alert(2)
  verbatim into href via href={website}. React warns, does not block. (FL-20260921-032)
- SOFTWARE CHANGE: every observed-data href interpolates only `resolveSafeLink`
  kind==="safe" (static sink audit); `fyd-lane/safe-link.test.ts` 16/16.
- SHA (verification record): `56f164e6` (Pig repo), "backlog: renderer-javascript-url-sink
  DONE_VERIFIED 2026-09-23 (16/16 safe-link tests PASS + static href-sink audit; Pig-side
  live-path proof residual recorded)". Note honest process: `1c6a5b61` REVOKED a premature
  DONE_VERIFIED (2026-09-22) before the 2026-09-23 re-verification.

## Documented in the learning record, code link not independently located (not counted as proven)
- L-09 tripwire argv false-red → cwd-aware match + port ownership + health contract
  (failures.md #7, memory/2026-09-26.md:1847-1851,2228,2615-2617). Change asserted in record;
  tripwire file not located in this pass.
- L-10 WSL restart killing supervised processes → external watchdog + idempotent restart
  script (failures.md #8). Operational, not a deterministic software default change.

## Suggested candidates — verdicts
- "@graph failure → JSON-LD processing changed": PROVEN (L-01).
- "mobile overflow → deterministic CSS rule changed": PROVEN (L-03, L-04).
- "reconciliation noise → gap lifecycle changed": PROVEN (L-05), with the caveat that no SHA
  exists because the lifecycle store lives untracked in tandem scratch.

## Missing learning infrastructure (the real Q30 gap)
The substance is stronger than PARTIAL, but the capture mechanism is archaeological, not
systematic: `~/workspace/fyd-autonomy/scratch/failures.md` is a "Failure archaeology"
written by a READER on 2026-09-27 reconstructing 2026-09-21 events — learnings are captured
days after the fact, in scratch, by whoever does archaeology. There is no write-time
learning record: commit messages carry the chain for FYD understand-fixes (good), but the
gap-lifecycle change (L-05) has no commit at all (untracked scratch files), and the
FAILURE_LEDGER lives on the Pig at /home/nolan/workspace/FAILURE_LEDGER.md outside any
repo. If Q30 is asked again in a week, the answer depends on another archaeology pass.
The smallest honest fix: a write-time learning ledger (learning id, date, observation,
evidence pointer, decision, change SHA or file, before/after metric) committed in-repo,
with the gap-lifecycle store moved under version control. Do NOT create LearningAuthority
to do it — a ledger file plus the existing commit-message discipline suffices.
