# Range 0201-0250 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-0201..ORA-0250: family `image-provenance` (first 50 of 150).
"Image provenance: {it} — digest pinned, signature verified, arch manifest ARM64"
Pass criterion: inspect shows arm64; digest matches pinned value in lockfile; no latest tags.

## Method
Read-only SSH probes via /tmp/oracle-ssh.sh -s against 129.146.60.17 (ping-core-01).
Commands: `docker images --format "{{.Repository}}:{{.Tag}} {{.Digest}}"` and
`docker image inspect <img> --format "{{.Architecture}}/{{.Os}}"`. Baseline untouched.

## Finding: mission image names do not exist on the Oracle host
Generator's ORA_IMGS (gen_matrices.py) is hardcoded and synthetic:
  postgres:16-arm64, qdrant-arm64, ollama-arm64, node:22-slim-arm64, python:3.12-slim-arm64,
  gateway-custom, worker-custom, adapter-custom, proxy-nginx-arm64, backup-cron-arm64,
  certbot-arm64, otel-collector-arm64, migrate-runner-arm64, seed-loader-arm64, watchdog-arm64

Actual image inventory on the host (verified 2026-09-24T02:33Z):
  ping-gateway:candidate-3c5d280dd  arm64/linux  sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2
  ping-gateway:candidate-84486f056  arm64/linux  sha256:467af2dabc081dd09a8f26560ab8320073320005030bd3767afa8b40eadd970e
  ollama/ollama:latest             arm64/linux  sha256:da6e0dc5651df159e45686fd663c4dbe1624a52c44d7280eeac1551d8f865532
  node:24-alpine                    arm64/linux  sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
  postgres:17-alpine                arm64/linux  sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73
  node:20-alpine                    arm64/linux  sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
  node:18-alpine                    arm64/linux  sha256:8d6421d663b4c28fd3ebc498332f249011d118945588d0a35cb9bc4b8ca09d9e
  qdrant/qdrant:v1.7.0              arm64/linux  sha256:ff1639878418c0572f50a7e1314874e399537eb97e6d2f42d6b987a07a2c4c4f

Intersection of mission names with host inventory: NONE. Zero matches.

## Conclusion
The pass criterion cannot be evaluated: there is no digest lockfile on record for the named images,
and the named images are not present on the deployment. Same defect class as the reproducibility
family — generator-synthesized items with no mapping to the real Oracle deployment.

## Real signal for the parent (not a mission verdict, but valuable)
- All 8 real host images are natively arm64/linux. Good news for the arch-compat family once regenerated.
- `ollama/ollama:latest` is tagged :latest on the host — the "no latest tags" invariant FAILS for the
  real deployment today. Worth a real finding once missions are regenerated against the inventory above.
- The compose/image-pin grep surfaced only source-code noise; no canonical image lockfile found on the
  host or in p18-oracle-staging. Recommend: establish digest-pin lockfile as part of the regen.

## Verdict
N-A with justification, all 50 missions in this range. Followup: regenerate image-provenance from the
real inventory table above; include digest-pin lockfile creation as a pre-step.
