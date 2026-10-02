#!/bin/bash
cd /home/nolan/projects/ping
echo "=== grep BindingVerifier ==="
grep -rl "BindingVerifier" src --include="*.ts" --include="*.tsx" | sort
echo "=== grep verifyClaim / bindClaim ==="
grep -rl "verifyClaim\|bindClaim\|claim.*bind\|bind.*claim" src --include="*.ts" --include="*.tsx" -i | sort | head -30
echo "=== git show the BindingVerifier commit files ==="
git show --stat 490f5f7c | head -60
