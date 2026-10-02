#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "function AskFydWidget" -A 20 src/fyd/components/renderer.tsx | head -25
grep -n "siteId" src/fyd/components/renderer.tsx | head -10
