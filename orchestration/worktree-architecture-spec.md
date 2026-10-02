# Deterministic Git Worktree Architecture Spec — Phase 2

Status: DESIGN (read-only inspection completed 2026-09-16 ~10:22 MDT; no implementation).
Primary repo: `/home/nolan/ping` (Pig WSL2, user `nolan`).
Canonical worktree root: `/home/nolan/ping/worktrees/` (inside the repo dir; REQUIRES a new `worktrees/` line in `.gitignore` — currently absent, so stray dirs pollute `git status`).

## 1. Inspection facts (all observed read-only on the Pig)

- `git worktree list`: exactly one worktree, the main checkout `/home/nolan/ping`, branch `constitutional-convergence-v2`, HEAD `d0ad44e2`. No agent worktrees exist yet.
- Local branches: `backup/night-shift-2026-09-15`, `constitutional-convergence-v2`, `main`, `night-shift-2026-09-15`, `night-shift-2026-09-15-marketing`, `night-shift-2026-09-15-orchestration`. Convention is descriptive; `agent/<id>-<run>` does not collide.
- Default remote branch is `main` (`refs/remotes/origin/HEAD`), but the live checkout is on `constitutional-convergence-v2`. The base branch for a worktree MUST be explicit per run and recorded; never assume.
- Stray dir `/home/nolan/ping/worktrees/VerifyReplay/` contains only a `worktree.json` marker (mission VerifyReplay, mode git-worktree, status prepared, notes: no-commit / no-edit-main-tree / replay-required; path recorded as the WINDOWS path `C:\Users\nolan\PING\worktrees\VerifyReplay`). It is NOT a registered git worktree and is untracked. Remove during Phase 2 setup. Windows-side worktree convention is retired; WSL path is canonical.
- Gitlinks `knowledge` (46954c4a) and `vos` (7d925433) have NO `.gitmodules` entry and are EMPTY in the main checkout too. Fresh worktrees will also have empty `knowledge/` and `vos/`. Consistent with main, no regression, but any capability requiring them must declare it and fail closed.
- pnpm monorepo: `pnpm-workspace.yaml` packages are `gateway`, `runtime/kernel/commit-service`, `runtime/replay`. No `node_modules` in the main checkout. pnpm binary currently resolves to the WINDOWS install (`/mnt/c/Users/nolan/AppData/Local/pnpm/bin/pnpm`) with store at `C:\Users\nolan\AppData\Local\pnpm\store\v11`. No WSL-local pnpm store exists. corepack 0.34.6 is available in WSL.
- Python: `/usr/bin/python3`, no `uv`, no venv in repo.
- Docker daemon is UP and healthy RIGHT NOW: server 29.5.3, overlayfs, cgroup v2, 24 CPUs, ~31 GB RAM. Running: `cosyvoice-tts`, `ollama`, `brain-postgres`, `brain-qdrant`, `open-webui` (all "Up 10 minutes" — daemon restarted ~10:11 MDT).
- Shared compose services own host ports: 5432 postgres, 6333 qdrant, 8200, 11434 ollama, 8000. Agent containers must publish NO host ports by default.
- Disk: `/dev/sdd` 1007G, 928G free (3% used). Disk is not the constraint; cleanup determinism is.
- Tracked env templates: `.env.base`, `.env.example` (plus several `brainos/**/.env.example`). FLAG (pre-existing, not mine to fix): `brainos/orchestration/config/environments/.env.mission-control` and `.env.qdrant` are TRACKED in git with non-example names. Contents not read. Recommend a secrets audit before agents touch these paths.
- Host vault candidate exists: `/home/nolan/.config/ping` (names only listed; contents not inspected).
- No `OPERATING_SPEC.md` exists in the repo yet.
- Other repos: `/home/nolan/agents/goCascadeProjects` is NOT a git repo. The worktree pattern applies to git repos only; non-git project dirs get per-run copy-on-write copies under `/home/nolan/agent-scratch/<agent-id>-<run-id>/` instead.

