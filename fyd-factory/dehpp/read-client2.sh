#!/bin/bash
cd /home/nolan/projects/ping
echo "##### site-client rest (150-260)"
sed -n '150,280p' src/app/sites/_shared/site-client.tsx
echo "##### DemoOwnerMode head"
sed -n '1,60p' src/fyd/owner-mode/demo-owner-mode.tsx 2>/dev/null || find src/fyd/owner-mode -name '*.tsx' | head
