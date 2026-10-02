#!/bin/bash
cd /home/nolan/projects/ping
grep -n "export async function getPingObjectGraph\|export function heroMediaFor" src/fyd/data/ping-object-source.ts src/fyd/media/select.ts
grep -n "export function validateSiteSpec\|export function isRenderable" src/fyd/sitespec/validator.ts
grep -n "export function canonicalize" src/lib/ping/ask-composer.ts
sed -n '289,320p' src/fyd/proceduralize/generator.ts
echo "=== overlay store? getPingObjectGraph body head ==="
grep -n "getPingObjectGraph" src/fyd/data/ping-object-source.ts | head
