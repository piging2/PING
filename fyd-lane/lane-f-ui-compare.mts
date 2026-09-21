/**
 * Lane F UI compare (runs on the Pig inside the website repo via tsx).
 *
 * Renders the same user-visible surfaces from TWO projections and compares
 * them semantically:
 *   1. The site-page surface: generateSiteSpec(graph, pins) — the declarative
 *      spec the SiteClient renders (home/about/services/explore pages).
 *   2. The ObjectView surface: loadObjectView(slug) — the canonical generic
 *      read-model loader (name, summary, services, contact, media,
 *      relationships-driven offerings).
 *
 * Both surfaces are loaded through the production read path
 * (getPingObjectGraphSync), which fail-closed verifies meta.graphDigest via
 * the TS canonicalizer — so a passing load also proves the Python reducer's
 * canonical bytes byte-match the TS canonicalizer's.
 *
 * Env: LIVE_DIR (current projection dir), REPLAY_DIR (replayed scratch dir).
 * Prints: sha256 digests of the canonicalized semantic surfaces + MATCH flag.
 * Wall-clock fields (dumpedAt) are excluded by construction: they never
 * enter the spec or the ObjectView.
 */
import { createHash } from "node:crypto";
import { getPingObjectGraphSync } from "@/fyd/data/ping-object-source";
import { loadObjectView } from "@/fyd/object/view";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { canonicalize } from "@/lib/ping/ask-composer";

const SLUG = "happy-place";

function sha(v: unknown): string {
  return createHash("sha256").update(canonicalize(v), "utf8").digest("hex");
}

function surface(dir: string) {
  process.env.FYD_PROJECTION_DIR = dir;
  const { graph, meta } = getPingObjectGraphSync(SLUG);
  const spec = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });
  const view = loadObjectView(SLUG);
  if (!view) throw new Error(`loadObjectView(${SLUG}) returned null from ${dir}`);
  return {
    specDigest: sha(spec),
    viewDigest: sha(view),
    meta: {
      graphDigest: meta.graphDigest,
      baseDigest: meta.baseDigest,
      fixtureFileDigest: meta.fixtureFileDigest,
      overlayEventIds: meta.overlayEventIds,
      generatedAt: meta.generatedAt,
      eventSequences: meta.eventSequences,
    },
  };
}

const liveDir = process.env.LIVE_DIR;
const replayDir = process.env.REPLAY_DIR;
if (!liveDir || !replayDir) throw new Error("LIVE_DIR and REPLAY_DIR must be set");

const live = surface(liveDir);
const replay = surface(replayDir);
const specMatch = live.specDigest === replay.specDigest;
const viewMatch = live.viewDigest === replay.viewDigest;

console.log(
  JSON.stringify(
    {
      specDigestMatch: specMatch,
      liveSpecDigest: live.specDigest,
      replaySpecDigest: replay.specDigest,
      viewDigestMatch: viewMatch,
      liveViewDigest: live.viewDigest,
      replayViewDigest: replay.viewDigest,
      liveMeta: live.meta,
      replayMeta: replay.meta,
    },
    null,
    1,
  ),
);
if (!specMatch || !viewMatch) process.exitCode = 3;
