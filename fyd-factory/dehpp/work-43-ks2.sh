#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git grep -n "KNOWN_SCHEMAS" -- '*.tsx' '*.ts' | grep -v __tests__ | head -8
