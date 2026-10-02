# F1 Falsifier Report: W1 TS dispatch idempotency fix

Date: 2026-09-27. Branch under test: `p0/front-door-idempotency` (f6a9302).
Falsifier: independent. Read-only on the branch: no commits, no pushes, no
fixes applied. All test rigs live in `/tmp/f1-harness` (ephemeral scratch);
nothing was deployed to the Pig, nothing touched :3100/:3200/HPP, no live
external effects.

## Method (independent of W1)

W1's harness at `/tmp/idem-harness` was not reused for execution. Instead:

1. Copied the two touched sources from the branch
   (`lane-p01/tree/src/app/api/mc/dispatch/route.ts`,
   `lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts`) to `/tmp/f1-harness/src`.
2. Applied only environment-constant rewrites (journal/artifacts paths,
   adapter shim path, ollama URL to 127.0.0.1:11440, ollama deadline 180s to 3s).
3. Compiled fresh with `tsc` (TypeScript 5.6.3 via npx) to `/tmp/f1-harness/dist`.
4. Diffed the independent compile against W1's `/tmp/idem-harness/dist`:
   byte-identical modulo the rewritten path/port constants for both files.
   W1's claim of testing the actual compiled route.ts is corroborated.
5. Wrote my own stub adapter shim (call-logged, allow/deny modes) and stub
   ollama (ok/hang modes, hit-logged), plus two drivers:
   `/tmp/f1-harness/driver-f1.js` (primary tests 1-8) and
   `/tmp/f1-harness/driver-repeat.js` (determinism repeats + corrected
   in-flight checks).

## PRIMARY OBJECTIVE results

### Test 1: 2 concurrent byte-identical POSTs - PASS
Exactly ONE mission, ONE semantic effect. Evidence: of 2 concurrent POSTs,
1 returned 200 SUCCEEDED and 1 returned 409 HOLD; journal holds exactly 1
`MC_MISSION_CREATED` and 1 `MC_RUN_SUCCEEDED` for the mission (9 journal
lines total); stub ollama hit exactly once; adapter `issue` called exactly
once; total shim calls 4 (profiles+authorize+issue+verify; the HOLD added none).

### Test 2: 10 concurrent byte-identical POSTs - PASS
Exactly ONE mission. Evidence per run: 1 SUCCEEDED + 9 HOLD (409),
1 `MC_MISSION_CREATED`, 1 `MC_RUN_SUCCEEDED`, 1 ollama hit, 1 adapter
`issue`, 9 journal lines. Repeated 5 times with fresh state: 5/5 identical
(pass lines R1-R5). Deterministic, not scheduling luck.

Mechanism note (verified by code reading, not assumed): within one Node
process, the whole check-then-act sequence from `await req.json()` through
the last artifact publish is synchronous (validation, `findPriorMission`,
`loadProfiles`/`authorize`/`issue` via `spawnSync`, all `emit`s and
`publishArtifact`s via sync fs appends). The first `await` is the agent
fetch. Node run-to-completion therefore makes the lookup-before-mint
atomic per process: the second handler always observes the first handler's
journaled `MC_MISSION_CREATED` and takes the 409 HOLD branch. This is the
real deployment topology too (`next start` is a single process on the Pig).
Residual, documented: under a multi-process topology (cluster, PM2,
horizontal replicas) the check-then-act would race, since there is no file
lock on the journal; the journal's event-id dedup would collapse the
duplicate event lines but the adapter authorize/issue and the agent
execution would still double-fire. Not a P0 blocker for the current
deployment, but worth one line in the record.

### Test 3: retry after terminal SUCCEEDED - PASS
Second identical POST: 200, `duplicate_suppressed: true`, same mission id
(`mc-m-de94113fade4`), original record returned. Deltas: journal 9 -> 9,
shim calls 4 -> 4, ollama hits 1 -> 1, artifact tree (file names + sha256
of each file) byte-identical. Projection still SUCCEEDED.

### Test 4: retry while in-flight - PASS
Setup: stub ollama in hang mode, first POST in-flight at the agent fetch,
duplicate POST fired 1s later. Duplicate: 409 HOLD, `ok: false`, reason
names the in-flight refusal. Zero side effects: journal 7 -> 7, shim
calls 3 -> 3, ollama hits 1 -> 1. First POST later hit the 3s deadline and
returned UNKNOWN with exactly one `MC_RUN_UNKNOWN`. Follow-up: a duplicate
fired after the mission reached UNKNOWN returned 409 HOLD with
`reconciliation_state: "RECONCILIATION IN PROGRESS"`, zero new events.

