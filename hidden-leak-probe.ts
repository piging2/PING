/**
 * Hidden-object leak probe (read-only): mirrors the harness worker's real
 * pipeline (generateSiteSpec -> buildRenderContext) on the two shard fixtures
 * that carry visibility:"hidden" objects, at baseline + shard-B boundary seeds.
 * A LEAK = a hidden object's id or distinctive content appearing in the
 * serialized public spec or render context.
 */
import * as fs from "node:fs";

// Same CSS stub as the harness worker (renderer.tsx imports .css modules).
(require as any).extensions[".css"] = function (m: any) {
  m.exports = {};
};

import { mutateGraph } from "/home/nolan/fyd-compile-harness/runner/lib";

const PING_SRC = "/home/nolan/projects/ping/src";
const GENERATED_AT = "2026-09-23T00:00:00.000Z"; // pinned, same as worker

async function main(): Promise<void> {
  const { generateSiteSpec } = await import(PING_SRC + "/fyd/proceduralize/generator.ts");
  const { buildRenderContext } = await import(PING_SRC + "/fyd/components/renderer.tsx");

  const fixtures = [
    "/home/nolan/fyd-compile-harness/fixtures/shard/batch-a-plumber.json",
    "/home/nolan/fyd-compile-harness/fixtures/shard/clearwater-plumbing-demo.json",
  ];
  const seeds = [0, 10, 19]; // baseline + shard-B seed range edges
  let cases = 0;
  let leaks = 0;

  for (const f of fixtures) {
    const raw = JSON.parse(fs.readFileSync(f, "utf8"));
    const hidden = (raw.graph.objects as any[]).filter(
      (o) => o && o.visibility === "hidden"
    );
    console.log(`fixture=${f.split("/").pop()} hidden_objects=${hidden.length}`);
    for (const h of hidden) console.log(`  hidden id=${h.id} schema=${h.schema}`);
    if (hidden.length === 0) continue;

    for (const seed of seeds) {
      const { graph } = mutateGraph(raw.graph, seed);
      const spec = generateSiteSpec(graph as any, { generatedAt: GENERATED_AT });
      const ctx = buildRenderContext(spec, graph as any, {
        viewerId: null,
        displayName: null,
      });
      const blob = JSON.stringify({ spec, ctx });
      cases++;
      const hits: string[] = [];
      for (const h of hidden) {
        const quotedId = JSON.stringify(h.id);
        if (blob.includes(quotedId)) hits.push(`id:${h.id}`);
        const strVals: Array<[string, string]> = [];
        for (const key of ["name", "title", "description", "phone", "email", "website"]) {
          const v = (h as any)[key];
          if (typeof v === "string" && v.length >= 8) strVals.push([key, v]);
        }
        const fields = (h as any).fields;
        if (fields && typeof fields === "object") {
          for (const [k, v] of Object.entries(fields)) {
            if (typeof v === "string" && (v as string).length >= 8)
              strVals.push([`fields.${k}`, v as string]);
          }
        }
        for (const [k, v] of strVals) {
          if (blob.includes(v)) hits.push(`${k}:${v.slice(0, 48)}`);
        }
      }
      if (hits.length > 0) {
        leaks++;
        console.log(
          `LEAK fixture=${f.split("/").pop()} seed=${seed} hits=${JSON.stringify(hits)}`
        );
      } else {
        console.log(`CLEAN fixture=${f.split("/").pop()} seed=${seed}`);
      }
    }
  }
  console.log(`probe done cases=${cases} leaks=${leaks}`);
  if (leaks > 0) process.exit(2);
}

main().catch((e) => {
  console.error("PROBE_CRASH", e);
  process.exit(1);
});
