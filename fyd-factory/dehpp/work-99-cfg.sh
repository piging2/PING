#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
sed -n '25,60p' src/app/sites/happy-place/composition.ts
echo "====="
sed -n '78,130p' src/app/sites/_shared/compose-site.ts