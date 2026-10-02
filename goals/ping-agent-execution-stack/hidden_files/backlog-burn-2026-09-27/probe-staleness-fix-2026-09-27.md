# Lane F probe staleness patch + Pig /tmp hygiene — fix-worker ledger

Date: 2026-09-27 ~11:20 MDT. Agent: backlog-burn fix subagent.
Task source: FYD-036 closure
(`~/workspace/goals/ping-agent-execution-stack/hidden_files/backlog-burn-2026-09-27/fyd-036-closure.md`).

## 1. Canonical file identified

`~/workspace/fyd-lane/lane-f-probe.py` is the canonical (only repo-tracked)
copy: `git ls-files | grep lane-f-probe` returns exactly
`fyd-lane/lane-f-probe.py`. Other on-disk copies are non-canonical:
git worktree checkouts (`.worktrees/fd537`, `.worktrees/ar-cac`,
`.worktrees/tenant-hostile`) and per-track scratch copies
(`track-a/d1-monitors` through `track-a/d4-spool`, `work/` + `replay/`
subdirs). None were touched; the fix applies only to the canonical file.

## 2. Branch and commit

- Branch: `lane-f-probe-staleness-fix`, created from
  `mc/sprint-integration-2026-09-27` at `d571362e3704e06599e4fe0fa26c12da1d2c6d9e`.
- Commit: `af001e3168b9e5fc347976f2ee2da4479e6d170b`
  ("fix: lane-f-probe.py September stalenesses (node resolution, pg path,
  POSTGRES_* env)").
- Local only; nothing pushed. Commit was made with an explicit pathspec
  (`git add lane-f-probe.py`); other streams' uncommitted working-tree
  changes were not touched.

## 3. Per-fix evidence (diff vs d571362)

1. **node resolution (Windows PATH assumption removed):** added
   `resolve_node()` — `shutil.which("node")` first, fallback to
   `/usr/local/bin/node`, hard error if neither. `run_query()` now calls
   `[resolve_node(), js_path]`. The WSL assumption is documented in the
   module docstring ("this script runs on the Pig's WSL, where
   /usr/local/bin/node and docker both work").
2. **pg module path:** `PGMOD` replacement changed from
   `/app/node_modules/pg` to `/app/gateway/node_modules/pg`.
3. **container env names:** QJS now reads `process.env.POSTGRES_HOST`,
   `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
   `POSTGRES_DB` (PH/PP/PU/PW/PD references fully removed — verified by
   grep). The main-journal path relies on the ping-gateway container's
   own env (password never passed through, never printed — results print
   only event ids + timestamps). The demo-journal path now injects the
   same `POSTGRES_*` names into the child env.
- `python3 -m py_compile` passes on the patched file.

## 4. End-to-end proof attempt — PROBE_TRANSPORT_FAILED

Attempted the documented egress-proxy route exactly as prescribed:

- `ssh -F /home/hatch/.ssh/pig-config pigwsl 'echo PIG_OK'`
  -> `nc: proxy read: Broken pipe` / `Connection closed by UNKNOWN port 65535`, rc=255.
- Retry, same command -> identical failure, rc=255.
- Alternate documented form (`pig-fb/pig-ssh.sh`, `muse-ssh@100.79.154.43`,
  same `nc -X connect -x hatch-egress-proxy:3130` proxy)
  -> identical failure, rc=255.

Both the smoke test and therefore the probe transfer/run failed at the
proxy CONNECT tunnel; SSH never reached the Pig. Per the standing UNKNOWN
rule, this is absence of evidence about the Pig, not evidence about the
Pig — no claim is made about the Pig's state (in particular no claim that
the ping-gateway container or its /tmp scripts are or are not present).
The patched script was NOT executed end-to-end; its corrected behavior
(node resolution, pg path, env names) is verified by code review and the
diff only.

## 5. Pig /tmp hygiene — NOT PERFORMED (blocked by transport)

The two tiny query scripts in the ping-gateway container's `/tmp` could
not be listed (names unknown to this agent) and were not removed; the
same transport failure that blocked the proof blocked hygiene. The
container was not touched in any way. Demo journal container
(ping-test-pg) was not started; no Pig reboot, no power-setting changes,
no broad process kills. No credential was read, printed, or exfiltrated
(this agent never even reached the host).

## 6. Branch restored

After committing, switched back to `mc/sprint-integration-2026-09-27`
(`git checkout mc/sprint-integration-2026-09-27`); the fix branch and
commit remain local for re-application once transport recovers.

## Verdict

**PROBE-FIX UNKNOWN — PROBE_TRANSPORT_FAILED.**

Evidence: three code fixes applied and committed
(`af001e3168b9e5fc347976f2ee2da4479e6d170b` on
`lane-f-probe-staleness-fix`, off `d571362`), py_compile clean, but the
end-to-end runtime proof could not run — both documented egress-proxy
routes fail deterministically with `nc: proxy read: Broken pipe /
Connection closed by UNKNOWN port 65535` (rc=255), the same signature as
the 2026-09-27 Pig-route incident. Hygiene is likewise unexecuted and
must be re-attempted when transport recovers. Recommended follow-up: a
parent-level transport-recovery check, then rerun the probe transfer/run
and the /tmp listing/removal from the fixed branch.
