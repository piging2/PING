#!/bin/bash
cd /home/nolan/projects/ping-askfyd-gold
python3 /tmp/probe-fields.py
grep -n "fieldConfirmations" src/fyd/object/types.ts | head -3
