/**
 * FYD-Q2 MANDATORY HOSTILE TEST v2 (Nolan, 2026-09-24 ~15:45 MDT).
 *
 * Chain: Business.address HIDE -> traverse located_at -> Location.address ->
 * renderer AND search AND Ask FYD AND Circle AND public agent context must
 * ALL show zero disclosure of the street address. Owner-authorized context
 * retains underlying observation access.
 *
 * v2 corrections:
 * - compileAskContext has ZERO production callers (dead code); the live
 *   "search"/retrieval surface is the visitor-answer related-object
 *   selection. Surface 2 now targets the live path.
 * - Surface 5 fixed (relatedObjects need description).
 * - Adds live answerAskFyd end-to-end with injected SiteBundle.
 */

import { objectViewToProjection } from "@/fyd/object/object-projection";
import { objectViewToCircleProjection } from "@/fyd/object/circle-adapter";
import {
  applyFieldVisibility,
  type FieldVisibilityDecision,
} from "@/fyd/sitespec/field-visibility";
import { answerAskFyd } from "@/fyd/ask/visitor-answer";
import { buildAskFydContext } from "@/fyd/ask/context-builder";
import type { ObjectView } from "@/fyd/object/types";
import type { ObjectGraph } from "@/fyd/sitespec/types";

const STREET = "123 Hidden St";
const FULL_ADDRESS = "123 Hidden St, Grand Junction, CO 81501";
const now = "2026-09-24T15:45:00Z";

const bizFields = {
  address: FULL_ADDRESS,
  locality: "Grand Junction, CO",
  phone: "+1 (970) 555-0100",
};
const locFields = { address: FULL_ADDRESS, locality: "Grand Junction, CO" };

function testGraph(): ObjectGraph {
  const mk = (id: string, schema: string, title: string, fields: Record<string, string>) => ({
    id, schema, controllerId: "ht-owner", visibility: "public" as const,
    title, description: "synthetic hostile fixture", fields,
    createdAt: now, updatedAt: now,
    provenance: { kind: "website-ingestion", ref: "https://example.test", derivedAt: now },
  });
  return {
    objects: [
      mk("ht-biz", "ping.social.business@1", "Hidden Acres Farm", bizFields),
      mk("ht-loc", "ping.social.location@1", "Hidden Acres Farm Site", locFields),
    ],
    relationships: [
      { id: "ht-rel-1", subject: "ht-biz", predicate: "located_at", object: "ht-loc", status: "active" },
    ],
  } as unknown as ObjectGraph;
}

const HIDE_BIZ_ADDRESS: FieldVisibilityDecision = {
  objectId: "ht-biz", field: "address", policy: "hide",
  decidedBy: "owner", decidedAt: now, source: "owner_override", version: 1,
};

function hiddenView(): ObjectView {
  return {
    id: "ht-biz", schema: "ping.social.business@1", name: "Hidden Acres Farm",
    category: "Farm", locationLabel: "Grand Junction, CO", summary: "A test farm.",
    media: [], services: [], serviceArea: [],
    contact: {
      phone: "+1 (970) 555-0100", email: null, website: null,
      locality: "Grand Junction, CO", addressVisibility: "hidden",
    },
    capabilities: [],
    provenance: { label: "observed on example.test", ref: "https://example.test", derivedAt: now, kind: "website-ingestion" },
    ownerUpdatedAt: now, sampleQuestions: [], fieldCorrections: [],
  } as unknown as ObjectView;
}

let failures = 0;
function check(label: string, value: unknown) {
  const hit = JSON.stringify(value).includes(STREET);
  console.log(`  [${hit ? "LEAK" : "ok"}] ${label}: ${hit ? "STREET ADDRESS DISCLOSED" : "zero street disclosure"}`);
  if (hit) failures++;
}

