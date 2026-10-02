/**
 * PING refresh survival proof (fyd/i07-acquisition, Writer C).
 *
 * Runs the PRODUCTION refresh path (builder/source-refresh :: refreshSource)
 * with the pre-rebuild base as currentSource and the rebuild candidate as
 * refreshedSource, carrying the tenant's owner layer through untouched.
 *
 * The proof is machine-checked: ownerLayerDigestBefore ===
 * ownerLayerDigestAfter and ownerLayerIntact === true, or the script exits
 * non-zero. The ping-fyd owner layer at proof time is the default
 * normalized intent with zero field corrections; the proof records exactly
 * that, so a future owner correction has a baseline to survive against.
 *
 * Run from the repo root AFTER the review artifacts exist (no pin swap
 * required; it reads the base/candidate JSON artifacts):
 *
 *   node_modules/.bin/tsx src/fyd/acquisition/prove-refresh-survival.ts \
 *     --review-dir src/fyd/acquisition/review
 *
 * Writes review/ping-refresh-proof-<stamp>.json.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { refreshSource } from "../builder/source-refresh";
import { normalizeOwnerIntent } from "../builder/owner-intent";
import { emptyManifest } from "../builder/manifest";
import { SITE_PLANNER_VERSION } from "../builder/planner";
import type { ObjectGraph } from "../sitespec/types";

export const REFRESH_PROOF_VERSION = "fyd-refresh-survival-proof@1";

const TENANT_ID = "ping-fyd";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

function latest(dir: string, prefix: string): string {
  const hits = readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort();
  if (hits.length === 0) throw new Error(`no artifact ${prefix}*.json in ${dir}`);
  return join(dir, hits[hits.length - 1]);
}

function main(): void {
  const reviewDir = arg("--review-dir");
  if (!reviewDir) {
    console.error("usage: prove-refresh-survival.ts --review-dir <dir>");
    process.exit(2);
  }
  const dir = resolve(reviewDir);

  const baseFile = latest(dir, "ping-base-");
  const candidateFile = latest(dir, "ping-candidate-");
  const currentSource = JSON.parse(readFileSync(baseFile, "utf8")) as ObjectGraph;
  const candidateDoc = JSON.parse(readFileSync(candidateFile, "utf8")) as {
    observedAt: string;
    candidateDigest: string;
    graph: ObjectGraph;
  };
  const refreshedSource = candidateDoc.graph;

  // The tenant's owner layer: default normalized intent, zero field
  // corrections. This is the actual durable owner state for ping-fyd in the
  // builder lane today; the proof asserts the refresh carries it through
  // byte-identically.
  const ownerLayer = {
    intent: normalizeOwnerIntent(),
    assertions: [] as [],
  };

  const result = refreshSource({
    tenantId: TENANT_ID,
    currentSource,
    refreshedSource,
    ownerLayer,
    manifest: emptyManifest(SITE_PLANNER_VERSION, TENANT_ID),
  });

  const proof = {
    proofVersion: REFRESH_PROOF_VERSION,
    ranAt: new Date().toISOString(),
    tenantId: TENANT_ID,
    baseFile,
    candidateFile,
    candidateObservedAt: candidateDoc.observedAt,
    candidateDigest: candidateDoc.candidateDigest,
    ownerAssertionsInLayer: ownerLayer.assertions.length,
    ownerLayerDigestBefore: result.ownerLayerDigestBefore,
    ownerLayerDigestAfter: result.ownerLayerDigestAfter,
    ownerLayerIntact: result.ownerLayerIntact,
    diffChanged: result.diff.changed,
    diffObjectChanges: result.diff.objectChanges.length,
    diffRelationshipChanges: result.diff.relationshipChanges.length,
    diffConflicts: result.diff.conflicts.length,
    diffActions: result.diff.actions,
  };

  const stamp = candidateDoc.observedAt.slice(0, 10).replace(/-/g, "");
  const proofPath = join(dir, `ping-refresh-proof-${stamp}.json`);
  writeFileSync(proofPath, JSON.stringify(proof, null, 2) + "\n", "utf8");

  console.log(JSON.stringify({ ...proof, proofPath }, null, 2));

  if (!result.ownerLayerIntact) {
    console.error("SURVIVAL PROOF FAILED: owner layer digest changed across refresh");
    process.exit(1);
  }
  if (result.ownerLayerDigestBefore !== result.ownerLayerDigestAfter) {
    console.error("SURVIVAL PROOF FAILED: digest mismatch");
    process.exit(1);
  }
  console.error("SURVIVAL PROOF: PASS (owner layer byte-identical across refresh)");
}

main();
