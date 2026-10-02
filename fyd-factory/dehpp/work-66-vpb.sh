#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "export function verifyPresentationBinding" -A 40 src/fyd/sitespec/graph.ts | head -50
