#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
D="src/fyd/__pressure__"
mkdir -p "$D"
cat > "$D/css-stub.mts" <<'F4_HARNESS_EOF_9Z'
/**
 * F4-PRESSURE bootstrap stub: node/tsx cannot parse .css imports pulled in
 * by renderer.tsx's UI tree (object-circle.module.css). This stubs them to {}
 * so the pure seam functions (buildRenderContext, resolveQuery) load.
 * Loaded via `tsx --import ./css-stub.mts` BEFORE the harness module.
 */
import { Module } from "node:module";

const m = Module as unknown as {
  _extensions: Record<string, (mod: { exports: unknown }, filename: string) => void>;
};
for (const ext of [".css", ".scss", ".sass", ".less"]) {
  m._extensions[ext] = function (mod) {
    mod.exports = {};
  };
}

F4_HARNESS_EOF_9Z
cat > "$D/f4-followup.mts" <<'F4_HARNESS_EOF_9Z'
import type { PingObject } from "../../lib/ping/types";
import { generateSiteSpec } from "../proceduralize/generator";
import { validateSiteSpec } from "../sitespec/validator";
const renderer = await import("../components/renderer");
const { buildRenderContext, resolveQuery } = renderer;

const GEN_AT = "2026-09-23T19:00:00.000Z";
const prov = () => ({ kind: "website-derived" as const, ref: "/index.html", derivedAt: GEN_AT });
const mk = (p: Partial<PingObject> & { id: string }): PingObject => ({
  schema: "ping.social.business@1", controllerId: "web:c", visibility: "public",
  title: "Untitled", description: "", fields: {}, createdAt: GEN_AT, updatedAt: GEN_AT,
  provenance: prov(), ...p,
});

// A. duplicate ids: which title lands in spec vs resolved owner?
const dupGraph = {
  objects: [
    mk({ id: "dup", title: "First Title", fields: { phone: "555-0001" }, description: "First." }),
    mk({ id: "dup", title: "Second Title", fields: { phone: "555-0002" }, description: "Second." }),
  ],
  relationships: [],
};
const dupSpec = generateSiteSpec(dupGraph as never, { generatedAt: GEN_AT });
const dupCtx = buildRenderContext(dupSpec, dupGraph as never, { viewerId: null, displayName: null });
const dupResolved = resolveQuery({ kind: "owner" }, dupCtx.graph, dupSpec.ownerObjectId);
console.log(JSON.stringify({
  case: "duplicate-ids-detail",
  specHomeTitle: dupSpec.pages[0]?.title,
  specOwnerId: dupSpec.ownerObjectId,
  resolvedOwnerTitle: (dupResolved[0] as PingObject | undefined)?.title,
  resolvedOwnerPhone: (dupResolved[0] as PingObject | undefined)?.fields?.phone,
  mismatch: dupSpec.pages[0]?.title !== (dupResolved[0] as PingObject | undefined)?.title,
}));

// B. title null: exact page titles + validator findings
const nullTitleGraph = {
  objects: [mk({ id: "b1", title: null as never, description: "d" })],
  relationships: [],
};
const ntSpec = generateSiteSpec(nullTitleGraph as never, { generatedAt: GEN_AT });
const ntFindings = validateSiteSpec(ntSpec, new Set(["ping.social.business@1"]));
console.log(JSON.stringify({
  case: "title-null-detail",
  pageTitles: ntSpec.pages.map((p) => p.title),
  navLabels: ntSpec.navigation,
  validatorErrors: ntFindings.filter((f) => f.severity === "error").length,
  validatorFindings: ntFindings.map((f) => f.severity + "@" + f.path + ": " + f.message),
}));

// C. conflicting facts: which phone does the Contact section resolve?
const confGraph = {
  objects: [
    mk({ id: "b-1", title: "Acme Plumbing", fields: { phone: "555-0001" }, description: "A" }),
    mk({ id: "b-2", title: "Acme Plumbing", fields: { phone: "555-0002" }, description: "B" }),
  ],
  relationships: [],
};
const confSpec = generateSiteSpec(confGraph as never, { generatedAt: GEN_AT });
const confCtx = buildRenderContext(confSpec, confGraph as never, { viewerId: null, displayName: null });
const contactSec = confSpec.pages.flatMap((p) => p.sections).find((s) => s.component === "Contact");
const confResolved = contactSec ? resolveQuery(contactSec.query, confCtx.graph, confSpec.ownerObjectId) : [];
console.log(JSON.stringify({
  case: "conflicting-facts-detail",
  ownerObjectId: confSpec.ownerObjectId,
  contactPhones: confResolved.map((o) => (o as PingObject).fields?.phone),
  phoneCount: confResolved.length,
}));

// D. unicode round-trip byte check
const uniTitle = "\u202EACME\u202C Plumbing \u200B\u200C\u200D \u{1F528}";
const uniGraph = { objects: [mk({ id: "b1", title: uniTitle, description: "d" })], relationships: [] };
const uniSpec = generateSiteSpec(uniGraph as never, { generatedAt: GEN_AT });
const uniCtx = buildRenderContext(uniSpec, uniGraph as never, { viewerId: null, displayName: null });
const uniResolved = resolveQuery({ kind: "owner" }, uniCtx.graph, uniSpec.ownerObjectId);
const rt = (uniResolved[0] as PingObject | undefined)?.title;
console.log(JSON.stringify({
  case: "unicode-roundtrip",
  specTitleByteEqual: uniSpec.pages[0]?.title === uniTitle,
  resolvedTitleByteEqual: rt === uniTitle,
}));

F4_HARNESS_EOF_9Z
node_modules/.bin/tsx --import ./$D/css-stub.mts ./$D/f4-followup.mts
RC=$?
rm -rf "$D"
echo "FOLLOWUP_EXIT=$RC"
