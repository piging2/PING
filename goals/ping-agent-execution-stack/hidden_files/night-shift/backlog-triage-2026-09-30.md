# Overnight Backlog Triage

**Date:** 2026-09-30, night shift (Nolan asleep)
**Task:** read-only recon. No commits, no file moves, no deletions, no platform/Pig/credential/git-history touches.
**Scope read:** `~/workspace/BACKLOG.md` (index), `~/workspace/BACKLOG_PING.md` (full), `~/workspace/BACKLOG_NOLAN.md` (full), `~/workspace/FAILURE_LEDGER.md` (all OPEN entries), goal-level backlog surfaces, first-party TODO/FIXME grep, `~/workspace/AGENTS.md` house rules.

## Standing lanes I stayed out of

- Main-chat crew: FOCUS-1..FOCUS-10 (BUG-0001 constitutional repair), the C1 perfecting pass, the Muse x Codex website synthesis, the FYD owner loop. No duplicates proposed.
- The 6-hour perfecting-pass cron owns BACKLOG.md execution. Nothing below runs its falsification-probe cycle; everything below is analysis, audit, or design-doc work the cron does not do.
- Pig, live platforms, credentials, git history: untouched. No probes against live gateways beyond read-only static/reachability checks from this sandbox.

---

## Part 1: Prioritized safe overnight work items (10)

Ranked by leverage for FYD trustworthiness, replayability, and evidence quality. Each item is: read-only analysis or a new doc/audit artifact under the night-shift or a goal hidden_files dir. No edits to standing files, no code changes, no platform effects.

### 1. `fail-ledger-hygiene` gap audit (BACKLOG_PING.md, PING.F)

**What:** Audit every OPEN failure-ledger entry against the convention (classification, evidence, replay, invariant learned) and produce a dated gap table.
**Where:** New artifact, e.g. `~/workspace/goals/ping-agent-execution-stack/hidden_files/night-shift/fail-ledger-hygiene-gap-2026-09-30.md`.
**Why safe:** Read-only. The ledger item itself notes convention adoption is lane-wide and "one pass cannot close it"; this produces the missing adoption checklist rather than editing entries (entry edits belong to the perfecting-pass cron).
**Done looks like:** A table: entry ID, status, has-classification Y/N, has-evidence Y/N, has-replay Y/N, has-invariant Y/N, blocker note. Zero writes to FAILURE_LEDGER.md.

### 2. `ergo-proof-artifact-convention` adoption audit (BACKLOG_PING.md, PING.F)

**What:** Sample the most recent ~20 proof artifacts across goal hidden_files dirs against the 2026-09-25 convention (date / lane-owner / claim / evidence header). Gap table + list of conforming examples for lanes to copy.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Read-only directory scans. Does not change any artifact.
**Done looks like:** Gap table with file paths, missing fields, and 2-3 conforming examples.

### 3. MC-11 / MC-25 VERIFIED-mint static emitter audit (BACKLOG_PING.md, PING.B)

**What:** Static grep of the local worktrees for code that mints or emits a `VERIFIED` status/claim; for each emitter, record whether a proof gate precedes the mint. Table: emitter file, line, mint site, proof gate present/absent/unknown.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Read-only static analysis. It feeds evidence to the convergence lane; it does not alter authority semantics or touch the BUG-0001 crew's constitutional repair (the crew owns the superuser/DB-enforcement defect; this item only maps who mints the word VERIFIED).
**Done looks like:** Emitter table with file:line references and proof-gate verdicts. No code changes.

### 4. `one-canonical-read-model` discrepancy map (BACKLOG_PING.md, PING.F, P1)

**What:** Map exactly where `proceduralize/__fixtures__/` and the PING-backed projection disagree (service lists, field values, surfaces that consume each), as a dated discrepancy table with file paths.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Read-only analysis. Fixes are owned by the fyd-build lane; this is the consumable discrepancy map, not a patch.
**Done looks like:** Table of disagreements with fixture path, projection path, differing values, consuming surface. This names the first broken boundary for the one-read-model invariant without touching either implementation.

### 5. `search-qdrant-truthfulness` label audit (BACKLOG_PING.md, PING.F, P1)

