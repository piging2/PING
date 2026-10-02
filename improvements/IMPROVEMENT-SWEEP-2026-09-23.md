# Continuous Improvement Sweep — 2026-09-23

Mission: durable, not one-shot. Nolan's standing order: never done when a stage finishes — analyze all of PING/FYD and think of improvements.

Method: evidence first. Every candidate: WHAT / WHY IT MATTERS / WHAT EVIDENCE SAYS / EXPECTED VALUE / COST-RISK / REVERSIBILITY. Product improvements (a stranger or Nolan would feel) separated from substrate improvements (only the system feels). Ranked by expected value per effort; value, cost, risk kept visible, no magic single score.

Standing law applied: decide at 80%+, no grill; consequential gates (credential changes, production DB mutation outside app paths, releases/rollbacks, auto-merged harvested code, spending money, external publishing) are Nolan-only; FYD-first tiebreak on conflicts; no new authorities, no second orchestration universe; nothing reopened unless runtime evidence proves a missing invariant.

Lanes: (1) FYD product surface, (2) PING runtime/substrate, (3) deployment/durability, (4) security posture (read-only, zero execution).

Evidence base: all seven 2026-09-23 NEXT-PHASE artifacts, BACKLOG_PING.md NOW frontier (deduped — no candidate below duplicates a NOW item), the deployed FYD candidate a69bb68f inspected read-only on the Pig, deployment provenance/execution records, baseline freeze.

---

## §0 Executive summary

The single strongest cross-lane finding: **the deployed FYD demo's only Service object is demo-added but labeled as a recorded fact** — the demo-honesty machinery is bypassed by a provenance-kind mismatch. Fixing that plus removing demo chrome are the two highest value-per-effort product items; both are presentation/labeling-only.

On the substrate: probe-001 proved *reconstruction* but NOT *attribution*. No record answers "who was authorized to do what to which target with what result." Five of eleven trace hops are missing, and probe-001's own mission.json still says `"running"`. The six missing audit event types are the single largest substrate gap — they upgrade ~10 metrics from narrative to measurement.

On durability: the only production DB with no verified backup is the live Pig `brain-postgres`; the Oracle backup set is 7 days stale. Both are additive, low-risk fixes, one of which is gated.

On security (Lane 4, read-only, no values viewed): credential-hygiene findings CONFIRMED with one correction — the "777" Pig perms are a drvfs artifact, not real; real exposure is narrower (sandbox processes) but genuine. Two posture-changers beyond Lane A: **the Oracle gateway API has no authentication at all** (Pig gateway has the middleware — divergent postures), and **crx-runtime has committed weak default credentials**. The unknown PG prober is assessed as a misconfigured local client, not an external attacker.

Top claimable tasks (ranked): see §1. Gated proposals (Nolan decides): see §2.

---

## §1 Ranked claimable tasks

Ordered by expected value per effort. P = product (stranger/Nolan feels it), S = substrate (system feels it), D = deployment/durability.

### 1. [P] Close the DEMO_SYNTHETIC labeling bypass (extends FYD-038)
- **WHAT:** Objects added by overlay events (in projection `meta.overlayEventIds`) must classify as `DEMO_SYNTHETIC` even when stamped `canonical-journal`. Fix at bundle-load time or dump time. Labeling only; no data deleted.
- **WHY IT MATTERS:** The product promise "every service resolving to real evidence" is violated on the deployed Happy Place demo today: its only Service object was added by overlay event `39fc9971...` from controller `identity_fyd_compiler_test` but is cited as a recorded fact. The 2026-09-22 demo-honesty machinery only fires on kind `"overlay-authored"`; `classificationFromProvenance` maps `canonical-journal` to `DIRECT_FACT`.
- **EXPECTED VALUE:** High. Integrity of the evidence story on the live surface. **COST:** 0.5 day. **RISK:** Low. **REVERSIBILITY:** Full.
- **Acceptance proof:** the Happy Place service object classifies `DEMO_SYNTHETIC`; Ask FYD's "what services do they offer" cites it as a demo addition, not fact; object untouched; existing demo-classification tests pass plus one fixture-grounded regression.

