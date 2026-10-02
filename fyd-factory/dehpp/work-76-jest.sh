#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
cat jest.config.* 2>/dev/null | head -40
ls jest.config* 2>/dev/null
grep -n '"jest"' -A 25 package.json | head -30
