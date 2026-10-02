# Dry-Run Report — W2-MISSIONS

2026-09-23, 19:35-20:25 MDT. Executor: W2-MISSIONS subagent (read-only w.r.t. fyd-factory; no writes, no commits, no business contact, no publication).
Read-only probes only. All artifacts below are under `~/workspace/orca-finish/wave2/missions/`.

## 1. Authorization recon (FYD mission inputs)

FINDING: **UNKNOWN_WITH_EXACT_BLOCKER** for "two authorized business URLs."
- No mission brief, state file, memory entry, or factory record supplies two authorized business URLs. None exist on record.
- Do NOT invent authorization. Do NOT contact any business. Do NOT publish.
- What IS authorized (verbatim from standing memory):
  - Happy Place Productions = owner-controlled test tenant; repo /home/nolan/projects/happy-place-platform; its Vercel site is a fidelity target only.
  - Coppersmith = internal/private product demo and evaluation ONLY; no endorsement implied, no public impersonating site, no business contact, no external mutation.
  - Demo Owner Mode is tenant-scoped to exactly these two test tenants.
  - Monument View Coffee Shop owners = authorization pending, NOT authorized.
- Dry-run fallback used: authorized-or-fixture inputs only. Class A (the two tenants) for render/Ask FYD; Class B (redacted fixtures) for acquisition/graph stages. Per the new FYD-MISSION-CONTRACT, every fixture-derived artifact is stamped FIXTURE.

## 2. FYD mission dry run — what ran

