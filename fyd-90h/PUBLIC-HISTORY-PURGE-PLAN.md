# Public-history purge plan: crx-runtime (incident zero)

Status: PLAN ONLY. No rewrite executed. No push performed. No secrets printed.
Prepared: 2026-09-29 ~18:05 MDT (Lane E).

## 1. Decision state

- PUBLIC HISTORY PURGE: AUTHORIZED CONDITIONALLY by Nolan. Preconditions:
  exact rewrite set produced first, isolated security operation, no
  unrelated history rewritten. Credential rotation already provides
  containment; the purge is exposure reduction.
- OAUTH CLIENT-SECRET RESET: AUTHORIZED, but BLOCKED at the interactive
  Cloud Console boundary (see section 7). Not completed by this lane.

## 2. Affected repository

- Local: `/home/nolan/crx-swarm/crx-runtime-main` (Pig WSL), HEAD `6c4b531`
  on `main`, clean tree.
- Public: `github.com/ngesk2/crx-runtime`. PUBLIC repo, 0 forks, 13
  branches, 11 collaborators, default branch `main`. Last push
  2026-09-28T12:35:36Z. Verified via GitHub API 2026-09-29.

## 3. Affected refs (public, verified 2026-09-29)

11 of 13 remote branches carry commits touching secret paths:

- origin/constitutional-trunk @ 74fbb74 (6 affected commits)
- origin/codex/context-workorder-convergence (7)
- origin/constitutional-convergence-v2 (7)
- origin/event-runtime-deduplication (7; remote has since moved
  23f0df5 -> 1f40cf4, recompute at execution)
- origin/feature/approval-effect-identity (7)
- origin/feature/context-compilation (7)
- origin/feature/external-agent-hardening (7)
- origin/feature/knowledge-replay-routing (7)
- origin/feature/mission-decomposition (7)
- origin/feature/namespace-entitlements (7)
- origin/feature/temporal-durable-execution (7)

CLEAN (0 affected commits, excluded from rewrite):

- origin/main @ 6c4b531
- origin/audit-hardening

Note: counts overlap; the same commits are reachable from multiple refs.
Unique public affected commits: 13.

## 4. Affected commits (13 unique, public)

Short SHAs, verified via `git rev-list --remotes=origin` on the Pig:

```
e36a0f6 6357e70 4464070 fce2294 e1f828d ea4eac6 0f09387
3c4c2dc 849ae56 3b06f63 77d830c 071782e 1a7a30e
```

Introductions (oldest first):

- 2026-06-23 `1a7a30e` / `0f09387`: `credentials/client_secret.json`
  (Google OAuth client secret) and `token.json` (Google OAuth pair).
- 2026-06-25 `849ae56` / `4464070`: `.env.base` (38+ keys).
- 2026-06-25 `77d830c` / `e1f828d`: `.env.example` (live values).

## 5. Secret paths (5, in public history)

1. `.env.base` (deleted in containment)
2. `credentials/client_secret.json` (deleted in containment)
3. `token.json` (deleted in containment)
4. `.env.example` (live values redacted to ROTATED_REPLACE_ME in containment)
5. `brainos/orchestration/config/environments/.env.qdrant`
   (3 public commits; path later renamed to `ping-runtime/...`;
   values redacted in containment)

