#!/bin/bash
cd /home/nolan/projects/ping
grep -n "function contactMethodFor" -A 40 src/fyd/components/renderer.tsx | head -60
