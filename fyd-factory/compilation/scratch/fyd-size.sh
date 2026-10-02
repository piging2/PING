#!/bin/bash
cd /home/nolan/projects/ping/src/fyd
echo "=== total size ==="
du -sh .
echo "=== file count by extension ==="
find . -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -12
echo "=== non-source files (not ts/tsx/css/json) ==="
find . -type f ! -name "*.ts" ! -name "*.tsx" ! -name "*.css" ! -name "*.json" ! -name "*.md" | head -10
echo "=== total source files ==="
find . -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l
