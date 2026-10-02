/**
 * PING acquisition rebuild driver (fyd/i07-acquisition, Writer C).
 *
 * Deterministic: (manifest, observedAt) -> candidate source graph + run
 * record + diffTwin diff. Uses existing machinery only:
 *
 *   - generateAnonymousPreview (onboarding/anonymous-preview): the website
 *     leg (S3). SSRF-safe fetch + structured extraction. Observed facts are
 *     RECORDED, never auto-merged into owner-asserted objects.
 *   - diffTwin (builder/semantic-diff): the twin diff (old base vs
 *     candidate) for review.
 *   - canonicalize / sha256Hex (lib/ping/digest): the exact digest rule the
 *     fyd-tenant-graph seam verifies against the ping-fyd pin.
 *
 * Owner-leg rule (mechanical, no inference): a field is re-derived from a
 * declared owner source ONLY where the mapping is an exact deterministic
 * copy (see EXACT_OWNER_MAPPINGS). Every other fact is carried from the
 * prior observation and flagged `carried-from-prior` in the run record.
 * Where a re-derived value differs from the prior value, the candidate
 * takes the current source value and the drift is recorded AND surfaced in
 * the diffTwin diff (fields-changed) for review. Nothing is silently
 * overwritten.
 *
 * Run from the repo root:
 *
 *   FYD_CLAIM_DIR=$(mktemp -d) node_modules/.bin/tsx \
 *     src/fyd/acquisition/rebuild-ping.ts \
 *     --manifest src/fyd/acquisition/ping-sources.json \
 *     --observed-at 2026-09-29T18:05:00.000Z \
 *     --review-dir src/fyd/acquisition/review
 *
 * Review artifacts (written BEFORE any pin swap):
 *   review/ping-base-20260921.json        pre-rebuild base (== pinned fixture)
 *   review/ping-candidate-20260929.json   candidate graph + digest
 *   review/ping-run-record-20260929.json  per-source outcomes + attribution
 *   review/ping-difftwin-20260929.json    diffTwin(old base, candidate)
 *
 * `--write-fixture <path>` regenerates the fixture TS module mechanically
 * from the candidate (same structure as the current fixture; updated
 * header). The pin value printed is machine-computed with the seam's
 * digest rule.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { canonicalize, sha256Hex } from "@/lib/ping/digest";
import { generateAnonymousPreview } from "../onboarding/anonymous-preview";
import { diffTwin, type SemanticDiff } from "../builder/semantic-diff";
import { normalizeOwnerIntent } from "../builder/owner-intent";
import { emptyManifest } from "../builder/manifest";
import { SITE_PLANNER_VERSION } from "../builder/planner";
import { PING_FYD_GRAPH } from "../proceduralize/__fixtures__/ping-fyd-graph";
import type { ObjectGraph } from "../sitespec/types";
import type { PingObject } from "@/lib/ping/types";

export const REBUILD_DRIVER_VERSION = "fyd-acquisition-rebuild@1";

const TENANT_ID = "ping-fyd";
/** Legacy provenance kind for owner-asserted tenant facts (existing primitive). */
const OWNER_ASSERTED = "owner-asserted";

interface ManifestSource {
  id: string;
  kind: string;
  locator: string;
  provenanceBasis: string;
  covers: string[];
}

interface Manifest {
  manifestVersion: number;
  tenant: string;
  declaredAt: string;
  declaredBy: string;
  sources: ManifestSource[];
}

/**
 * Exact deterministic owner mappings: field <- source value, verbatim copy.
 * Anything not listed here is carried from the prior observation.
 */
interface OwnerMapping {
  objectId: string;
  field: "title" | "description" | string;
  sourceId: string;
  /** Path into the parsed source JSON, e.g. ["tenant","contact","facebook"]. */
  sourcePath: (string | number)[];
  provenanceRef: string;
  note?: string;
}

const EXACT_OWNER_MAPPINGS: OwnerMapping[] = [
  {
    objectId: "ping-fyd-business",
    field: "title",
    sourceId: "S2",
    sourcePath: ["products", 0, "name"],
    provenanceRef: "owner:tenant-config",
  },
  {
    objectId: "ping-fyd-facebook",
    field: "url",
    sourceId: "S1",
    sourcePath: ["tenant", "contact", "facebook"],
    provenanceRef: "owner:tenant-config",
    note: "S3's locator IS this URL: the page's address is owner-declared in S1.",
  },
];

function usage(): never {
  console.error(
    "usage: rebuild-ping.ts --manifest <path> --observed-at <iso> --review-dir <dir> [--write-fixture <path>]",
  );
  process.exit(2);
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

function getPath(obj: unknown, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string | number, unknown>)[seg as string];
  }
  return cur;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