## 2. Worktree lifecycle spec

### 2.1 Naming (normative)

- Worktree path: `/home/nolan/ping/worktrees/agent-<agent-id>-<run-id>/`
- Branch: `agent/<agent-id>-<run-id>`
- `<agent-id>`: lowercase slug, `[a-z0-9-]{1,32}`. `<run-id>`: 12 hex chars from the run identity (existing PING Identity Authority). Supervisor rejects any name not matching `^agent/[a-z0-9-]{1,32}-[0-9a-f]{12}$` and any duplicate of a live branch.
- One branch is checked out in exactly one worktree (git enforces this; the naming makes collisions structurally impossible).

### 2.2 CREATE (supervisor only, on the Pig via WSL as `nolan`)

```bash
REPO=/home/nolan/ping
WT=$REPO/worktrees/agent-<agent-id>-<run-id>
BR=agent/<agent-id>-<run-id>
BASE=<explicit base, e.g. main>          # recorded in run manifest; never defaulted silently

flock /home/nolan/.ping-supervisor.lock \
  git -C "$REPO" worktree add -b "$BR" "$WT" "$BASE"
```

Post-create hook (same lock; ALL must pass or the worktree is removed and CREATE is marked FAILED):

```bash
# 1. manifest (machine-readable, also the lock/ownership record)
cat > "$WT/.agent-worktree.json" <<EOF
{"agent_id":"<agent-id>","run_id":"<run-id>","branch":"$BR","base":"$BASE",
 "repo":"/home/nolan/ping","created_at":"<UTC ISO>","capability":"<capability>",
 "state":"active","container":""}
EOF
# 2. required-path assertion (fail closed; covers knowledge/, vos/ if declared)
for p in $REQUIRED_PATHS; do test -e "$WT/$p" || { echo "MISSING $p"; exit 3; }; done
# 3. dependencies (WSL-local pnpm; see section 3)
pnpm --dir "$WT" install --frozen-lockfile --prefer-offline
# 4. secrets (see section 4)
install -m 600 /home/nolan/.config/ping/vault/<capability>.env "$WT/.env"
# 5. record
git -C "$REPO" worktree list --porcelain >> /home/nolan/.ping-worktree-ledger.log
```

`.agent-worktree.json` is untracked by design (worktrees/ will be gitignored) and is the supervisor's source of truth for ownership.

### 2.3 ACTIVE

- The agent's container mounts exactly one worktree: `--mount type=bind,src=$WT,dst=/workspace` and runs with `--user $(id -u nolan):$(id -g nolan)` so every file created stays nolan-owned (root-owned files would break host-side teardown).
- Agent commits to its own branch as it works (`git -C /workspace commit`). NO pushes, ever. Agent NEVER merges, rebases onto other branches, or touches another worktree.
- Agent MUST NOT run `git stash` (stash is shared across all worktrees of the repo). Teardown audits `git stash list`; a stash created during the run is a violation flag.

### 2.4 MERGE / RECONCILE HANDOFF (orchestrator only)

1. Supervisor locks the worktree during handoff: `git -C "$REPO" worktree lock "$WT"`.
2. Verify: agent branch contains only expected paths (`git diff --stat $BASE...$BR`), all tests the capability requires pass, no secrets in the diff (`git diff $BASE...$BR | grep -iE 'BEGIN .*PRIVATE|api[_-]?key|secret' ` → fail closed on hit; `.env` is gitignored so it cannot appear, this is belt-and-braces).
3. Merge ONLY into the mission's target branch and ONLY with explicit authorization (standing rule: no main/master commits without Nolan's word). Default safe handoff when merge is not authorized: leave the branch in place, store the diff as an artifact (`git -C "$REPO" diff $BASE...$BR > /home/nolan/.ping-artifacts/<run-id>.diff`), mark run `awaiting-merge`.
4. Authorized merge: `git -C "$REPO" merge --no-ff "$BR" -m "merge $BR (<run-id>)"` on the target worktree/branch. Conflicts → run marked FAILED, conflict listing saved as artifact, human decision required. Never `--force` a merge.

