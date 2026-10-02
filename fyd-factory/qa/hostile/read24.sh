#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "Sanitized public scalar\|sanitizeField\|sanitizeFields" src/fyd/ src/lib/ping/ --include="*.ts" | grep -v __tests__ | head -10
