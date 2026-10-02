#!/bin/bash
cd /home/nolan/projects/ping
sed -n '60,110p' src/fyd/components/renderer.tsx
echo "===== SitePageView ====="
sed -n '1790,1830p' src/fyd/components/renderer.tsx
