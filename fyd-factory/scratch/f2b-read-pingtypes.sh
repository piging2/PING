#!/bin/bash
cd /home/nolan/projects/ping
echo "=== PingObject interface ==="
grep -B2 -A 40 "export interface PingObject" src/lib/ping/types.ts | head -70
echo "=== PingRelationship interface ==="
grep -B2 -A 25 "export interface PingRelationship" src/lib/ping/types.ts | head -40
