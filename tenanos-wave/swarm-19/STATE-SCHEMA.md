# TenantOS Convergence Wave: STATE.json Schema (Swarm 19)

Machine-readable wave state lives at `~/workspace/tenanos-wave/STATE.json`.
The coordinator owns it. Swarms read it; only the coordinator (and Swarm 19
acting as its writer on instruction) mutates it. It is the single source of
truth for what is proposed, who owns it, and what has been proven.

## Top-level fields

| Field | Type | Required | Meaning |
|---|---|---|---|
| `wave` | string | yes | `"tenanos-autonomous-convergence"` |
| `schema_version` | string | yes | `"1.0.0"`; bump minor on additive field changes, major on breaking changes |
| `repo` | string | yes | `"/home/nolan/projects/ping"` (Pig WSL path) |
| `base_branch` | string | yes | Branch the wave forks from, e.g. `"fyd-factory"` |
| `base_commit` | string | yes | Exact SHA all wave branches fork from, e.g. `"e48ef710..."` |
| `integration_branch` | string | yes | `"tenanos-wave/integration"` |
| `updated_at` | string (ISO-8601) | yes | Last mutation time |
| `updated_by` | string | yes | Who mutated, e.g. `"coordinator"`, `"swarm-19"` |
| `proposals` | array of proposal | yes | All proposals, newest last |

## Proposal object

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique, e.g. `"P-20260923-001"`. Format: `P-YYYYMMDD-NNN`, NNN zero-padded sequence per day |
| `title` | string | yes | One-line human summary |
| `swarm` | string | yes | Owning swarm, two digits, e.g. `"02"` |
| `writer` | string \| null | yes | Assigned single writer (swarm id or agent id); null until assigned |
| `status` | enum | yes | `proposed` \| `approved` \| `applied` \| `tested` \| `integrated` \| `rejected` |
| `files_touched` | array of string | yes | Exact repo-relative paths in the diff |
| `claimed_areas` | array of string | yes | Glob patterns for overlap detection, e.g. `"src/tenanos/mission/**"`, `"package.json"`. A superset of `files_touched`; includes areas the swarm intends to own while the proposal is non-terminal |
| `diff_ref` | string \| null | yes | Path to approved diff artifact, e.g. `"diffs/P-20260923-001.diff"` (relative to tenanos-wave/) |
| `branch` | string \| null | yes | `tenanos-wave/<swarm>-<slug>` once created |
| `worktree` | string \| null | yes | Pig WSL worktree path once created |
| `base_commit` | string \| null | yes | SHA the branch forked from (must equal wave `base_commit` unless the coordinator re-based the wave) |
| `commit` | string \| null | yes | Local commit SHA once Gate 4 passes |
| `integration_commit` | string \| null | yes | Integration-branch commit once Gate 5 passes |
| `oracle_touch` | boolean | yes | Must be `false` for all wave proposals. `true` is a schema violation and blocks approval |
| `test_results` | object \| null | yes | See below |
| `failure_ledger` | array of string | yes | FL entry ids linked to this proposal, e.g. `["FL-20260923-101"]`; empty array if none |
| `decided_by` | string \| null | yes | Who made the last status transition, e.g. `"coordinator"` |
| `notes` | string | yes | Free text: evidence links, adversary findings, rejection reason |
| `created_at` | string (ISO-8601) | yes | |
| `updated_at` | string (ISO-8601) | yes | |

`test_results` shape (null until Gate 2 runs):
```json
{
  "typecheck": {"command": "tsc --noEmit -p tsconfig.json", "pass": true, "at": "..."},
  "unit": {"command": "jest --config src/tenanos/jest.config.cjs <paths>", "suites": 4, "tests": 31, "pass": true, "at": "..."},
  "lint": {"command": "eslint <files>", "pass": true, "at": "..."},
  "adversarial": {"suites": 2, "tests": 9, "pass": true, "findings_open": 0, "at": "..."},
  "merged": {"typecheck_pass": true, "suites_pass": true, "boot_smoke_pass": true, "at": "..."}
}
```

## Status machine

```
proposed -> approved -> applied -> tested -> integrated
   |           |          |          |
   +---> rejected <------+----------+  (any gate failure with evidence)
```
- `proposed`: swarm filed intent + `claimed_areas` + draft diff. Overlap check runs here.
- `approved`: coordinator assigned writer, stored the approved diff artifact.
- `applied`: diff applied on the isolated branch/worktree, clean-check passed.
- `tested`: Gates 2 and 3 PASS with evidence in `test_results`.
- `integrated`: merged to the integration branch AND Gate 6 (merged-state tests) PASS.
- `rejected`: terminal. `notes` must carry the reason + evidence. A reworked
  idea gets a NEW proposal id; ids are never reused.

Rules:
- Transitions only move forward except `-> rejected` from any state, and
  `integrated -> approved` (reopen) when Gate 6 fails on the merged tree.
- `status` changes require `decided_by` and a fresh `updated_at`.
- No proposal may skip a status.
- `oracle_touch: true` blocks `approved` permanently.

## Overlap detection (early-warning)

Before approving a proposal, the coordinator runs
`~/workspace/tenanos-wave/swarm-19/check-overlap.py`, which compares the new
proposal's `claimed_areas` globs against every non-terminal proposal
(`proposed|approved|applied|tested`). Any glob overlap is reported with both
proposal ids; the coordinator then serializes (one writer proceeds, the other
waits or becomes reviewer) or narrows the claimed areas.

Shared-seam files that must never be co-claimed:
`package.json`, `tsconfig.json`, `src/tenanos/jest.config.cjs`,
any `src/tenanos/types.ts` or shared schema file once created.

## Failure-ledger linkage

Any gate failure, adversarial finding, or merged-state regression that is not
fixed inside the proposal's own scope opens an entry in
`~/workspace/FAILURE_LEDGER.md` (format `FL-YYYYMMDD-NNN`) and is linked in
the proposal's `failure_ledger` array. The ledger entry is the durable record;
STATE.json only links to it.