Design-point correction (my initial check was miscalibrated, not a code
defect): the HOLD on a CREATED/QUEUED/RUNNING in-flight mission carries
`reconciliation_state: null`. That is the projector's honest value:
`mc-dispatch.ts` sets the string only on `MC_RUN_UNKNOWN` (L391) and null
otherwise (L309/374/382). Null means "no reconciliation in progress, the
mission is mid-flight", which is the true state.

### Test 5: different key, same bytes - PASS
`f1-kA` vs `f1-kB`: two distinct mission ids (`mc-m-72546ab2351a`,
`mc-m-5550abe9b222`), both SUCCEEDED, neither suppressed, 2 ollama hits.
The key participates in identity derivation.

### Test 6: no key, byte-identical retry - PASS
Both POSTs derived `mc-m-ca7a09c9c739` (the `'default'` key); the second
returned `duplicate_suppressed: true` with zero new journal lines and zero
new adapter calls.

### Test 7 (E2): SAME key + DIFFERENT prompt bytes - behavior confirmed, verdict below
`f1-e2key` + prompt alpha derived `mc-m-c97a4466d2df`; same key + prompt
beta derived `mc-m-1e38be6dfa1d`. Both POSTs executed fully: 2 SUCCEEDED,
2 `MC_RUN_SUCCEEDED` (one per derived id), 2 ollama hits, no suppression
anywhere. So yes: W1's design lets key-reuse-with-different-bytes silently
execute a second mission.