### 2.5 TEARDOWN (supervisor only; deterministic; ordered)

Teardown requires the run to be in a terminal state (`completed`, `failed`, `timed-out`, `awaiting-merge`, `discarded`). Order is load-bearing:

```bash
REPO=/home/nolan/ping
WT=$REPO/worktrees/agent-<agent-id>-<run-id>
BR=agent/<agent-id>-<run-id>

# 1. container gone first (phase 3 owns the container id; recorded in .agent-worktree.json)
docker rm -f <container-id> 2>/dev/null || true
# 2. snapshot-or-discard gate: BUILDER runs must have reconcile-complete or an explicit
#    discard record; otherwise REFUSE teardown (never silently drop unmerged work)
# 3. remove worktree (--force discards uncommitted agent state: intended, gated by step 2)
flock /home/nolan/.ping-supervisor.lock \
  git -C "$REPO" worktree remove --force "$WT"
# 4. delete branch (-d if merged, -D only with recorded discard authorization)
git -C "$REPO" branch -d "$BR" || git -C "$REPO" branch -D "$BR"  # second only if discard authorized
# 5. prune stale metadata
git -C "$REPO" worktree prune
# 6. ledger
echo "<UTC ISO> teardown $BR container=<id> state=<terminal-state>" >> /home/nolan/.ping-worktree-ledger.log
```

### 2.6 Crash / orphan recovery (supervisor reaper, runs at supervisor start and every 15 min)

```bash
REPO=/home/nolan/ping
# worktree dirs with no live container AND run not active -> stale
for d in "$REPO"/worktrees/agent-*/; do
  run_manifest="$d.agent-worktree.json"
  # if manifest missing or container dead and state not active/locked-for-merge: teardown path
done
# dirs not registered in git worktree list at all (e.g. interrupted create):
git -C "$REPO" worktree list --porcelain | grep '^worktree ' | cut -d' ' -f2 > /tmp/live-wt.txt
# anything under worktrees/ not in live-wt.txt and older than 30 min -> remove dir, log anomaly
# then:
git -C "$REPO" worktree prune
```

Rules: no worktree dir may exist without a matching `.agent-worktree.json` manifest for more than 30 minutes. No branch `agent/*` may exist without a live worktree or an `awaiting-merge` record. The sweeper NEVER deletes a worktree whose manifest state is `locked-for-merge`. Every reaper action appends to the ledger.

## 3. Per-worktree dependency mitigation

Problem: `node_modules`, `.venv`, build outputs multiply per worktree. 928G free means this is a speed problem, not a space problem — the fix is shared content-addressable stores, not dedup heroics.

### Node/pnpm (the actual repo: 3 workspace packages)

Do NOT use the Windows-side pnpm. One-time host setup (Phase 2):

```bash
corepack enable
corepack prepare pnpm@10 --activate        # match pnpm-lock.yaml v11 line; verify against package.json packageManager field
pnpm config set store-dir /home/nolan/.pnpm-store   # ext4: hardlinks work, fast
```

Per-worktree: `pnpm --dir "$WT" install --frozen-lockfile --prefer-offline`. The global store makes the 2nd..Nth worktree install hardlink-only (seconds, ~0 new disk for unchanged deps). `node_modules` itself stays inside each worktree (bind-mounted into the container) so each agent sees a complete, normal layout.

### Python (agents that need it; repo currently has no venv)

```bash
export PIP_CACHE_DIR=/home/nolan/.cache/pip     # shared wheel cache
python3 -m venv "$WT/.venv" --without-pip        # or with pip; venv itself is cheap (~20MB)
"$WT/.venv/bin/pip" install --prefer-binary -r requirements.txt
```

