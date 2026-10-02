#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "export function CustomerSite" -A 30 src/app/sites/_shared/customer-site.tsx | head -40
echo "=== DemoChrome distinctive strings ==="
grep -n "FYD Social\|Generated site demo\|editor\|Editor\|validat" src/app/sites/_shared/demo-chrome.tsx | head -12