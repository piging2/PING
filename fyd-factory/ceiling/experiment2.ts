/**
 * F5-CEILING experiment 2: same graph, documented operating-point vector
 * vs the production preset vector. Quantifies the dead-vector loss.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { planSite } from "/home/nolan/projects/ping/src/fyd/builder/planner";
import { withTenantContext } from "/home/nolan/projects/ping/src/fyd/tenant/tenant-context";
import { strategyForSite } from "/home/nolan/projects/ping/src/fyd/builder/strategy-for-site";
import {
  policyForVector,
  COPPERSMITH_VECTOR,
  PING_DOGFOOD_VECTOR,
  NAMED_PRESET_VECTORS,
} from "/home/nolan/projects/ping/src/fyd/builder/dimensions";
import { COPPERSMITH_GRAPH } from "/home/nolan/projects/ping/src/fyd/proceduralize/__fixtures__/coppersmith-graph";

const STAMP = "2026-09-23T00:00:00.000Z";
function canon(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (typeof v === "object") {
    const keys = Object.keys(v as Record<string, unknown>).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canon((v as Record<string, unknown>)[k])).join(",") + "}";
  }
  return "null";
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function planWith(vector: Record<string, number>, label: string) {
  const planned = withTenantContext({ tenantId: "coppersmith-plumbing" }, () =>
    planSite({ ctx: { tenantId: "coppersmith-plumbing" }, graph: COPPERSMITH_GRAPH, vector: vector as never, generatedAt: STAMP }),
  );
  const home = planned.spec.pages.find((p) => p.slug === "home");
  const policy = policyForVector(vector as never);
  const fp = {
    homeComponents: home?.sections.map((s) => s.component),
    policy: { ctaEmphasis: policy.ctaEmphasis, density: policy.density, mediaTreatment: policy.mediaTreatment, presenceMode: policy.presenceMode, maxSectionsPerPage: policy.maxSectionsPerPage },
    archetype: planned.spec.archetype,
  };
  return { label, fp, hash: sha(canon(fp)) };
}

const prod = planWith(strategyForSite("coppersmith-plumbing", COPPERSMITH_GRAPH).vector, "production: TRADES preset (urgency 0.6)");
const doc = planWith(COPPERSMITH_VECTOR, "documented: COPPERSMITH_VECTOR (urgency 0.85)");
const pingProd = planWith(strategyForSite("ping-fyd").vector, "production: TECHNOLOGY preset");
const pingDoc = planWith(PING_DOGFOOD_VECTOR, "documented: PING_DOGFOOD_VECTOR");

const out = { generatedAt: STAMP, runs: [prod, doc, pingProd, pingDoc] };
for (const r of out.runs) {
  console.error(r.label + "\n  fp=" + r.hash.slice(0, 12) + " home=" + JSON.stringify(r.fp.homeComponents) + "\n  policy=" + JSON.stringify(r.fp.policy));
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
