#!/bin/bash
cd /home/nolan/projects/ping || exit 1
sed -n '1,120p' src/fyd/media/__tests__/owner-hero.test.ts
