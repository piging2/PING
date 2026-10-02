#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
sed -n '20,39p' src/app/sites/_shared/customer-site.tsx
echo "=== footer rendering ==="
sed -n '69,110p' src/app/sites/_shared/customer-site.tsx