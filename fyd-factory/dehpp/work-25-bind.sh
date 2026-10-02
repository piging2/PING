#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
echo "=== boundField ==="
sed -n "$(grep -n '^function boundField\|^export function boundField' src/fyd/components/renderer.tsx | cut -d: -f1),+25p" src/fyd/components/renderer.tsx
echo ""
echo "=== binding verifier module ==="
grep -rn "verifyBinding\|BindingVerifier" src/fyd/sitespec/*.ts src/fyd/components/renderer.tsx | grep -v "^.*://" | head -10
echo ""
echo "=== demo-owner-mode gate ==="
grep -n "NEXT_PUBLIC_FYD_DEMO_OWNER_MODE\|export function DemoOwnerMode\|export default" src/fyd/owner-mode/demo-owner-mode.tsx | head
