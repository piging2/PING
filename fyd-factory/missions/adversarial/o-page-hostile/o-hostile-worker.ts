/**
 * o-hostile-worker.ts: runs hostile /o missions against the patched Pig tree.
 *
 * Usage:
 *   tsx o-hostile-worker.ts --missions <missions.jsonl> --out <results.jsonl>
 *
 * Per mission:
 *   build ObjectGraph -> composeObjectView (x2, determinism) ->
 *   canonical digest -> executable-scheme scan on capability hrefs ->
 *   category expectation check -> result record.
 *
 * hostile-media missions exercise resolveSafeLink("navigate") directly
 * (the single safe-link authority the renderer must clear).
 *
 * All fixtures are synthetic (synthetic:true, testing_only:true).
 * Read-only: never touches the network, never writes outside --out.
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";

// view.ts transitively imports .css modules; stub them for headless run.
(require as any).extensions[".css"] = function (m: any) {
  m.exports = {};
};

import { composeObjectView } from "/home/nolan/projects/ping/src/fyd/object/view.ts";
import { resolveSafeLink } from "/home/nolan/projects/ping/src/fyd/sitespec/safe-link.ts";
import { computePipelineCodeVersion } from "/home/nolan/fyd-compile-harness/runner/lib.ts";

const PIPELINE_CODE_VERSION = computePipelineCodeVersion();
const WORKER_VERSION = "o-hostile-1.0";

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) {
    console.error(`missing arg ${name}`);
    process.exit(2);
  }
  return process.argv[i + 1];
}

function canon(v: any): any {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v).sort()) o[k] = canon(v[k]);
    return o;
  }
  return v;
}
const digestOf = (v: any) =>
  crypto.createHash("sha256").update(JSON.stringify(canon(v))).digest("hex");

const EXEC_SCHEME = /^(?:javascript|data|vbscript|file|blob):/i;

interface Mission {
  mission_id: string;
  category: string;
  synthetic: boolean;
  testing_only: boolean;
  object: any;
  extra_objects: any[];
  relationships: any[];
  expect: any;
}

function checkExpect(m: Mission, view: any, resolveResult: any): { met: boolean; detail: string } {
  const e = m.expect;
  const caps: any[] = view?.capabilities ?? [];
  const capKinds = new Set(caps.map((c: any) => c.kind));
  if (e.no_capability) {
    const bad = caps.filter((c: any) => c.kind === e.no_capability);
    return bad.length === 0
      ? { met: true, detail: `no ${e.no_capability} capability emitted` }
      : { met: false, detail: `UNEXPECTED ${e.no_capability} capability: ${JSON.stringify(bad)}` };
  }
  if (e.no_capabilities) {
    const bad = caps.filter((c: any) => e.no_capabilities.includes(c.kind));
    return bad.length === 0
      ? { met: true, detail: `none of [${e.no_capabilities}] emitted` }
      : { met: false, detail: `UNEXPECTED capabilities: ${JSON.stringify(bad)}` };
  }
  if (e.capability) {
    const got = caps.find((c: any) => c.kind === e.capability.kind);
    if (!got) return { met: false, detail: `missing ${e.capability.kind} capability` };
    if (got.href !== e.capability.href)
      return { met: false, detail: `href mismatch: got ${JSON.stringify(got.href)} want ${JSON.stringify(e.capability.href)}` };
    return { met: true, detail: `${e.capability.kind} -> ${got.href}` };
  }
  if (e.capabilities) {
    for (const want of e.capabilities) {
      const got = caps.find((c: any) => c.kind === want.kind);
      if (!got || got.href !== want.href)
        return { met: false, detail: `capability mismatch for ${want.kind}: got ${JSON.stringify(got?.href)}` };
    }
    return { met: true, detail: `all ${e.capabilities.length} expected capabilities present` };
  }
  if (e.resolve) {
    const r = resolveResult;
    if (!r) return { met: false, detail: "no resolve result" };
    if (r.kind !== e.expect_kind)
      return { met: false, detail: `resolve kind ${r.kind} != ${e.expect_kind}` };
    if (e.expect_href && r.href !== e.expect_href)
      return { met: false, detail: `resolve href ${JSON.stringify(r.href)} != ${JSON.stringify(e.expect_href)}` };
    return { met: true, detail: `resolveSafeLink -> ${r.kind}${r.href ? " " + r.href : ""}` };
  }
  if (e.absent_service) {
    const names = (view?.services ?? []).map((s: any) => s.name);
    return names.includes(e.absent_service)
      ? { met: false, detail: `PRIVATE SERVICE LEAKED into services: ${e.absent_service}` }
      : { met: true, detail: `private service absent from services (${names.length} services)` };
  }
  if (e.present_service) {
    const names = (view?.services ?? []).map((s: any) => s.name);
    return names.includes(e.present_service)
      ? { met: true, detail: `public service present: ${e.present_service}` }
      : { met: false, detail: `public service MISSING: ${e.present_service}` };
  }
  if (e.observe === "private-compose") {
    const blob = JSON.stringify(view ?? {});
    const markerHit = /PRIV-MARK-\d+/.test(blob);
    return {
      met: true,
      detail: `observed: composed=${!!view} marker_present=${markerHit} (composeObjectView is viewer-agnostic; the /o route gates via loadObjectViewById)`,
    };
  }
  return { met: false, detail: "unknown expectation" };
}

function run(m: Mission): any {
  const rec: any = {
    mission_id: m.mission_id,
    category: m.category,
    synthetic: true,
    testing_only: true,
    pipeline_code_version: PIPELINE_CODE_VERSION.slice(0, 16),
    worker_version: WORKER_VERSION,
  };
  try {
    if (m.category === "hostile-media") {
      const r = resolveSafeLink(m.expect.url, "navigate");
      const chk = checkExpect(m, null, r);
      rec.outcome = chk.met ? "PASS" : "FAIL";
      rec.deterministic = true;
      rec.executable_hrefs = 0;
      rec.expectation_met = chk.met;
      rec.detail = chk.detail;
      return rec;
    }
    const graph = {
      objects: [m.object, ...(m.extra_objects ?? [])],
      relationships: m.relationships ?? [],
    };
    const v1 = composeObjectView(graph, "wave2-test", m.object, "wave2", "wave2-nonexistent");
    const v2 = composeObjectView(graph, "wave2-test", m.object, "wave2", "wave2-nonexistent");
    const d1 = digestOf(v1);
    const d2 = digestOf(v2);
    rec.deterministic = d1 === d2;
    rec.digest = d1.slice(0, 16);
    // Executable-scheme scan across the executable seam: capability hrefs.
    let execCount = 0;
    for (const c of v1.capabilities ?? []) {
      if (typeof c.href === "string" && EXEC_SCHEME.test(c.href)) execCount++;
    }
    for (const med of v1.media ?? []) {
      if (typeof med.src === "string" && EXEC_SCHEME.test(med.src)) execCount++;
    }
    rec.executable_hrefs = execCount;
    const chk = checkExpect(m, v1, null);
    rec.expectation_met = chk.met;
    rec.detail = chk.detail;
    rec.capability_kinds = (v1.capabilities ?? []).map((c: any) => c.kind);
    rec.outcome = rec.deterministic && execCount === 0 && chk.met ? "PASS" : "FAIL";
    return rec;
  } catch (err: any) {
    rec.outcome = "CRASH";
    rec.deterministic = false;
    rec.executable_hrefs = -1;
    rec.expectation_met = false;
    rec.detail = `exception: ${err?.message ?? String(err)}`.slice(0, 300);
    return rec;
  }
}

const missions: Mission[] = fs
  .readFileSync(arg("--missions"), "utf-8")
  .split("\n")
  .filter((l) => l.trim().length > 0)
  .map((l) => JSON.parse(l));

const out = fs.createWriteStream(arg("--out"), "utf-8");
let pass = 0, fail = 0, crash = 0;
for (const m of missions) {
  if (m.synthetic !== true || m.testing_only !== true) {
    throw new Error(`mission ${m.mission_id} missing synthetic markers`);
  }
  const r = run(m);
  out.write(JSON.stringify(r) + "\n");
  if (r.outcome === "PASS") pass++;
  else if (r.outcome === "CRASH") crash++;
  else fail++;
}
out.end();
console.log(`missions=${missions.length} pass=${pass} fail=${fail} crash=${crash}`);
console.log(`pipeline=${PIPELINE_CODE_VERSION.slice(0, 16)}`);