### 2. [P] Remove demo chrome from the tenant product surface
- **WHAT:** Drop "Generated site demo" header and "Procedural clone proof" badge; tab title becomes the business name; gate the "Customize this site" structured editor behind demo-owner-mode (the `DemoOwnerMode` null-when-off pattern already exists). Keep the footer honesty line.
- **WHY IT MATTERS:** The first thing a stranger reads is that this is a demo, not a business. A real owner's first objection would be exactly this chrome. The stranger smoke test cannot pass honestly while the surface announces "procedural clone proof".
- **EXPECTED VALUE:** High. Every future stranger visit, owner preview, screenshot reads as product. **COST:** 0.5–1 day. **RISK:** Low (presentation only). **REVERSIBILITY:** Full.

### 3. [S] Attempt-level budgets + deadline sweeper
- **WHAT:** Add `{max_steps, max_tool_calls, max_wall_clock, deadline_utc}` to every attempt claim record; a periodic *bounded* sweeper marks attempts past `deadline_utc` as `killed: deadline-exceeded` via additive reconciliation (never rewrites history).
- **WHY IT MATTERS:** A dead worker's attempt can sit in `"running"` forever — probe-001's attempt-1 is the living proof. Bounded attempts make "no immortal agents" operational, not aspirational.
- **EXPECTED VALUE:** High. Converts invisible stalls into visible kills. Moves: UNKNOWN_OUTCOMES, WORKER_REPLACEMENTS→SUCCESSFUL_RESUMES interpretability, fewer runaways reaching Nolan. **COST:** Small (schema + sweeper + synthetic probe). **RISK:** Low, fail-closed by construction. **REVERSIBILITY:** Full.

### 4. [D] CI quality gate on piging2/fyd
- **WHAT:** One `.github/workflows/ci.yml`: checkout → Node 24 → typecheck → lint + secret scan + env-allowlist → tests → `next build` → dependency audit. Fail-fast, cheapest first. `GITHUB_TOKEN` minimal (`contents: read`). Quality gate only — never deploys.
- **WHY IT MATTERS:** Without a required check on main, "automatic Production" via Vercel's Git integration is automatic-unsafe-promotion. Today there is no gate at all, so every future merge to main is unverified.
- **EXPECTED VALUE:** High. Gates every future main push; unblocks branch protection. **COST:** Medium. **RISK:** Low. **REVERSIBILITY:** Full.
- **Acceptance proof:** green end-to-end on a test branch; red on a deliberately-failing branch (negative proof); token permissions audited minimal.

### 5. [S] Six missing audit event types
- **WHAT:** Emit `memory_read`, `authorization`, `tool_call`, `effect_receipt`, `memory_write`, `mission_completed` as append-only events through the gateway's existing authorized event path. Same journal, new record shapes; schemas already specified in OBSERVABILITY §1–§2.
- **WHY IT MATTERS:** The attribution invariant. Consequential gates are unenforceable without `authorization` events. `tool_call` makes BLIND_RETRIES measurable instead of inferable from mtimes. Probe-001's mission.json says `"running"` after completion — the mission-closure hop is unproven even in the minimal probe.
- **EXPECTED VALUE:** Very high — upgrades ~10 metrics from narrative to measurement. **COST:** Medium (six emission seams; the `authorization` enforcement half is real work). **RISK:** Medium — if emitted as optional free-text the fields rot; needs a validator on the emission path. **REVERSIBILITY:** High (append-only).
- **Acceptance proof:** re-run of probe-001 shows all six events; mission flips to `completed`; synthetic rogue write produces a `blocked` receipt; BLIND_RETRIES etc. compute from events alone.

### 6. [P] Ask widget posts to trusted-path `/api/fyd/ask/[siteId]`
- **WHAT:** Change `AskFydWidget` to POST the nested route with no tenant identity in the body, per the codebase's own G3 guidance. Legacy flat route retained.
- **WHY IT MATTERS:** Tenant-authority hygiene: the primary interactive widget currently uses the legacy flat route where tenant identity comes from the request body; the nested route refuses body-tenant mismatch with 400.
- **EXPECTED VALUE:** Medium. Closes the body-tenant attack surface on the live widget. **COST:** 0.5 day. **RISK:** Low. **REVERSIBILITY:** Full.

