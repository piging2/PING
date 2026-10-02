# TenantOS Convergence Wave: Integration Playbook (Swarm 19)

Owner: Swarm 19 (Integration / Release). Coordinator is the sole write dispatcher;
Swarm 19 becomes the single writer for a semantic unit only when the coordinator
sends an approved diff.

Scope: TenantOS execution substrate only (the autonomous tenant execution loop).
FYD/HPP product work belongs to a separate coordinator. Do not touch it.

Absolute constraints (binding, from wave charter):
- Integrate proven patches continuously. Never accumulate a 24h mega-branch.
- Oracle stays protected: no Oracle promotion except through the existing
  certification discipline.
- NO pushes. NO main/master commits. NO second orchestrator/event authority.

Repo: /home/nolan/projects/ping on the Pig (WSL). All repo commands run via
~/workspace/pig/pigwsl-run.sh '<script>' (base64-wrapped; avoids cmd.exe
quote mangling). Do not disrupt the PING server on Pig port 3100.

---

## 1. Pipeline: PATCH -> TEST -> ADVERSARIAL TEST -> COMMIT -> INTEGRATE -> TEST MERGED STATE

Each proposal moves through these gates in order. A gate is PASS only with
evidence recorded in STATE.json. UNKNOWN is not PASS.

### Gate 1: PATCH (approved diff applied on an isolated branch)

Preconditions:
- Proposal exists in ~/workspace/tenanos-wave/STATE.json with status "approved".
- Approved diff artifact stored at ~/workspace/tenanos-wave/diffs/<proposal-id>.diff.
- `claimed_areas` (glob list) recorded; coordinator ran overlap check
  (swarm-19/check-overlap.py) and found no collision with another
  non-terminal proposal, or serialized the writers.

Commands (writer = the swarm assigned by the coordinator, single writer per
semantic unit):
```
# Record the base commit BEFORE branching (this exact SHA goes in STATE.json)
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/projects/ping && git rev-parse HEAD'
# -> e.g. e48ef710...  (fyd-factory, 2026-09-23)

# Create an isolated WORKTREE from the base SHA (never branch inside the dirty
# main worktree; the main worktree carries 66 uncommitted FYD files)
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/projects/ping && git worktree add /home/nolan/tenanos-wt/<proposal-id> -b tenanos-wave/<swarm>-<slug> <base-sha>'

# Verify the worktree is clean of unrelated dirty work (must print nothing)
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && git status --porcelain'

# Apply the coordinator-approved diff only (no invented changes beyond it)
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && git apply /mnt/c/Users/hatch/workspace/tenanos-wave/diffs/<proposal-id>.diff'
```
Note: the diff path inside WSL maps from the Windows side; verify the resolved
path exists before applying. If `git apply --check` fails, STOP and report to
the coordinator. Never hand-edit beyond the approved diff.

Mark STATE.json: status "applied", plus `branch`, `worktree`, `base_commit`,
`applied_at`.

### Gate 2: TEST (unit/integration tests on the branch)

P0 baseline fact (verified 2026-09-23 on the Pig): root `npm test` (bare `jest`)
has NO TypeScript transform configured, so every TS suite fails at parse time.
Do not rely on `npm test` for substrate code.

Concrete commands, run inside the worktree:
```
# Typecheck (fastest meaningful gate; tsconfig.json is strict)
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && node_modules/.bin/tsc --noEmit -p tsconfig.json'

# Scoped jest with ts-jest for new substrate code.
# FIRST wave diff must create src/tenanos/jest.config.cjs (single writer,
# modeled on src/fyd/jest.config.cjs lines 1-38), after which:
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && node_modules/.bin/jest --config src/tenanos/jest.config.cjs <paths-touched-by-diff>'

# Lint the touched files
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && node_modules/.bin/eslint <touched-files>'
```
PASS criteria: tsc clean, all touched-area suites green, eslint clean.
Record in STATE.json `test_results`: { typecheck, unit: {suites, tests, pass},
lint }. Any failure -> fix within the approved diff's scope only, or send back
to the coordinator as "rejected" with evidence.

