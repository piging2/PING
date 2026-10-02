# Certification Notes: candidate a9cad2663 (Lane F, 2026-09-20)

Honest record of how this certification was produced, including every deviation,
retry, and known imperfection. Nothing here is smoothed over.

## 1. Gate-0 DIRTY handling (no faked clean root)

release-certify.js gate 0 (sourceSha) fails on any dirty worktree. The shared
worktree's tracked tree was clean; the only dirt was the untracked `releases/`
directory (release-record workspace, pre-existing from the stale
releases/candidate-4d522a6b record). Lane F held it aside with md5 provenance
(`find releases -type f -exec md5sum`, 6 files), verified `git status --porcelain`
empty, ran certification, then restored it byte-identical (md5 diff clean).
The stale releases/candidate-4d522a6b directory was never modified, never committed.

## 2. Shared-worktree branch move during certification

At ~09:11 MDT, while Lane F was certifying, Discovery Lane B committed
ed0de7edd9a900b3d9616c0605cdbae49a8c1667 ("fix(knowledge): route KNOWLEDGE_PROMOTE
missions to the Phase F KnowledgePromoter") and the shared worktree moved from
branch constitutional-convergence-v2 to convergence-discovery-2026-09-20.
Lane F detected the HEAD move (gate-0 precondition check), DISCARDED the in-flight
certify run, and re-ran release-certify.js with --root pointed at a pristine
detached git worktree pinned to a9cad2663 (`git worktree add --detach`).
The candidate branch constitutional-convergence-v2 still points at a9cad2663;
only the shared worktree's checkout moved. The candidate is SHA-pinned everywhere
in this record, so the move does not affect certification validity.
Follow-up for the coordinator: decide the shared worktree's home branch after
Discovery work; the deploy lane must deploy the SHA, not a branch tip.

## 3. First certify attempt failed on snapshot construction (environmental, healed)

The first full release-certify run FAILED 2 gates, both caused by Lane F's
snapshot construction, not by the candidate:
- runtimeDepsClosure: 6 EXTERNAL_UNRESOLVABLE (dockerode, express, googleapis, pg,
  simple-git, yaml) because node_modules sat at snapshot/gateway/node_modules while
  the gate resolves from the snapshot root. Fixed by installing node_modules at the
  snapshot root, mirroring the deploy /app layout (Dockerfile.gateway:
  COPY gateway/package*.json ./ ; RUN npm ci --only=production).
- securityNegatives: 3 findings, exactly the credential-bearing .env files
  (.env.base, brainos/orchestration/config/environments/.env.mission-control,
  .env.qdrant) that the repo .dockerignore excludes from the docker build context.
  Fixed by applying the full .dockerignore when building the snapshot.
The snapshot was rebuilt (git archive a9cad2663 + .dockerignore + root npm ci,
360 packages) and the full sequence re-run: 8/8 PASS, verdict CERTIFIED, exit 0.
Per the standing retry rule this was an environmental failure, fixed in the
invocation and retried with evidence, not a candidate defect.

## 4. Migration cert first attempt failed on NODE_PATH (environmental, healed)

certify-sequence-migration.js requires bare 'pg'; the first run hit
MODULE_NOT_FOUND. Healed with NODE_PATH=<candidate>/gateway/node_modules (same
bootstrap family as Lane A's run-gate.sh), then 50/50 PASS. Environmental, retried.

## 5. Scratch resources

- Scratch postgres:16 container `lanef-pg` (ports 15434/15435; 15433/5434 were held
  by the prior candidate's staging sandbox, which Lane F did not touch) and network
  `lanef-cert-net` were created by Lane F and REMOVED after the runs.
- The pristine detached worktree /tmp/lanef/candidate-root was removed from the
  git worktree registry after certification (`git worktree remove --force`).
- /tmp/lanef retains logs and the snapshot for audit; it is ephemeral.

## 6. Known open items (not blockers, recorded)

- FL-20260919-014 (OPEN): sequence_replay_cert T1 (legacy backfill expectations)
  6 failures; identical baseline on pristine code; the obsolete test encodes the
  pre-fix behavior. Not this lane's scope.
- eventIdentity certification WITHDRAWN (F7, 2026-09-18); witnessReplay UNDEFINED.
  Both declared in the repo's CERTIFICATION.md and the release artifact.
- .env hygiene: git-tracked .env files contain real-looking secrets but are excluded
  from the docker build by .dockerignore (standing repo-hygiene flag for Nolan,
  not an Oracle blocker).

## 7. What the deploy lane still owns

Container build for linux/arm64, candidate startup, readiness, canonical event
write, dedup, mission path, worker/result path, restart, post-restart read,
rollback proof (rollback image 8400deecf2a9 verified healthy BEFORE any swap),
provenance labels (org.opencontainers.image.*) + /health source_sha surfacing,
and recording the real IMAGE_DIGEST. No Oracle mutation was performed by Lane F.
