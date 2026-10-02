#!/bin/bash
# uniqueness check: (970) 555-0142 must not appear in any other fixture
echo "=== 555-0142 in other fixtures ==="
grep -l "555-0142" /home/nolan/ping/var/fyd-projections/*.json 2>/dev/null || echo "none found (good)"
echo "=== any 555-01xx in existing fixtures ==="
grep -ho "555-01[0-9][0-9]" /home/nolan/ping/var/fyd-projections/*.json 2>/dev/null | sort | uniq -c || echo "none (good)"
echo "=== clearwater / Clearwater mentions anywhere existing ==="
grep -li "clearwater" /home/nolan/ping/var/fyd-projections/*.json 2>/dev/null || echo "none (good)"
echo "=== example.com in existing fixtures ==="
grep -l "example.com" /home/nolan/ping/var/fyd-projections/*.json 2>/dev/null || echo "none"
