# Effect Class 06: External API Mutation

Survey date: 2026-09-24. Status: READ-ONLY SURVEY (no writes made).
Evidence base: `~/workspace/fyd/VERCEL-RECON-2026-09-23.md`,
`~/workspace/skills/vercel/bin/vercel-api.py`, `~/workspace/skills/github`,
`/home/nolan/ping/adapters/openai_adapter.js` (Pig), gateway
`/home/nolan/ping/gateway/adapters/github` (DTO only, no writes).

Definition: direct API calls from the runtime/agents that change external
state. Pure inference calls (OpenAI chat/embeddings) are NOT in this class.

---

## 6a. Vercel REST mutations

Mutating endpoints in use: `POST /v10/projects`, `POST
/v10/projects/{id}/env`, `PATCH /v9/projects/{id}`, `POST /v13/deployments`,
`POST /v9/projects/{id}/rollback`. Reads: `GET /v9/projects/{id}/env`,
`GET /v6/deployments?projectId=`.

- **Q1 Identity:** partially native. Deployments: `gitSource.ref` (SHA) is a
  stable logical identity; polling `GET /v6/deployments?projectId=&limit=1`
  reaches `readyState` READY/ERROR/CANCELED. Projects: `name`. Env vars:
  (key, target). Rollback: `deploymentId`.
- **Q2 Provider idempotency key:** NONE. Same-SHA redeploys create NEW
  deployment records (harmless duplication, not effect duplication — the
  artifact is identical for the same SHA). `POST /v10/projects` with an
  existing name: duplicate behavior UNKNOWN from evidence ("no project may
  exist. Enumerate first.").
- **Q3 Queryable:** YES, strongly. `GET /v6/deployments` state machine
  (READY/ERROR/CANCELED) is an explicit outcome signal; project/env GETs
  exist.
- **Q4 Reconcile:** EXISTS. Probe: poll deployments until terminal
  `readyState`; compare `deploymentId`/`meta.githubCommitSha` to the dispatched
  SHA. Deployments are content-addressed by SHA: a timed-out `POST
  /v13/deployments` that actually landed is discovered by the poll. Env vars:
  `GET /v9/projects/{id}/env` after.
- **Q5 Reversible:** YES. Rollback is a first-class compensating action
  (`POST /v9/projects/{id}/rollback` with last-good deploymentId); redeploy
  known-good SHA; `git revert` + push. Env vars updatable/deletable.
- **Q6 UNKNOWN means:** a deployment may be building/live; a Preview URL may
  serve new code. Blast radius bounded: previews are branch-scoped and "never
  touch production" (recon section 8). Production deploy UNKNOWN is the
  consequential case (only from the designated production branch).
- **Q7 Retry safe:** `POST /v13/deployments` when the same SHA is used AND the
  poll shows no deployment with that SHA in non-terminal state (duplicate
  records are inert). `POST /v10/projects/{id}/env` only after the env GET
  probe (duplicate keys per target may create duplicates). Rollback:
  retry-safe, it converges.
- **Q8 HOLD:** production-branch deployments where the poll is ambiguous (a
  second production deployment racing the first); `POST /v10/projects`
  duplicate-name ambiguity (enumerate first, per recon).
- Confidence: HIGH on structure; MEDIUM on duplicate project-name behavior
  (UNKNOWN).

## 6b. GitHub API mutations (`POST /user/repos`)

Evidence: `~/workspace/fyd/VERCEL-RECON-2026-09-23.md` step 1;
`~/workspace/skills/github/bin/gh-api.py`; gateway
`/home/nolan/ping/gateway/adapters/github/` contains only `github_dto.js`
(DTO mapping — no writes through PING).

- **Q1 Identity:** NATIVE. Repo identity is `(owner, name)`; duplicate
  `POST /user/repos` with the same name returns 422, which is itself the
  evidence the repo exists.
- **Q2 Provider idempotency key:** NONE needed; provider enforces uniqueness.
  422 = logical no-op signal.
- **Q3 Queryable:** YES. `GET /repos/{owner}/{repo}`.
- **Q4 Reconcile:** trivial and definitive. On timeout/ambiguity:
  `GET /repos/<owner>/<repo>` exists -> RECOVER_SUCCEEDED; 404 ->
  SAFE_TO_RETRY.
- **Q5 Reversible:** YES. `DELETE /repos/{owner}/{repo}` (destructive but
  available); rename also possible.
- **Q6 UNKNOWN means:** a repo may or may not exist; worst case is a
  duplicate-name collision on retry, which the provider rejects safely.
  Negligible consequence.
- **Q7 Retry safe:** ALWAYS for repo creation: the provider's uniqueness
  constraint makes blind retry convergent (create-or-confirm-exists). The
  recon doc's own guidance: "capture id and full_name" then verify with
  `git ls-remote`.
- **Q8 HOLD:** when the OWNER is ambiguous (the recon's open question:
  `piging2/fyd` vs `ngesk2/fyd`): creating under the wrong owner is a real,
  hard-to-undo mistake. Hold on identity ambiguity, not outcome ambiguity.
- Confidence: HIGH.

## 6c. OpenAI adapter — EXCLUDED from the effect registry

Evidence: `/home/nolan/ping/adapters/openai_adapter.js` lines 30-70: only
`generate()` (`POST /chat/completions`) and `embed()` (`POST /embeddings`),
plus `health()`.

No external state mutation. Both methods are inference: same inputs produce a
fresh completion; no server-side resource is created (Assistants/Threads API
not used). There is no logical operation identity to persist, no idempotency
key needed, no reconciliation target, nothing to reverse except spend.
UNKNOWN after a timeout means: tokens may or may not have been billed; retry
the computation (cheap, safe) and treat cost as the only consequence class.
Treat as read-like for the ORCA port: EXCLUDE from the effect registry or
model as cost-only.

Confidence: HIGH (actual adapter code read).

## 6d. Spotify device playback (write-safe rule, already encoded)

Evidence: spotify skill line 70: "do not retry on another device after a
timeout — the glasses wake-up path can time out in Muse while still waking
c50 and starting playback. Verify with now-playing instead of retrying."

Effect = device wake + playback. Reconciliation = `now-playing` read. Retry
after timeout is unsafe because the effect may have landed. This rule should
be ported VERBATIM as the canonical pattern: timeout is an observation,
probe before any second attempt.

## Port guidance

- Vercel is the cleanest external-API port target: SHA-addressed artifacts,
  queryable provider state machine, first-class rollback. Low current blast
  radius (no FYD project exists yet; HPP frozen).
- GitHub repo create is the model of provider-enforced idempotency: find or
  create an equivalent uniqueness anchor for every class that lacks one.
- Inference calls are excluded; the port must not wrap them in effect
  semantics (cost-only), or it will drown the registry in noise.
