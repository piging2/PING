#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== redacted batch fixtures ==="
ls -la src/fyd/proceduralize/__fixtures__/redacted-batch-c-*.ts
echo "=== importers of redacted batches ==="
grep -rln -e 'redacted-batch' src --include='*.ts' --include='*.tsx' | head -10
echo "=== record counts in batches ==="
for f in src/fyd/proceduralize/__fixtures__/redacted-batch-c-*.ts; do
  echo "$(basename $f): \"id\"-keys=$(grep -c -e '\"id\"' $f) lines=$(wc -l < $f)"
done
echo "=== head of one batch ==="
head -30 src/fyd/proceduralize/__fixtures__/redacted-batch-c-dentist.ts
