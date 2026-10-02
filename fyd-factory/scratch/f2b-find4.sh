#!/bin/bash
cd /home/nolan/projects/ping
echo "=== data/fyd-owner/happy-place.json head ==="
head -c 4000 data/fyd-owner/happy-place.json
echo ""
echo "=== factory corpus doc ==="
grep -rli "fyd-factory\|factory corpus" src research scratch --include="*.md" 2>/dev/null | head
