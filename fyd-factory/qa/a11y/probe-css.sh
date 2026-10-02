#!/bin/bash
# QA-A11Y probe 6: fetch compiled CSS, extract theme color values
set -u
OUT=/tmp/qa-a11y-css; mkdir -p $OUT
for css in 6e7b4dfc4271dafa 3d5fb6879572269f 49f45562515fea30; do
  curl -s --max-time 20 "http://localhost:3100/_next/static/css/$css.css" -o $OUT/$css.css
done
wc -c $OUT/*.css
echo "=== theme color defs ==="
grep -oh '\-\-color-[a-z-]*:#[0-9a-fA-F]\{3,8\}' $OUT/*.css | sort -u | head -40
echo "=== text-background rule ==="
grep -oh '\.text-background{[^}]*}' $OUT/*.css | head -3
grep -oh '\.bg-primary{[^}]*}' $OUT/*.css | head -3