`.venv/` must be gitignored (check; add if absent). If `uv` is ever installed, prefer it: `uv venv --seed` with `UV_CACHE_DIR=/home/nolan/.cache/uv`.

### Build artifacts

Per-worktree `dist/`, `build/`, `.next/` etc. are disposable by definition: they are regenerated inside the container and die with the worktree. No mitigation needed beyond gitignore (verify).

## 4. Secret injection (vault -> worktree, never committed)

- Authoritative vault: `/home/nolan/.config/ping/vault/<capability>.env`, mode 600, nolan-only, on host disk. One file per capability; each contains ONLY the keys that capability is authorized for. (Vault population/rotation is out of scope for this spec; the dir exists, contents not inspected.)
- Injection: supervisor copies the capability's vault file to `$WT/.env` with `install -m 600` BEFORE container start. `.env` and `.env.*` are already gitignored (lines 27-28). The container reads `/workspace/.env` normally.
- Hard rules: no secret ever baked into an image; no secret committed (reconcile hook greps the diff); no host env inheritance into the container (`docker run --env-file` is NOT used — the file-in-worktree approach keeps one mechanism); no vault file ever mounted directly into a container (a compromised agent could then read other capabilities' files only if they were mounted — they aren't); teardown (`worktree remove`) destroys the `.env` copy with the worktree.
- The tracked `.env.base` / `.env.example` files are templates only. The tracked `.env.mission-control` and `.env.qdrant` under `brainos/` are flagged for audit (section 1).

## 5. Disk accounting and sweep policy

- Supervisor records `du -sb "$WT"` at create, at reconcile, and at teardown into the run manifest/ledger.
- Caps: max 8 live agent worktrees (concurrency cap, section 6); per-worktree soft alert at 5 GB (investigate: usually a runaway log or build output).
- Sweeper (same 15-min reaper): any worktree in terminal state older than 24h gets torn down; any `awaiting-merge` branch older than 7 days is flagged to Nolan (never auto-deleted — it holds unmerged work); ledger retains 90 days.
- Global guard: if `/dev/sdd` usage exceeds 80%, supervisor refuses new CREATE with `DISK-PRESSURE` until the sweeper clears terminal worktrees. (Currently 3%; this is a guardrail, not a live concern.)

## 6. Concurrent agents on one repo (2-5): what breaks and the rule for each

| Hazard | Mechanism | Rule |
|---|---|---|
| Branch double-checkout | git refuses to check out one branch in two worktrees | Structurally prevented by unique `agent/<id>-<run>` names; supervisor rejects duplicates |
| Stash cross-talk | `git stash` is per-REPO, shared across all worktrees | Agents forbidden from `git stash`; teardown audits `git stash list` |
| Port collisions | Compose services own 5432/6333/8200/11434/8000 on the host | Agent containers publish NO host ports. If a capability genuinely needs one, supervisor allocates from 18000-18999 via the flock-held lockfile, one port per run, released at teardown |
| DB contention | `brain-postgres` / `brain-qdrant` are shared | Agents NEVER start their own DB containers. Connection strings come from the vault (least-privilege creds), over the Docker bridge network |
| Ref races | Two agents creating/deleting refs | Unique branch names make ref creation collision-free; all mutating git ops (`worktree add/remove`, `prune`, merge) go through `flock /home/nolan/.ping-supervisor.lock` |
| pnpm store races | Concurrent installs | pnpm's content-addressable store is concurrency-safe (internal locking); safe |
| Index/lock files | Each worktree has its own private index (`$WT/.git` is a gitfile pointer; per-worktree admin dir under `.git/worktrees/`) | No sharing; safe by construction |
| knowledge/ / vos/ | Empty gitlinks in every worktree | Capabilities declare them as required paths; hook fails closed if missing (sec 2.2). Do not hand-copy populated dirs without provenance — locate the authoritative populated source first (BLOCKER 3) |
| Container filesystem | Slow bind-mount I/O for node_modules | Acceptable at 2-5 agents; measure before optimizing |
| CPU/RAM | 24 vCPU / 31 GB host | Default per-agent cap 2 vCPU / 4 GB; max 6 concurrent builders (12 vCPU / 24 GB) leaving headroom for compose services; supervisor admission check refuses CREATE past the cap |

