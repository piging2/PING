#!/bin/bash
cd /home/nolan/projects/ping
echo "##### ping-object-source (head)"
sed -n '1,120p' src/fyd/data/ping-object-source.ts
echo "##### media/select heroMediaFor"
grep -n -B3 -A45 "export function heroMediaFor" src/fyd/media/select.ts | head -80