### 7. [D] Env-allowlist lint: secrets can never drift into Vercel env
- **WHAT:** CI job failing when a new `process.env.X` read appears that is not in a committed allowlist, or a new `NEXT_PUBLIC_*` is added without approval. Allowlist documents today's set: `FYD_PROJECTION_DIR` (Preview) and the deliberate absence of `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE`.
- **WHY IT MATTERS:** The secret posture is proven by one scan on one SHA. `NEXT_PUBLIC_` inlines at build time — a mistake is irrevocable once built.
- **EXPECTED VALUE:** Medium-high. Cheap insurance on the highest-consequence failure class. **COST:** Small (~1–2h). **RISK:** Low. **REVERSIBILITY:** Full.

### 8. [S] Silent-brief delta projection with bridge-noise filter
- **WHAT:** Implement OBSERVABILITY §4 as specified: the brief is a watermarked delta over the audit log excluding `created_by=event-to-mission-bridge` noise, implementing the seven EMPTY conditions and seven maximum-signal headings.
- **WHY IT MATTERS:** The Pig bridge emits a micro-mission every ~5s, all `completed`. Without the filter the brief can never be silent and the killer metric (useful tasks per human interruption) is meaningless.
- **EXPECTED VALUE:** Medium — makes the signal/noise ratio honest. **COST:** Small (read-only projection; spec complete). **RISK:** Low. **REVERSIBILITY:** Full.

### 9. [S] First GitHub pipeline activation run — measure real unauthenticated quota cost
- **WHAT:** Run CHANGE_WATCH over the 66-repo seed corpus (conditional HEAD requests, heartbeat the rest, P0 license-change flag) then bounded DISCOVERY (50 stubs), per GITHUB-PIPELINE's "FIRST SCHEDULED MISSION RUN". Primary deliverable: measured unauthenticated quota cost per repo-tick and per-run — the evidence that decides whether the GitHub App token conversation is real or hypothetical.
- **WHY IT MATTERS:** Standing law says proceed unauthenticated and let rate limits actually block before the token conversation. Today that is policy without a measurement.
- **EXPECTED VALUE:** Medium — unlocks the whole scheduling model; also dogfoods tasks 3, 5, 8. **COST:** Small (one bounded read-only run). **RISK:** Low. **REVERSIBILITY:** Full.

### 10. [P] Human-readable proposal review card in the structured editor
- **WHAT:** Replace the raw JSON `<pre>` digest dump in the /sites editor's proposal review with a before/after change card (digest collapsed). Reuse/mirror the `buildSitePatchCard` concept from the Ask FYD site-patch flow.
- **WHY IT MATTERS:** Hostile Q8. The owner-intent mechanism exists in two places, but the editor's review step shows a JSON blob no real owner can evaluate. The proposal UX, not the mechanism, is the blocker.
- **EXPECTED VALUE:** Medium-high. Mechanism exists vs owner can use it. **COST:** 1–2 days. **RISK:** Low (additive UI). **REVERSIBILITY:** Full.

### 11. [D] Automated stranger smoke as a verify-only post-deploy job
- **WHAT:** Triggered by Vercel deployment-success: runs the smoke checklist read-only against the deployment URL (routes 200, no fatal console errors, unsafe-URL probe inert, 320/375 no overflow, SiteSpec renders, and the canonical Ask FYD question once it lands). Posts PASS/FAIL. Never deploys, never mutates, never promotes.
- **WHY IT MATTERS:** Stranger smoke is currently a manual step that has never run. Without automation, every deploy's acceptance depends on someone remembering.
- **EXPECTED VALUE:** Medium-high. **COST:** Medium. **RISK:** Low by design (no deploy credentials). **REVERSIBILITY:** Full.