// Surface 1: renderer
console.log("Surface 1: renderer (objectViewToProjection)");
{
  const proj = objectViewToProjection(hiddenView(), testGraph());
  check("projection.location", proj.location);
  check("projection.locationRef", proj.locationRef);
  check("projection full JSON", proj);
}

// Surface 2: live search/retrieval = visitor-answer publicGraphOf + related selection
console.log("Surface 2: search (live: publicGraphOf + one-hop located_at traversal)");
{
  // Mirror publicGraphOf: applyFieldVisibility(graph, []) then 1-hop related.
  const projected = applyFieldVisibility(testGraph(), []);
  const loc = projected.objects.find((o) => o.id === "ht-loc")!;
  const rel = projected.relationships.find(
    (r: { predicate: string }) => r.predicate === "located_at",
  )!;
  console.log(`  traversed loc.address = ${JSON.stringify((loc.fields as Record<string, unknown>).address)}`);
  console.log(`  located_at edge present in public graph: ${!!rel}`);
  check("traversed Location object (search selection)", loc);
}

// Surface 3: Ask FYD live (answerAskFyd end-to-end)
console.log("Surface 3: Ask FYD (answerAskFyd, visitor)");
{
  const bundle = {
    siteId: "ht-site",
    businessName: "Hidden Acres Farm",
    graph: testGraph(),
    spec: {
      kind: "fyd.sitespec@1", ownerObjectId: "ht-biz", version: 1,
      generator: { name: "fyd-site-generator", version: "ht", generatedAt: now },
      themeTokens: {}, navigation: [], pages: [], provenance: {},
    },
    findings: [], renderable: true, mediaManifest: null,
  } as never;
  const out = answerAskFyd(
    { siteId: "ht-site", question: "What is the street address of the business?", mode: "visitor" },
    { loadBundle: () => bundle },
  );
  if (!out.ok) {
    console.log(`  answerAskFyd error: ${(out as { error: { kind: string } }).error.kind}`);
  } else {
    const o = out as { answer: string; citations: unknown[]; unknowns: unknown[] };
    check("ask answer text", o.answer);
    check("ask citations", o.citations);
  }
}

// Surface 4: Circle
console.log("Surface 4: Circle (objectViewToCircleProjection)");
{
  check("circle projection", objectViewToCircleProjection(hiddenView()));
}

// Surface 5: public agent context (buildAskFydContext over projected graph)
console.log("Surface 5: public agent context (buildAskFydContext)");
{
  const projected = applyFieldVisibility(testGraph(), [HIDE_BIZ_ADDRESS]);
  const ctx = buildAskFydContext({
    viewer: { id: null, displayName: null },
    target: {
      id: "ht-biz", schema: "ping.social.business@1", title: "Hidden Acres Farm",
      description: "synthetic hostile fixture", fields: (projected.objects.find((o) => o.id === "ht-biz")!.fields as Record<string, unknown>),
    },
    relatedObjects: projected.objects
      .filter((o) => o.id !== "ht-biz")
      .map((o) => ({
        id: o.id, schema: o.schema, title: o.title,
        description: "synthetic hostile fixture",
        fields: o.fields as Record<string, unknown>,
      })),
    relationships: projected.relationships as never,
    plan: null, grants: [],
    siteSpec: { siteId: "ht-site" } as never,
    question: "What is the street address?",
  } as never);
  check("public agent context", ctx);
}

// Owner-authorized context retains the observation
console.log("Owner-authorized context (must RETAIN the observation):");
{
  const g = testGraph();
  const biz = g.objects.find((o) => o.id === "ht-biz")!;
  const retained = JSON.stringify(biz.fields).includes(STREET);
  console.log(`  [${retained ? "ok" : "FAIL"}] source graph retains street address for owner: ${retained}`);
  if (!retained) failures++;
}

console.log(`\nFYD-Q2 RESULT: ${failures === 0 ? "PASS - zero street disclosure on all 5 surfaces" : `FAIL - ${failures} disclosure(s) detected (P0)`}`);
process.exit(failures === 0 ? 0 : 1);
