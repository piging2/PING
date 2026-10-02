#!/bin/bash
# s3: content greps for commodity symbols (read-only, excludes src/fyd)
cd /home/nolan/projects/ping || exit 1
R="src/app src/components src/config src/content src/lib src/motion src/services src/types scripts"
G="grep -r --include='*.ts' --include='*.tsx' -l"
echo "=== SERVICES DIR ==="; ls -la src/services/
echo "=== LIB DIR (top) ==="; ls src/lib/ | head -60
echo "=== 'capabilit' content ==="
eval "$G -i 'capabilit' $R" 2>/dev/null | grep -v __tests__ | head -20
echo "=== 'provenance' content ==="
eval "$G -i 'provenance' $R" 2>/dev/null | grep -v __tests__ | head -20
echo "=== 'evidence' content ==="
eval "$G -i 'evidence' $R" 2>/dev/null | grep -v __tests__ | head -20
echo "=== 'cache' content (exports) ==="
eval "$G -iE 'export (function|class|const|interface|type).*cache|cache' $R" 2>/dev/null | grep -viE '__tests__|node_modules|next/cache' | head -20