### 12. [S] Effect ledger + reconcile-vs-retry classifier (design + synthetic proof)
- **WHAT:** Idempotency-keyed ledger for external effects plus a classifier that reconciles before retrying on UNKNOWN_OUTCOME. Neither Orca nor CRX has this; Orca's Retry is blind and user-driven. Synthetic missions only; no real external effects in tests.
- **WHY IT MATTERS:** The only item here where the failure mode is real-world damage: blind retry of a mission that already sent an email sends two emails. Prerequisite for trusting the substrate with outreach, publishing, or spending-adjacent actions.
- **EXPECTED VALUE:** High but latent — pays out when real missions run. **COST:** Medium-large (genuinely inventive). **RISK:** Medium — a classifier that suppresses a needed retry is as bad as a blind retry; needs adversarial testing. **REVERSIBILITY:** Medium (ledger append-only; classifier decisions are consumed history).
- **Acceptance proof:** synthetic mission: effect "sent", worker dies before reporting; classifier reconciles from ledger and suppresses retry — sink shows exactly one effect. Adversarial variant: no ledger entry → retry NOT suppressed.

### 13. [D] Rollback drill: prove candidate-84486f056 actually restores
- **WHAT:** On Oracle, restore current DB into temp volume + temp port (never live ports/volumes/names), boot the digest-pinned rollback image against it, assert `/health` healthy and migration ledger noop, tear down. Dated drill artifact.
- **WHY IT MATTERS:** The rollback anchor is an assertion, not a proof. dep-rollback-proof is OPEN. A rollback never executed is a hope.
- **EXPECTED VALUE:** High. **COST:** Medium. **RISK:** Medium-low (scratch-only by construction). **REVERSIBILITY:** Full.

### 14. [D] Branch protection + production promotion rule on piging2/fyd
- **WHAT:** After CI lands and the import completes: require the CI gate on `main`; pin Vercel production branch to `main`; Preview per branch; `main` → Production only when required checks pass; Deployment Protection ON for Preview. One-page deploy doc.
- **WHY IT MATTERS:** The repo's GitHub default branch is `fyd/builder-composition`, not `main` — the wrong-branch deploy trap is live until explicitly defused.
- **EXPECTED VALUE:** Medium. **COST:** Small. **RISK:** Low. **REVERSIBILITY:** Full. **Blocked on:** CI gate + Nolan's import.

### 15. [S] Store-layer enforcement of the transition table
- **WHAT:** Port Orca's pure `Apply(from, event) → (to, error)` table with the fix Orca missed: the store calls `Apply()` first and rejects `ErrIllegalTransition`. A validator inside the existing writer path, not a second authority.
- **WHY IT MATTERS:** Orca's table is "true of the function and false of the system" — `Store.UpdateStatus` writes raw statuses. Cheapest invariant on the list.
- **EXPECTED VALUE:** Medium-low standalone, compounding. **COST:** Low. **RISK:** Low. **REVERSIBILITY:** High.

### 16. [D] Oracle backup freshness: re-run the verified backup set to current state
- **WHAT:** Re-execute the 2026-09-16 procedure against current Oracle state (pg_dump sha256-recorded, Qdrant snapshot, source tar, restore doc updated: ping_events=2557, missions=483, migration v11).
- **WHY IT MATTERS:** The "full verified backup set" is 7 days stale and predates the entire dual-writer window. A restore from it loses a week of journal history.
- **EXPECTED VALUE:** Medium. **COST:** Small-medium. **RISK:** Low. **REVERSIBILITY:** Additive.

### 17. [S] Durable attempt run row (PG journal namespace)
- **WHAT:** Close crx-audit gap #3: attempt row `(mission_id, attempt_seq, worker binding, worktree path, input digest + input text, typed status)` as a projection of canonical `ping_events` — never a second writer. Status mutations through the task-15 transition table.
- **WHY IT MATTERS:** Probe-001 worked file-local because it had one task and two attempts. At scale, "the previous attempt's state" needs an identity that outlives any process. Join key for WORKER_REPLACEMENTS / SUCCESSFUL_RESUMES.
- **EXPECTED VALUE:** Medium (future scale). **COST:** Medium. **RISK:** Medium — the #1 risk is scope creep into a second orchestration universe; the "projection, never a second writer" constraint must be in the acceptance proof. **REVERSIBILITY:** Medium.

