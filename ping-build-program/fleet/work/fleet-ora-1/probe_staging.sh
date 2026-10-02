#!/bin/bash
echo "== staging dir =="
ls -la /home/ubuntu/p18-oracle-staging/ 2>/dev/null | head -30
echo "== any manifest/ledger referencing components =="
find /home/ubuntu/p18-oracle-staging -maxdepth 2 -type f 2>/dev/null | head -40
echo "== done =="
