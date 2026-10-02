/**
 * chain-proof.ts: proves the P4 digest-chain invalidation property
 * (LANE-CHAOS-R2) for the FYD compilation pipeline, against the pipeline's
 * TRUE dependency shape (not an assumed one).
 *
 * Usage:
 *   tsx chain-proof.ts --fixture <path>
 *
 * The FYD pipeline's real dependency shape:
 *   spec   = f(graph) but only of the spec-visible projection (structure,
 *            queries, embedded copy such as the owner title). Field values
 *            that sections resolve via query at render time (phone, hours,
 *            description) are NOT embedded in the spec.
 *   render = f(spec, graph): the RenderContext binds both.
 *
 * Proves three things:
 *   REPRODUCIBILITY: identical source bytes -> identical digests at every
 *     stage, across two fully independent runs.
 *   INVALIDATE-SPEC-VISIBLE (owner title edit): every downstream digest
 *     moves (fixture, graph, spec, spec_b, findings, render).
 *   INVALIDATE-RENDER-VISIBLE (phone edit): fixture, graph, and render
 *     digests move, while spec/spec_b/findings digests provably DO NOT
 *     (the spec does not embed the phone; asserting otherwise would invent
 *     a false dependency).
 * Each edit class first asserts its own assumption (the edited value is
 * actually observable in the artifact it should affect).
 *
 * Exit 0 with ALL CHECKS PASS, else exit 1 listing failures.
 * Read-only w.r.t. the repo; writes nothing (prints to stdout).
 */

import * as fs from "node:fs";

// Same CSS stub the worker uses (renderer.tsx transitively imports .css).
(require as any).extensions[".css"] = function (m: any) {
  m.exports = {};
};

import { digest, sha256Hex } from "./lib";

const PING_SRC = "/home/nolan/projects/ping/src";
const GENERATED_AT = "2026-09-23T00:00:00.000Z";

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  if (i < 0 || i + 1 >= process.argv.length) {
    console.error(`missing required arg ${name}`);
    process.exit(2);
  }
  return process.argv[i + 1];
}

interface Chain {
  fixture_digest: string;
  graph_digest: string;
  spec_digest: string;
  spec_digest_b: string;
  findings_digest: string;
  render_digest: string;
}

interface Compiled {
  chain: Chain;
  specJson: string;
  ctxJson: string;
}

async function compileAll(graph: any, fixtureDigest: string): Promise<Compiled> {
  const { generateSiteSpec } = await import(PING_SRC + "/fyd/proceduralize/generator.ts");
  const { validateSiteSpec } = await import(PING_SRC + "/fyd/sitespec/validator.ts");
  const { buildRenderContext } = await import(PING_SRC + "/fyd/components/renderer.tsx");

  const graph_digest = digest(graph);
  const s1 = generateSiteSpec(graph, { generatedAt: GENERATED_AT });
  const s2 = generateSiteSpec(graph, { generatedAt: GENERATED_AT });
  const spec_digest = digest(s1);
  const spec_digest_b = digest(s2);
  const specJson = JSON.stringify(s1);
  const knownSchemas = new Set(graph.objects.map((o: any) => o.schema));
  const findings = validateSiteSpec(s1, knownSchemas);
  const findings_digest = digest({ spec_digest, findings });
  const ctx = buildRenderContext(s1, graph, { viewerId: null, displayName: null });
  const ctxJson = JSON.stringify(ctx);
  const render_digest = digest({ spec_digest, graph_digest, ctx });
  return {
    chain: { fixture_digest: fixtureDigest, graph_digest, spec_digest, spec_digest_b, findings_digest, render_digest },
    specJson,
    ctxJson,
  };
}

function editTitle(graph: any): { edited: any; description: string; marker: string } {
  const g = JSON.parse(JSON.stringify(graph));
  const owner = g.objects.find((o: any) => /business/i.test(o.schema)) ?? g.objects[0];
  const marker = "CHAINPROOF";
  owner.title = `${owner.title} ${marker}`;
  return { edited: g, description: `title on ${owner.id} += " ${marker}"`, marker };
}