### 18. [S] Worktree create/archive discipline (Orca harvest, direct)
- **WHAT:** Port Orca's `CreateForRun`/`Archive` with four hardenings: typed kind enum, typed idempotent errors, branch-ownership check on archive, create+archive lock per runID.
- **WHY IT MATTERS:** Parallel attempts editing one checkout collide; archive-before-prune is the "never destroy" primitive for killed runs.
- **EXPECTED VALUE:** Medium. **COST:** Low-medium. **RISK:** Low. **REVERSIBILITY:** High.

### 19. [P] Evidence-grounded suggested-question chips in the Ask FYD widget
- **WHAT:** 2–3 suggested-question chips above the Ask input, derived from schema roles present in the tenant graph. Never suggest a question the graph cannot answer.
- **WHY IT MATTERS:** The generic placeholder produces honest refusals that read as product failure. Suggestions only where evidence exists turn the refusal machinery into a strength.
- **EXPECTED VALUE:** Medium. **COST:** Low (client-only). **RISK:** Low. **REVERSIBILITY:** Full.

### 20. [D] Healthcheck on the Oracle gateway deploy config + disk-hygiene dry-run
- **WHAT:** Add `GET /health` healthcheck + restart policy to the Oracle gateway config at the next controlled promotion (no live restart now). Separately: dry-run the Pig's `<15% free` disk trigger and record the logged event plus current C: free space.
- **WHY IT MATTERS:** Oracle gateway has `health: null` — nothing knows if it's sick. The 09-13 Docker-daemon death at 1.5% C: free is the highest-severity Pig infra failure on record, and the hygiene alerting path is unverified.
- **EXPECTED VALUE:** Low-medium each. **COST:** Small each. **RISK:** ~Zero / low. **REVERSIBILITY:** Full.

### 21. [S] Dependency-aware ready-set query (invention)
- **WHAT:** `depends_on(run_id, dep_id)` edge table + ready-set query (all deps terminal-success), cycle/self-edge rejection at insert, evaluated atomically with claim.
- **WHY IT MATTERS:** CRX missions are independent today; multi-step missions decompose "in the coordinator's head." This is the gap between the flat mission list and real decomposed work.
- **EXPECTED VALUE:** Medium-low now, high when multi-task missions exist. **COST:** Medium. **RISK:** Medium — wrong ready-set semantics silently block or misfire missions; needs adversarial tests. **REVERSIBILITY:** Medium.

### 22. [S] Orca persistent watch activation (weekly poll)
- **WHAT:** Scheduled mission: weekly HEAD-SHA poll + releases API (conditional, unauthenticated), state in `orca-watch/state.json`, escalation to daily for 30 days on SHA change. Meaningful-change classifier decides review-task creation.
- **WHY IT MATTERS:** Harvest/reject decisions rot; Orca's README documents features that don't exist. This is the STALE_ASSUMPTIONS check for the harvest layer.
- **EXPECTED VALUE:** Low (insurance). **COST:** Tiny. **RISK:** None. **REVERSIBILITY:** Full. **Note:** creating the schedule is persistent state — Nolan's call (Gated 8 below).

---

## §2 Gated proposals — Nolan decides, nothing executed