VERDICT: ACCEPTABLE for P0, with a documented divergence. Reasoning:
(a) The safety-critical direction holds: a different prompt can never be
falsely suppressed, because `promptDigest` participates in the missionId.
The worst case of key reuse with mutated bytes is duplicate execution,
which is exactly the pre-fix behavior, never silent dropping of real work.
(b) The P0 idempotency requirement (double-click, concurrent identical
POSTs, byte-identical retries: ONE semantic effect) is fully met, per
tests 1, 2, 3, 6 above.
(c) The divergence is real and must be recorded: the Python front door
fails CLOSED on same-key/different-bytes, while this TS design treats the
key as a derivation salt and fails OPEN (second execution). A client using
both doors with one key discipline will see inconsistent behavior, and a
client that mutates the prompt between retries while reusing a key gets
two missions. Recommend documenting the contract explicitly ("retries must
be byte-identical; the key is a salt, not a request name") and, as future
hardening, persisting the key in `MC_MISSION_CREATED` event data so a
same-key/different-bytes guard becomes possible without a new store. Not
a deployment blocker for the sprint's one-mission proof.

### Test 8: malformed keys - PASS
`""`, 129 chars, `"has space!"`, `42`, `true`: all 400
`bad_idempotency_key`, before any side effect. `null` key dispatches as
the default (200 SUCCEEDED), consistent with W1. After all six cases the
journal held exactly the 9 lines of the single null-key dispatch and one
`MC_MISSION_CREATED`: nothing was minted for the malformed fives.

## SECONDARY OBJECTIVE: the adapter-call.js mystery

Question: when did `/home/nolan/workspace/mission-control/lane-d/adapter-call.js`
go missing, is it recoverable, and can the served :3100 route dispatch today?

### Findings (all read-only; Pig transport verified via pigwsl-exec.sh)

1. **The file is absent.** `lane-d/` holds only `LANE-C-NOTE-DECISION.md`
   (790 bytes). Broad `find` across `/home/nolan/workspace`,
   `/home/nolan/projects`, `/home/nolan/CascadeProjects` (maxdepth 8, name
   `*adapter-call*`) returns nothing. No tarball on the Pig mentions it.
   Local `~/workspace` has no copy. The served repo
   `/home/nolan/projects/ping` has no copy.

2. **Never committed.** `git log --all -- '*adapter-call.js*'` (path-based)
   in `/home/nolan/projects/ping` is empty: the file was never in git.
   Pickaxe (`-S 'adapter-call.js'`) hits exactly one commit, `42f81d53`
   (2026-09-26 07:26:22 -0600, "Lane D: Mission Control dispatch UI/API
   vertical slice"), which introduced the `ADAPTER_SHIM` constant
   referencing it. The same commit's `LANE-D-DISPATCH.md` documents it as
   "Support glue (NOT in the repo, not an authority)" with ops
   `profiles`/`authorize`/`issue`/`verify` against the ExternalAgentAdapter
   at `/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js`.

3. **Directory forensics say it never lived in `lane-d/`.**
   `lane-d/` was born 2026-09-26 07:20:17 -0600; its mtime (last entry
   add/remove) is 2026-09-26 07:22:29, identical to the decision note's
   mtime. Any create/delete of `adapter-call.js` after 07:22:29 would have
   bumped the dir mtime. So no deletion time can be established: the
   evidence is consistent with the file never existing as an entry there.
   The honest "when did it go missing" answer is therefore: indeterminate;
   it was already absent (or never present) by W1's verification on
   2026-09-27 ~13:10 MDT, and the reference was committed as
   planned-but-untracked glue on 2026-09-26 07:26.

4. **Evidence gap flagged.** `LANE-D-DISPATCH.md` claims a full live
   acceptance on :3100 (mission `mc-m-63d04f4517f9`: artifacts, journal
   `MC_*` events, SUCCEEDED projection, restart-stable). Today on the Pig:
   the artifacts directory
   `/home/nolan/workspace/mission-control/artifacts/` does not exist; the
   journal `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`
   (42 lines, mtime 2026-09-26 19:47) contains zero `MC_MISSION_CREATED` /
   `MC_RUN_SUCCEEDED` events; the only Pig-side trace of `mc-m-63d04f4517f9`
   is the ledger text itself. Either the acceptance ran against scratch
   paths that were later cleaned, or the ledger overstates what landed in
   the documented locations. This does not change the falsifier verdicts
   above, but the parent should know the lane-D acceptance bytes are not
   where the ledger says they are.

5. **Recoverable: NO. Reconstructible: YES (with effort, not done here).**
   No recoverable copy exists in git history, tarballs, the served tree,
   or anywhere on the Pig. Reconstruction is feasible because the contract
   is fully documented: `node <shim> <op> <payload-json>` on stdout JSON,
   ops `profiles|authorize|issue|verify` (per `mc-dispatch.ts::adapterCall`),
   forwarding to the existing `ExternalAgentAdapter`, which itself exists
   (e.g. `/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js`,
   24161 bytes, plus vendored copies under `orca-adapter/`). The Pig's
   `_adapter_shim.js` (md5 `a02ae803f2ea880af9384dcd458489d9`, matching
   W1's vendored copy) is NOT a drop-in: different CLI
   (`<adapter_dir> <op> <request.json>`, ops authorize|issue only). Per the
   brief, no reconstruction was attempted; inventing the dependency would
   be worse than documenting its absence.

6. **Served :3100 dispatch capability today: NONE (read-only determination,
   no live POST sent).** The running server (PID 5943, `next-server`
   v15.5.24, started 2026-09-27 08:04:20, cwd `/home/nolan/projects/ping`)
   serves the `.next` build from 2026-09-26 18:47:57, whose compiled
   `server/app/api/mc/dispatch/route.js` contains the missing path as its
   only shim reference. Any POST would run `loadProfiles()` first, which
   calls `adapterCall('profiles')` = `spawnSync('node',
   ['/home/nolan/workspace/mission-control/lane-d/adapter-call.js',
   'profiles'])`, which fails ENOENT, throws, and returns 503
   `adapter_unavailable`; GET fails the same way at the same line. So the
   served dispatch route cannot dispatch, and cannot even serve its
   catalog, until the adapter transport is restored. This gates deployment
   of W1's fix (and of the unfixed route alike).

## Constraints compliance

No pushes, no commits to `p0/front-door-idempotency` (branch files
untouched; `git diff HEAD -- lane-p01` empty), no main/master contact, no
Pig writes (all Pig commands read-only via pigwsl-exec.sh), no live
dispatch POST to :3100, no :3200 or HPP contact, no external effects. The
deliverable is this file; the rig is ephemeral in `/tmp/f1-harness`.

## Bottom line

W1's idempotency fix survives the concurrent-attack battery: 2/2 and
10/10 byte-identical concurrent POSTs collapse to exactly one mission and
one agent execution, deterministically (5/5 repeats); terminal retries
suppress with zero side effects; in-flight retries 409 HOLD with zero side
effects; key participation, default-key collision, and malformed-key
rejection all behave as specified. The E2 same-key/different-bytes
behavior is fail-open but acceptable for P0 with the divergence documented.
Deployment is blocked on the missing `adapter-call.js`, which is not
recoverable from any source found; the served :3100 route is a 503 on any
dispatch-shaped traffic today.