**What:** (a) Static grep for "hybrid"/"semantic search" labels across FYD surfaces; (b) one read-only Qdrant reachability probe from this sandbox (no remediation, no restart, no config change). Record label vs reachability verdict.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Grep is local; the probe is a read-only network check. No remediation attempted (remediation is the deploying lane's).
**Done looks like:** Label inventory with file:line plus reachability result (reachable/unreachable/unknown) and the rule applied ("no hybrid label unless hybrid executes").

### 6. `evidence-evidence-replay` scope question (BACKLOG_PING.md, FYD lane, P3 OPEN)

**What:** Analysis memo answering the item's scope question: is claim-evidence support replayable from stored evidence, and what would the replay procedure be? Cite the actual evidence machinery (refs, claims, validators) with file paths.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Pure analysis. No code, no canonical bytes, no identity semantics (identity work is frozen and crew-adjacent).
**Done looks like:** Memo with the replay procedure sketched, gaps named, file:line citations.

### 7. `askfyd-outcome-history` contract design (BACKLOG_PING.md, FYD lane, P3 OPEN)

**What:** Design doc for the Ask FYD outcome-history contract: record shape, fields, privacy gating hooks (FYD-010), how it composes with the existing answer contract. No implementation.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Doc only. Supports the FYD owner loop without touching the website synthesis, the owner loop itself, or crew lanes.
**Done looks like:** Contract doc with record shape, field table, composition notes, open questions for the fyd lanes.

### 8. `registry-ai-vocabulary` doc sketch (BACKLOG_PING.md, FYD lane, P3 HARVEST)

**What:** The sanctioned "doc sketch": what a typed component catalog (component -> zod prop schema + slots + description) would contain for the FYD registry, drawn from the Harvest Register row (json-render, Apache-2.0, patterns only, npm dep REJECTED).
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** The backlog item's own sanctioned shape is a doc sketch. No dependency added, no code.
**Done looks like:** Sketch doc with example catalog entries and the validation boundary it would close.

### 9. `sec-secret-history-unrun` close-out memo (BACKLOG_PING.md, PING.E, OPEN)

**What:** Write the two-layer close-out: (a) local plane VERIFIED CLOSED (2026-09-25 proxy metadata scan: zero commits ever added secret-shaped files; exact `git -S <value>` check impossible here because the four historical values were never written down by design); (b) Nolan-gated checklist for the remainder (Pig-side repo history check + content check, value holder required).
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Documentation only. Does not touch credentials, does not run the content check, does not touch the Pig.
**Done looks like:** Memo with the verified-local status, the residual risk note, and the explicit Nolan-gated checklist.

### 10. `cost-verification-cache` measurement design (BACKLOG_PING.md, PING.F, P2 OPEN)

**What:** Measurement spec for the 63-72% duplicate verification load: how to instrument the tandem verification path to log content hashes per verification, compute the duplicate rate per round, and trend it. Spec only, no implementation on the tandem path.
**Where:** New artifact under `hidden_files/night-shift/`.
**Why safe:** Design doc only. The tandem path is not modified; no behavior change to the outreach machinery.
**Done looks like:** Spec with the hash point, the log schema, the per-round metric definition, and the trending query.

### Explicitly excluded (and why)

- AUTH-CONV-02/03/05/07/08/10 audits: identity-authority territory; the identity ruling is frozen and BUG-0001 constitutional repair is crew-owned. An independent audit now risks duplicating the crew.
- EVENT-SPINE policy docs: event/authority semantics are crew-adjacent under BUG-0001; left for the crew.
- `objectgraph-relate-output-dropped` and `visibility-customize-dangling-import`: standing lane-owned items; the former is staged awaiting Nolan's word, the latter is fyd-product-lane owned with a writer-ownership question open (see flags).
- BACKLOG_NOLAN.md items 7/8 (storage): superseded posture (see flags). Item 10 (42 FB like intents): the refuse block is load-bearing; must not be "cleaned up." RS-001..005, FYD-028..032: Pig automation, Nolan-gated.
- Any falsification probe on a BACKLOG.md OPEN item: the perfecting-pass cron owns that cycle.

---

## Part 2: Stale, duplicated, or contradictory items (with file:line)

### F1. FYD-010 listed OPEN but recorded DONE_VERIFIED (contradiction)

- `~/workspace/BACKLOG_PING.md` FYD execution lane: `**FYD-010** (P4, NOW-5, OPEN): Field-level privacy gate for Ask FYD` (also repeated in the historical reconciliation table at line 662 as OPEN).
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27/BACKLOG.md:46`: `**NOW-5 / FYD-010** (P1, DONE_VERIFIED 2026-09-27)` with the full evidence trail: branch `fyd-010-field-gate` fa7067e, `fyd-010-field-gate.test.ts` 13 tests, original falsification probe 2/2 PASS, lane suite 210/210, tsc clean, served-path proof on ephemeral :3199 with zero owner-field values in visitor JSON, ledger `fyd-010-closure.md`.
- The backlog entry is stale. Either promote the DONE_VERIFIED (if the proof stands) or record why the burn-layer closure does not satisfy the entry. Note the reconciliation table at line 662 also carries a status column, so the stale status appears twice.

### F2. BACKLOG.md:24 "NEXT" pointer vs actual Nolan-gated state (stale sequencing)

- `~/workspace/BACKLOG.md:24` frames the `objectgraph-relate-output-dropped` P3 falsification sweep as the pass's next action ("the 2026-09-21 replay used stale `src/core` paths").
- `~/workspace/BACKLOG.md:24-27` note says the re-probe + patch are staged at `goals/ping-agent-execution-stack/hidden_files/perfecting-pass-2026-09-27/` and await Nolan's word for the fyd-build lane.
- The "NEXT" reads actionable; the real state is Nolan-gated. The sequencing note is stale relative to the gate.

### F3. Writer-ownership question on `visibility-customize-dangling-import` (possible lane conflict)

- `~/workspace/BACKLOG.md:30-33`: the item is P1 and **fyd-product-lane owns** it; the recovery copy is uncommitted (`fyd-product-lane/src/fyd/proceduralize/patch.ts`, sha 3ac95ddb) with unverified provenance vs the proven fyd-build copy e80be003.
- Same note: "The fyd-build lane's own 2026-09-30 commits claim DONE_VERIFIED from replay; that claim awaits Nolan's word."
- If fyd-build committed on a fyd-product-lane-owned surface, that is a one-mutation-owner-per-surface question for the coordinator. Either the ownership line is wrong or the commit scope is. Flagged, not resolved here (read-only task).

### F4. FL-20260922-002 tracked twice, with a wrong cross-ref (duplication)

- `~/workspace/BACKLOG_PING.md:278`: `**FL-20260922-002-invariant** (P3, OPEN)` in the FYD execution lane.
- `~/workspace/BACKLOG_PING.md:619`: `**fail-fl-20260922-002** (OPEN)` in PING.F, whose text says "see FL-20260922-002-invariant (P6)" but the item actually sits in the **P3** list at line 278, not P6.
- Same invariant, two entries, and the cross-ref's "(P6)" is wrong. Suggest collapsing to one entry with the correct section pointer.

### F5. NOW-6 / DEPLOY-PROV-001 factual premise is stale (stale decision)

- `~/workspace/BACKLOG_PING.md:49` (NOW-6) and `:578` (`dep-provenance-gap`, DECISION 2026-09-22): recommend accepting `candidate-3c5d280dd` as the honest live baseline, describing both live Oracle containers as running that candidate.
- `~/workspace/BACKLOG_PING.md` 2026-09-26 entries (`dep-pig-gateway-provenance`, `dep-pig-gateway-tenantos-drift`, `dep-pig-gateway-unknown-endpoint`, `dep-pig-gateway-broker-absent`, `dep-pig-gateway-pg-unreachable`, `dep-pig-gateway-rollback`): the live Pig gateway is `ping-gateway:repair-cert-20260924` (digest `sha256:4472c543484e120f03095fd4276a8326e0db31ffe4701a35caf9ffb5c17379f2`), matching repo ~c99e1ff36 plus a backport overlay, predating the TenantOS hardening.
- The 2026-09-22 decision's "both containers run 3c5d280dd" premise no longer describes the live artifact (at least on the Pig gateway). The recommended default needs re-verification before anyone cites it; the Grill's DEPLOY-PROV-001 pointer inherits the staleness.

### F6. BACKLOG_NOLAN.md item 2: stale proof claim (stale)

- Item 2 (Threads profile photo 1x1) carries a 2026-09-26 proof claim that the 2026-09-27 perfecting pass flagged as stale (crop proof missing). Status vs evidence mismatch; needs either a fresh proof or a status correction. Note: the fix itself would touch a live platform surface, so it stays parked; only the status wording is flagged here.

### F7. BACKLOG_NOLAN.md items 7/8: superseded posture (stale)

- Item 7 (Pig C: disk-pressure early warning) and item 8 (P0 storage root-cause) read as active maintenance, but Nolan's 2026-09-30 ~19:50 CEO storage directive set the binding posture: C: is GUARDED at ~71 GB free / 15.4%, E: is quarantined, storage work is exception-driven, not continuous cleanup. The items' posture predates the directive and should be reworded to the exception-driven stance or marked SUPERSEDED.

### F8. Deployment sequencing tension: NOW-6 vs CEO directive (contradiction risk)

- `~/workspace/BACKLOG_PING.md` `dep-single-writer-restore` (BLOCKED): stop :8081 after Nolan confirms NOW-6, to restore single-writer operation.
- CEO ORDER CONTINUITY NOT FEATURE WAVE (2026-09-30 ~17:44) P0(1): PROMOTE THE PROVEN GATEWAY IMAGE through the bounded deployment/rollback procedure.
- These are two deployment directives with potentially conflicting sequencing (restore single-writer by stopping :8081 vs promote a proven image first). Neither has Nolan's resolution recorded. Sequencing question for the coordinator, not for this task.

### F9. Vercel AI SDK adoption tracked twice (duplication)

- `~/workspace/BACKLOG_PING.md` PING platform section: `xcut-vercel-ai-sdk-adoption` (P2, HARVEST: adopt patterns only, no dep).
- `~/workspace/BACKLOG_PING.md` Harvest Register: `reg-ai-sdk-adopt-when-needed` (DEFERRED: adopted when the intelligence lane needs a model, not before).
- Same decision, two homes. Suggest one entry with a cross-ref.

### F10. Note: FYD-034 vs FL-20260919-004 (cross-ref, not a contradiction)

- `~/workspace/BACKLOG_PING.md` FYD-034 (P6, DEFERRED): 260-commit push parked per directive 11; "no remote on local repo; Pig-side status = FL-20260919-004 (OPEN)".
- `~/workspace/FAILURE_LEDGER.md` FL-20260919-004 (OPEN): Pig-side push blocked, egress-proxy 401, local commits f4bf5304a and 1995f0a59 remain unpushed.
- Consistent, but the two must be reconciled before any push resumes; recording the linkage explicitly would prevent a lane from "discovering" the blocked push independently.

---

## Part 3: Surfaces covered

- **Goal backlogs:** the only goal-level backlog surface is `~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27/` (a directory, not a file). It is the perfecting pass's own burn-layer workspace: its `BACKLOG.md` is the pass's run ledger (FYD-002/010/011/012/013/014/016/017/018/022/024/025/026 closures recorded), plus proof scripts, served-proof HTML, and ledgers. No other goal directory carries a BACKLOG/TODO file. GRILLING-BRIEF.md is a decision surface (the Grill), not a backlog.
- **Failure ledger OPEN entries:** 19 matched `- status: OPEN` / `STATUS: OPEN` lines (FAILURE_LEDGER.md lines 64, 86, 159, 260, 344, 454, 464, 507, 515, 786, 969, 1004, 1125, 1998, 2342, 2565, 2646, 2672, 2699). Representative: FL-20260919-001 (Threads fail-closed streak, watching), FL-20260919-002 (Instagram CDP wedge, watching), FL-20260919-004 (Pig push blocked, egress-proxy 401), plus Nolan-gated, parent-gated, coordinator-gated, and platform-quarantined entries (Pig comms blackout quarantined to the Pig surface; Oracle-side restart Nolan-only; manual browser recovery). All are blocked on Nolan, a parent/coordinator decision, a live platform, or the Pig. None is unilaterally actionable from this side chat. The full audit is proposed as work item 1 above.
- **First-party TODO/FIXME grep:** no genuine first-party TODO markers surfaced. Hits were: vendored research copies (`convergence-expansion-2026-09-19/harvest/markitdown`, `crx-autonomous-missions/repos/langgraph`, `crx-autonomous-missions/repos/autogen`), variable-name false positives (`todo` as a JS variable in `pig-fb/ig-nearmiss-followup.js`), and a comment-word match in `pig-fb/page-profile-pic.js`. The in-code TODO surface is effectively empty; the backlogs and the failure ledger are the real work surfaces.
- **House rules honored:** read `~/workspace/AGENTS.md` (Pig SSH transport, quoting, wrapper volatility, pigwsl-exec/pig-put rules). No Pig access was used in this task; no changes made outside this report file.

---

## Recommended next step for the parent agent

Hand items 1-10 to Pigi as overnight execution units in this side chat (each is a bounded analysis/doc/audit task with a clear done state). Route flags F1, F4, F9 to the perfecting-pass cron owner as backlog hygiene (they are wording/status fixes to BACKLOG_PING.md, which the cron owns); route F2, F3, F5, F8 to the coordinator/Nolan as decisions or sequencing questions (they involve lane ownership, deployment order, and Nolan's word). Nothing in this report requires waking Nolan.
