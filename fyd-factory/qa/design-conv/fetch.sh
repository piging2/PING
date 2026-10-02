#!/bin/bash
# Fetch static HTML for QA-DESIGN-CONV
OUT=/home/nolan/workspace/fyd-factory/qa/design-conv
mkdir -p "$OUT"
for slug in coppersmith-plumbing happy-place; do
  code=$(curl -s -o "$OUT/${slug}.html" -w '%{http_code}' "http://localhost:3100/sites/${slug}")
  echo "${slug}: HTTP ${code}, bytes=$(wc -c < "$OUT/${slug}.html")"
done
