/**
 * Coppersmith family-page input builder (product lane, Coppersmith-first proving).
 *
 * Deterministic: pinned graph fixture + pinned production media manifest +
 * pinned presentation observation -> scorer verdicts -> planPage -> render input.
 * No network, no clock, no randomness. Same pinned inputs -> same page.
 *
 * Business-truth source: the machine-generated Coppersmith object graph
 * fixture (proceduralizer output, 2026-09-21). Media: the authorized demo
 * ingest manifest (Decision 1: ingest, never hotlink; siteId-namespaced
 * derivatives). Design signal: the presentation observation (signal, never
 * authority). Owner intent: phone-primary emergency trade, coppersmith theme.
 *
 * Only relevance-passing assets reach the planner, and only relevance-passing
 * assets appear in the render manifest.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { getPipelineManifest } from "@/fyd/media/bundle-media";
import { scoreAsset, type MediaRole, type ScoreComponents } from "@/fyd/media/score";
import { isAcquirable, type FydMediaObject, type MediaVariant } from "@/fyd/media/types";
import {
  planPage,
  type DesignSignal,
  type HomePagePlan,
  type OwnerIntent,
  type PlannerCapability,
  type PlannerMediaRole,
  type ScoredMediaAsset,
} from "@/fyd/proceduralize/planner";
import {
  SIGNAL_NOT_AUTHORITY,
  type PresentationObservation,
} from "@/fyd/proceduralize/presentation-observe";
import type { FamilyRenderInput, MediaManifest } from "@/fyd/family/types";

export const COPPERSMITH_SITE_ID = "coppersmith-plumbing";
export const COPPERSMITH_THEME_ID = "fyd/coppersmith-trade-authority@1";

/**
 * Business-trade set for relevance scoring, derived from canonical graph
 * evidence (business title "Coppersmith Plumbing - HVAC - Mechanical" and
 * the Plumbing / Heating & Cooling / HVAC / Ventilation service objects).
 * An asset is on-trade when it is on-trade for either claimed trade; the
 * scorer's cross-trade cap still applies within each single-trade verdict.
 */
const BUSINESS_TRADES = ["plumbing", "hvac"] as const;

/**
 * Scorer roles with a matching planner role. The scorer's "gallery" role
 * has no planner counterpart, so gallery-only assets stay unbound (honest:
 * no role mapping is invented).
 *
 * "owner-portrait" is scored for the audit report but NEVER emitted as a
 * planner asset here: no manifest asset carries depicts-person evidence,
 * and the scorer's owner-portrait bar (minRelevance 0.0) passes non-person
 * images (product photos). The planner now enforces the depicts-person
 * rule in its binding audit (planner.ts portraitRoleBindable: an asset
 * binds to owner-portrait/team-photo only with a depictsPersonId that
 * references a person object), so emission would be filtered there too;
 * this producer-side exclusion is defense in depth. Producers with real
 * person evidence map it to ScoredMediaAsset.depictsPersonId.
 */
const BINDABLE_SCORER_ROLES: MediaRole[] = ["hero-documentary", "service-imagery", "project-photo", "owner-portrait"];
const EMITTED_SCORER_ROLES: MediaRole[] = ["hero-documentary", "service-imagery", "project-photo"];

/**
 * Capability evidence for Coppersmith (every entry traces to the graph or
 * to verified source-site bytes; see the comments).
 */
const CAPABILITIES: PlannerCapability[] = [
  // ask-affordance: site capability, always honest.
  "ask-affordance",
  // Multi-tier CTAs observed on the source site (nav CTA, hero phone, banner).
  "cta-primary",
  "cta-secondary",
  "cta-tertiary",
  // Phone in the graph: fields.phone = "970-245-3869".
  "phone-tap",
  // "Schedule Installation" lead form verified in the live homepage bytes
  // (2026-09-25). Planned (installation) conversion path alongside call.
  "schedule-path",
  // Hours in the graph: fields.hours = "Mo,Tu,We,Th,Fr 07:30-16:00".
  "hours-display",
  // Locality in the graph: "Grand Junction, Colorado, 81501, United States".
  "address-display",
  // Deliberately absent: estimate-path (no estimate evidence), map-route
  // (no street address in the graph), social-link / content-link /
  // newsletter-capture (no socials, content objects, or newsletter
  // evidence in the graph). No invented capabilities.
];

