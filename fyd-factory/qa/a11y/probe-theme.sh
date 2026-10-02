#!/bin/bash
# QA-A11Y probe 7: resolve theme scoping for the audited pages
set -u
OUT=/tmp/qa-a11y-css
echo "=== context around --color-background defs ==="
grep -o '.\{80\}--color-background:#111315.\{40\}' $OUT/3d5fb6879572269f.css | head -3
echo "---"
grep -o '.\{80\}--color-background:#f7f7f9.\{40\}' $OUT/3d5fb6879572269f.css | head -3
echo "=== data-theme / dark selectors in html ==="
grep -o '<body[^>]*>' /tmp/qa-a11y/copper.html | head -2
grep -o 'data-theme="[^"]*"' /tmp/qa-a11y/copper.html | sort | uniq -c | head
grep -o 'class="dark[^"]*"' /tmp/qa-a11y/copper.html | head -2
echo "=== hero eyebrow computed: text-accent value candidates ==="
grep -o '.\{60\}--color-accent:#432e2d.\{30\}' $OUT/3d5fb6879572269f.css | head -4
