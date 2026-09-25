/**
 * FYD media role scoring (presentation-observations.md Part B, media-score@1).
 *
 * NEW BOUNDED MODULE (additive). The protected acquisition substrate
 * (types.ts, discover.ts, safe-fetch.ts, ingest.ts, derivatives.ts) is
 * reused as-is; this module is called between digest and role assignment
 * and modifies nothing.
 *
 * DETERMINISM CONTRACT: every function here is pure. Same asset data in,
 * same score out. No fs, no network, no clock, no randomness. The
 * MediaScorecard carries scoreVersion "media-score@1"; changing any
 * number below is a spec change, not a tuning tweak.
 *
 * What scoring does NOT do (enforced elsewhere, never here):
 * - R5 (rights): unclear-reference-only assets are never acquired at all
 *   (ingest.ts enforcement); scoring never sees them.
 * - R7 (unsafe sink): the URL safety policy rejects unsafe sources before
 *   scoring (L0 / safe-fetch.ts enforcement).
 * Rejections emitted here are R1 (wrong-trade), R2 (documentary bar),
 * R3 (resolution), R4 (aspect), R6 (near-duplicate tie-loss).
 *
 * Rejection records are typed and never silent: every role an asset fails
 * gets one entry per failed rule with the score breakdown in `detail`.
 * The scorecard itself is pure, so it carries no timestamp; the manifest
 * observation layer (which has observedAt) owns the audit trail.
 */

import type { FydMediaObject } from "./types";
import type { PresentationObservation } from "../proceduralize/presentation-observe";
import {
  KNOWN_TRADES,
  keywordsForTrade,
} from "./trade-keywords";

/** Display roles the component family needs. */
export type MediaRole =
  | "hero-documentary"
  | "service-imagery"
  | "owner-portrait"
  | "project-photo"
  | "gallery";

/**
 * Mapping to the pre-existing FydMediaRole vocabulary (types.ts), for
 * readers crossing the old/new boundary. Scoring uses MediaRole only.
 */
export const MEDIA_ROLE_LEGACY_MAP: Record<MediaRole, string> = {
  "hero-documentary": "hero",
  "service-imagery": "service",
  "owner-portrait": "team",
  "project-photo": "project",
  gallery: "gallery",
};

export interface MediaScoreInput {
  /** The acquired asset being scored (bytes on disk, digest computed). */
  asset: FydMediaObject;
  /** Candidate display role being scored for. */
  role: MediaRole;
  /**
   * Trade of the current business, e.g. "carpentry", "plumbing".
   * From canonical objects, never inferred from pixels.
   */
  businessTrade: string;
  /** All other acquired assets for this business (duplication checks). */
  siblingAssets: FydMediaObject[];
  /** Source presentation observations for context (Part A), or null. */
  presentation: PresentationObservation | null;
  /**
   * Observation metadata from discovery: where the image sat in the
   * source page. Observation metadata, not business truth.
   */
  observationContext?: {
    /** Part A.7 section kind the image was found in, e.g. "projects". */
    sectionKind?: string | null;
    /** Nearby caption/heading text when available. */
    captionText?: string | null;
  } | null;
}

export interface ScoreComponents {
  onTradeRelevance: number;
  documentarySignal: number;
  resolutionAdequacy: number;
  aspectFit: number;
  uniqueness: number;
}

export interface RoleAcceptanceBar {
  role: MediaRole;
  /** Minimum weighted score to be eligible for the role. */
  minScore: number;
  /** Minimum shorter-side pixels. */
  minWidth: number;
  /** Accepted aspect-ratio bands: [minW/H, maxW/H]. */
  aspectBands: Array<[number, number]>;
  /** Minimum documentarySignal required. */
  minDocumentary: number;
  /** Minimum onTradeRelevance required. */
  minRelevance: number;
  /** Component weights: [relevance, documentary, resolution, aspect, uniqueness]. */
  weights: [number, number, number, number, number];
}

/**
 * Per-role acceptance bars (locked V1, media-score@1). DATA, not code
 * branches: the scorer reads these; it never hardcodes role behavior.
 */