| Stage | Ran | Result | Artifact |
|---|---|---|---|
| Acquisition | Corpus fixture validation path (F2-CORPUS-A validated redacted trades fixtures, batch-b fixtures present) | PASS on fixtures (per factory records; re-verify not repeated here) | corpus/fixtures/batch-a,b (factory) |
| Evidence | LANE-LIN tracer verification (read-only review of completed report) | PASS: 7/7 links resolved, sha256-pinned, negative control correct (bogus claim -> MISSING) | fyd-factory/lineage/LINEAGE-REPORT.md |
| Object graph | Entity resolution design verified in report; real projections exist on Pig | PASS (established) | real projection coppersmith-plumbing.json (Pig) |
| SiteSpec | TD-001 re-check: generator Explore query narrows to ObjectFeed-eligible schemas (commit 4a9cc919) | PASS / FALSE POSITIVE CONFIRMED | artifacts/happy-place.html, artifacts/coppersmith-plumbing.html (0x "Spec failed validation") |
| Render | Full HTML fetched from live demo routes; unit suites green (see coding run) | PASS w/ caveats: provenance JSON embedded; media pipeline derivatives live (/fyd-media/...). exact "opacity:0" count = 0 in served HTML (earlier substring hit was a false alarm; VQ-001 is runtime behavior, not statically verifiable — correction recorded in CHECKPOINT.md) | artifacts/*.html (~74KB each) |
| Browser verification | NOT RUN in this dry run | BLOCKED: visual-critic harness lives in the factory lanes and I am read-only there; duplicating it would violate the lane boundary. Factory VISUAL-CRITIC evidence stands: FAIL, not gate-ready (VQ-001 motion gates content, VQ-002 contrast, VQ-004 zero media, +6 more) | factory visual/desktop-critique.json (not re-run) |
| Ask FYD | NOT RUN live | BLOCKED: ask-path verification is LANE-ASK / TD-002 territory (privacy-leak investigation in flight); duplicating violates lane boundary. Ask FYD API-level passed 2026-09-22 (131 tests); full evidence-boundedness NOT re-verified here | — |

FYD mission dry-run verdict: stages acquisition->render re-confirmed PASS with artifacts; browser verification and Ask FYD are explicit BLOCKED items (lane boundaries honored), and TD-001 is falsified. The mission would currently stop at NEEDS_OWNER_INPUT / READY_WITH_WARNINGS at best — never READY — until those two lanes deliver.

## 3. Coding mission dry run — what ran

Ran the golden-path lane suites on the Pig, branch fyd-factory @ e48ef710 (the exact run-tests.sh suite set, read-only):
- proceduralize 82/82, components 93/93, sitespec 91/91, builder 96/96, archetypes 11/11, customize 54/54, media 107/107
- Total: 53 suites / 524 tests, 0 failures. Unit-test level of the golden path is GREEN.

## 4. First broken step + evidence + fix plan

**FIRST BROKEN STEP (per the coding contract's stage-order rule): RENDER stage — projection-seam safe-link bypass on the /o object page.**
- Stage order: acquisition (PASS on fixtures) -> evidence (PASS, LANE-LIN) -> graph (PASS) -> SiteSpec (PASS; TD-001 falsified) -> RENDER (**BROKEN**) -> browser verify -> Ask FYD. RENDER is the first stage with a reproducible, current-branch, hard failure.
- Evidence (QA-HOSTILE, completed 2026-09-23 ~19:36 MDT, independent of this lane; reviewed, not duplicated):
  - BYPASS A35/A36: `buildCapabilities` in `src/fyd/object/view.ts` (committed source, lines ~190-192) interpolates raw contact values into hrefs with NO safe-link gate. `website: "javascript:alert('A35')"` rendered as a LIVE `<a href="javascript:alert('A35')">Website</a>` end-to-end through `composeObjectView` on the /o object page. Genuine XSS-class seam hole.
  - BYPASS A44: `<img src="javascript:alert('A44')">` rendered on the hero; no URL gate on `DisplayMedia.src`.
  - Weaknesses (not the first step, but adjacent): `contactMethodFor(email)` accepts `"><script>...@x.com` and emits raw mailto: actionUri (neutralized only by React escaping); same un-gated interpolation for call/email capabilities (A37); `exportCustomerData` emits literal `<script>` strings in the JSON blob (inert unless inlined, but unsafe-by-construction).
  - Coverage note: LANE-SEC's 20/20 PASS covered the main SitePageView path; the /o object page was explicitly "code-scanned but not gauntleted" — the gap was coverage, not contradiction.
- Why this is FIRST and not something else:
  - TD-001: FALSIFIED on this branch (both contestants + my re-check: zero "Spec failed validation" in served HTML; generator emits `{kind:"all", schemas:[...eligible...], limit:20}`). MISDIRECTED verdict; no fix.
  - F5-CEILING works_for reverse-direction defect (planner group() drops reverse works_for persons, so no People section): real, patch proposal exists (`patches/f5-ceiling-works-for-people.patch`, unapplied) — but measured on the production planner path the HPP-derived planner is superseding, so it is a SECOND candidate with a supersession caveat, not the first.
  - VISUAL-CRITIC FAIL (VQ-001 etc.): demo-quality gate failures on the same RENDER stage; severity lower (quality, not security); supports the RENDER-stage verdict but is not the first hard failure.
  - TD-002 (Ask FYD privacy leak): still in flight (later stage anyway).
- **SMALLEST-FIX PLAN (not implemented — implementation belongs to the constitutional sprint, which owns golden-path forensics; handoff point recorded below):**
  1. In `src/fyd/object/view.ts` `buildCapabilities`, route website/email/call values through the existing `resolveSafeLink` choke point before href interpolation (harvest, do not build a new sanitizer). Fail-closed: unsafe scheme -> drop the link or render as plain text, never emit raw href. Expected: one function, additive only.
  2. Apply the same gate to `DisplayMedia.src` (the lane already proposed `patches/display-media-src-allowlist.patch` as OPTIONAL hardening, git-apply-clean; integrate or narrow it — coordinator decides).
  3. Regression tests: add A35/A36/A44 hostile inputs as probes in the existing `projection-seam-attack.test.ts` (fails-before demonstrated on current source, passes-after the fix).
  4. Run all 7 lane suites + hostile suite; zero regressions.
  5. Red-team: independent adversarial lane probes adjacent classes (A37 mailto, export JSON blob, bidi/zero-width, theme tokens).
  6. Integrate via coordinator patch flow (shared-file rule honored).
- **HANDOFF POINT (exact):** constitutional sprint lane (owns golden-path forensics per the sprint's Phase 17 mandate). Deliver to it: this report + QA-HOSTILE's `qa/hostile/HOSTILE-VERDICT.md` + `results-extract.json` + `raw-run-output.txt` + the plan above. No implementation here — the sprint decides whether the /o page goes through the factory's new planner or gets patched in place.

## 5. Running the missions through the A5 control loop (direction update evaluation)

Source of truth: `wave1/orca-arch/ORCA-INVENTORY.md` + `A5-VERDICT.md` (branch `feature/orca-autonomy` @ `ae55b77ff`, worktree `/home/nolan/worktrees/orca-autonomy`, dormant since 2026-09-18; A5 substantially proven by independent audit; A6 restart-remediation implemented but witnessed re-proof pending; A7 continuous operation never built — no runner).

### FYD mission through the loop (observe -> plan -> authorize -> delegate -> monitor -> verify -> record -> follow-up/retry/escalate -> close)

What the loop CAN already do:
- OBSERVE/PLAN: objective text ("produce verified FYD experience for <authorized tenant>, contract v1.0") -> staged tasks with capability profiles (one task per contract stage). This is data, no authority crossed.
- AUTHORIZE: `authorizeWorkOrder` is fail-closed (12 profiles; unknown agent / capability-not-in-profile / PENDING_AUTH -> denied). The contract's publish-gate prohibition maps directly: no publish-class capability exists in the 12 profiles, so any publish work order is denied by construction. The FYD contract's input-class rule (A/B allowed, C forbidden without a written record) is enforceable as a work-order constraint (constraints must tighten).
- DELEGATE/MONITOR: issue closed 14-field envelopes with deterministic work_order_id to exterior agents (Hermes proven; goose/qwen/crush CLI proofs on file). 180s dispatcher timeout < 10min deadline; timeout -> honest failed envelope, never fabricated success (proven in A5 claim 3).
- VERIFY/RECORD: `verifyResultEnvelope` binds authorized==invoked==result agent; `recordVerifiedResult` emits WORKER_COMPLETED/WORKER_FAILED only through PING's UnifiedEventRuntime (single authority stays with the spine; ORCA mints no event identity).
- ASSESS/FOLLOW-UP: the t2 pattern (causation_id = prior event_id, input built from live state at follow-up time) chains the 7 contract stages without a human re-dispatching each stage. Worker-reported failure -> same taskId re-issued attempt+1 (max 2 attempts, 2 work orders per run); validation failure or retry exhaustion -> escalate (exit 3).
- Evidence dirs (objective/observe/plan/policy/workorder/dispatch/verify/result/assess/close) satisfy the contract's artifact + signature requirements.

What BLOCKS it:
- A7 was never built: no cron/systemd/service runs the loop. There is no "let ORCA run FYD work without us" yet — only "supervised single-run execution": a human launches `run-loop.sh` with the bounded objective and reads the exit code. Plan around this honestly: the mission runs as one supervised run, with the supervisor as the countersigner the contracts require.
- No browser-verification capability profile exists among the 12. The FYD contract's browser stage would be AUTHORIZE-denied until a profile with CDP/headless-Chrome constraints is written and approved. That denial is the contract working as designed, not a bug.
- `BuildBusiness(sourceManifest)` is a directive, not an implementation: the loop can orchestrate the 7 stage work orders, but there is no single operation to call yet (LANE-ORCH-SPEC is writing it). Until then, multi-stage orchestration is the loop's assess/follow-up chaining, which is proven.

Exact delta to full autonomy for the FYD mission:
1. A7 runner (scheduler that launches run-loop.sh; this is the whole gap between "dormant-capable" and "autonomous").
2. Witnessed A6 re-proof (SIGKILL mid-run -> reconcileStartup recovery; the interruption drill in INTERRUPTION-DRILL.md doubles as this proof — see section on graded drills).
3. One approved browser-verification capability profile (constraints: own CDP port, never the production browser, no business contact, no publish).
4. BuildBusiness implementation (Phase 17/factory), so the loop issues ONE work order instead of seven chained ones.

### Coding mission through the loop

What the loop CAN already do:
- The 10-gate contract maps 1:1: inspect/test/identify/plan = t1 work orders; implement = follow-up t2 work order with isolated-worktree constraint (worktree isolation is the map's one DIRECT_REUSE); test = t3; red-team = follow-up to a DIFFERENT agent profile with an adversarial brief (the loop supports distinct agents; adversarial independence is a policy decision, recorded in orca_policy); integrate = work order constrained to the coordinator's patch flow; report = close artifact.
- Timeout-to-retry is proven (attempt 1 timeout -> honest failed envelope -> WORKER_FAILED -> re-issue attempt+1, A5 claim 3) — directly relevant to flaky test suites.
- The smallest-fix rule's "no new authority" is enforceable as an authorization constraint (capability not in profile -> denied).

What BLOCKS it: same A7 gap (supervised single run); plus the integration gate terminates in a human-owned coordinator by design (the factory's standing rule: lanes propose patches, coordinator integrates) — that is not a bug to fix, it is the boundary the loop must respect.

Exact delta to full autonomy for the coding mission:
1. A7 runner.
2. Witnessed A6 re-proof (the coding mission's own interruption drill: SIGKILL the loop mid-test-run -> reconcileStartup must recover without duplicate delegation).
3. Red-team independence policy written into orca_policy (adversarial follow-ups must go to a different agent/profile with no access to the implementer's artifacts — currently a convention, not enforced).
4. A standing isolated-worktree provisioning step in the loop's delegate path (currently manual).

Bottom line: the A5 loop is a proven-capable, dormant coordinator that can run both missions TODAY as supervised single runs, with the contracts as its task specifications and its authorization boundary as the enforcement of the contracts' prohibitions (no publish, no invented authorization, no business contact). It cannot yet run them "without us" (no A7 runner), and it must not yet run the browser-verification stage (no approved capability profile). The contracts stand regardless of executor.

## 6. Open items and caveats

- Browser verification and Ask FYD stages of the FYD mission were not re-run here (lane boundaries); the mission verdict depends on factory lanes delivering them.
- The render HTML artifacts are snapshots of the live demo server at 2026-09-23 ~20:00 MDT; the server serves from branch fyd-factory @ e48ef710 with 83 dirty files — snapshot, not a pinned build.
- Packet count for this lane: ~24 tool-call packets (recon, Pig probes, test run, 4 deliverables). Running total to update in the wave ledger.
