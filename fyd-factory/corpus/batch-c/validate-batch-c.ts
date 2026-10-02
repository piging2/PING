/**
 * Batch-C redacted fixture validator.
 * Run from the repo root: npx tsx /home/nolan/fyd-factory/validate-batch-c.ts
 * Emits JSON to stdout; exits nonzero on any error.
 */
import { createHash, createHash as _unused } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { REDACTED_BATCH_C_DENTIST_GRAPH } from "./src/fyd/proceduralize/__fixtures__/redacted-batch-c-dentist";
import { REDACTED_BATCH_C_CPA_GRAPH } from "./src/fyd/proceduralize/__fixtures__/redacted-batch-c-cpa";
import { REDACTED_BATCH_C_LAWFIRM_GRAPH } from "./src/fyd/proceduralize/__fixtures__/redacted-batch-c-lawfirm";
import { REDACTED_BATCH_C_CONSULTANT_GRAPH } from "./src/fyd/proceduralize/__fixtures__/redacted-batch-c-consultant";
import type { PingObject, PingRelationship } from "./src/lib/ping/types";

const FIX_DIR = "./src/fyd/proceduralize/__fixtures__";
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const PHONE_RE = /^\(970\) 555-01([4-5][0-9])$/;

const KNOWN_SCHEMAS = new Set([
  "ping.social.profile@1",
  "ping.social.post@1",
  "ping.social.business@1",
  "ping.social.person@1",
  "ping.social.article@1",
  "ping.social.project@1",
  "ping.social.product@1",
  "ping.social.service@1",
  "ping.social.location@1",
  "ping.social.offer@1",
  "ping.knowledge.business@1",
  "ping.knowledge.service@1",
  "ping.knowledge.location@1",
  "ping.knowledge.person@1",
  "ping.knowledge.article@1",
]);

const errors: string[] = [];
const warnings: string[] = [];
const phones: { value: string; obj: string }[] = [];

function fail(msg: string) {
  errors.push(msg);
}
function warn(msg: string) {
  warnings.push(msg);
}

/** Port of ask-composer canonicalize: sorted keys, array order preserved. */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(rec[k])}`).join(",")}}`;
  }
  return "null";
}

const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

interface FixtureDef {
  key: string;
  file: string;
  exportName: string;
  graph: { objects: PingObject[]; relationships: PingRelationship[] };
  expect: {
    people: number;
    services: number;
    articles: number;
    projects: number;
    locations: number;
    phone: boolean;
    hours: boolean;
  };
}

const FIXTURES: FixtureDef[] = [
  {
    key: "dentist",
    file: "redacted-batch-c-dentist.ts",
    exportName: "REDACTED_BATCH_C_DENTIST_GRAPH",
    graph: REDACTED_BATCH_C_DENTIST_GRAPH as { objects: PingObject[]; relationships: PingRelationship[] },
    expect: { people: 3, services: 4, articles: 2, projects: 2, locations: 2, phone: true, hours: true },
  },
  {
    key: "cpa",
    file: "redacted-batch-c-cpa.ts",
    exportName: "REDACTED_BATCH_C_CPA_GRAPH",
    graph: REDACTED_BATCH_C_CPA_GRAPH as { objects: PingObject[]; relationships: PingRelationship[] },
    expect: { people: 2, services: 5, articles: 1, projects: 0, locations: 1, phone: true, hours: false },
  },
  {
    key: "lawfirm",
    file: "redacted-batch-c-lawfirm.ts",
    exportName: "REDACTED_BATCH_C_LAWFIRM_GRAPH",
    graph: REDACTED_BATCH_C_LAWFIRM_GRAPH as { objects: PingObject[]; relationships: PingRelationship[] },
    expect: { people: 4, services: 4, articles: 2, projects: 2, locations: 2, phone: true, hours: true },
  },
  {
    key: "consultant",
    file: "redacted-batch-c-consultant.ts",
    exportName: "REDACTED_BATCH_C_CONSULTANT_GRAPH",
    graph: REDACTED_BATCH_C_CONSULTANT_GRAPH as { objects: PingObject[]; relationships: PingRelationship[] },
    expect: { people: 1, services: 2, articles: 3, projects: 0, locations: 1, phone: false, hours: false },
  },
];

