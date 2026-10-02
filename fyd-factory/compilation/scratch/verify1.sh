#!/bin/bash
cd /home/nolan/projects/ping
echo "=== buildRenderContext definitions ==="
grep -rn "export function buildRenderContext\|export const buildRenderContext\|export async function buildRenderContext" src --include=*.ts --include=*.tsx | grep -v __tests__
echo "=== buildSemanticRenderModel definitions ==="
grep -rn "export function buildSemanticRenderModel\|export const buildSemanticRenderModel" src --include=*.ts --include=*.tsx | grep -v __tests__
echo "=== callers of buildRenderContext (non-test) ==="
grep -rln "buildRenderContext" src --include=*.ts --include=*.tsx | grep -v __tests__ | grep -v "components/renderer"
echo "=== callers of buildSemanticRenderModel (non-test) ==="
grep -rln "buildSemanticRenderModel" src --include=*.ts --include=*.tsx | grep -v __tests__ | grep -v "sitespec/render-model"
echo "=== render-model.ts head ==="
sed -n '90,115p' src/fyd/sitespec/render-model.ts
