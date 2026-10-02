/**
 * FileDumpProjectionReader — today's physical ProjectionReader.
 *
 * NAMING: the file dump is ONE DISPOSABLE REPRESENTATION of a projection
 * derived from the journal (the authority). It is never canonical truth,
 * and the word "authority" is never attached to the dump. Deleting the
 * dump and regenerating from the journal must yield the same
 * snapshotDigest for the same history — that disposability is proven by
 * test, not asserted.
 *
 * Mechanics (harvested, not reinvented):
 *   - Read: the JSON snapshot at <projectionDir>/<siteId>.json, parsed and
 *     digest-verified by projection-verify.ts (the same fail-closed rules
 *     the read seam has always enforced).
 *   - Regenerate: execFile the PING-side dump
 *     (tools/fyd-site-projection/dump.py), which rebuilds the snapshot
 *     from the fixture base + journal overlays. SERVER ONLY — never call
 *     from the public served path (regen is a privileged operation owned
 *     by the regen seam, not by page rendering).
 *
 * Determinism: the snapshot identity (snapshotDigest) excludes volatile
 * wall-clock fields (meta.dumpedAt). Same canonical history -> same
 * canonicalBytes -> same snapshotDigest, no matter when the dump ran.
 */

import { execFile } from "node:child_process";
import { readFile, readdir, access } from "node:fs/promises";
import { readFileSync, readdirSync, constants } from "node:fs";
import { join } from "node:path";
import {
  parseAndVerifyRawProjection,
  canonicalSnapshotBytes,
  snapshotDigestOf,
  sourceDigestOf,
} from "./projection-verify";
import {
  RegenerateFailed,
  type ProjectionReader,
  type ProjectionReadOpts,
  type ProjectionSnapshot,
  type RegenerateResult,
  type SyncProjectionReader,
} from "./projection-reader";

const DEFAULT_PROJECTION_DIR = "/home/nolan/ping/var/fyd-projections";

/** Candidate locations for the PING-side dump script (first hit wins). */
const DUMP_SCRIPT_CANDIDATES = [
  "/home/hatch/workspace/lane-d-impl/tools/fyd-site-projection/dump.py",
  "/home/nolan/ping/tools/fyd-site-projection/dump.py",
];

const REGEN_TIMEOUT_MS = 120_000;

function projectionDir(): string {
  // Resolved lazily (per call): tests repoint FYD_PROJECTION_DIR per case.
  return process.env.FYD_PROJECTION_DIR ?? DEFAULT_PROJECTION_DIR;
}