### Gate 3: ADVERSARIAL TEST (fail-before + red-team pass)

Two parts, both required:
1. Writer includes fail-before tests: a test that FAILS on the pre-patch code
   (demonstrating the defect, bypass, or missing behavior) and PASSES after.
   Colocate as `<name>.adversarial.test.ts` next to the code.
2. The relevant wave adversary swarm runs its pass against the branch:
   - 06 memory adversary (memory claims), 15 security red team (trust
     boundaries, injection, secrets), 16 confidence ceiling (overclaim),
     18 contract/schema adversary (schema/type drift), 20 autonomy gauntlet
     (end-to-end loop abuse).
   Adversaries write tests only; they never edit another swarm's source
   except via a coordinator-routed diff.

Command (same scoped config):
```
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && node_modules/.bin/jest --config src/tenanos/jest.config.cjs --testPathPattern "adversarial"'
```
PASS criteria: adversarial suites green, no unresolved adversary finding.
An unresolved finding blocks COMMIT; it becomes a failure-ledger entry
(FL-YYYYMMDD-NNN in ~/workspace/FAILURE_LEDGER.md) and the proposal returns
to "proposed" with notes. Record `test_results.adversarial`.

### Gate 4: COMMIT (local only)

```
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/<proposal-id> && git add <touched-files-only> && git commit -m "<type>(<area>): <what> [<proposal-id>]" && git rev-parse HEAD'
```
Rules:
- Conventional message, proposal id in the trailer/subject.
- `git add` lists exactly the files in the approved diff. Nothing else.
- Commit is LOCAL ONLY. Never `git push`. Never commit to main/master.
- Record commit SHA in STATE.json.

### Gate 5: INTEGRATE (coordinator merges into the wave integration line)

The coordinator (sole write dispatcher) merges the swarm branch into the wave
integration branch. Swarm branches are never merged by their own writers.

Integration-line convention: `tenanos-wave/integration`, branched from the
same recorded base commit as the swarm branches. Fast-forward or
`--no-ff` merge per coordinator call; on conflict, the coordinator serializes
the overlapping writers (see section 3) and re-runs Gates 2-3 on the resolved
tree before committing the merge.

Mark STATE.json: status "integrated", `integrated_at`, `integration_commit`.

### Gate 6: TEST MERGED STATE (verify the integration, not just the branch)

On the integration branch worktree, re-run the FULL affected surface:
```
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/integration && node_modules/.bin/tsc --noEmit -p tsconfig.json'
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/integration && node_modules/.bin/jest --config src/tenanos/jest.config.cjs src/tenanos'
```
Plus a boot smoke check that the dev server still starts (must not disrupt
port 3100: use a throwaway port):
```
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/tenanos-wt/integration && timeout 60 node_modules/.bin/next start -p 3199 2>&1 | head -5 || true'
```
(Adjust once the substrate has its own runtime entrypoint; until then the
Next boot smoke proves no shared-config breakage.)

PASS criteria: typecheck clean, all substrate suites green, boot smoke starts
without MODULE_NOT_FOUND. Record `test_results.merged`. Only then is the
proposal DONE. A merged-state failure reopens the proposal (status back to
"approved", notes describe the interaction) and may open a failure-ledger
entry.

### Worktree teardown

After "integrated" + merged-state PASS:
```
~/workspace/pig/pigwsl-run.sh 'cd /home/nolan/projects/ping && git worktree remove --force /home/nolan/tenanos-wt/<proposal-id> && git branch -d tenanos-wave/<swarm>-<slug>'
```
Keep the branch until the coordinator confirms the integration commit is
good; teardown is coordinator-directed.

---

## 2. Oracle protection rules

Oracle = the deployed runtime (gateway containers, e.g. ping-gateway on the
Pig/Oracle cloud). It is NOT this repo's dev server and NOT a passing test
suite. Promotion to Oracle happens only through the existing certification
discipline:

