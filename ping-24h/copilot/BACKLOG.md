# Copilot backlog queue (visible, persistent)

Owner order 2026-09-28 ~15:23 MDT: burn the Copilot pool (identities 1-4 only; 5-10 denied) on highest-leverage tasks. Maximum useful parallelism, not token consumption as KPI. Weight away from identity_1; surface to Nolan when it needs more tokens. Fail closed on unknown/stale quota. One writer per semantic unit; Copilot as readers/falsifiers/bounded implementers on isolated branches only. No pushes. No dirty-work overwrite. No new authorities or truth stores.

Live quota 15:19 MDT (entitlement remaining, not tasks-remaining): identity_1 52, identity_2 176, identity_3 185, identity_4 175.

## Wave 1: P0 forest sweep verification (DISPATCHED 2026-09-28 ~15:25 MDT)

Read-only verification of B15 classification and B14 forest map. Evidence staged Pig-side at /home/nolan/copilot-broker/evidence-ping24h/.

- CP-01 (identity_2): verify B15 VALUABLE-COMPLETE C1-C3 (Ask FYD honesty 17, owner correction 12, object feed 23). Per-file diff membership, header/finding-ID evidence, originating-lane attribution, ContextPack patch-region overlap.
- CP-02 (identity_3): verify B15 VALUABLE-COMPLETE C4-C7 (proceduralize/retrieval 9, secret broker 4, .github agent defs 10, journal gateway tooling 3).
- CP-03 (identity_4): verify B15 VALUABLE-PARTIAL (MC dispatch hardening 13, digest consolidation 9, sites UI/lab 13). Pin the exact "partial" rationale; document the 3-way digest divergence with paths and line numbers.
- CP-04 (identity_2): verify B14 forest map C1-C5 (Ask FYD, context compilation, evidence binding, owner correction, conversational customization). Confirm canonical paths and worktree alternatives exist.
- CP-05 (identity_3): verify B14 C6-C10 (regeneration, generated experience, decision fabric, worker contract, MC projection).
- CP-06 (identity_4): verify B14 C11-C17 (MC dispatch, journal gateway, tenant isolation, digest authority, secret broker, engagement guard, builder homes) plus all 8 duplication defects with file paths.

## Wave 2: queued (dispatch as wave 1 clears)

- CP-07: Ask FYD strongest-implementation comparison. Read canonical Ask FYD, the dirty-tree Ask FYD edits (B15 C1), and the ask-loop worktree's 12 uncommitted Ask FYD edits (incl. ask-composer.ts +150) on its merged ancestor. Rank by: evidence binding, honesty/ABSTAIN behavior, owner-correction path, test coverage. Verdict: which implementation wins, what gets harvested from the losers. Read-only; no code changes.
- CP-08: B15 DUPLICATE/SUPERSEDED/GENERATED verification (mc-approval vendored 9, 4 backup files, media manifests, var/ outputs). Confirm canonical sources and safe-to-ignore status.
- CP-09: B14 stranded-branch triage read: tenanos-wave branches P-089/091/092/095/098/100/103/104-105. For each: one-paragraph capability summary, overlap with canonical, verdict HARVEST / SUPERSEDED / UNKNOWN. Read-only.
- CP-10: B14 stranded-branch triage read: design lanes 04-08 + render-wire + fix-evidence-ref + fyd/builder-rebuild-v1 + constitutional-convergence-v2 (12 dirty). Same format as CP-09.
- CP-11: Falsifier swarm seed: replay B1 decision-surface claims from a clean checkout. Verify the 42 surfaces; confirm the declared-only/unreached list.
- CP-12: Falsifier swarm: replay B3 reached-path weak edges 1-5 from clean checkout. Confirm each edge reproduces.
- CP-13: Falsifier swarm: replay B4 recovery failures from clean checkout. Confirm each execution-confirmed failure.

## Wave 3: gated

- CP-JEV: independent verification of every JEV gateway candidate pre-edit proof and acceptance-matrix line. GATED on the parent-owned JEV lane producing the candidate proof. Do not dispatch before the gate clears.
- CP-CTX: ContextPack 3-way merge analysis (dirty route.ts vs patch branch vs canonical). GATED on Nolan authorizing the merge sequencing. Analysis only, no merge.

## Dispatch protocol (for the coordinator)

1. Refresh quota: read /home/nolan/copilot-broker/state/identities.json (fail closed if stale >15 min or any identity not OK).
2. Pick the next backlog task; assign the identity with the most remaining quota among 2/3/4 (identity_1 only when 2/3/4 are all below 40).
3. Write task JSON to /home/nolan/copilot-broker/tasks/<id>.json via stdin-fed SSH; verify byte count.
4. Dispatch in background: node /home/nolan/copilot-broker/dispatch-task.js <task json>.
5. Record dispatched in tracking.json immediately.
6. On completion handoff or report file appearance: update tracking.json (completed/failed), append the verdict to the LEDGER, and dispatch the next task.