const OWNER_INTENT: OwnerIntent = {
  themeName: COPPERSMITH_THEME_ID,
  // Emergency-prone trade: plumbing/HVAC. Phone IS the conversion.
  tradeCategory: "emergency",
  primaryCta: "call",
  // Verbatim source-site hero copy (two hero H2s in the live homepage
  // bytes, 2026-09-25): H1 source #2 per the planner's headline rule.
  sourceHeadline: "You Don't Need A Plumber, You Need A Coppersmith",
};

/** Pinned presentation observation (signal, never authority). */
function loadObservation(): PresentationObservation {
  const p = join(
    process.cwd(),
    "src",
    "fyd",
    "proceduralize",
    "__fixtures__",
    "coppersmith-presentation-observation.json",
  );
  const raw = JSON.parse(readFileSync(p, "utf8")) as PresentationObservation;
  if (raw.authority !== SIGNAL_NOT_AUTHORITY) {
    // Fail closed: a bad authority marker discards the whole signal.
    throw new Error("coppersmith presentation observation missing the signal-not-authority marker");
  }
  return raw;
}

/** PresentationObservation -> planner DesignSignal (hint fields only). */
export function toDesignSignal(obs: PresentationObservation): DesignSignal {
  return {
    authority: SIGNAL_NOT_AUTHORITY,
    logoCandidates: obs.logo.map((l) => ({ position: l.position, confidence: l.confidence })),
    dominantPrimaryLabel: obs.ctas.dominantPrimaryLabel,
    navLabels: obs.navigation.labels,
    imageDensityBand: obs.imageDensity.band,
    imageFinish:
      obs.imageTreatment.finish === "documentary" || obs.imageTreatment.finish === "polished"
        ? obs.imageTreatment.finish
        : "mixed",
    sectionKinds: obs.sectionSequence.map((s) => s.sectionKind),
  };
}

export interface ScoredAssetReport {
  assetId: string;
  digest: string;
  sourceUrl: string;
  width: number;
  height: number;
  winningTrade: string;
  /** role -> { score, passed, rule ids } for the winning trade's verdict. */
  roles: Record<string, { score: number; passed: boolean; rules: string[] }>;
}

/**
 * Score every manifest asset under each claimed business trade and keep
 * the best verdict per role. A role passes only when the scorer's
 * acceptance bar passes; the planner never sees a failed asset as bindable.
 */
export function scoreCoppersmithMedia(
  media: FydMediaObject[],
  obs: PresentationObservation,
): { scored: ScoredMediaAsset[]; report: ScoredAssetReport[] } {
  const scored: ScoredMediaAsset[] = [];
  const report: ScoredAssetReport[] = [];

  for (const asset of media) {
    const roleVerdicts: ScoredAssetReport["roles"] = {};
    const bestByRole = new Map<MediaRole, { score: number; passed: boolean; components: ScoreComponents; trade: string }>();
    for (const trade of BUSINESS_TRADES) {
      const card = scoreAsset(asset, trade, media, obs);
      for (const role of BINDABLE_SCORER_ROLES) {
        const score = card.roleScores[role];
        const eligible = card.eligibleRoles.includes(role);
        const prev = bestByRole.get(role);
        if (!prev || score > prev.score) {
          bestByRole.set(role, {
            score,
            passed: eligible,
            components: card.components[role],
            trade,
          });
        }
        const rules = card.rejections.filter((r) => r.role === role).map((r) => r.rule);
        const cur = roleVerdicts[role];
        if (!cur || score > cur.score) {
          roleVerdicts[role] = { score, passed: eligible, rules };
        }
      }
    }
    for (const role of EMITTED_SCORER_ROLES) {
      const v = bestByRole.get(role);
      if (!v) continue;
      scored.push({
        assetId: asset.id,
        role: role as PlannerMediaRole,
        score: v.score,
        passed: v.passed,
        components: { ...v.components },
        onTrade: v.trade,
      });
    }
    // Logo-mark: the scorer has no logo role. Brand-mark assets that
    // cleared the rights gate (acquirable, business-slug filename match)
    // are the business's own marks; they bind as logo-mark only.
    const file = fileNameOf(asset);
    if (
      asset.roles.includes("logo") &&
      isAcquirable(asset.rightsSource) &&
      /coppersmith/i.test(file)
    ) {
      scored.push({
        assetId: asset.id,
        role: "logo-mark",
        score: 1,
        passed: true,
        components: { "rights-gate": 1 },
      });
    }
    report.push({
      assetId: asset.id,
      digest: asset.digest,
      sourceUrl: asset.provenance.sourceUrl,
      width: asset.width,
      height: asset.height,
      winningTrade: bestTradeOf(bestByRole),
      roles: roleVerdicts,
    });
  }
  return { scored, report };
}