Containment reference: local commit `b0b82f6` ("incident-zero: remove
exposed credentials from branch tip") on local-only branch
`incident-zero/containment-20260929`. Parent is `74fbb74`. NOT pushed;
verified no `incident*`/`secret*` refs exist on origin as of 2026-09-29.

Reconciliation note: a 2026-09-28 record says the secret branch was
pushed to the remote at the exact SHA. Current `ls-remote` shows no such
ref. Reconcile at execution (pushed-then-deleted vs different remote).

## 6. Recovery point

Before any rewrite, in an isolated clone:

1. `git fetch origin` and record every ref SHA.
2. Create annotated tag `pre-purge-20260929` on each of the 11 affected
   ref tips.
3. `git bundle create /secure/path/crx-runtime-pre-purge.bundle --all`
   and verify the bundle.
4. Keep the bundle until the post-rewrite scan passes and Nolan
   confirms retention or destruction.

Rollback: push the tag SHAs back to their ref names (force-push) from
the bundle. This restores the exact pre-rewrite public state.

## 7. OAuth client-secret rotation (BLOCKED at human boundary)

The exposed Google OAuth client secret lived at
`credentials/client_secret.json`. Incident zero independently proved the
`token.json` OAuth pair dead per Google; the client-secret reset is the
residual lower-severity item.

Exact human action required (no agent path exists):

1. Nolan opens console.cloud.google.com in his own session.
2. Select the Google Cloud project owning the OAuth client.
3. APIs and Services > Credentials > OAuth 2.0 Client IDs >
   select the affected client > RESET SECRET.
4. Store the replacement ONLY in the Secure Vault / ping-vault
   (never chat, files, or logs).
5. Update authorized consumers to the new secret.
6. Prove: old secret rejected, new secret accepted.

An agent cannot cross this boundary: the reset is a console-UI action
with Nolan's interactive session. Status: BLOCKED pending Nolan.

## 8. Rewrite map (exact, to run in an isolated clone)

Tool: `git filter-repo` (fresh clone; never the shared worktree).

```
git clone --mirror https://github.com/ngesk2/crx-runtime purge-work.git
cd purge-work.git
git filter-repo \
  --path .env.base \
  --path credentials/client_secret.json \
  --path token.json \
  --path .env.example \
  --path brainos/orchestration/config/environments/.env.qdrant \
  --invert-paths \
  --refs origin/constitutional-trunk \
          origin/codex/context-workorder-convergence \
          origin/constitutional-convergence-v2 \
          origin/event-runtime-deduplication \
          origin/feature/approval-effect-identity \
          origin/feature/context-compilation \
          origin/feature/external-agent-hardening \
          origin/feature/knowledge-replay-routing \
          origin/feature/mission-decomposition \
          origin/feature/namespace-entitlements \
          origin/feature/temporal-durable-execution
```

Notes:

- `--invert-paths` with `--path` removes the five paths from every
  rewritten commit. `origin/main` and `origin/audit-hardening` are
  excluded and must rewrite to byte-identical SHAs; verify that after.
- `.env.example` is removed wholesale rather than redacted, because its
  history contains live values. If the file must exist, re-add a clean
  template in a separate, post-purge commit.
- Re-fetch immediately before execution; the affected set above is a
  2026-09-29 snapshot.

## 9. Force-push implications

- All 11 refs get new SHAs. `origin/constitutional-trunk` moves off
  `74fbb74`; any local branch or worktree based on `74fbb74` (including
  `incident-zero/containment-20260929`) becomes dangling and must be
  rebased onto the rewritten trunk or retired.
- The nine constitutional-runtime commits on `origin/main` are NOT
  affected; `main` stays put.
- Builds or served artifacts pinned to old SHAs become historical
  references only.
- Requires Nolan's explicit GO for the force-push step itself; this plan
  does not grant it.

## 10. Collaborator and fork consequences

- Forks: 0 (verified). No fork coordination needed.
- Collaborators (11 logins, verified): nmgeske, ngesk2,
  nolangesk-droid, nolangese-sudo, trishnikitha-art, ngeske-commits,
  pinging87, pinging86, pinging1, pinging2, pinging3.
- Every clone with the old refs will diverge on next fetch. Each owner
  must `git fetch` then `git reset --hard origin/<branch>` (discarding
  local work on those branches) or re-clone. No open-PR check was run;
  enumerate open PRs from affected branches at execution and rebase or
  close them.
- Notify the human owners (Nolan's call on channel) BEFORE the
  force-push, with the recovery tag names.

## 11. Post-rewrite scan (before declaring done)

1. `git rev-list --remotes=origin -- <5 paths>` returns 0 commits.
2. Secret scan of all rewritten tips (gitleaks or truffleHog); 0 findings.
3. Old blob SHAs unreachable: `git cat-file -e` fails for each removed
   blob in the rewritten refs.
4. Old SHAs (`74fbb74` lineage) no longer advertised by `ls-remote`
   after push.
5. GitHub may retain unreachable objects in cache; if the post-push
   scan still resolves old blobs via the API, request cache removal
   through GitHub Support.
6. Only then: rotate nothing further (rotation already complete except
   the Cloud Console item), and confirm bundle retention/destruction
   with Nolan.

## 12. Execution protocol

- Isolated security operation. Separate mirror clone. No product
  commits in the same operation, before or after.
- Two gates: (a) Nolan approves this plan; (b) Nolan gives explicit GO
  for the force-push.
- If any step deviates from this plan, stop and re-plan.
