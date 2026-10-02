/**
 * PING-backed object source for FYD demo sites. SERVER ONLY.
 *
 * This module is the website repo's read seam onto PING state. It reads the
 * canonical projection JSON written by the PING-side dump
 * (/home/nolan/ping/tools/fyd-site-projection/dump.py) and NEVER falls back
 * to a static fixture: a missing, malformed, or tampered projection is a
 * hard failure, not a silent stale render.
 *
 * Verification (fail closed, in order):
 *  1. The projection file exists and parses.
 *  2. meta.siteId matches the requested site.
 *  3. Every object carries provenance with a non-empty ref — the
 *     "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS" law. This is the data
 *     source's share of "verify bindings before render": the renderer
 *     verifies per-field bindings; this module guarantees the projection
 *     itself only contains traceable objects.
 *  4. graphDigest: sha256 over canonicalize(graph) recomputed here and
 *     compared to meta.graphDigest. canonicalize is the repo's existing
 *     canonical JSON (src/lib/ping/ask-composer.ts) — the same rule the
 *     dump uses (recursive key sort, array order preserved). A mismatch
 *     means the projection was tampered with or written by a different
 *     dumper version: refuse to serve it.
 *
 * The projection directory is configurable via FYD_PROJECTION_DIR for tests;
 * in production it is the PING-owned var dir the dump writes to.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { canonicalize } from "@/lib/ping/ask-composer";
import type { ObjectGraph } from "@/fyd/sitespec/types";
import type { PingObject, PingRelationship } from "@/lib/ping/types";

export interface ProjectionMeta {
  siteId: string;
  dumpedAt: string;
  dumperVersion: string;
  baseDigest: string;
  fixtureFileDigest: string;
  fixtureHeader: string;
  overlayEventIds: string[];
  graphDigest: string;
  generatedAt: string;
  eventSequences?: [number, number] | null;
}

export interface PingProjection {
  graph: ObjectGraph;
  meta: ProjectionMeta;
}

function projectionDir(): string {
  return (
    process.env.FYD_PROJECTION_DIR ?? "/home/nolan/ping/var/fyd-projections"
  );
}

function fail(siteId: string, reason: string): never {
  throw new Error(`ping-object-source: site "${siteId}": ${reason}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateObject(o: unknown, siteId: string): asserts o is PingObject {
  if (!isRecord(o)) fail(siteId, "object is not a record");
  for (const k of ["id", "schema", "visibility", "title"] as const) {
    if (typeof o[k] !== "string" || (o[k] as string).length === 0) {
      fail(siteId, `object has bad "${k}"`);
    }
  }
  const prov = o["provenance"];
  if (!isRecord(prov) || typeof prov["ref"] !== "string" || prov["ref"] === "") {
    fail(
      siteId,
      `object "${o["id"]}" lacks provenance ref: no customer fact without a traceable basis`,
    );
  }
}

function validateRelationship(
  r: unknown,
  siteId: string,
): asserts r is PingRelationship {
  if (!isRecord(r)) fail(siteId, "relationship is not a record");
  for (const k of ["id", "subject", "object", "predicate"] as const) {
    if (typeof r[k] !== "string" || (r[k] as string).length === 0) {
      fail(siteId, `relationship has bad "${k}"`);
    }
  }
}

function validateGraph(graph: unknown, siteId: string): asserts graph is ObjectGraph {
  if (!isRecord(graph)) fail(siteId, "graph is not a record");
  if (!Array.isArray(graph["objects"])) fail(siteId, "graph.objects is not an array");
  if (!Array.isArray(graph["relationships"]))
    fail(siteId, "graph.relationships is not an array");
  for (const o of graph["objects"]) validateObject(o, siteId);
  for (const r of graph["relationships"]) validateRelationship(r, siteId);
}

function validateMeta(meta: unknown, siteId: string): asserts meta is ProjectionMeta {
  if (!isRecord(meta)) fail(siteId, "meta is not a record");
  if (meta["siteId"] !== siteId)
    fail(siteId, `meta.siteId "${String(meta["siteId"])}" does not match requested site`);
  for (const k of [
    "dumpedAt",
    "dumperVersion",
    "baseDigest",
    "fixtureFileDigest",
    "graphDigest",
    "generatedAt",
  ] as const) {
    if (typeof meta[k] !== "string" || (meta[k] as string).length === 0) {
      fail(siteId, `meta has bad "${k}"`);
    }
  }
  if (!Array.isArray(meta["overlayEventIds"])) {
    fail(siteId, "meta.overlayEventIds is not an array");
  }
}

function parseAndVerify(raw: string, siteId: string, path: string): PingProjection {
  let doc: unknown;
  try {
    doc = JSON.parse(raw);
  } catch {
    fail(siteId, `projection at ${path} is not valid JSON`);
  }
  if (!isRecord(doc)) fail(siteId, "projection is not a record");
  validateMeta(doc["meta"], siteId);
  validateGraph(doc["graph"], siteId);
  const meta = doc["meta"] as ProjectionMeta;
  const graph = doc["graph"] as ObjectGraph;
  const recomputed = createHash("sha256")
    .update(canonicalize(graph), "utf8")
    .digest("hex");
  if (recomputed !== meta.graphDigest) {
    fail(
      siteId,
      "graphDigest mismatch: the projection was tampered with or written by " +
        "an incompatible dumper; refusing to serve it",
    );
  }
  return { graph, meta };
}

/**
 * Load the PING-backed projection for a site. Throws (fail closed) when the
 * projection is missing, malformed, untraceable, or tampered. Never returns
 * stale or unverified data.
 */
export async function getPingObjectGraph(siteId: string): Promise<PingProjection> {
  const path = join(projectionDir(), siteId + ".json");
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    fail(
      siteId,
      `no PING projection at ${path} (run the PING-side dump first); refusing to serve stale data`,
    );
  }
  return parseAndVerify(raw!, siteId, path);
}

/**
 * Synchronous variant for call sites that must stay sync (e.g. the Ask FYD
 * bundle loader). Same verification, same fail-closed contract.
 */
export function getPingObjectGraphSync(siteId: string): PingProjection {
  const path = join(projectionDir(), siteId + ".json");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    fail(
      siteId,
      `no PING projection at ${path} (run the PING-side dump first); refusing to serve stale data`,
    );
  }
  return parseAndVerify(raw, siteId, path);
}

/** Site ids this source can serve: the projection files present on disk. */
export async function listPingSiteIds(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  try {
    const files = await readdir(projectionDir());
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .sort();
  } catch {
    return [];
  }
}

/** Synchronous variant of listPingSiteIds. */
export function listPingSiteIdsSync(): string[] {
  try {
    return readdirSync(projectionDir())
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .sort();
  } catch {
    return [];
  }
}
