#!/bin/bash
cd /home/nolan/projects/ping
echo "########## ObjectGraph type ##########"
grep -n "ObjectGraph" -A 8 src/fyd/sitespec/types.ts | head -30
echo
echo "########## PingObject / PingRelationship ##########"
grep -n "export interface PingObject" -A 40 src/lib/ping/types.ts | head -60
grep -n "export interface PingRelationship" -A 20 src/lib/ping/types.ts | head -30
grep -n "export interface AskEvidenceRef" -A 10 src/lib/ping/types.ts | head -15
grep -n "export interface AskClaimClassification" -A 8 src/lib/ping/types.ts | head -12
