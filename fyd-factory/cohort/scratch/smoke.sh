#!/bin/bash
cat > /home/nolan/smoke.mts <<'EOF'
import { buildSemanticRenderModel } from "/home/nolan/projects/ping/src/fyd/sitespec/render-model";
import { generateSiteSpec } from "/home/nolan/projects/ping/src/fyd/proceduralize/generator";
import { validateSiteSpec, isRenderable } from "/home/nolan/projects/ping/src/fyd/sitespec/validator";
const spec = generateSiteSpec({ objects: [], relationships: [] }, { generatedAt: "2026-09-24T02:00:00Z" });
const findings = validateSiteSpec(spec, new Set<string>());
console.log("pages:", spec.pages.length, "renderable:", isRenderable(findings));
const m = buildSemanticRenderModel(spec, { objects: [], relationships: [] }, { viewerId: null, displayName: null }, { asOf: "2026-09-24T02:00:00Z" });
console.log("render model pages:", m.pages.length, "version:", m.renderModelVersion);
console.log("SMOKE OK");
EOF
cd /home/nolan/projects/ping
node --import tsx/esm --import /home/nolan/css-register.mjs /home/nolan/smoke.mts
