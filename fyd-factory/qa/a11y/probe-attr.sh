#!/bin/bash
# QA-A11Y probe 5: attribute wrapper vs site content; check opacity:0 strictly
set -u
cd /home/nolan/projects/ping || exit 1
echo "=== where is 'Generated site demo' h1? ==="
grep -o '.\{200\}Generated site demo.\{200\}' /tmp/qa-a11y/copper.html | head -2
echo "=== page.tsx structure (read-only) ==="
grep -n "main\|<h1\|Generated site demo\|SiteClient\|site-client" src/app/sites/coppersmith-plumbing/page.tsx | head -20
echo "=== strict opacity:0 inline check ==="
grep -o 'style="[^"]*opacity:0[;"]' /tmp/qa-a11y/copper.html | head -5; echo "(copper strict count: $(grep -o 'style="[^"]*opacity:0[;"]' /tmp/qa-a11y/copper.html | wc -l))"
grep -o 'style="[^"]*opacity:0[;"]' /tmp/qa-a11y/happy.html | wc -l
echo "=== data-motion enter count ==="
grep -o "data-motion='enter'\|data-motion=\"enter\"" /tmp/qa-a11y/copper.html | wc -l
echo "=== duplicate ids ==="
grep -o 'id="[^"]*"' /tmp/qa-a11y/copper.html | sort | uniq -d | head -10
echo "=== aria-label on ask input: label for check ==="
grep -o '<label[^>]*>' /tmp/qa-a11y/copper.html | head -8