1. Release doctrine (~/workspace/PING_CONVERGENCE_SPRINT_2026-09-19.md:417):
   a release is a certified closure of a SPECIFIC revision. Certify the exact
   SHA; the next cycle certifies a newer SHA later.
2. Certification gates (~/workspace/oracle-deployment-84486f056-certification.md):
   Gate B (distribution closure), Gate I (build/runtime on target arch),
   Gate J (release provenance: source SHA, image ID, build host), plus the
   P0 invariant set (e.g. P0-012 null-pool fail-closed, P0-013a/b duplicate
   idempotency vs semantic collision).
3. Declarations ORACLE_RUNTIME_PROVEN / ORACLE_RESTART_PROVEN are earned only
   by closing every certification gate with live evidence. Lesson
   FL-20260920-023: these declarations were once asserted prematurely and had
   to be STRUCK. Health ("container is up") is not certification.
4. Rollback anchor is immutable: the certified rollback image/commit is
   preserved and untouched by every wave operation.
5. Substrate patches merged by this wave do NOT constitute Oracle promotion.
   No wave branch, commit, or integration state may claim Oracle status.
   Promotion is a separate, coordinator-and-Nolan-gated certification event.
6. Never restart, reconfigure, or redeploy Oracle containers as part of wave
   work. Never touch deployment manifests, Dockerfiles for the gateway, or
   credentials. Do not disrupt the port-3100 PING server.

---

## 3. Isolated-branch workflow

Branch naming: `tenanos-wave/<swarm>-<slug>`
- <swarm>: two-digit swarm number, e.g. `02`, `19`.
- <slug>: short kebab-case, e.g. `mission-schema`, `mcp-registry`.

Base commit:
- All wave branches and the integration branch fork from ONE recorded base
  commit, stored in STATE.json as `wave.base_commit`.
- Current base (2026-09-23): `e48ef710` on `fyd-factory`
  ("FYD Wave 1 fixup: current product UI implementation + ask test alignment").
  The coordinator re-records the base if the underlying branch moves.

Verifying the base is clean of unrelated dirty work:
- The main worktree at /home/nolan/projects/ping carries 66 uncommitted
  files, all FYD product work (separate coordinator's lane). Wave branches
  must never see them.
- Mechanism: create every wave branch as a fresh WORKTREE from the base SHA
  (`git worktree add ... <base-sha>`), never by branching inside the dirty
  main worktree.
- Clean check (must print nothing before applying a diff):
  `git status --porcelain` inside the worktree.
- FYD exclusion zone (never touch in a wave diff): `src/fyd/**`,
  `src/app/**/fyd/**`, `src/components/fyd/**`, and any of the 66 dirty
  files. The worktree mechanism plus `git apply --check` enforces this.

No-push rule:
- `git push` is forbidden for all wave branches, always. Commits stay local
  on the Pig.
- Recommended guardrail (coordinator applies once per clone):
  `git config --local alias.push '!echo PUSH BLOCKED: wave rule; exit 1'`
  (defense in depth; the rule itself is the authority, the alias is a tripwire).

One-writer rule:
- One writer per mutable semantic unit or branch. Independent lanes may
  progress in isolated worktrees with explicit ownership; overlapping lanes
  reduce to one writer while the other becomes reviewer.
  (Standing rule, memory 2026-09-18.)
- The coordinator assigns the writer per proposal in STATE.json (`writer`).
  No other swarm edits those files until the proposal reaches "integrated"
  or "rejected".

---

## 4. Patch size and cadence

- Continuously integrate proven patches. Never accumulate a 24h mega-branch.
- Prefer small, single-purpose diffs (one semantic unit = one proposal).
- Shared-seam files (package.json, tsconfig.json, jest configs, shared
  schema/type files) are serialized: only one non-terminal proposal may claim
  them at a time (see STATE-SCHEMA.md `claimed_areas` and check-overlap.py).