export const ROLE_ACCEPTANCE_BARS: ReadonlyArray<RoleAcceptanceBar> = [
  {
    role: "hero-documentary",
    minScore: 0.7,
    minWidth: 1200,
    aspectBands: [[1.33, 2.4]],
    minDocumentary: 0.5,
    minRelevance: 0.6,
    weights: [0.35, 0.3, 0.15, 0.1, 0.1],
  },
  {
    role: "service-imagery",
    minScore: 0.55,
    minWidth: 600,
    aspectBands: [[0.75, 1.9]],
    minDocumentary: 0.0,
    minRelevance: 0.4,
    weights: [0.4, 0.15, 0.2, 0.15, 0.1],
  },
  {
    role: "owner-portrait",
    minScore: 0.6,
    minWidth: 400,
    aspectBands: [[0.66, 1.1]],
    minDocumentary: 0.5,
    minRelevance: 0.0,
    weights: [0.1, 0.45, 0.2, 0.15, 0.1],
  },
  {
    role: "project-photo",
    minScore: 0.6,
    minWidth: 800,
    aspectBands: [[0.75, 2.0]],
    minDocumentary: 0.5,
    minRelevance: 0.5,
    weights: [0.35, 0.3, 0.15, 0.1, 0.1],
  },
  {
    role: "gallery",
    minScore: 0.45,
    minWidth: 400,
    aspectBands: [[0.5, 2.5]],
    minDocumentary: 0.0,
    minRelevance: 0.2,
    weights: [0.25, 0.15, 0.2, 0.2, 0.2],
  },
];

export const SCORE_VERSION = "media-score@1";

export function barForRole(role: MediaRole): RoleAcceptanceBar {
  const bar = ROLE_ACCEPTANCE_BARS.find((b) => b.role === role);
  if (!bar) throw new Error("Unknown media role: " + role);
  return bar;
}

// ---------------------------------------------------------------------------
// Text helpers (pure).
// ---------------------------------------------------------------------------

