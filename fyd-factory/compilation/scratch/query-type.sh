#!/bin/bash
cd /home/nolan/projects/ping
sed -n '/How a section resolves its objects from the graph/,/^export type FYDQuery/p' src/fyd/sitespec/types.ts | head -5
grep -n "export type FYDQuery" -A 25 src/fyd/sitespec/types.ts | head -35
