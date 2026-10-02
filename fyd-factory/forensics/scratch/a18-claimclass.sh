#!/bin/bash
cd /home/nolan/projects/ping
echo "===== where is claimClassFor ====="; grep -rln "function claimClassFor\|const claimClassFor" --include="*.ts" src/ | head
echo; echo "===== claimClassifications producer ====="; grep -rn "claimClassifications" --include="*.ts" src/ -l | grep -v __tests__ | head
