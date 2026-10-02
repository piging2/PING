#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "contactMethodFor" src/fyd --include="*.ts" --include="*.tsx" | grep -v __tests__ | head
