#!/bin/bash
cd /home/nolan/projects/ping
echo "=== redacted / fixture_digest / site_id mentions ==="
grep -rliE "redacted|fixture_digest|fixture digest" src research scratch --include="*.md" --include="*.ts" --include="*.json" 2>/dev/null | head -20
echo "=== site_id schema ==="
grep -rl "site_id" src --include="*.ts" --include="*.md" 2>/dev/null | head -20
