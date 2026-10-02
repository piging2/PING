#!/bin/bash
cd /home/nolan/projects/ping
grep -rn "export function generateSiteSpec\|export async function generateSiteSpec\|export const generateSiteSpec" src/fyd/builder/*.ts | head
echo ---
grep -rn "export function validateSiteSpec\|export async function validateSiteSpec\|export const validateSiteSpec" src/fyd/sitespec/*.ts | head
echo ---
grep -rn "export function buildRenderContext\|export async function buildRenderContext\|export const buildRenderContext" src/fyd -l | head
echo ---
grep -n "generateSiteSpec" src/fyd/builder/index.ts | head
grep -n "validateSiteSpec" src/fyd/sitespec/index.ts | head