### G1. brain-postgres + brain-qdrant backup (the missing production backup)
- **WHAT:** Daily `pg_dump -Fc` of `brain-postgres`/`ping_runtime` + daily Qdrant snapshots, staged on the Pig outside Docker volumes, copied off-host to Oracle `/opt/ping/backups/pig-brain/`. 14-day retention. Weekly automated restore-verification into scratch containers (isolation pattern from RESTORE-2026-09-16.md): counts ≥ last known, migration ledger max=11, spot-check a known event hash; PASS/FAIL recorded as a PING event, Nolan notified on failure only.
- **WHY IT MATTERS:** The only production DB with no verified backup. The mission pipeline writes every ~5s; every day widens the unrecoverable-loss window. Single highest value-per-effort item in the sweep.
- **EVIDENCE:** Baseline freeze: "No verified backup of the live brain-postgres/ping_runtime database was found"; existing pg_dump files of unknown provenance; no crons touch either plane; the live DB sits on a single-volume Windows box that already lost Docker to disk pressure.
- **VALUE:** Very high. **COST:** Small-medium to build; minutes of Pig I/O daily. **RISK:** Low (pg_dump is read-only; writes are new files + scratch containers). **REVERSIBILITY:** Full.
- **DECISION:** (a) scope: daily PG dump + Qdrant snapshots (recommended) vs PG-only; (b) destination: Oracle host (recommended) vs cloud object storage; (c) retention: 14 days (recommended) vs other; (d) scheduler: Windows Task Scheduler wake-to-run (recommended) vs WSL cron vs scheduler container; (e) restore-verification: weekly automatic (recommended) vs manual.

### G2. DEPLOY-PROV-001: resolve the dual-writer
Already in the one grill (GRILLING-BRIEF.md); not duplicated. New from this sweep: the concrete breakage modes if it manifests — duplicate micro-mission emission (both EventBridge poll loops active), duplicate completion/event IDs (CE-001 documents completion identity is already fragile: `Date.now()` in the preimage, lease-reaper duplication, emit-before-check — two writers multiply every one of those modes), concurrent migration or advisory-lock contention on future promotions. No active corruption observed; risk is latent. What changes the recommendation: (a) evidence of duplicate events attributable to the second writer → stop :8081 immediately; (b) a discovered promotion record → the "undocumented" premise dissolves; (c) health degradation on either container → treat as the predicted failure. Recommended: accept candidate-3c5d280dd as the honest baseline, stop :8081, populate the deployment registry.

### G3. Credential hygiene batch (Lane 4, verified read-only, no values viewed)
Verified: literal PG password at `C:\Users\nolan\PING\docker-compose.yml:40` (~12 chars); `.env.muse` truly world-readable (755 on ext4) holding both live gateway API keys; vault dev-mode (trivial root token — not a secret store); MUSE key ownership/rotation unknown; Oracle gateway backups 664 + unencrypted.
Correction worth knowing: the "777" Pig perms are a drvfs artifact, not real permissions — real Windows ACLs are Nolan/Admins/SYSTEM + CodexSandboxUsers read-only. Exposure is narrower than "world" but genuine for sandbox processes.
- **DECISION (batch or separately):** (1a) authorize rotating the live brain-postgres `POSTGRES_PASSWORD` and converting the compose line to `${...}` interpolation from a 600 env file — with the caveat that the compose entry is probably the stale 5433 postgres, not the live DB, so Nolan names which credential he wants rotated; (1b) chmod 600 + service-user chown on `/home/nolan/ping-gateway-src/gateway/.env.muse` (zero downtime, cheapest real exposure closed); (1c) ping-vault: strike it from the trust story entirely, or fund a real Vault promotion project; (1d) name an owner and rotation procedure for `MUSE_LEVEL_1/2_KEY`, or rotate now (requires gateway restarts).

### G4. Oracle gateway API auth posture (new posture-changer from Lane 4)
- **WHAT EVIDENCE SAYS:** The Oracle gateway image has no auth middleware (`exterior_auth_middleware.js` absent; `/health` and `/events` return 200 with no credentials and with a bogus bearer). The Pig gateway HAS the middleware. The two planes have divergent auth postures. Lane A's open question 1 is now answered: Oracle API auth = none, loopback-only binding.
- **WHY IT MATTERS:** Anyone/anything on the Oracle host reads the event stream with no credentials.
- **DECISION:** port the Pig's exterior-auth middleware into the Oracle gateway image (rebuild + redeploy = a release action, brief gateway downtime, must not break the event bridge), or formally record "loopback-binding is the intended and sufficient control." **Reversible** via redeploy of the pinned digest.

