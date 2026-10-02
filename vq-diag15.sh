#!/bin/bash
cd /home/nolan/projects/ping
grep -n -B4 '<ClaimBadge objects={objects} />' src/fyd/components/renderer.tsx | head -40