function editPhone(graph: any): { edited: any; description: string; marker: string } | null {
  const g = JSON.parse(JSON.stringify(graph));
  for (const o of g.objects) {
    const phone = o.fields?.phone;
    if (typeof phone === "string" && /\d/.test(phone)) {
      const chars = phone.split("");
      for (let i = chars.length - 1; i >= 0; i--) {
        if (/\d/.test(chars[i])) {
          chars[i] = String((parseInt(chars[i], 10) + 1) % 10);
          break;
        }
      }
      const marker = chars.join("");
      o.fields.phone = marker;
      return { edited: g, description: `fields.phone on ${o.id}: ${phone} -> ${marker}`, marker };
    }
  }
  return null;
}

async function main(): Promise<void> {
  const fixturePath = arg("--fixture");
  const rawBytes = fs.readFileSync(fixturePath);
  const fixtureDigest = sha256Hex(rawBytes.toString("utf8"));
  const graph = JSON.parse(rawBytes.toString("utf8")).graph;
  if (!graph || !Array.isArray(graph.objects) || graph.objects.length === 0) {
    console.error("CHAIN_PROOF_ABORT: fixture carries no object graph");
    process.exit(2);
  }

  const failures: string[] = [];
  const check = (name: string, ok: boolean, detail = "") => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
    if (!ok) failures.push(name);
  };
  const short = (d: string) => d.slice(0, 12);
  const stages: (keyof Chain)[] = [
    "fixture_digest",
    "graph_digest",
    "spec_digest",
    "spec_digest_b",
    "findings_digest",
    "render_digest",
  ];

  // ---- Direction 1: reproducibility ----
  const baseA = await compileAll(graph, fixtureDigest);
  const baseB = await compileAll(graph, fixtureDigest);
  for (const s of stages) check(`repro:${s}`, baseA.chain[s] === baseB.chain[s]);
  check("repro:determinism", baseA.chain.spec_digest === baseA.chain.spec_digest_b);

  // ---- Direction 2a: spec-visible edit (title) moves everything ----
  const t = editTitle(graph);
  console.log(`edit: ${t.description}`);
  const tBytes = JSON.stringify({ graph: t.edited });
  const tRun = await compileAll(t.edited, sha256Hex(tBytes));
  check("shape:title_is_spec_visible", tRun.specJson.includes(t.marker),
    "assumption: edited title must be observable in the spec");
  if (tRun.specJson.includes(t.marker)) {
    for (const s of stages) {
      check(`invalidate-title:${s}`, (tRun.chain[s] as string) !== (baseA.chain[s] as string),
        `${short(baseA.chain[s] as string)} -> ${short(tRun.chain[s] as string)}`);
    }
  } else {
    check("invalidate-title:skipped", false, "title not spec-visible for this fixture");
  }
  check("invalidate-title:determinism", tRun.chain.spec_digest === tRun.chain.spec_digest_b);

  // ---- Direction 2b: render-visible edit (phone) moves only its true dependents ----
  const p = editPhone(graph);
  if (!p) {
    console.log("SKIP  invalidate-phone: no phone field in this fixture");
  } else {
    console.log(`edit: ${p.description}`);
    const pBytes = JSON.stringify({ graph: p.edited });
    const pRun = await compileAll(p.edited, sha256Hex(pBytes));
    check("shape:phone_is_render_visible", pRun.ctxJson.includes(p.marker),
      "assumption: edited phone must be observable in the render context");
    check("shape:phone_not_spec_visible", !pRun.specJson.includes(p.marker),
      "assumption: edited phone must NOT be embedded in the spec");
    for (const s of ["fixture_digest", "graph_digest", "render_digest"] as (keyof Chain)[]) {
      check(`invalidate-phone:${s}:moves`, (pRun.chain[s] as string) !== (baseA.chain[s] as string),
        `${short(baseA.chain[s] as string)} -> ${short(pRun.chain[s] as string)}`);
    }
    for (const s of ["spec_digest", "spec_digest_b", "findings_digest"] as (keyof Chain)[]) {
      check(`invalidate-phone:${s}:stable`, (pRun.chain[s] as string) === (baseA.chain[s] as string),
        "no false dependency: spec does not embed the phone");
    }
    check("invalidate-phone:determinism", pRun.chain.spec_digest === pRun.chain.spec_digest_b);
  }

  console.log(failures.length === 0 ? "ALL CHECKS PASS" : `${failures.length} CHECKS FAILED`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("CHAIN_PROOF_ERROR", e?.message ?? e);
  process.exit(1);
});
