#!/bin/bash
F=/home/nolan/workspace/fyd-factory/qa/design-conv
for s in coppersmith-plumbing happy-place; do
  echo "===== $s: all <section> tags with data attrs ====="
  grep -o '<section[^>]*>' $F/$s.html | head -40
  echo "===== $s: data-fyd-section list ====="
  grep -o 'data-fyd-section="[^"]*"' $F/$s.html
  echo "===== $s: h1/h2 headings ====="
  grep -o '<h[12][^>]*>[^<]*' $F/$s.html | sed 's/<[^>]*>//g' | head -30
done