### G5. brain-postgres network exposure + backup at-rest encryption
- **WHAT EVIDENCE SAYS:** brain-postgres publishes 0.0.0.0:5432 — LAN-reachable, password as the only control, on a machine that travels. Oracle backup artifacts are 664 + unencrypted; two mislabeled `.env.bak-*` files.
- **DECISION:** (a) rebind brain-postgres to 127.0.0.1 (brief DB downtime on container recreate; reversible); (b) encrypt Oracle backups at rest with a Nolan-held key + chmod 600 + keep-or-delete the `.env.bak-*` files (blast radius of doing nothing: any local foothold on the Oracle host yields the full production DB dump in plaintext).

### G6. Vercel env rule enforceable + prober follow-up + Orca watch cron
- (a) "No secrets in Vercel env" is currently convention-only (no CI, no pre-deploy script; the connected Vercel credential sees zero projects and gets 403 on teams, so current env is unauditable). **DECISION:** check in a `VERCEL_ENV_ALLOWLIST.md` in the FYD repo (covered by claimable task 7) and get a Vercel-team-scoped read token so a scheduled job can diff `/v9/projects/{id}/env` against the allowlist and alert.
- (b) Unknown PG prober: 13 FATAL lines across 9/21–9/22 (Lane 4 corrected the count; the one `password authentication failed for user "ping"` line proves a container-network source during the 9/21 deploy window — misconfigured local client, not an external attacker). **DECISION:** (A) nothing further, (B) enable `log_connections=on` + `%h` in `log_line_prefix` via `pg_reload_conf()` (no restart) so the next probe is attributable, or (C) one deeper forensics pass.
- (c) Orca watch cron: confirmed absent on all three surfaces. **DECISION:** activate now (claimable task 22's schedule), keep deferred, or drop.

### G7. Docker VHDX compaction (6.2 GB, controlled window)
- **DECISION:** approve a maintenance window (the Pig is Nolan's machine; downtime pauses the mission pipeline + gateway) with shutdown order: stop containers → stop Docker Desktop/WSL backend → compact → restart → verify all containers healthy + gateway /health green. Disk pressure already killed the daemon once; the alerting path (claimable task 20) is the early-warning fallback.

### G8. piging2/fyd default branch → main
- **DECISION:** in the same browser session as the Vercel import, flip the repo default branch from `fyd/builder-composition` to `main` (~2 minutes, removes the wrong-branch trap permanently; Vercel's production branch stays explicitly `main` regardless).

---

## §3 Deliberately not proposed / not reopened

- Real Service objects for Coppersmith / richer acquisition: NOW-1/NOW-2, the authorized frontier. Nothing to add.
- Direct tel:/mailto: outside contact flow: settled by Nolan's directive.
- FYD-009, GEN-CONSTRAINT, FYD-010, FYD-012, FYD-021, FYD-037: frontier items, untouched.
- Production read seam pointing at `__tests__/fixtures`: observed, parked until NOW-1 produces a real projection store.
- Git history rewrite for committed weak defaults (crx-runtime): explicitly NOT proposed (destructive); neutralize forward instead (Lane 4 P8, proposed as claimable with the no-history-rewrite constraint — folded into the gated batch at Nolan's discretion).
- No new authorities, no second orchestration universe, no new event system, no secrets platform (Lane 4 agrees with Lane A's REUSE verdict: a new platform fixes none of the actual gaps).

## §4 Dedupe notes

- Effect ledger: coordinate with BACKLOG_PING `MC-28` (failure classification vocabulary) and `recon-disposition-vocabulary`; reuse `fail-ledger-hygiene`'s "classification + evidence + invariant learned" entry shape.
- Attempt row: respect `MC-20` (mission ledger vs event journal boundary); share grant vocabulary with `cap-grant-audit` / `MC-35` / `MC-39`.
- GitHub quota run: also measure duplicate-verification rate (`cost-verification-cache`: 63–72% duplicate verification load) so both fixes share one dataset.
- Pre-introduction audit: `evidence-single-authority` / `xcut-no-second-authority-audit` before any candidate adding a store (tasks 15, 17, 21).
