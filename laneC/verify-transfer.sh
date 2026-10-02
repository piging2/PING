#!/bin/bash
# Compare local Lane C files against worktree copies by sha256.
cd /home/nolan/worktrees/constitutional-convergence || exit 1
declare -A MAP
MAP[migration-trigger-gate.js]=tools/distribution/migration-trigger-gate.js
MAP[arm64-compat.js]=tools/distribution/arm64-compat.js
MAP[security-negatives.js]=tools/distribution/security-negatives.js
MAP[runtime-deps-closure.js]=tools/distribution/runtime-deps-closure.js
MAP[release-certify.js]=tools/distribution/release-certify.js
MAP[snapshot-manifest.js]=tools/distribution/snapshot-manifest.js
MAP[MIGRATION-TRIGGER-FIXTURE-INTERFACE.md]=tools/distribution/MIGRATION-TRIGGER-FIXTURE-INTERFACE.md
MAP[validate-artifact.js]=tools/distribution/validate-artifact.js
MAP[synthetic-proof.js]=tools/distribution/synthetic-proof.js
MAP[release-artifact.schema.json]=tools/distribution/release-artifact.schema.json
MAP[release-artifact.example.json]=tools/distribution/release-artifact.example.json
MAP[RELEASE-SEQUENCE.md]=tools/distribution/RELEASE-SEQUENCE.md
MAP[trigger-policy.oracle-canonical.json]=tools/distribution/trigger-policy.oracle-canonical.json
MAP[ARTIFACT-CLASSIFICATION.md]=infrastructure/oracle/ARTIFACT-CLASSIFICATION.md
for local in "${!MAP[@]}"; do
  wt="${MAP[$local]}"
  a=$(sha256sum "/home/hatch/workspace/laneC/$local" | cut -d' ' -f1)
  b=$(sha256sum "$wt" | cut -d' ' -f1)
  if [ "$a" = "$b" ]; then echo "MATCH $wt"; else echo "DIFF $wt"; fi
done
