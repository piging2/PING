#!/bin/bash
# FYD attacker lane: regenerate all hostile-execution artifacts from pinned sources.
# Fails loudly on any step. /tmp artifacts are ephemeral; this script rebuilds them.
set -e
cd "$(dirname "$0")"
VENDOR="$HOME/workspace/fyd-attacker/vendor"
LANEQ="$HOME/workspace/laneq/work"
TREE="$HOME/workspace/lane-p01/tree"

echo "--- vendor integrity"
cd "$VENDOR"
sha256sum -c SOURCES.sha256

echo "--- composer bundle"
mkdir -p /tmp/fyd-attacker
npx --yes esbuild@0.28.2 "$VENDOR/src/lib/ping/ask-composer.ts" \
  --bundle --platform=node --format=esm \
  --alias:@/fyd="$VENDOR/src/fyd" --alias:@/lib="$VENDOR/src/lib" \
  --outfile=/tmp/fyd-attacker/composer.bundle.mjs

echo "--- pure-function extracts (TS-parser, loud-verified)"
cd "$HOME/workspace/fyd-attacker/suites"
node extract.mts "$LANEQ/ask-composer.ts" classificationFromProvenance claimClassification
node extract.mts "$LANEQ/visitor-answer.ts" claimClassFor answerStateFor basisForClassification
node extract.mts "$LANEQ/visitor-answer.ts" conflictObservationSource
node extract.mts "$LANEQ/visitor-answer.ts" basisForClassification citationFor buildCitations claimClassFor
node extract.mts "$TREE/src/fyd/ask/field-conflicts.ts" parseConflictObservationRefId
node extract.mts "$VENDOR/src/app/api/fyd/ask/ask-pipeline.ts" answerClassFor

echo "--- citations module assembly"
{ echo "// Citations module: verified extracts of the REAL customer-layer functions.";
  echo "// Assembled by suites/setup.sh; do not hand-edit.";
  grep -v "^export { " /tmp/fyd-attacker-extract-basisForClassification-citationFor-buildCitations-claimClassFor.mts; echo;
  grep -v "^export { " /tmp/fyd-attacker-extract-conflictObservationSource.mts; echo;
  echo 'import { parseConflictObservationRefId } from "/tmp/fyd-attacker-extract-parseConflictObservationRefId.mts";';
  echo 'export { basisForClassification, citationFor, buildCitations, claimClassFor, conflictObservationSource };';
} > /tmp/fyd-attacker-citations.mts
node -e "import('/tmp/fyd-attacker-citations.mts').then(m=>console.log('citations module OK:', Object.keys(m).sort().join(',')))"

echo "--- setup complete"
