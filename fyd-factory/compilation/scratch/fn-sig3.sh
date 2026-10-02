#!/bin/bash
cd /home/nolan/projects/ping
grep -n "export function generateSiteSpec\|export function\|export interface\|export type\|export async" src/fyd/proceduralize/generator.ts | head -30
echo ===
sed -n '1,80p' src/fyd/proceduralize/generator.ts
