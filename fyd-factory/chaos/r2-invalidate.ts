/**
 * r2-invalidate.ts: incremental invalidation with mid-run change detection
 * (LANE-CHAOS R2, probe P4).
 *
 * Stage graph (mirrors incremental/proof/inc_proof.py dependency shape):
 *   OBJECT:cw-biz-01 --\
 *   OBJECT:cw-svc-01 ---+--> SECTION:home:hero:0 (copy has phone) --\
 *   OBJECT:cw-svc-02 --+--> SECTION:home:contact:3 (copy has phone) -+--> PAGE:home --> SPEC:site
 *                       \--> SECTION:services:services:0 (no phone) --> PAGE:services --/
 *
 * Contract under test:
 *   1. A node is served from cache only when its recomputed input digest
 *      matches the committed input digest.
 *   2. The runner snapshots the source digest at pass start. If the source
 *      digest differs at any later point in the pass, the pass is marked
 *      DIRTED (mid-run change detected) and a validation pass re-runs every
 *      node against the final source until fixpoint. No stale digest survives
 *      in the committed baseline.
 *
 * Modes:
 *   node r2-invalidate.ts --work <dir> --mode baseline   (commit pass 1)
 *   node r2-invalidate.ts --work <dir> --mode run        (chaos pass + validation)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { digest } from "../compilation/runner/lib.ts";

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`missing required arg ${name}`);
  process.exit(2);
}

const WORK = arg("--work");
const MODE = arg("--mode");
const SOURCE = path.join(WORK, "source.json");
const BASELINE = path.join(WORK, "baseline.json");
const RUNLOG = path.join(WORK, "run-log.json");
const NODE_SLEEP_MS = 150;
const PROGRESS = arg("--progress", "");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sourceDigest = (): string =>
  crypto.createHash("sha256").update(fs.readFileSync(SOURCE)).digest("hex");
const readSource = (): any => JSON.parse(fs.readFileSync(SOURCE, "utf8"));

interface NodeRec { input_digest: string; output_digest: string; }
type Graph = Record<string, NodeRec>;

function computeNode(nodeId: string, src: any, outs: Record<string, string>): { input: any; output: any } {
  const objs = src.objects;
  if (nodeId === "OBJECT:cw-biz-01") {
    const fields = objs["cw-biz-01"].fields;
    return { input: { fields }, output: { id: "cw-biz-01", fields } };
  }
  if (nodeId === "OBJECT:cw-svc-01" || nodeId === "OBJECT:cw-svc-02") {
    const id = nodeId.split(":")[1];
    const fields = objs[id].fields;
    return { input: { fields }, output: { id, fields } };
  }
  if (nodeId === "SECTION:home:hero:0" || nodeId === "SECTION:home:contact:3") {
    const phone = objs["cw-biz-01"].fields.phone;
    const copy = nodeId.includes("hero") ? `Clearwater Plumbing Co. - Call ${phone}` : `Call ${phone} today`;
    return {
      input: { obj_digests: [outs["OBJECT:cw-biz-01"]], component: "Hero/Contact" },
      output: { id: nodeId, copy, objectIds: ["cw-biz-01"] },
    };
  }
  if (nodeId === "SECTION:services:services:0") {
    return {
      input: { obj_digests: [outs["OBJECT:cw-svc-01"], outs["OBJECT:cw-svc-02"]], component: "ServiceGrid" },
      output: { id: nodeId, objectIds: ["cw-svc-01", "cw-svc-02"] },
    };
  }
  if (nodeId === "PAGE:home") {
    // Parent outputs bind child digests (as incremental/proof/inc_proof.py
    // does): otherwise a parent's digest cannot reflect subtree changes and
    // invalidation would be invisible at the parent level.
    const secs = ["SECTION:home:hero:0", "SECTION:home:contact:3"];
    return {
      input: { sec_digests: secs.map((s) => outs[s]) },
      output: { slug: "home", sections: secs.map((s) => ({ id: s, digest: outs[s] })) },
    };
  }
  if (nodeId === "PAGE:services") {
    const secs = ["SECTION:services:services:0"];
    return {
      input: { sec_digests: secs.map((s) => outs[s]) },
      output: { slug: "services", sections: secs.map((s) => ({ id: s, digest: outs[s] })) },
    };
  }
  if (nodeId === "SPEC:site") {
    const pages = ["PAGE:home", "PAGE:services"];
    return {
      input: { page_digests: pages.map((p) => outs[p]) },
      output: { kind: "fyd.sitespec@1", pages: pages.map((p) => ({ slug: p, digest: outs[p] })) },
    };
  }
  throw new Error(`unknown node ${nodeId}`);
}

const ORDER = [
  "OBJECT:cw-biz-01", "OBJECT:cw-svc-01", "OBJECT:cw-svc-02",
  "SECTION:home:hero:0", "SECTION:home:contact:3", "SECTION:services:services:0",
  "PAGE:home", "PAGE:services", "SPEC:site",
];

/** One pass over all nodes. Returns per-node events and whether any recompute happened. */
async function pass(committed: Graph, log: any[], passName: string, sStart: string): Promise<{ graph: Graph; changed: boolean; dirtiedAt: number | null }> {
  const next: Graph = {};
  const outs: Record<string, string> = {};
  let changed = false;
  let dirtiedAt: number | null = null;
  for (let i = 0; i < ORDER.length; i++) {
    const nodeId = ORDER[i];
    const src = readSource(); // re-read every node: observe concurrent edits
    const sNow = sourceDigest();
    if (sNow !== sStart && dirtiedAt === null) dirtiedAt = i;
    const { input, output } = computeNode(nodeId, src, outs);
    const inD = digest(input);
    const prev = committed[nodeId];
    if (prev && prev.input_digest === inD) {
      next[nodeId] = prev;
      outs[nodeId] = prev.output_digest;
      log.push({ pass: passName, node: nodeId, event: "cache_hit" });
    } else {
      const outD = digest(output);
      next[nodeId] = { input_digest: inD, output_digest: outD };
      outs[nodeId] = outD;
      changed = changed || !prev || prev.output_digest !== outD;
      log.push({ pass: passName, node: nodeId, event: "recomputed" });
    }
    if (PROGRESS) fs.appendFileSync(PROGRESS, nodeId + "\n");
    await sleep(NODE_SLEEP_MS);
  }
  return { graph: next, changed, dirtiedAt };
}

