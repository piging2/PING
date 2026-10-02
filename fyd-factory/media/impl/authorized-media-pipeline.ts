/**
 * authorized-media-pipeline.ts
 *
 * NIGHT-MEDIA media abstraction: authorized ingest -> sha256 digest ->
 * provenance record -> derivative derivation -> FYD-controlled serving path.
 *
 * Scope: this module owns the POLICY and the RECORD-KEEPING for media the
 * factory is allowed to touch. It does not fetch from the network, does not
 * rasterize images, and does not invent a new security authority.
 *
 * Rights policy (explicit states, never implicit):
 * - "authorized-owned": FYD/PING-owned asset. Digest, derive, and serve are
 *   allowed. Example: PING Social brand art commissioned by the owner.
 * - "authorized-demo": owner-authorized demo asset for a specific demo site.
 *   Digest, derive, and serve are allowed within the authorized demo scope.
 * - "public-viewable-not-authorized": publicly viewable but no republication
 *   right. Bytes are never acquired, derivatives are never made, the asset
 *   is never served. Reference-only records may exist so the factory can
 *   prove it saw the reference and refused it.
 * - "unknown": treated as NOT authorized. Hard refusal.
 *
 * 500-program media law: public viewability does NOT imply republication
 * rights. Policy and rights state are explicit on every record.
 *
 * Dependencies: node:crypto only. No image libraries, no network.
 */

import { createHash } from "node:crypto";

/** Explicit rights-policy states. No other states exist. */
export type RightsState =
  | "authorized-owned"
  | "authorized-demo"
  | "public-viewable-not-authorized"
  | "unknown";

/** States whose bytes the factory may acquire, derive, and serve. */
const ACQUIRABLE: ReadonlySet<RightsState> = new Set([
  "authorized-owned",
  "authorized-demo",
]);

/** Authorization evidence that must accompany every authorized ingest. */
export interface Authorization {
  /** Human sentence stating the authorization basis. Never implies FYD copyright ownership. */
  basis: string;
  /** Who granted the authorization (name + role). */
  authorizedBy: string;
  /** ISO date the authorization was granted. */
  authorizedAt: string;
}

/** Synthetic-media marking. AI-generated assets must always carry a caption. */
export interface SyntheticMark {
  kind: "ai-generated";
  generator: string;
  /** Render-facing honesty sentence. Empty caption is a mint-time error. */
  caption: string;
}

/** Input to the ingest stage. Authorization is required, never optional. */
export interface IngestInput {
  slug: string;
  bytes: Uint8Array;
  originalFormat: string;
  width: number;
  height: number;
  rightsState: RightsState;
  authorization?: Authorization;
  synthetic?: SyntheticMark;
  sourceNote: string;
  observedAt: string;
}

/** A minted provenance record. The full chain for ask-FYD "why this?" */
export interface ProvenanceRecord {
  id: string;
  slug: string;
  digest: string;
  width: number;
  height: number;
  originalFormat: string;
  rightsState: RightsState;
  authorization: Authorization | null;
  synthetic: SyntheticMark | null;
  sourceNote: string;
  observedAt: string;
  derivedFrom: null;
}

/** A registered derivative variant of an authorized asset. */
export interface MediaVariant {
  name: string;
  width: number;
  height: number;
  format: "webp" | "jpeg";
  quality: number;
  bytes: number;
  digest: string;
  derivedFrom: string;
  servedFrom: string;
}

/** The unit manifest: one asset plus every controlled derivative. */
export interface MediaManifest {
  manifestVersion: 1;
  asset: ProvenanceRecord;
  variants: MediaVariant[];
}

export class MediaRightsRefusal extends Error {
  readonly rightsState: RightsState;
  constructor(rightsState: RightsState, detail: string) {
    super(
      `media rights refusal [${rightsState}]: ${detail}. ` +
        `Bytes were not acquired, no derivative was made, nothing was served.`
    );
    this.name = "MediaRightsRefusal";
    this.rightsState = rightsState;
  }
}

export function isAcquirableState(state: RightsState): boolean {
  return ACQUIRABLE.has(state);
}

/** sha256 hex of raw bytes. Same bytes always yield the same digest. */
export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireAuthorization(input: IngestInput): Authorization {
  if (!isAcquirableState(input.rightsState)) {
    throw new MediaRightsRefusal(
      input.rightsState,
      `asset "${input.slug}" is not in an acquirable rights state`
    );
  }
  if (!input.authorization) {
    throw new MediaRightsRefusal(
      input.rightsState,
      `asset "${input.slug}" is acquirable in principle but carries no authorization evidence`
    );
  }
  if (input.synthetic && input.synthetic.caption.trim() === "") {
    throw new MediaRightsRefusal(
      input.rightsState,
      `asset "${input.slug}" is synthetic but its caption is empty; the mark is the honesty`
    );
  }
  return input.authorization;
}

