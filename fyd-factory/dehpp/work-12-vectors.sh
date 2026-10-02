#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== dimensions CompositionPolicy + policyForVector ==="
sed -n '181,260p' src/fyd/builder/dimensions.ts
echo ""
echo "=== site-vectors.ts ==="
sed -n '1,80p' src/fyd/builder/site-vectors.ts