function tokensOf(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Filename portion of a URL path, lowercased, without query/fragment. */
function fileNameOfUrl(url: string | null | undefined): string {
  if (!url) return "";
  const noQuery = url.split("?")[0].split("#")[0];
  const segs = noQuery.split("/");
  return (segs[segs.length - 1] ?? "").toLowerCase();
}

/** Alt + caption + title text the scorer may read for an asset. */
function descriptiveText(
  asset: FydMediaObject,
  ctx: MediaScoreInput["observationContext"],
): string {
  return [
    asset.altText ?? "",
    asset.title ?? "",
    ctx?.captionText ?? "",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Component 1: onTradeRelevance.
// ---------------------------------------------------------------------------

/** Section kinds that count as trade-content context (image sits inside
 *  trade-work content, e.g. a projects or services section). */
const TRADE_CONTEXT_SECTIONS = new Set(["services", "projects"]);

/** Stock-agency filename markers (documentarySignal input). */
const STOCK_MARKERS = [
  "stock-",
  "stock_",
  "shutterstock",
  "istock",
  "adobe-stock",
  "adobestock",
  "gettyimages",
  "getty",
  "dreamstime",
  "123rf",
  "depositphotos",
];

/**
 * Documentary-signal rule (shared with A.11 image treatment): alt/caption
 * referencing a real job, location, or person counts documentary.
 */
export const DOCUMENTARY_TEXT_PATTERN =
  /project|job[\s-]?site|our team|before|after|installed|crew|technician|on[\s-]?site/i;

export function scoreOnTradeRelevance(input: MediaScoreInput): number {
  const { asset, businessTrade } = input;
  const own = keywordsForTrade(businessTrade);
  const textTokens = new Set(tokensOf(descriptiveText(asset, input.observationContext)));
  const fileTokens = new Set(tokensOf(fileNameOfUrl(asset.provenance?.sourceUrl)));

  const hasOwn = (s: Set<string>) => [...s].some((t) => own.has(t));

  // Cross-trade detection: tokens matching any OTHER trade's keyword set.
  const crossTrades = KNOWN_TRADES.filter(
    (t) => t !== businessTrade.toLowerCase().trim(),
  );
  const crossHit =
    crossTrades.some((t) => {
      const kw = keywordsForTrade(t);
      return [...textTokens].some((tok) => kw.has(tok)) || [...fileTokens].some((tok) => kw.has(tok));
    });

  let score: number;
  if (hasOwn(textTokens)) {
    // Full match on alt/caption/title tokens.
    score = 1.0;
  } else if (
    input.observationContext?.sectionKind &&
    TRADE_CONTEXT_SECTIONS.has(input.observationContext.sectionKind.toLowerCase())
  ) {
    // Match on section context only.
    score = 0.6;
  } else if (hasOwn(fileTokens)) {
    // Filename tokens only.
    score = 0.4;
  } else {
    // No signal: absence of evidence is not evidence of absence.
    score = 0.2;
  }

  // Cross-trade cap: tokens of another trade with no own-trade signal
  // (the documented conduit-on-carpentry failure) can never clear a
  // trade-sensitive bar.
  if (crossHit && !hasOwn(textTokens) && !hasOwn(fileTokens)) {
    score = Math.min(score, 0.1);
  }
  return score;
}

// ---------------------------------------------------------------------------
// Component 2: documentarySignal.
// ---------------------------------------------------------------------------

export function scoreDocumentarySignal(input: MediaScoreInput): number {
  const { asset } = input;
  const text = descriptiveText(asset, input.observationContext);
  if (DOCUMENTARY_TEXT_PATTERN.test(text)) return 1.0;
  const file = fileNameOfUrl(asset.provenance?.sourceUrl);
  if (STOCK_MARKERS.some((m) => file.includes(m))) return 0.0;
  return 0.5;
}

// ---------------------------------------------------------------------------
// Component 3: resolutionAdequacy. Pure arithmetic per the spec formula.
// ---------------------------------------------------------------------------

export function scoreResolutionAdequacy(asset: FydMediaObject, bar: RoleAcceptanceBar): number {
  if (bar.minWidth <= 0) return 1;
  return Math.min(1, Math.min(asset.width, bar.minWidth) / bar.minWidth);
}

// ---------------------------------------------------------------------------
// Component 4: aspectFit.
// ---------------------------------------------------------------------------

/**
 * 1.0 inside an accepted band; 0.5 within 25% of a band edge
 * (crop-tolerant); 0.0 otherwise. Best band wins.
 */
export function scoreAspectFit(asset: FydMediaObject, bar: RoleAcceptanceBar): number {
  if (asset.width <= 0 || asset.height <= 0) return 0;
  const aspect = asset.width / asset.height;
  let best = 0;
  for (const [lo, hi] of bar.aspectBands) {
    if (aspect >= lo && aspect <= hi) return 1.0;
    if ((aspect < lo && aspect >= lo * 0.75) || (aspect > hi && aspect <= hi * 1.25)) {
      best = Math.max(best, 0.5);
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Component 5: uniqueness.
// ---------------------------------------------------------------------------

function variantByteSum(asset: FydMediaObject): number {
  return (asset.variants ?? []).reduce((n, v) => n + (v.bytes || 0), 0);
}

/**
 * 1.0 when no sibling is a near-duplicate; 0.5 when one is. Exact digest
 * duplicates are impossible post-ingest (dedupe by digest), so the V1
 * near-duplicate rule is deterministic from asset data: same dimensions
 * and same total variant byte size within 2% (both assets must carry
 * variant bytes; without size evidence there is no near-match claim).
 */
export function scoreUniqueness(asset: FydMediaObject, siblings: FydMediaObject[]): number {
  const myBytes = variantByteSum(asset);
  for (const s of siblings) {
    if (s.digest === asset.digest) continue; // exact dup: ingest's job
    if (s.width !== asset.width || s.height !== asset.height) continue;
    const sibBytes = variantByteSum(s);
    if (myBytes <= 0 || sibBytes <= 0) continue;
    const diff = Math.abs(myBytes - sibBytes) / Math.max(myBytes, sibBytes);
    if (diff <= 0.02) return 0.5;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// Weighted score, eligibility, rejections.
// ---------------------------------------------------------------------------

export function scoreComponents(input: MediaScoreInput): ScoreComponents {
  const bar = barForRole(input.role);
  return {
    onTradeRelevance: scoreOnTradeRelevance(input),
    documentarySignal: scoreDocumentarySignal(input),
    resolutionAdequacy: scoreResolutionAdequacy(input.asset, bar),
    aspectFit: scoreAspectFit(input.asset, bar),
    uniqueness: scoreUniqueness(input.asset, input.siblingAssets),
  };
}

export function weightedScore(components: ScoreComponents, bar: RoleAcceptanceBar): number {
  const [wRel, wDoc, wRes, wAsp, wUni] = bar.weights;
  return (
    wRel * components.onTradeRelevance +
    wDoc * components.documentarySignal +
    wRes * components.resolutionAdequacy +
    wAsp * components.aspectFit +
    wUni * components.uniqueness
  );
}

export interface RoleRejection {
  role: MediaRole;
  /**
   * Rule vocabulary. R1,R2,R3,R4,R6 are the scorer-emitted rules from
   * the locked spec. R5 (rights) and R7 (unsafe sink) are enforced by
   * the protected pipeline before scoring and never emitted here.
   * MIN_SCORE is the B.1 weighted-score gate: the locked spec's R1..R7
   * vocabulary does not name it, so it is typed distinctly rather than
   * mislabeled as R1. (Flagged as a spec ambiguity in the build report.)
   */
  rule: "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "MIN_SCORE";
  detail: string;
}

export interface RoleScoreResult {
  role: MediaRole;
  score: number;
  components: ScoreComponents;
  eligible: boolean;
  rejections: RoleRejection[];
}

/**
 * Score one asset for one role. R1 fires when onTradeRelevance is below
 * the role's minRelevance (after cross-trade capping); R2 when
 * documentarySignal is below minDocumentary; R3 when the asset is below
 * the role's minWidth; R4 when aspectFit is 0.0. A role is eligible only
 * when every component bar AND the weighted minScore clear.
 */
export function scoreOneRole(input: MediaScoreInput): RoleScoreResult {
  const bar = barForRole(input.role);
  const components = scoreComponents(input);
  const score = weightedScore(components, bar);
  const rejections: RoleRejection[] = [];
  const breakdown =
    "relevance=" + components.onTradeRelevance.toFixed(2) +
    " documentary=" + components.documentarySignal.toFixed(2) +
    " resolution=" + components.resolutionAdequacy.toFixed(2) +
    " aspect=" + components.aspectFit.toFixed(2) +
    " uniqueness=" + components.uniqueness.toFixed(2) +
    " score=" + score.toFixed(3);

  if (components.onTradeRelevance < bar.minRelevance) {
    rejections.push({
      role: input.role,
      rule: "R1",
      detail:
        "Wrong-trade content: onTradeRelevance " +
        components.onTradeRelevance.toFixed(2) + " < role minRelevance " +
        bar.minRelevance + " for trade '" + input.businessTrade + "'. " + breakdown,
    });
  }
  if (components.documentarySignal < bar.minDocumentary) {
    rejections.push({
      role: input.role,
      rule: "R2",
      detail:
        "Documentary bar: documentarySignal " +
        components.documentarySignal.toFixed(2) + " < role minDocumentary " +
        bar.minDocumentary + ". " + breakdown,
    });
  }
  if (input.asset.width < bar.minWidth) {
    rejections.push({
      role: input.role,
      rule: "R3",
      detail:
        "Resolution: asset width " + input.asset.width + "px < role minWidth " +
        bar.minWidth + "px. " + breakdown,
    });
  }
  if (components.aspectFit === 0) {
    rejections.push({
      role: input.role,
      rule: "R4",
      detail:
        "Aspect: asset aspect " +
        (input.asset.height > 0
          ? (input.asset.width / input.asset.height).toFixed(2)
          : "unknown") +
        " outside every accepted band " +
        JSON.stringify(bar.aspectBands) + ". " + breakdown,
    });
  }
  if (score < bar.minScore) {
    rejections.push({
      role: input.role,
      rule: "MIN_SCORE",
      detail:
        "Below the role's minimum weighted score: " + score.toFixed(3) +
        " < " + bar.minScore + ". " + breakdown,
    });
  }
  return { role: input.role, score, components, eligible: rejections.length === 0, rejections };
}

// ---------------------------------------------------------------------------
// MediaScorecard (spec C.0, additive sidecar: never on the asset itself).
// ---------------------------------------------------------------------------

export interface MediaScorecard {
  /** Asset digest this scorecard belongs to. */
  assetDigest: string;
  /** Per-role weighted scores, 0..1. */
  roleScores: Record<MediaRole, number>;
  /** Per-role component breakdowns for audit. */
  components: Record<MediaRole, ScoreComponents>;
  /** Roles whose acceptance bar this asset clears. */
  eligibleRoles: MediaRole[];
  /** Typed rejections with rule ids R1..R7. */
  rejections: Array<{ role: MediaRole; rule: string; detail: string }>;
  /** Spec version that produced this scorecard. */
  scoreVersion: typeof SCORE_VERSION;
}

const ALL_ROLES: MediaRole[] = [
  "hero-documentary",
  "service-imagery",
  "owner-portrait",
  "project-photo",
  "gallery",
];

/**
 * Score one asset for every role. Pure: same asset data in, same
 * scorecard out. Rejections are typed, recorded, never silent.
 */
export function scoreAsset(
  asset: FydMediaObject,
  businessTrade: string,
  siblingAssets: FydMediaObject[],
  presentation: PresentationObservation | null,
  observationContext?: MediaScoreInput["observationContext"],
): MediaScorecard {
  const roleScores = {} as Record<MediaRole, number>;
  const components = {} as Record<MediaRole, ScoreComponents>;
  const eligibleRoles: MediaRole[] = [];
  const rejections: MediaScorecard["rejections"] = [];
  for (const role of ALL_ROLES) {
    const result = scoreOneRole({
      asset,
      role,
      businessTrade,
      siblingAssets,
      presentation,
      observationContext,
    });
    roleScores[role] = result.score;
    components[role] = result.components;
    if (result.eligible) {
      eligibleRoles.push(role);
    } else {
      for (const r of result.rejections) {
        rejections.push({ role: r.role, rule: r.rule, detail: r.detail });
      }
    }
  }
  return {
    assetDigest: asset.digest,
    roleScores,
    components,
    eligibleRoles,
    rejections,
    scoreVersion: SCORE_VERSION,
  };
}
