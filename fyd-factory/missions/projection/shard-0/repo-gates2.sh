#!/bin/bash
cd /home/nolan/projects/ping
grep -n "export function\|export const" src/fyd/sitespec/field-visibility.ts | head -10
sed -n '1,60p' src/fyd/sitespec/field-visibility.ts | grep -n "hidden\|private\|public" | head -15
