#!/bin/bash
echo "=== WSL chromium ==="
which chromium chromium-browser google-chrome google-chrome-stable chrome 2>/dev/null
ls /usr/bin /usr/local/bin 2>/dev/null | grep -i -E "^chrom" | head -5
echo "=== WSL playwright (npm global / nolan home) ==="
npm ls -g --depth=0 2>/dev/null | head -10
ls /home/nolan/.npm-global/lib/node_modules 2>/dev/null | head
find /home/nolan -maxdepth 4 -type d -name "playwright*" 2>/dev/null | head -5