async function resolveDumpScript(): Promise<string> {
  const override = process.env.FYD_DUMP_PY;
  if (override) return override;
  for (const candidate of DUMP_SCRIPT_CANDIDATES) {
    try {
      await access(candidate, constants.R_OK);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new RegenerateFailed(
    "<unknown>",
    "no dump script found: set FYD_DUMP_PY or install one at " +
      DUMP_SCRIPT_CANDIDATES.join(" / "),
  );
}

function execFileAsync(
  file: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { env, timeout: REGEN_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const code =
            typeof (error as { code?: unknown }).code === "number"
              ? (error as { code: number }).code
              : -1;
          reject(
            Object.assign(
              new Error(
                `dump.py failed (exit ${code}): ${String(stderr).slice(0, 500)}`,
              ),
              { exitCode: code, stderr: String(stderr) },
            ),
          );
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

function buildSnapshot(
  siteId: string,
  raw: string,
  path: string,
): ProjectionSnapshot {
  const verified = parseAndVerifyRawProjection(raw, siteId, path);
  // Snapshot identity is computed over the RAW document (pre-overlay): the
  // owner overlay is a serve-time composition owned by ping-object-source
  // and is never part of the snapshot's byte identity.
  const doc = JSON.parse(raw) as Record<string, unknown>;
  return {
    siteId,
    canonicalBytes: canonicalSnapshotBytes(doc),
    snapshotDigest: snapshotDigestOf(doc),
    sourceDigest: sourceDigestOf(verified.meta),
    meta: verified.meta,
    graph: verified.graph,
    presentationIntent: verified.presentationIntent,
    fieldVisibility: verified.fieldVisibility,
  };
}

function missingSnapshotError(siteId: string, path: string): Error {
  return new Error(
    `file-dump-projection-reader: site "${siteId}": no snapshot at ${path} ` +
      `(regenerate from the journal first); refusing to serve stale data`,
  );
}

export class FileDumpProjectionReader
  implements ProjectionReader, SyncProjectionReader
{
  readonly kind = "file-dump" as const;

  /** Resolved lazily so FYD_PROJECTION_DIR repoints work per call. */
  protected dir(): string {
    return projectionDir();
  }

  protected snapshotPath(siteId: string): string {
    return join(this.dir(), siteId + ".json");
  }

  async readSnapshot(
    siteId: string,
    _opts?: ProjectionReadOpts,
  ): Promise<ProjectionSnapshot> {
    const path = this.snapshotPath(siteId);
    let raw: string;
    try {
      raw = await readFile(path, "utf8");
    } catch {
      throw missingSnapshotError(siteId, path);
    }
    return buildSnapshot(siteId, raw, path);
  }

  readSnapshotSync(
    siteId: string,
    _opts?: ProjectionReadOpts,
  ): ProjectionSnapshot {
    const path = this.snapshotPath(siteId);
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      throw missingSnapshotError(siteId, path);
    }
    return buildSnapshot(siteId, raw, path);
  }

  async listSiteIds(): Promise<string[]> {
    try {
      const files = await readdir(this.dir());
      return files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length))
        .sort();
    } catch {
      return [];
    }
  }

  listSiteIdsSync(): string[] {
    try {
      return readdirSync(this.dir())
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -".json".length))
        .sort();
    } catch {
      return [];
    }
  }

  /**
   * Rebuild the snapshot for a site from canonical history (fixture base +
   * journal overlays) via the PING-side dump, then return the rebuilt
   * snapshot's identity.
   *
   * SERVER ONLY. Never call from the public served path: regeneration is a
   * privileged operation. The dump inherits the process journal config
   * (FYD_OVERLAY_JOURNAL, FYD_JOURNAL_GATEWAY_URL, ...); this reader only
   * pins the output directory to its own projectionDir so the reader's
   * configured location is authoritative.
   */
  async regenerate(siteId: string): Promise<RegenerateResult> {
    let script: string;
    try {
      script = await resolveDumpScript();
    } catch (e) {
      throw new RegenerateFailed(
        siteId,
        e instanceof Error ? e.message : String(e),
      );
    }
    const outDir = this.dir();
    try {
      await execFileAsync("python3", [script, siteId], {
        ...process.env,
        FYD_PROJECTION_OUT_DIR: outDir,
      });
    } catch (e) {
      const err = e as { exitCode?: number; message?: string };
      const hint =
        err.exitCode === 2
          ? " (overlay query failed: journal unreachable or WRONG_JOURNAL — fail closed, nothing written)"
          : "";
      throw new RegenerateFailed(
        siteId,
        `dump.py invocation failed${hint}: ${err.message ?? String(e)}`,
      );
    }
    const outPath = join(outDir, siteId + ".json");
    let snapshot: ProjectionSnapshot;
    try {
      snapshot = await this.readSnapshot(siteId);
    } catch (e) {
      throw new RegenerateFailed(
        siteId,
        `dump ran but the rebuilt snapshot is unreadable: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
    return {
      siteId,
      snapshotDigest: snapshot.snapshotDigest,
      sourceDigest: snapshot.sourceDigest,
      outPath,
    };
  }
}

/** Narrow a registered reader to the sync contract (fail closed otherwise). */
export function requireSyncReader(
  reader: ProjectionReader,
  siteId: string,
): SyncProjectionReader {
  if (
    typeof (reader as SyncProjectionReader).readSnapshotSync !== "function" ||
    typeof (reader as SyncProjectionReader).listSiteIdsSync !== "function"
  ) {
    throw new Error(
      `projection-reader: sync read of site "${siteId}" unsupported by the ` +
        `${reader.kind} reader (async contract only); refusing to fake it`,
    );
  }
  return reader as SyncProjectionReader;
}
