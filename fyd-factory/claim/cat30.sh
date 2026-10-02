#!/bin/bash
cd /home/nolan/projects/ping
grep -n "export function applyFieldVisibility" -A 45 src/fyd/sitespec/field-visibility.ts | head -60
