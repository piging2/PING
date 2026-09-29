# Security Lane 07 — 2026-09-29 ~12:00 MDT
**Interval:** PING/FYD convergence interval 07. Investigator: security-lane subagent.
**Mode:** READ-ONLY. No commits, no writes to any git repo, no destructive git operations.
**Scope:** credential containment, accidental Happy Place commit f21ba933, corrupt ref fyd/builder-rebuild-v1.

---

## 1. CREDENTIAL CONTAINMENT

### VERDICT: NOT CONTAINED — incident open, live secrets still on a public branch

**FACTS**
- Repo: `github.com/ngesk2/crx-runtime` (public). Branch: `constitutional-trunk`.
- Live upstream tip: `74fbb74d9ab73f7df7b23bad2355f2c808ed720d` ("Lane-L-tenant-isolation-vectors", 2026-09-25). Local remote-tracking ref is stale at `ffc2b4d`; no fetch performed (read-only lane).
- `token.json` (741 bytes, blob `86e0088df1d61f2efef06ddd2f3bb1c919f5235f`): STILL PRESENT at the live upstream tip. Google OAuth token-pair shape (access_token, refresh_token, scope, token_type, expires_in), opaque non-placeholder values per ledger-01 structural audit.
- `.env.base` (4,086 bytes, blob `8067366f30fe735707f3e5b820d60c8e67c5767f`): STILL PRESENT at the live upstream tip. 38 keys; credential-shaped opaque values for `QDRANT_API_KEY`, `HF_TOKEN`, `HUGGINGFACE_HUB_TOKEN`, `GOOGLE_TOKEN` (Google Drive OAuth), `GITHUB_APP_WEBHOOK_SECRET`, `POSTGRES_PASSWORD` per ledger-01 structural audit.
- Neither file exists on `origin/main` or in the local `main` checkout (`6c4b531`, clean). `CascadeProjects/infra/.env` on main carries compose-local credential-shaped values (lower severity, same hygiene class).
- Both files are REFERENCED BY live code per ledger-02/COORDINATOR-LOG: `google_drive_backup.py` reads token.json; 5 compose files + `configuration_authority.py` load .env.base. `.gitignore` covers `.env.base` (tracked anyway) but NOT `token.json`.
- No rotation/revocation confirmation exists in any ledger 01 through 06. Assume all exposed material is compromised until proven otherwise.
- No dedicated credential-quarantine directory exists. `/home/nolan/workspace/tandem/quarantine/` holds only unrelated research JSONs (complaint signals, segment deep-dive). Containment to date is procedural: exclusion from all workspace bank commits (ledger-01 secret scan) plus the standing hold "No CRX harvest writes until containment is confirmed" (ledger-06).
- No secret values are recorded in this report or any ledger. The read-only GitHub API responses contained encoded file content; it was NOT decoded, printed, or retained.

**EVIDENCE PRESERVED**
- Verification method: read-only `git ls-remote` (ref state only) + public GitHub REST API file reads at `ref=constitutional-trunk`. Local repos untouched; no fetch, no clone, no checkout of the affected branch.
- Public commit history checked: no removal commit exists between the stale local tip and the live tip `74fbb74`.

