# Oracle Proven Baseline: 84486f056 (Frozen 2026-09-20)

Accepted by Nolan as the new proven baseline on 2026-09-20.

## Baseline identity

- Source SHA: 84486f056e597f404f81f6ca6dbbf3f3c75ba7c0
- Branch: refactor/runtime-authority-convergence
- Repo: /home/nolan/ping
- Image: ping-gateway:candidate-84486f056
- Image ID: sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e
- Arch: arm64
- Status: ORACLE_RUNTIME_PROVEN, ORACLE_RESTART_PROVEN
- Proven at: 2026-09-20 ~18:25 MDT
- Rollback anchor: 8400deecf2a9 (PRESERVED / UNTOUCHED)
- Rollback containers preserved: ping-gateway-rollback-rc4d522a6b, ping-gateway-old-512776de5

## What this baseline proves

- ARM64 image runs on Oracle
- Gateway reaches healthy with PostgreSQL services initialized
- Controlled gateway restart returns to healthy
- Canonical event persisted and read back live on Oracle PostgreSQL
- Exact duplicate returns ok with single database row retained

## What this baseline does NOT claim

This freeze records Nolan's accepted promotion decision. It does not retroactively claim the five failure classes are now impossible. Those are handled as permanent release gates in separate work.

## Freeze rules (Nolan's directive)

- Do not casually modify the running Oracle deployment
- Do not reuse candidate-84486f056 for another build
- Do not mutate the image
- Future releases receive new immutable identities
- Preserve: source SHA, image ID, image tag, distribution manifest, certification artifact, migration and schema state, deployment procedure, restart proof, rollback anchor

## Preserved artifacts

- Certification artifact: ~/workspace/oracle-deployment-84486f056-certification.md
- This freeze record: ~/workspace/oracle-baseline-84486f056-frozen.md
- Rollback image: 8400deecf2a9 (immutable, untouched)
- Deployment procedure: to be encoded as sustainable release procedure (next step)

## Oracle change policy (from this point forward)

Normal release: SOURCE -> TEST -> DISTRIBUTION -> BUILD -> CERTIFY -> PROMOTE -> VERIFY -> OBSERVE
Emergency fix: REPRODUCE -> SMALLEST FIX -> CERTIFY -> PROMOTE -> VERIFY
Never debug by accumulating speculative changes directly on Oracle.
If candidate fails: PRESERVE EVIDENCE -> ROLLBACK -> FIX OFFLINE -> RECERTIFY