## 7. Non-git projects

`/home/nolan/agents/goCascadeProjects` is not a git repo. Same isolation guarantee via per-run directory copies: `cp -a` the project to `/home/nolan/agent-scratch/<agent-id>-<run-id>/`, mount at `/workspace`, delete the copy at teardown. No branch semantics; the diff artifact at handoff is `diff -r` against the pristine source.

## FACTS (observed, 2026-09-16 ~10:22 MDT)

F1. Main checkout `/home/nolan/ping` on branch `constitutional-convergence-v2` (HEAD d0ad44e2); no agent worktrees exist; `worktrees/` is not gitignored; stray untracked `worktrees/VerifyReplay/` marker dir exists (Windows-path convention, not a real worktree).
F2. Gitlinks `knowledge/` and `vos/` have no `.gitmodules` and are empty even in the main checkout.
F3. pnpm monorepo (gateway, runtime/kernel/commit-service, runtime/replay); pnpm currently resolves to the Windows install with a Windows-side store; no WSL-local store; corepack available.
F4. Docker daemon healthy NOW (29.5.3, overlayfs, cgroup v2, 24 CPU, ~31 GB RAM); compose services own host ports 5432/6333/8200/11434/8000.
F5. Disk 928G free on /dev/sdd. Vault dir `/home/nolan/.config/ping` exists. No OPERATING_SPEC.md. `.env.mission-control` and `.env.qdrant` under brainos/ are tracked in git (flagged, contents not read).

## RECOMMENDATIONS

R1. Adopt this spec as the Phase 2 build contract: `<repo>/worktrees/agent-<id>-<run>/` + `agent/<id>-<run>` branches + supervisor-owned lifecycle + flock-serialized git mutations + manifest-per-worktree.
R2. Phase 2 setup checklist (ordered): add `worktrees/` to `.gitignore`; remove stray `worktrees/VerifyReplay/`; WSL-local pnpm via corepack with `store-dir=/home/nolan/.pnpm-store`; create `/home/nolan/.config/ping/vault/` convention; create the supervisor lockfile path and ledger.
R3. Containers run as nolan's uid:gid with exactly one bind mount (`$WT` -> `/workspace`); no host ports by default; ephemeral port range 18000-18999 for the rare exception.
R4. Secrets: vault-per-capability `.env` files copied to `$WT/.env` (0600) pre-start; never mounted vault dirs, never committed, destroyed at teardown.
R5. Reconcile default is no-merge: branch + diff artifact persist as `awaiting-merge` until merge is explicitly authorized (standing no-main-commit rule).

## BLOCKERS

B1. Pig SSH as `nolan` works and WSL is accessible; no blocker here. (Tunnel was down earlier today; currently up.)
B2. Merge authorization: the reconcile path needs Nolan's standing rule clarified per mission — default in this spec is branch-preserved + diff artifact, merge only on explicit word.
B3. Populated `knowledge/` / `vos/` source unknown: they are empty in the WSL main checkout. Before any agent capability depends on them, locate the authoritative populated copies (possibly the Windows `C:\Users\nolan\PING` mirror) and define the provisioning rule (copy vs read-only bind of a snapshot).
B4. Tracked `.env.mission-control` / `.env.qdrant`: recommend a secrets audit before agent execution begins; if they hold real credentials they should leave git history per the credential rules.
B5. pnpm version pin: verify `package.json` `packageManager` field and pin corepack to it (lockfile suggests pnpm 10.x).