**OWNER DECISIONS NEEDED (Nolan)**
1. Revoke/rotate: Google OAuth pair (token.json), HuggingFace tokens, Qdrant API key, GitHub App webhook secret, Postgres passwords. NOT ACTED ON; nothing in this lane can do it.
2. Remove both files from the branch; then authorize or explicitly decline a public-history purge (history rewrite on a public branch — requires Nolan's explicit approval either way).
3. Add `.env*`, `token.json`, `*.pem` ignore rules plus a pre-commit secret scan so it cannot recur.
4. Decide when CRX-side harvest writes may resume (currently BLOCKED per the standing hold; harvest lane operates read-only only).

---

## 2. ACCIDENTAL HAPPY PLACE COMMIT f21ba933

### VERDICT: EXISTS, LOCAL-ONLY, NOTHING PUSHED

**FACTS**
- Repo: `/home/nolan/projects/happy-place-platform` — the ORIGINAL Happy Place repo (standing policy: never touch). Remote: `github.com/trishnikitha-art/happy-place-platform.git`.
- Commit: `f21ba933` "wip: commit stranded work 2026-09-29 (wave4 integration-ledger sweep)", created 2026-09-29 09:11:02 -0600 during the wave-4 sweep.
- Position: HEAD of local branch `devin/hpp-ping-boundary`. Prior state was `6dd11bed` (2026-09-16); reflog shows no other changes since.
- Push state: the branch has NO upstream configured; `git branch -r --contains f21ba933` returns empty. Nothing pushed.
- Content (high level, 10 files, 3,561 insertions, all additive): two status docs (`PRODUCTION_REPAIR_QUICK_REFERENCE.md`, `PRODUCTION_STATUS.md`), two commit-message draft txt files, a media sync script, two KV backup JSONs (`media.v1.json.backup.2026-09-10T00-54-31-724Z`, `projects.v1.json.backup.2026-09-10T00-54-31-724Z`), two media-resolution test scripts, one `hpp-ping-boundary.test.ts`. No core site code modified.
- The sanctioned forensic clone (`/home/nolan/projects/happy-place-platform-forensic`, at `ed0575a`) is separate and was not the target of this commit.

**EVIDENCE PRESERVED**
- Nothing done: no reset, no clean, no rewrite, no push. The commit sits exactly as created. Reflog entry retained as the audit trail.

**OWNER DECISIONS NEEDED (Nolan)**
1. How to resolve the policy violation: keep as a local WIP commit, relocate the content into the forensic clone, or another disposition. Destructive git actions need Nolan's explicit word.

---

## 3. CORRUPT REF fyd/builder-rebuild-v1

### VERDICT: CONFIRMED CORRUPT, single-repo scope, impact precisely mapped

**FACTS**
- Repo: `/home/nolan/workspace` (main workspace). Ref: `.git/refs/heads/fyd/builder-rebuild-v1` (loose ref).
- Contents: `49e821bf8b712b22153f367a166a519dce3277ab`. Target object is ABSENT from the object store (`git cat-file -t` → "Not a valid object name").
- Corruption signature: the branch reflog's last entries (`85faad17` → "backlog: FYD-010/FYD-012 falsification evidence 2026-09-26", preceded by `8cc82913`) do NOT contain `49e821bf`. The ref file was overwritten outside git's ref-update path (no reflog entry for the bad pointer; filesystem-level or direct-file write). Pre-existing per ledger-01; not caused by the workspace sweep.
- Repair viability (read-only finding, repair NOT performed): both reflog-recorded last tips EXIST as commit objects in the local store: `85faad1740844013f54923565fd1982cacef7fe3` (commit) and `8cc8291337795f74243e8809426324b5c3c316b6` (commit). A future authorized repair could repoint the branch at `85faad17` (its last reflog-recorded tip). The ledger-01-listed tip `b6a5cb4e` is also absent; neither `b6a5cb4e` nor `49e821bf` is a repair target.
- Scope: `/home/nolan/workspace` only. `/home/nolan/ping` and `/home/nolan/crx-swarm/crx-runtime-main` have no such ref. The distinct branch `fyd/builder-rebuild-v1-cherrypick` in packed-refs (→ `8cc82913`) is HEALTHY and unrelated to the corruption. No worktree is checked out at the corrupt branch (verified via `git worktree list`). No remote-tracking ref of the same name. Current workspace HEAD (`security/secret-redaction-2026-09-28` at `f1c4d70`) unaffected.

**Operations BLOCKED**
- Any ref resolution that dereferences the tip fatals: `git for-each-ref` → "fatal: missing object 49e821bf8b712b22153f367a166a519dce3277ab for refs/heads/fyd/builder-rebuild-v1". Same class fails for `git checkout fyd/builder-rebuild-v1`, `git log fyd/builder-rebuild-v1`, `git rev-parse --verify fyd/builder-rebuild-v1`.
- `git fsck` (read-only) reports: "error: refs/heads/fyd/builder-rebuild-v1: invalid sha1 pointer 49e821bf8b712b22153f367a166a519dce3277ab".
- Still working (verified): `git branch` listing (rc=0), `git status` (rc=0), `git worktree list`. Untested: `git fetch`, `git gc` (gc writes; not run in a read-only lane).

**OWNER DECISIONS NEEDED (Nolan)**
1. Repair direction: DELETE the ref vs REPOINT to the last reflog tip `85faad17` (objects available; full recovery possible). Repair NOT performed by this lane; a future repair must be explicitly authorized and must not mix into the TenantOS semantic commit per the infrastructure order.

---

## CROSS-CUTTING NOTES

- None of the three items required Pig-side writes or any repo mutation; all investigation was read-only (`ls-remote`, `ls-tree`, `cat-file`, `fsck`, public GitHub API GETs, reflog/branch/status reads via pigwsl-exec).
- The f21ba933 and corrupt-ref items remain PENDING in ledger-06's owner-decision list; this lane adds no new blocking facts, only precision: (a) secrets are confirmed still live at upstream tip `74fbb74` as of ~12:00 MDT today; (b) the corrupt ref's bad pointer has no reflog entry (out-of-band overwrite); (c) both reflog tips for the corrupt branch are present and recoverable.
- This file is NOT committed. Coordinator handles commits.
