#!/bin/bash
cd /home/nolan/projects/ping
echo "##### registry component names"
grep -rn "name:" src/fyd/components/registry*.ts | head -60
echo "##### registry files"
ls src/fyd/components/ | head -40