function bestTradeOf(
  m: Map<MediaRole, { score: number; trade: string }>,
): string {
  let best: { score: number; trade: string } | null = null;
  for (const v of m.values()) {
    if (!best || v.score > best.score) best = v;
  }
  return best ? best.trade : "none";
}

function fileNameOf(asset: FydMediaObject): string {
  const url = asset.provenance.sourceUrl;
  const slash = url.lastIndexOf("/");
  const q = url.indexOf("?", slash);
  return (q === -1 ? url.slice(slash + 1) : url.slice(slash + 1, q)).toLowerCase();
}

/** Choose the render derivative: card 768w preferred, else thumbnail, else first. */
function pickRenderVariant(asset: FydMediaObject): MediaVariant | null {
  const vs = asset.variants;
  if (vs.length === 0) return null;
  return (
    vs.find((v) => v.name === "card") ??
    vs.find((v) => v.name === "thumbnail") ??
    vs[0] ??
    null
  );
}

function businessTitle(): string {
  const owner = COPPERSMITH_GRAPH.objects.find(
    (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
  );
  return owner?.title?.trim() ?? "Coppersmith Plumbing - HVAC - Mechanical";
}

/** Alt text from evidence only: object title + observed asset title. Never invented. */
function altFor(asset: FydMediaObject): string {
  const name = businessTitle();
  if (asset.roles.includes("logo")) return name + " logo";
  const t = asset.title.trim();
  return t ? name + ": " + t : name;
}

/**
 * Render manifest: FYD-controlled derivative URLs for relevance-passing
 * assets only. Keyed by asset id; the planner's media bindings resolve
 * against these keys.
 */
export function buildRenderMediaManifest(
  media: FydMediaObject[],
  scored: ScoredMediaAsset[],
): MediaManifest {
  const passing = new Set(scored.filter((s) => s.passed).map((s) => s.assetId));
  const out: MediaManifest = {};
  for (const asset of media) {
    if (!passing.has(asset.id)) continue;
    const variant = pickRenderVariant(asset);
    if (!variant) continue;
    out[asset.id] = {
      url: variant.url,
      alt: altFor(asset),
      width: variant.width,
      height: variant.height,
    };
  }
  return out;
}

/** Full deterministic build: observation + manifest -> scored media -> plan -> render input. */
export function buildCoppersmithFamilyInput(): FamilyRenderInput {
  const obs = loadObservation();
  const manifest = getPipelineManifest(COPPERSMITH_SITE_ID);
  if (!manifest) {
    throw new Error("production media manifest missing for " + COPPERSMITH_SITE_ID);
  }
  const { scored } = scoreCoppersmithMedia(manifest.media, obs);
  const plan: HomePagePlan | null = planPage({
    graph: COPPERSMITH_GRAPH,
    capabilities: CAPABILITIES,
    media: { assets: scored },
    designSignal: toDesignSignal(obs),
    ownerIntent: OWNER_INTENT,
  });
  if (!plan) throw new Error("planPage returned null for the Coppersmith graph");
  return {
    plan,
    graph: COPPERSMITH_GRAPH,
    media: buildRenderMediaManifest(manifest.media, scored),
    siteSlug: COPPERSMITH_SITE_ID,
    askHref: "#ask-fyd",
  };
}

/** Plan-only build for audit tooling (no render manifest). */
export function buildCoppersmithPlan(): HomePagePlan {
  const obs = loadObservation();
  const manifest = getPipelineManifest(COPPERSMITH_SITE_ID);
  if (!manifest) {
    throw new Error("production media manifest missing for " + COPPERSMITH_SITE_ID);
  }
  const { scored } = scoreCoppersmithMedia(manifest.media, obs);
  const plan = planPage({
    graph: COPPERSMITH_GRAPH,
    capabilities: CAPABILITIES,
    media: { assets: scored },
    designSignal: toDesignSignal(obs),
    ownerIntent: OWNER_INTENT,
  });
  if (!plan) throw new Error("planPage returned null for the Coppersmith graph");
  return plan;
}
