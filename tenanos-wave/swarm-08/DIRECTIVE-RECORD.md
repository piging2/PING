# Coordinator Directive Record — Swarm 08

**Received:** 2026-09-23 ~18:36 MDT (follow-up handoff). Recorded here; applied below.

## The three directives

1. **Canonical code root for ALL wave substrate code is `src/tenanos/**`.** No other new roots (`src/orca/`, `src/mcp/`, etc.); competing roots rejected at approval.
2. **`src/fyd/**` and the 66 uncommitted FYD files in the main worktree are a hard exclusion zone.** Wave work happens only in fresh worktrees from tag `tenanos-wave-base-20260923` (created at e48ef710).
3. **Approved diffs land at `~/workspace/tenanos-wave/diffs/<id>.diff`; proposal tracking in `~/workspace/tenanos-wave/STATE.json`** per the STATE-SCHEMA.md convention.

## How they apply to Swarm 08 (Mission Control audit)

- **(1) Canonical root:** Swarm 08 is AUDIT + WIRING PROPOSAL only (no UI rewrites, no new code). It proposes no new files under any `src/` root. All diffs target existing gateway-repo files (removals / UNKNOWN-marking), so there is no competing-root question. Recorded for compliance: nothing in this swarm's output creates `src/orca/`, `src/mcp/`, or any new root.
- **(2) FYD exclusion:** The audit touched no FYD files. The assigned repo `/home/nolan/projects/ping` (Next.js/FYD site) was inspected read-only for a Mission Control surface (none found — the surface lives in the gateway repo `/home/nolan/ping`); nothing was modified. Tag `tenanos-wave-base-20260923` verified present at `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` (read-only `git tag -l` + `rev-parse` on the Pig).
- **(3) Diff + proposal filing:** Diffs written to `~/workspace/tenanos-wave/diffs/P-20260923-08{1..7}.diff`. Proposals P-20260923-081 through P-20260923-088 appended to `~/workspace/tenanos-wave/STATE.json` following the existing entry shape (STATE-SCHEMA.md does not exist yet; the live convention is the P-20260923-001 entry). Note: these proposals target the **gateway repo** `/home/nolan/ping` (and one file in `/home/nolan/projects/constitutional-runtime`), NOT the wave repo `/home/nolan/projects/ping` — flagged explicitly in each proposal's notes and via absolute paths in `files_touched`, since STATE.json's top-level `repo` points at the wave repo.

## One-writer rule compliance

Per the swarm charter: I never write repo files. The `.diff` files are proposals only, for the coordinator's sole write dispatcher. No branches, no commits, no pushes, no Oracle actions.
