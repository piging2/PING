#!/bin/bash
# s2: file-name harvest for commodity signals (read-only, excludes src/fyd)
cd /home/nolan/projects/ping || exit 1
R="src/app src/components src/config src/content src/lib src/motion src/services src/types src/middleware.ts scripts"
echo "=== MEDIA-ish files ==="
find $R -type f \( -iname "*media*" -o -iname "*image*" -o -iname "*asset*" -o -iname "*upload*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== EVIDENCE/PROVENANCE-ish ==="
find $R -type f \( -iname "*evidence*" -o -iname "*provenance*" -o -iname "*witness*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== CAPABILITY-ish ==="
find $R -type f \( -iname "*capabilit*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== PROPOSAL/APPROVAL-ish ==="
find $R -type f \( -iname "*proposal*" -o -iname "*approval*" -o -iname "*review*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== THEME/TOKEN/DESIGN-ish ==="
find $R -type f \( -iname "*theme*" -o -iname "*token*" -o -iname "*design*" -o -iname "*palette*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== CACHE-ish ==="
find $R -type f \( -iname "*cache*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== TRACE/OBSERVABILITY-ish ==="
find $R -type f \( -iname "*trace*" -o -iname "*observ*" -o -iname "*telemetry*" -o -iname "*metric*" -o -iname "*log*" \) 2>/dev/null | grep -v node_modules | head -40
echo "=== SEARCH-ish ==="
find $R -type f \( -iname "*search*" -o -iname "*index*" -o -iname "*query*" \) 2>/dev/null | grep -v node_modules | head -40
