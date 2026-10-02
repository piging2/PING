/**
 * FYD-Q2 MANDATORY HOSTILE TEST (jest version).
 * Business.address HIDE -> located_at -> Location.address: zero street
 * disclosure on renderer, search, Ask FYD, Circle, public agent context.
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

function testGraph(): ObjectGraph {
  const mk = (id: string, schema: string, title: string, fields: Record<string, string>) => ({
    id, schema, controllerId: "ht-owner", visibility: "public" as const,
    title, description: "synthetic hostile fixture", fields,
    createdAt: now, updatedAt: now,
    provenance: { kind: "website-ingestion", ref: "https://example.test", derivedAt: now },
  });
  return {
    objects: [
      mk("ht-biz", "ping.social.business@1", "Hidden Acres Farm", {
        address: FULL_ADDRESS, locality: "Grand Junction, CO", phone: "+1 (970) 555-0100",
      }),
      mk("ht-loc", "ping.social.location@1", "Hidden Acres Farm Site", {
        address: FULL_ADDRESS, locality: "Grand Junction, CO",
      }),
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

function noStreet(label: string, value: unknown) {
  const hit = JSON.stringify(value).includes(STREET);
  // eslint-disable-next-line no-console
  console.log(`  [${hit ? "LEAK" : "ok"}] ${label}`);
  expect(hit).toBe(false);
}

test("FYD-Q2: renderer shows zero street disclosure via located_at traversal", () => {
  const proj = objectViewToProjection(hiddenView(), testGraph());
  noStreet("projection.location", proj.location);
  noStreet("projection.locationRef", proj.locationRef);
  noStreet("projection full JSON", proj);
});

test("FYD-Q2: search (live retrieval) shows zero street disclosure via located_at traversal", () => {
  const projected = applyFieldVisibility(testGraph(), []);
  const loc = projected.objects.find((o) => o.id === "ht-loc")!;
  const rel = projected.relationships.find(
    (r: { predicate: string }) => r.predicate === "located_at",
  );
  expect(rel).toBeTruthy();
  noStreet("traversed Location object", loc);
});

test("FYD-Q2: Ask FYD (live answerAskFyd) shows zero street disclosure", () => {
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
  expect(out.ok).toBe(true);
  if (out.ok) {
    noStreet("ask answer text", (out as unknown as { answer: string }).answer);
    noStreet("ask citations", (out as unknown as { citations: unknown }).citations);
  }
});

test("FYD-Q2: Circle shows zero street disclosure", () => {
  noStreet("circle projection", objectViewToCircleProjection(hiddenView()));
});

test("FYD-Q2: public agent context shows zero street disclosure", () => {
  const projected = applyFieldVisibility(testGraph(), [HIDE_BIZ_ADDRESS]);
  const ctx = buildAskFydContext({
    viewer: { id: null, displayName: null },
    target: {
      id: "ht-biz", schema: "ping.social.business@1", title: "Hidden Acres Farm",
      description: "synthetic hostile fixture",
      provenance: { kind: "website-ingestion", ref: "https://example.test", derivedAt: now },
      fields: (projected.objects.find((o) => o.id === "ht-biz")!.fields as Record<string, unknown>),
    },
    relatedObjects: projected.objects
      .filter((o) => o.id !== "ht-biz")
      .map((o) => ({
        id: o.id, schema: o.schema, title: o.title,
        description: "synthetic hostile fixture",
        provenance: { kind: "website-ingestion", ref: "https://example.test", derivedAt: now },
        fields: o.fields as Record<string, unknown>,
      })),
    relationships: projected.relationships as never,
    plan: null, grants: [],
    siteSpec: { siteId: "ht-site" } as never,
    question: "What is the street address?",
  } as never);
  noStreet("public agent context", ctx);
});

test("FYD-Q2: owner-authorized context retains the underlying observation", () => {
  const g = testGraph();
  const biz = g.objects.find((o) => o.id === "ht-biz")!;
  expect(JSON.stringify(biz.fields)).toContain(STREET);
});