/**
 * Ingest stage: rights gate FIRST, then digest, then provenance mint.
 * Throws MediaRightsRefusal for anything not explicitly authorized.
 */
export function ingestAuthorizedMedia(input: IngestInput): ProvenanceRecord {
  const authorization = requireAuthorization(input);
  const digest = sha256Bytes(input.bytes);
  return {
    id: `fyd-media-${digest.slice(0, 16)}`,
    slug: input.slug,
    digest,
    width: input.width,
    height: input.height,
    originalFormat: input.originalFormat,
    rightsState: input.rightsState,
    authorization,
    synthetic: input.synthetic ?? null,
    sourceNote: input.sourceNote,
    observedAt: input.observedAt,
    derivedFrom: null,
  };
}

/** Derivative plan: bounded ladder, modern formats, never upscales. */
export interface DerivativePlan {
  width: number;
  height: number;
  format: "webp" | "jpeg";
  quality: number;
  name: string;
  servedFrom: string;
}

const LADDER_WIDTHS = [1600, 768, 480];
const BLUR_WIDTH = 10;

/**
 * Pure derivation plan for an authorized provenance record. The plan names
 * exact renditions; rasterization is done by the derivation executor
 * (night build used PIL/WebP). A manifest containing a non-acquirable asset
 * is rejected as a unit: planDerivatives throws MediaRightsRefusal.
 */
export function planDerivatives(record: ProvenanceRecord): DerivativePlan[] {
  if (!isAcquirableState(record.rightsState) || !record.authorization) {
    throw new MediaRightsRefusal(
      record.rightsState,
      `cannot plan derivatives for asset "${record.slug}"`
    );
  }
  const plans: DerivativePlan[] = [];
  const rung = (w: number): void => {
    const h = Math.round((record.height * w) / record.width);
    plans.push({
      width: w,
      height: h,
      format: "webp",
      quality: 82,
      name: `${record.slug}-${w}w`,
      servedFrom: servingPath(record.digest, `${record.slug}-${w}w.webp`),
    });
  };
  for (const w of LADDER_WIDTHS) {
    if (w < record.width) rung(w);
  }
  if (!LADDER_WIDTHS.includes(record.width)) {
    rung(record.width); // native width when it is not a ladder rung
  }
  const blurH = Math.max(1, Math.round((record.height * BLUR_WIDTH) / record.width));
  plans.push({
    width: BLUR_WIDTH,
    height: blurH,
    format: "webp",
    quality: 20,
    name: `${record.slug}-blur`,
    servedFrom: servingPath(record.digest, `${record.slug}-blur.webp`),
  });
  const card = [...plans]
    .filter((p) => p.width <= 768)
    .sort((a, b) => b.width - a.width)[0];
  if (card) {
    plans.push({
      width: card.width,
      height: card.height,
      format: "jpeg",
      quality: 75,
      name: `${record.slug}-${card.width}w`,
      servedFrom: servingPath(record.digest, `${record.slug}-${card.width}w.jpg`),
    });
  }
  return plans;
}

/**
 * Register a produced derivative. The variant stamps its own digest plus
 * derivedFrom (digest of the original). Registration refuses assets that
 * are not authorized; registration never back-fills authorization.
 */
export function registerDerivative(
  record: ProvenanceRecord,
  plan: DerivativePlan,
  bytes: Uint8Array
): MediaVariant {
  if (!isAcquirableState(record.rightsState) || !record.authorization) {
    throw new MediaRightsRefusal(
      record.rightsState,
      `cannot register derivative "${plan.name}" for unauthorized asset "${record.slug}"`
    );
  }
  const ext = plan.format === "webp" ? "webp" : "jpg";
  return {
    name: plan.name,
    width: plan.width,
    height: plan.height,
    format: plan.format,
    quality: plan.quality,
    bytes: bytes.byteLength,
    digest: sha256Bytes(bytes),
    derivedFrom: record.digest,
    servedFrom: servingPath(record.digest, `${plan.name}.${ext}`),
  };
}

