# Merge-Conflict Early-Warning Scan (Swarm 19, 2026-09-23 ~19:00 MDT)

Method: every swarm is still in exploration (spawned 18:36-18:37 MDT; no
claimed file areas declared yet except P-20260923-001). This scan maps each
swarm's charter to its LIKELY patch area, flags the shared seams where two
charters converge on the same files, and states the serialization the
coordinator must enforce before approving diffs.

Standing input: ~/workspace/tenanos-wave/WAVE-LEDGER.md (18 swarms, all
read-only vs the repo, coordinator is sole write dispatcher).

## Canonical-root decision (coordinator: decide before first code diff)

All wave substrate code must live under ONE new root: `src/tenanos/**`.
Do not let parallel roots proliferate (`src/orca/`, `src/mcp/`, `src/mission/`
as siblings would create competing authorities for the same loop stages).
Constitutional rule of one applies to directory layout too.

## Charter-to-area map (likely patch areas)

| Swarm | Charter | Likely area (new, under src/tenanos/) | Overlap risk |
|---|---|---|---|
| 01 | Tenant reality / boundaries | `tenant/**` (tenant scoping invariants) | HIGH: `src/fyd/tenant/` already exists in the FYD tree. 01 must NOT touch it (separate coordinator's lane). New code goes in `src/tenanos/tenant/` only |
| 02 | ORCA mission engine | `mission/**` (mission schema, lifecycle) | HIGH with 09 (see below) |
| 03 | MCP / tool plane | `mcp/**`, `tools/**` (registry, invocation) | HIGH with 04 |
| 04 | Tool safety / side effects | `tools/policy/**`, side-effect gates + tests | HIGH with 03: 04 writes policy/tests against 03's registry. Serialize: 03 owns registry source, 04 owns policy source + adversarial tests |
| 05 | Memory convergence | `memory/**` (store, write path) | MEDIUM with 06 |
| 06 | Memory adversary | tests only vs 05's area | LOW if tests-only holds; 06 never edits 05's source except via coordinator diff |
| 07 | Observability | `observe/**`; may want `src/app/api/diagnostics/` (exists) | MEDIUM: diagnostics routes are shared surface, serialize |
| 08 | Mission Control | `control/**` + API routes `src/app/api/tenanos/**` | MEDIUM: route dirs are per-directory (low file collision) but the route index/conventions are shared |
| 09 | Task claiming | `mission/claim/**` | HIGH with 02: claiming is a mission-engine seam. Either 02 owns `mission/**` incl. claim files and 09 reviews, or split files explicitly (`mission/engine.ts` vs `mission/claim.ts`) with both recorded in claimed_areas |
| 10 | Human decision budget | `human/**` (escalation, budgets) | LOW; touches mission seam at the escalation boundary, coordinate with 02 |
| 11 | Failure recovery | `recovery/**`; appends to `~/workspace/FAILURE_LEDGER.md` | LOW: ledger is append-only by convention; never rewrite another entry |
| 14 | Harvest runtimes | `adapters/**` (runtime harvest adapters) | LOW-MEDIUM: adapter registry may collide with 03's tool registry, coordinate naming |
| 15, 16, 18, 20 | Adversaries / gauntlet | tests only (`**/*.adversarial.test.ts`) | LOW provided they never edit source trees directly |

## Shared seams: serialize to ONE non-terminal claimant

These files/areas must never be co-claimed. `check-overlap.py` enforces this
once claimed_areas are declared; until then the coordinator enforces by rule:

1. `package.json` (scripts, deps) - every swarm will want a script. Route ALL
   package.json edits through single-writer proposals.
2. `tsconfig.json` - same.
3. `src/tenanos/jest.config.cjs` - claimed by P-20260923-001 (swarm 19). No
   other proposal may claim it while non-terminal.
4. `src/tenanos/types.ts` (or any shared schema file) - first swarm to need
   shared types files a proposal; others consume, never co-edit.
5. `src/app/api/**` route files - per-directory files rarely collide, but
   shared middleware/conventions do. Declare route dirs in claimed_areas.
6. `.github/` - untracked, part of the FYD dirty set. Wave does not touch.

## Exclusion zones (wave diffs must never include these)

- `src/fyd/**`, `src/app/**/fyd/**`, `src/components/fyd/**` - FYD product
  lane (separate coordinator, 16 agents, 66 dirty files on fyd-factory).
- `src/lib/ping/**` - PING site lane code, not substrate.
- Anything under the 66 dirty files in the main worktree. The worktree
  mechanism (branch from base SHA, clean-check before apply) enforces this.

## Current state and coordinator actions

- Declared claims so far: P-20260923-001 (swarm 19, `src/tenanos/jest.config.cjs`,
  status proposed). No other claims. Overlap check: clean.
- REQUIRED before any swarm's first diff: the swarm declares `claimed_areas`
  in STATE.json (coordinator records a `proposed` proposal). The coordinator
  runs `check-overlap.py` on every approval.
- Highest near-term collision risks to pre-serialize: 02 vs 09 (mission/claim
  seam), 03 vs 04 (tool registry vs safety policy), 01 vs FYD lane
  (`src/fyd/tenant/` boundary).
- Re-run this scan when the first 3 code proposals land or when any swarm's
  charter drifts into another's claimed area.
