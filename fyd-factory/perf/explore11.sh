#!/bin/bash
cd /home/nolan/projects/ping
grep -n "interface DisplayMedia" -A 20 src/fyd/media/select.ts | head -30