/** FYD-controlled serving path. Same-origin, content-addressed, no hotlink. */
export function servingPath(digest: string, filename: string): string {
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error("servingPath requires a full sha256 hex digest");
  }
  if (/[^\w.\-]/.test(filename) || filename.includes("..")) {
    throw new Error("servingPath requires a plain filename");
  }
  return `/fyd-media/${digest}/${filename}`;
}

/** Assemble the unit manifest. Fails closed on any rights problem. */
export function buildManifest(
  record: ProvenanceRecord,
  variants: MediaVariant[]
): MediaManifest {
  if (!isAcquirableState(record.rightsState) || !record.authorization) {
    throw new MediaRightsRefusal(
      record.rightsState,
      `manifest refused for asset "${record.slug}"`
    );
  }
  for (const v of variants) {
    if (v.derivedFrom !== record.digest) {
      throw new Error(
        `variant "${v.name}" derivedFrom mismatch: not derived from asset "${record.slug}"`
      );
    }
  }
  return { manifestVersion: 1, asset: record, variants };
}

/**
 * Reference-only record for cohort (third-party) media. This is the ONLY
 * factory-approved shape for public-viewable-NOT-authorized assets: URL +
 * page URL + license signals, never bytes. The rights gate keeps these out
 * of every manifest.
 */
export interface CohortMediaReference {
  businessId: string;
  kind: "og:image" | "twitter:image" | "image_src" | "json-ld:image" | "other";
  url: string;
  pageUrl: string;
  licenseSignal: string;
  rightsState: Extract<RightsState, "public-viewable-not-authorized">;
}

/** Refuse to turn a cohort reference into an acquired asset. Always throws. */
export function refuseCohortAcquisition(ref: CohortMediaReference): never {
  throw new MediaRightsRefusal(
    ref.rightsState,
    `cohort reference ${ref.kind} ${ref.url} (page ${ref.pageUrl}): ` +
      `public viewability does not imply republication rights`
  );
}

/*
 * MEDIA URL GATING (A44) - adapter notes, not a new authority.
 *
 * QA-HOSTILE found an unsafe DisplayMedia.src reaching an <img> (A44):
 * no URL gate sat between the media manifest and the rendered src.
 *
 * The gating authority is resolveSafeLink in
 * src/fyd/sitespec/safe-link.ts. It is the ONE place that converts an
 * observed URL string into a renderer-usable href: parser-based (not
 * scheme-regex), control-character smuggling fails closed, relative
 * references need an explicit itself-safe base, and the "navigate"
 * capability allows http:/https: only. No new authority is created here;
 * this module must never mint its own competing URL gate.
 *
 * Contract this module requires from the render seam:
 * 1. Every DisplayMedia.src and DisplayMedia.blurUrl passes through
 *    resolveSafeLink(raw, "navigate") (or the same-origin-relative path
 *    fast lane from patches/display-media-src-allowlist.patch) before it
 *    reaches an <img>. Unsafe values make the media null, and the
 *    renderer already renders its typographic fallback when media is null.
 * 2. This module's servingPath() output is always a same-origin relative
 *    path (/fyd-media/<sha256>/<file>), which the patch's allowlist
 *    passes by construction. Any absolute URL the factory did not mint
 *    must clear resolveSafeLink or be dropped.
 * 3. Serving is FYD-controlled: derivatives live under the digest path
 *    above and are never hotlinked from third-party origins.
 *
 * gateMediaUrlForPreview() below is a PREVIEW-TIME adapter that mirrors
 * the authority's contract for standalone tooling (manifest verification
 * outside the repo). It is explicitly NOT the authority: the renderer
 * must call the real resolveSafeLink. The adapter fails closed on
 * anything it cannot classify.
 */
export type MediaUrlVerdict = { kind: "pass" } | { kind: "refuse"; reason: string };

export function gateMediaUrlForPreview(raw: unknown): MediaUrlVerdict {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { kind: "refuse", reason: "non-string or empty" };
  }
  const value = raw.trim();
  // Same-origin relative path fast lane (mirrors the allowlist patch).
  if (/^\/[^\s\\]*$/.test(value) && !value.startsWith("//")) {
    return { kind: "pass" };
  }
  // Absolute URLs: parser-based scheme check, mirroring resolveSafeLink.
  let parsed: URL | null = null;
  try {
    parsed = new URL(value);
  } catch {
    return { kind: "refuse", reason: "not a parseable absolute URL and not a same-origin path" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { kind: "refuse", reason: `non-navigable scheme ${parsed.protocol}` };
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { kind: "refuse", reason: "control characters present" };
  }
  return { kind: "pass" };
}