interface FieldAttribution {
  field: string;
  basis: "owner-source" | "carried-from-prior";
  sourceId: string | null;
  drift: string | null;
}

interface ObjectAttribution {
  objectId: string;
  idStable: boolean;
  fields: FieldAttribution[];
}

async function main(): Promise<void> {
  const manifestPath = arg("--manifest");
  const observedAt = arg("--observed-at");
  const reviewDir = arg("--review-dir");
  const writeFixturePath = arg("--write-fixture");
  if (!manifestPath || !observedAt || !reviewDir) usage();
  if (Number.isNaN(Date.parse(observedAt))) {
    console.error(`invalid --observed-at: ${observedAt}`);
    process.exit(2);
  }

  const t0 = Date.now();
  mkdirSync(reviewDir, { recursive: true });

  // ---- Load manifest ----------------------------------------------------
  const manifest = JSON.parse(
    readFileSync(resolve(manifestPath), "utf8"),
  ) as Manifest;
  if (manifest.tenant !== TENANT_ID) {
    console.error(`manifest tenant ${manifest.tenant} != ${TENANT_ID}`);
    process.exit(2);
  }
  const manifestDigest = sha256File(resolve(manifestPath));
  const byId = new Map(manifest.sources.map((s) => [s.id, s]));

  // ---- Owner leg: read declared owner sources ---------------------------
  const s1 = byId.get("S1")!;
  const s2 = byId.get("S2")!;
  const s1Path = resolve(s1.locator);
  const s2Path = resolve(s2.locator);
  const s1Doc: unknown = JSON.parse(readFileSync(s1Path, "utf8"));
  const s2Doc: unknown = JSON.parse(readFileSync(s2Path, "utf8"));
  // NOTE: EXACT_OWNER_MAPPINGS entries name their source document directly
  // (S1/S2). S3 (the Facebook Page) is the website-ingestion leg; its URL
  // value is owner-declared in S1, which is what the mapping reads.
  const sourceDocs: Record<string, unknown> = { S1: s1Doc, S2: s2Doc };
  const sourceDigests: Record<string, string> = {
    S1: sha256File(s1Path),
    S2: sha256File(s2Path),
  };

  // ---- Prior base (also the diffTwin oldGraph) ---------------------------
  const priorBase = deepClone(PING_FYD_GRAPH) as ObjectGraph;

  // ---- Build candidate: IDs byte-stable, facts re-derived or carried ----
  const candidate = deepClone(priorBase);
  const attributions: ObjectAttribution[] = [];
  const drifts: string[] = [];

  const objectsById = new Map(candidate.objects.map((o) => [o.id, o]));
  for (const obj of candidate.objects) {
    const prior = (priorBase.objects.find((o) => o.id === obj.id) ??
      null) as PingObject | null;
    const attr: ObjectAttribution = {
      objectId: obj.id,
      idStable: prior !== null,
      fields: [],
    };
    if (!prior) {
      throw new Error(`candidate object ${obj.id} has no prior twin`);
    }
    const record = (
      field: string,
      basis: "owner-source" | "carried-from-prior",
      sourceId: string | null,
      drift: string | null,
    ) => attr.fields.push({ field, basis, sourceId, drift });

    for (const m of EXACT_OWNER_MAPPINGS.filter((x) => x.objectId === obj.id)) {
      const v = getPath(sourceDocs[m.sourceId], m.sourcePath);
      if (typeof v !== "string" || v.length === 0) {
        throw new Error(
          `owner mapping ${m.objectId}#${m.field}: source ${m.sourceId} has no string at ${m.sourcePath.join(".")}`,
        );
      }
      const target: "title" | "description" | "field" =
        m.field === "title" || m.field === "description" ? m.field : "field";
      const before =
        target === "field"
          ? (obj.fields?.[m.field] as string | undefined)
          : obj[target];
      let drift: string | null = null;
      if (before !== v) {
        drift = `re-observed drift: prior=${JSON.stringify(before)} source=${JSON.stringify(v)}`;
        drifts.push(`${m.objectId}#${m.field}: ${drift}`);
        if (target === "field") {
          obj.fields = { ...(obj.fields ?? {}), [m.field]: v };
        } else {
          (obj as unknown as Record<string, unknown>)[target] = v;
        }
      }
      record(m.field, "owner-source", m.sourceId, drift);
    }

    // Everything else is carried: record the carry explicitly.
    const mappedFields = new Set(
      EXACT_OWNER_MAPPINGS.filter((x) => x.objectId === obj.id).map((x) => x.field),
    );
    for (const f of ["title", "description"]) {
      if (!mappedFields.has(f)) record(f, "carried-from-prior", "S4", null);
    }
    for (const k of Object.keys(obj.fields ?? {}).sort()) {
      if (!mappedFields.has(k)) record(`fields.${k}`, "carried-from-prior", "S4", null);
    }

    // Re-stamp provenance derivation; createdAt/updatedAt preserved (no fact
    // churn beyond recorded drifts). Volatile stamps are non-semantic to
    // diffTwin, so a pure re-observation yields an empty diff.
    obj.createdAt = prior.createdAt;
    if (drifts.length === 0) obj.updatedAt = prior.updatedAt;
    else obj.updatedAt = observedAt;
    obj.provenance = {
      kind: OWNER_ASSERTED as PingObject["provenance"]["kind"],
      ref: prior.provenance.ref,
      derivedAt: observedAt,
    };
    attributions.push(attr);
  }
  for (const rel of candidate.relationships) {
    const prior = priorBase.relationships.find((r) => r.id === rel.id);
    if (!prior) throw new Error(`candidate relationship ${rel.id} has no prior twin`);
    rel.createdAt = prior.createdAt;
    rel.evidenceRef = prior.evidenceRef;
  }

  // ---- Website leg (S3): observe, record, never auto-merge ---------------
  const s3 = byId.get("S3")!;
  const claimDir = process.env.FYD_CLAIM_DIR ?? join(tmpdir(), `fyd-acquisition-claims-${process.pid}`);
  process.env.FYD_CLAIM_DIR = claimDir;
  mkdirSync(claimDir, { recursive: true });
  interface WebsiteLeg {
    url: string;
    ok: boolean;
    code?: string;
    message?: string;
    evidenceTitle?: string | null;
    businessFactsFound?: number;
    merged: false;
    note: string;
  }
  let websiteLeg: WebsiteLeg;
  try {
    const outcome = await Promise.race([
      generateAnonymousPreview({ url: s3.locator, clientId: "acquisition-rebuild:ping-fyd" }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("website-leg timeout (45s)")), 45_000),
      ),
    ]);
    if (!outcome.ok) {
      websiteLeg = {
        url: s3.locator,
        ok: false,
        code: outcome.code,
        message: outcome.message,
        merged: false,
        note: "fetch failed: zero new facts; nothing merged, nothing invented.",
      };
    } else {
      const ev = outcome.preview.evidence;
      const facts = [
        ev.phone,
        ev.email,
        ev.address,
        ev.description,
        ...ev.services,
        ...ev.hours,
      ].filter((x) => x !== null && x !== undefined && String(x).length > 0).length;
      websiteLeg = {
        url: s3.locator,
        ok: true,
        evidenceTitle: ev.title,
        businessFactsFound: facts,
        merged: false,
        note:
          "observed facts are recorded here only; merging website facts into " +
          "owner-asserted objects requires an owner-reviewed decision, never an automatic merge.",
      };
    }
  } catch (e) {
    websiteLeg = {
      url: s3.locator,
      ok: false,
      code: "driver-error",
      message: e instanceof Error ? e.message : String(e),
      merged: false,
      note: "website leg threw: fail closed, zero new facts.",
    };
  }

  // ---- Candidate digest (the seam's exact rule) --------------------------
  const candidateDigest = sha256Hex(canonicalize(candidate));
  const priorDigest = sha256Hex(canonicalize(priorBase));

  // ---- diffTwin diff (review artifact) -----------------------------------
  const diff: SemanticDiff = diffTwin({
    tenantId: TENANT_ID,
    oldGraph: priorBase,
    newGraph: candidate,
    manifest: emptyManifest(SITE_PLANNER_VERSION, TENANT_ID),
    intent: normalizeOwnerIntent(),
    ownerAssertions: [],
  });

  // ---- Write review artifacts --------------------------------------------
  const stamp = observedAt.slice(0, 10).replace(/-/g, "");
  const basePath = join(reviewDir, `ping-base-20260921.json`);
  const candidatePath = join(reviewDir, `ping-candidate-${stamp}.json`);
  const recordPath = join(reviewDir, `ping-run-record-${stamp}.json`);
  const diffPath = join(reviewDir, `ping-difftwin-${stamp}.json`);
  writeFileSync(basePath, JSON.stringify(priorBase, null, 2) + "\n", "utf8");
  writeFileSync(
    candidatePath,
    JSON.stringify(
      {
        driverVersion: REBUILD_DRIVER_VERSION,
        observedAt,
        manifestDigest,
        candidateDigest,
        priorDigest,
        graph: candidate,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  writeFileSync(
    recordPath,
    JSON.stringify(
      {
        driverVersion: REBUILD_DRIVER_VERSION,
        observedAt,
        manifest: manifestPath,
        manifestDigest,
        sourceDigests,
        ownerMappings: EXACT_OWNER_MAPPINGS,
        drifts,
        objectAttribution: attributions,
        websiteLeg,
        claimDir,
        elapsedMs: Date.now() - t0,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  writeFileSync(diffPath, JSON.stringify(diff, null, 2) + "\n", "utf8");

  // ---- Optional: regenerate the fixture TS module ------------------------
  if (writeFixturePath) {
    const fixtureText = renderFixture(candidate, observedAt, candidateDigest);
    writeFileSync(resolve(writeFixturePath), fixtureText, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        driverVersion: REBUILD_DRIVER_VERSION,
        observedAt,
        priorDigest,
        candidateDigest,
        digestsEqual: priorDigest === candidateDigest,
        diffChanged: diff.changed,
        objectChanges: diff.objectChanges.length,
        relationshipChanges: diff.relationshipChanges.length,
        conflicts: diff.conflicts.length,
        drifts: drifts.length,
        websiteLegOk: websiteLeg.ok,
        artifacts: { basePath, candidatePath, recordPath, diffPath },
        fixtureWritten: writeFixturePath ?? null,
      },
      null,
      2,
    ),
  );
}

/**
 * Mechanical fixture regeneration: the same module structure as the current
 * fixture, produced from the candidate graph. The legacy "owner-asserted"
 * kind keeps the existing OWNER_ASSERTED const pattern (the kind is not in
 * the ObjectProvenanceKind vocabulary; the cast is load-bearing).
 */
function renderFixture(graph: ObjectGraph, observedAt: string, digest: string): string {
  const header = `/**
 * PING Social graph fixture: the owner-asserted PING knowledge base.
 *
 * Re-derived: ${observedAt} (driver ${REBUILD_DRIVER_VERSION}; presence-compiler
 * machinery: anonymous-preview website leg + deterministic owner-leg compile;
 * declared sources in src/fyd/acquisition/ping-sources.json).
 * Prior baseline: /home/nolan/ping/var/fyd-projections/ping-fyd.json
 * (observed 2026-09-21T00:00:00.000Z, dumper fyd-dogfood-builder@1, absent
 * from every repo).
 * graphDigest: ${digest}
 * (sha256 over canonicalize(graph); the fyd-tenant-graph seam verifies the
 * fixture against the ping-fyd pin with this exact rule.)
 *
 * Epistemic status (owner-asserted only):
 * - Every object carries the legacy provenance kind "owner-asserted" with
 *   ref "owner:tenant-config": facts the owner asserted into the tenant
 *   knowledge base, never website-observed or journal-recorded. The ask lane
 *   maps this kind to USER_OVERRIDE (see classificationFromProvenance), the
 *   same rank as the render binding-verifier's owner_asserted lane (b9a0201a).
 * - The knowledge base is hand-authored; facts are unchanged since the
 *   2026-09-21 baseline. Ask FYD must surface what IS there and refuse what
 *   is NOT (UNSUPPORTED), never fill gaps from model priors.
 * - All four service objects carry empty fields: services have titles and
 *   descriptions only. No pricing, no hours, no service-specific contact
 *   info exists in the base. This rebuild makes acquisition reproducible; it
 *   does NOT fix the thin substrate. Improving knowledge quality belongs at
 *   the PING source, never inside this fixture.
 *
 * Regeneration: re-run src/fyd/acquisition/rebuild-ping.ts --write-fixture
 * (mechanical). Never hand-edit to "improve" knowledge quality.
 */

import type { ObjectGraph } from "../../sitespec/types";
import type { ObjectProvenanceKind } from "../../../lib/ping/types";

/**
 * The legacy provenance kind for owner-asserted tenant facts. It was
 * dropped from the ObjectProvenanceKind vocabulary; the binding-verifier's
 * owner_asserted lane (LEGACY_OWNER_ASSERTED_KIND, b9a0201a) and the ask
 * lane's classificationFromProvenance handle the string at runtime. The
 * cast keeps this type-correct WITHOUT re-adding the kind to the vocabulary.
 */
const OWNER_ASSERTED = "owner-asserted" as ObjectProvenanceKind;

export const PING_FYD_GRAPH: ObjectGraph = `;
  const body = JSON.stringify(graph, null, 2).replace(
    /"kind": "owner-asserted"/g,
    '"kind": OWNER_ASSERTED',
  );
  return header + body + ";\n";
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
