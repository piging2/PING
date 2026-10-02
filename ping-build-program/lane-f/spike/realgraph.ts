/**
 * Lane F spike: adapter from FYD factory demo fixtures to SearchableObject.
 *
 * READ-ONLY: fixture files are parsed, never modified. The fixtures are
 * DEMO_SYNTHETIC (fictional businesses, 555 phones, .example.com domains)
 * but structurally real FYD object graphs: PingObject shape (id, schema,
 * visibility, title, description, fields, relationships with
 * subject/predicate/object).
 *
 * The factory corpus is single-tenant, all public. Two test-only objects
 * (owner-visibility, hidden) plus one foreign-tenant object are INJECTED
 * in memory by buildRealGraph() for the forbidden-viewer proof; they are
 * clearly labeled and never written to the fixture files.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SearchableObject, Visibility } from "./types.ts";

const FIXTURE_DIR = "/home/hatch/workspace/fyd-factory/corpus/fixtures";

const FIXTURE_FILES = [
  "batch-a/batch-a-plumber.json",
  "batch-a/batch-a-hvac.json",
  "batch-a/batch-a-electrician.json",
  "batch-a/batch-a-roofer.json",
  "batch-b-landscaper.json",
  "batch-b-pest-control.json",
  "batch-b-general-contractor.json",
  "batch-b-cleaning-service.json",
  "clearwater-plumbing-demo.json",
];

interface FixtureObject {
  id: string;
  schema: string;
  visibility?: string;
  title?: string;
  description?: string;
  fields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface FixtureRel {
  subject: string;
  predicate: string;
  object: string;
  status?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  return [];
}

function adaptObject(o: FixtureObject, tenantId: string): SearchableObject {
  const f = o.fields ?? {};
  const name = str(o.title) || str(f["name"]) || o.id;
  const description = str(o.description) || str(f["description"]);
  const extra: string[] = [];
  // Business-shaped extra signals that real FYD questions use.
  for (const k of ["hours", "locality", "licensed_insured", "warranty", "pricing", "response", "slogan"]) {
    const v = str(f[k]);
    if (v) extra.push(v);
  }
  for (const a of asStringArray(f["area_served"])) extra.push(`serves ${a}`);
  const vis = (o.visibility === "owner" || o.visibility === "hidden" ? o.visibility : "public") as Visibility;
  return {
    id: o.id,
    tenantId,
    schema: o.schema,
    name,
    description,
    extra,
    url: str(f["website"]) || null,
    phone: str(f["phone"]) || null,
    sourceIdentity: null,
    visibility: vis,
    relationships: [],
    eventTime: str(o.updatedAt) || str(o.createdAt) || "2026-09-23T00:00:00Z",
  };
}

export interface RealGraphResult {
  objects: SearchableObject[];
  /** fixture business names, for typo-query generation in the proof suite */
  businessNames: Array<{ id: string; name: string }>;
  /** fixture business ids, for id-lookup queries */
  businessIds: string[];
}

/**
 * Loads the factory demo fixtures read-only and adapts them.
 * Test-only visibility/tenant objects are injected in memory (labeled).
 */
export function buildRealGraph(): RealGraphResult {
  const tenantId = "tenant-fyd-factory";
  const byId = new Map<string, SearchableObject>();
  const rels: FixtureRel[] = [];
  const businessNames: Array<{ id: string; name: string }> = [];
  const businessIds: string[] = [];

  for (const file of FIXTURE_FILES) {
    const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, file), "utf8"));
    const g = raw.graph ?? raw;
    for (const o of g.objects as FixtureObject[]) {
      const adapted = adaptObject(o, tenantId);
      byId.set(adapted.id, adapted);
      if (adapted.schema === "ping.social.business@1") {
        businessNames.push({ id: adapted.id, name: adapted.name });
        businessIds.push(adapted.id);
      }
    }
    for (const r of (g.relationships ?? []) as FixtureRel[]) {
      if (r.status && r.status !== "active") continue;
      rels.push(r);
    }
  }

  // Wire relationships: fixture rels are subject -> predicate -> object.
  // The retrieval layer's adjacency is seeded-object -> its outgoing edges,
  // so "services of X" expands from the business along offers/provides.
  for (const r of rels) {
    const subj = byId.get(r.subject);
    if (!subj) continue;
    if (!byId.has(r.object)) continue;
    subj.relationships.push({ predicate: r.predicate, targetId: r.object });
  }

  // ---- Test-only injections (in-memory, labeled, never written to fixtures)
  const ownerOnly: SearchableObject = {
    id: "test-only-owner-biz",
    tenantId,
    schema: "ping.social.business@1",
    name: "Zebra Confidential Consulting",
    description: "Owner-only strategy notes for a private client engagement.",
    extra: ["internal only"],
    url: null,
    phone: null,
    sourceIdentity: null,
    visibility: "owner",
    relationships: [],
    eventTime: "2026-09-23T00:00:00Z",
  };
  const hidden: SearchableObject = {
    id: "test-only-hidden-biz",
    tenantId,
    schema: "ping.social.business@1",
    name: "Hidden Quarry Supplies",
    description: "Suppressed record pending legal review.",
    extra: [],
    url: null,
    phone: null,
    sourceIdentity: null,
    visibility: "hidden",
    relationships: [],
    eventTime: "2026-09-23T00:00:00Z",
  };
  const foreignTenant: SearchableObject = {
    id: "test-only-foreign-biz",
    tenantId: "tenant-other",
    schema: "ping.social.business@1",
    name: "Clearwater Plumbing Co.",
    description: "A same-named business in a DIFFERENT tenant. Must never leak across.",
    extra: [],
    url: null,
    phone: null,
    sourceIdentity: null,
    visibility: "public",
    relationships: [],
    eventTime: "2026-09-23T00:00:00Z",
  };
  byId.set(ownerOnly.id, ownerOnly);
  byId.set(hidden.id, hidden);
  byId.set(foreignTenant.id, foreignTenant);

  return { objects: [...byId.values()], businessNames, businessIds };
}

export function fixtureFileCount(): number {
  return readdirSync(FIXTURE_DIR).length;
}
