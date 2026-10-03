# Allowlist policy: bounded git-ingestion rollout

## Rule

**Only repos listed in `git-ingestion/allowlist.json` may be ingested. Nothing
else. Every addition, removal, or scope change is a deliberate owner-visible
decision, recorded here with date, decider, and reason. Silent scope creep is
a defect.**

## Rollout stages

1. **Stage 0 — PING's own repos, local paths only (current).** The workspace
   repo itself. No network fetch involved: the engine opens the local
   checkout read-only. Proves the pipeline end to end without trusting any
   remote.
2. **Stage 1 — PING's own repos, `https://` remotes.** Same trust class
   (repos Nolan controls), but exercises the clone/fetch path: bare-mirror
   clone, no recursive submodules (T-02, CVE-2026-5917), transport limited to
   `https://` + local paths (enforced in `clone.py`).
3. **Stage 2 — named third-party repos, one at a time.** Each addition names
   the repo, the reason PING needs its history as observations, and the ref
   scope. Revisit the threat register before each addition.
4. **Stage 3 — untrusted repos.** NOT authorized by this policy. Requires a
   new explicit owner decision AND a re-run of the full acceptance gauntlet
   against the current engine, plus whatever additional hardening the new
   threat model demands. The gauntlet being green is necessary, never
   sufficient.

## Entry lifecycle

`proposed` → `active` → `suspended` | `removed`. Only `active` entries
ingest. A repo that starts failing validation (corrupt objects, ref
churn beyond the TOCTOU budget, quarantine storms) is `suspended`
pending investigation, not silently retried forever.

## Per-run bounds (defense in depth, on top of `config.py` caps)

- `max_commits_per_run`: hard ceiling on commits walked per ingestion run.
- `ref_scope`: only these refs are walked; everything else is invisible to
  the packet builder (enforced via `ref_allowlist` in `packet.py`).

## History

| date | decider | change | reason |
|---|---|---|---|
| 2026-10-03 | github-ingestion coordinator | allowlist v1: `ping-workspace` (local `/home/hatch/workspace`, ref `refs/heads/ingestion/github-2026-10-02`, 25 commits/run) | First bounded end-to-end proof. Stage 0. |
