#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== importers of site-client (expect none) ==="
grep -rln "site-client" src/ --include="*.ts" --include="*.tsx" | head -5
echo "(empty = safe to delete)"
echo "=== current HPP page.tsx imports ==="
head -35 src/app/sites/happy-place/page.tsx