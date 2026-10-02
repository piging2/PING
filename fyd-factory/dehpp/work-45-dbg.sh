#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
ls -la src/app/sites/happy-place/page.tsx
wc -l src/app/sites/happy-place/page.tsx
sed -n '80,95p' src/app/sites/happy-place/page.tsx