async function main(): Promise<void> {
  fs.mkdirSync(WORK, { recursive: true });
  if (MODE === "baseline") {
    const log: any[] = [];
    const { graph } = await pass({}, log, "baseline", sourceDigest());
    fs.writeFileSync(BASELINE, JSON.stringify(graph, null, 1) + "\n");
    console.log(JSON.stringify({ mode: "baseline", nodes: ORDER.length }));
    return;
  }
  if (MODE === "run") {
    const before: Graph = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
    const sStart = sourceDigest();
    const log: any[] = [];
    // Chaos pass: a concurrent edit may land mid-pass.
    const p2 = await pass(before, log, "pass2", sStart);
    const sEnd = sourceDigest();
    const dirtied = sEnd !== sStart;
    let passes = 1;
    let current = p2.graph;
    // Validation: re-run to fixpoint against the final source. Any stale
    // hit from the dirtied pass is corrected here; the loop proves fixpoint.
    if (dirtied) {
      for (let v = 0; v < 3; v++) {
        passes++;
        const pv = await pass(current, log, `validate${v + 1}`, sourceDigest());
        current = pv.graph;
        if (!pv.changed && pv.dirtiedAt === null) break;
      }
    }
    fs.writeFileSync(BASELINE, JSON.stringify(current, null, 1) + "\n");
    const changedNodes = ORDER.filter((n) => before[n]?.output_digest !== current[n]?.output_digest);
    const runReport = {
      mode: "run",
      passes,
      source_changed_mid_pass: dirtied,
      first_dirtied_node_index: p2.dirtiedAt,
      changed_nodes: changedNodes,
      log,
    };
    fs.writeFileSync(RUNLOG, JSON.stringify(runReport, null, 1) + "\n");
    console.log(JSON.stringify({
      passes, dirtied, dirtied_at_node: p2.dirtiedAt, changed_nodes: changedNodes,
    }));
    return;
  }
  console.error(`unknown mode ${MODE}`);
  process.exit(2);
}

main().catch((e) => { console.error("INVALIDATE_FATAL", e?.message ?? e); process.exit(1); });