function checkValueHygiene(key: string, objId: string, fkey: string, v: string) {
  if (v.includes("@")) {
    if (!/^[^\s@]+@[^\s@]+\.example\.com$/.test(v))
      fail(`${key}: ${objId} field "${fkey}" email "${v}" is not .example.com`);
  }
  if (/^https?:\/\//.test(v) && !v.includes("example.com"))
    fail(`${key}: ${objId} field "${fkey}" url "${v}" is not an example.com placeholder`);
  const phoneish = v.match(/\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/);
  if (phoneish && fkey.toLowerCase().includes("phone")) {
    if (!PHONE_RE.test(v)) fail(`${key}: ${objId} phone "${v}" outside allowed fictional range`);
    else phones.push({ value: v, obj: `${key}:${objId}` });
  }
}

const report: Record<string, unknown>[] = [];

for (const fx of FIXTURES) {
  const { key, graph, expect } = fx;
  const path = join(FIX_DIR, fx.file);
  const fileBytes = readFileSync(path);
  const fileSha = sha256(fileBytes);
  const content = fileBytes.toString("utf8");

  if (!content.includes("DEMO_SYNTHETIC")) fail(`${key}: file missing DEMO_SYNTHETIC marker text`);

  const objIds = new Set<string>();
  for (const o of graph.objects) {
    if (!o.id || objIds.has(o.id)) fail(`${key}: duplicate or empty object id "${o.id}"`);
    objIds.add(o.id);
    if (!KNOWN_SCHEMAS.has(o.schema)) fail(`${key}: ${o.id} unknown schema "${o.schema}"`);
    if (o.visibility !== "public" && o.visibility !== "private")
      fail(`${key}: ${o.id} bad visibility "${o.visibility}"`);
    if (!o.title) fail(`${key}: ${o.id} missing title`);
    if (typeof o.description !== "string") fail(`${key}: ${o.id} description not a string`);
    if (!o.provenance || o.provenance.kind !== "overlay-authored")
      fail(`${key}: ${o.id} provenance.kind must be overlay-authored, got "${o.provenance?.kind}"`);
    if (!o.provenance?.ref) fail(`${key}: ${o.id} provenance.ref missing`);
    if (!ISO_RE.test(o.provenance?.derivedAt ?? "")) fail(`${key}: ${o.id} derivedAt not ISO`);
    if (!ISO_RE.test(o.createdAt ?? "")) fail(`${key}: ${o.id} createdAt not ISO`);
    if (o.fields.redaction_class !== "DEMO_SYNTHETIC")
      fail(`${key}: ${o.id} missing redaction_class=DEMO_SYNTHETIC`);
    for (const [fk, fv] of Object.entries(o.fields)) {
      if (Array.isArray(fv)) {
        if (!fv.every((e) => typeof e === "string")) fail(`${key}: ${o.id} field "${fk}" has non-string array entries`);
        fv.forEach((e) => checkValueHygiene(key, o.id, fk, e));
      } else if (typeof fv === "string") {
        checkValueHygiene(key, o.id, fk, fv);
      } else {
        fail(`${key}: ${o.id} field "${fk}" is not string or string[]`);
      }
    }
    // Required-field contract from sitespec schemas.
    if (o.schema === "ping.social.business@1" || o.schema === "ping.social.service@1") {
      if (!o.description) fail(`${key}: ${o.id} required description is empty`);
    }
  }

  const relIds = new Set<string>();
  for (const r of graph.relationships) {
    if (!r.id || relIds.has(r.id)) fail(`${key}: duplicate or empty relationship id "${r.id}"`);
    relIds.add(r.id);
    if (!objIds.has(r.subject)) fail(`${key}: rel ${r.id} subject "${r.subject}" does not resolve`);
    if (!objIds.has(r.object)) fail(`${key}: rel ${r.id} object "${r.object}" does not resolve`);
    if (r.status !== "active" && r.status !== "inactive")
      fail(`${key}: rel ${r.id} bad status "${r.status}"`);
    if (!r.evidenceRef) fail(`${key}: rel ${r.id} missing evidenceRef`);
  }

  // Shape expectations.
  const bySchema = (s: string) => graph.objects.filter((o) => o.schema === s);
  const biz = bySchema("ping.social.business@1");
  const shape = {
    people: bySchema("ping.social.person@1").length,
    services: bySchema("ping.social.service@1").length,
    articles: bySchema("ping.social.article@1").length,
    projects: bySchema("ping.social.project@1").length,
    locations: bySchema("ping.social.location@1").length,
    phone: biz.some((b) => typeof b.fields.phone === "string"),
    hours: biz.some((b) => typeof b.fields.hours === "string"),
  };
  for (const [k, v] of Object.entries(expect)) {
    if ((shape as Record<string, unknown>)[k] !== v)
      fail(`${key}: shape mismatch ${k}: expected ${v}, got ${(shape as Record<string, unknown>)[k]}`);
  }
  if (biz.length !== 1) fail(`${key}: expected exactly 1 business object, got ${biz.length}`);

  // Sparse fixture: allow empty article descriptions only for consultant.
  for (const a of bySchema("ping.social.article@1")) {
    if (!a.description && key !== "consultant")
      fail(`${key}: article ${a.id} has empty description`);
    if (!a.description && key === "consultant") warn(`${key}: sparse article ${a.id} has no description (intended, UNKNOWN handling)`);
  }

  const graphSha = sha256(canonicalize(graph));
  report.push({
    key,
    file: fx.file,
    repo_path: "src/fyd/proceduralize/__fixtures__/" + fx.file,
    export_name: fx.exportName,
    objects: graph.objects.length,
    relationships: graph.relationships.length,
    shape,
    file_sha256: fileSha,
    graph_sha256: graphSha,
  });
}

// Phone uniqueness within batch and against the whole repo fixture corpus.
const seen = new Map<string, string>();
for (const p of phones) {
  if (seen.has(p.value)) fail(`duplicate phone ${p.value} in ${p.obj} and ${seen.get(p.value)}`);
  seen.set(p.value, p.obj);
}
if (phones.length !== 3) fail(`expected 3 phones total (dentist, cpa, lawfirm), got ${phones.length}`);

const allFixtureFiles = readdirSync(FIX_DIR).filter((f) => f.endsWith(".ts"));
for (const f of allFixtureFiles) {
  if (f.startsWith("redacted-batch-c-")) continue;
  const text = readFileSync(join(FIX_DIR, f), "utf8");
  const found = text.match(/\(970\)\s?555-01\d{2}|\+197055501\d{2}/g) || [];
  for (const m of found) {
    const norm = m.replace(/\s/g, "");
    if (["(970)555-0140", "(970)555-0143", "(970)555-0145", "+19705550140", "+19705550143", "+19705550145"].includes(norm))
      fail(`phone collision: ${f} already uses ${m}`);
  }
}

const out = {
  batch: "batch-c",
  marker: "DEMO_SYNTHETIC",
  provenance_kind: "overlay-authored",
  fixtures: report,
  phones_used: [...seen.entries()].map(([value, obj]) => ({ value, object: obj })),
  errors,
  warnings,
  valid: errors.length === 0,
};
console.log(JSON.stringify(out, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
