# Improvement Sweep — Mission Task Backlog (2026-09-23)

Ranked claimable tasks from the continuous improvement sweep. Evidence-backed; deduped against BACKLOG_PING.md NOW frontier. Claim one, work it, verify with tool evidence, mark DONE_VERIFIED with the proof.

Claim protocol: copy the task row into your attempt record; do not start a task marked BLOCKED-ON; gated items are NOT in this file (they live in the sweep doc §2 and need Nolan).

| # | Task | Acceptance proof | Effort | Blocked on |
|---|------|------------------|--------|-----------|
| 1 | Close DEMO_SYNTHETIC labeling bypass (extends FYD-038) | Happy Place service object (overlay `39fc9971...`) classifies DEMO_SYNTHETIC; Ask FYD cites it as demo addition not fact; object untouched; demo-classification tests pass + 1 fixture regression | 0.5d | — |
| 2 | Remove demo chrome from tenant product surface | Demo-mode OFF: no demo header/badge, no editor, tab title = business name; footer honesty line stays; mode ON restores proof chrome; verified on deployed preview | 0.5–1d | — |
| 3 | Attempt-level budgets + deadline sweeper | attempt.json requires {max_steps, max_tool_calls, max_wall_clock, deadline_utc}; synthetic past-deadline attempt marked `killed: deadline-exceeded` via additive event only; sweeper is itself a bounded mission | 1–2 sessions | — |
| 4 | CI quality gate on piging2/fyd | Green on test branch; red on deliberately-failing branch; GITHUB_TOKEN minimal; zero secret refs | M | — |
| 5 | Six missing audit event types | Probe-001 re-run shows memory_read, authorization, tool_call, effect_receipt, memory_write, mission_completed; mission flips completed; synthetic rogue write → `blocked` receipt; metrics compute from events alone | M | — |
| 6 | Ask widget → trusted-path /api/fyd/ask/[siteId] | No body tenant identity; tenant_mismatch still 400s; widget tests updated; flat route retained | 0.5d | — |
| 7 | Env-allowlist lint for Vercel | CI red on test branch adding `process.env.SNEAKY_KEY`; green on main; allowlist + names-only env doc committed | S | — |
| 8 | Silent-brief delta projection + bridge filter | Window of only bridge micro-missions → EMPTY brief; synthetic non-bridge transition appears under correct heading; 7 EMPTY conditions evaluated from records; filter rule versioned | S | — |
| 9 | First GitHub pipeline activation run | 66 seed identities resolved with conditional requests; per-endpoint counts + 304 rate logged; P0 path exercised or "no P0"; reserve-threshold stop demonstrated or "never hit"; per-tick quota cost reported with yes/no on 30-repo daily tier sustainability | S | — |
| 10 | Human-readable proposal review card | Any intent renders before/after card with digest collapsed; approval still applies exact digest-bound proposal | 1–2d | — |
| 11 | Automated stranger smoke (verify-only) | Preview deploy → PASS status with per-check table; deliberately broken preview → FAIL + notify; no deploy/env mutation by the job (credential scope audited) | M | Nolan's Vercel import |
| 12 | Effect ledger + reconcile-vs-retry classifier (design + synthetic proof) | Design doc (idempotency-key format, ledger shape, classifier table from test-07 draft, authority story); synthetic: effect sent, worker dies, classifier suppresses retry — sink shows exactly one effect; adversarial: no ledger entry → retry NOT suppressed; no real external effects | M–L | — |
| 13 | Rollback drill on Oracle | Dated artifact: restored counts ≥ baseline, /health healthy from candidate-84486f056, migration noop, scratch teardown, live untouched | M | — |
| 14 | Branch protection + production promotion rule | Protection requires CI check; Vercel production branch = main; promotion rule documented; Deployment Protection on for Preview | S | 4 + Nolan's import |
| 15 | Store-layer transition-table enforcement | Illegal status writes rejected at store; legal transitions unaffected; validator inside existing writer path | S | — |
| 16 | Oracle backup freshness re-run | New dated artifacts with sha256s; restore doc updated (ping_events=2557, missions=483, migration v11) | S–M | — |
| 17 | Durable attempt run row (PG journal namespace) | Row = projection of ping_events, no second writer (pre-introduction audit evidence-single-authority first); status mutations through task 15's table; MC-20 boundary respected | M | — |
| 18 | Worktree create/archive discipline (Orca harvest) | Typed kind enum, idempotent typed errors, branch-ownership check, per-runID lock; verified against live repo HEAD imports | S–M | — |
| 19 | Ask FYD suggested-question chips | 2–3 chips derived from schema roles present in graph; never suggests unanswerable questions | S | — |
| 20 | Oracle gateway healthcheck + Pig disk-hygiene dry-run | Config diff shows healthcheck (applied at next promotion, no live restart); dry-run trigger fires with logged event + current C: free space recorded | S | — |
| 21 | Dependency-aware ready-set query | Edge table + atomic ready-set evaluated with claim; cycle/self-edge rejected at insert; adversarial tests; pre-introduction audit first | M | — |
| 22 | Orca watch activation | Weekly conditional poll scheduled; state in orca-watch/state.json; daily escalation on SHA change; classifier decides review tasks | S | Nolan (gated G8 in sweep) |

Gated items (NOT claimable): G1 brain-postgres backup, G2 dual-writer (grill DEPLOY-PROV-001), G3 credential hygiene batch, G4 Oracle gateway auth posture, G5 DB rebind + backup encryption, G6 Vercel token / prober logging / watch cron, G7 VHDX compaction, G8 default-branch flip. See IMPROVEMENT-SWEEP-2026-09-23.md §2 for exact decision questions.
