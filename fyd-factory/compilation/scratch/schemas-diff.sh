#!/bin/bash
cd /home/nolan/projects/ping
git diff --stat src/fyd/sitespec/schemas.ts
echo ===
git diff src/fyd/sitespec/schemas.ts | head -40
