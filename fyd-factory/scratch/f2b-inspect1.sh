#!/bin/bash
cd /home/nolan/projects/ping
echo === files ===
ls -la src/fyd/proceduralize/__fixtures__/
echo === head fixtures-structured.ts ===
head -c 3000 src/fyd/proceduralize/__fixtures__/fixtures-structured.ts
