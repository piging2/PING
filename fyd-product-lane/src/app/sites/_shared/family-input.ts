/**
 * Generic family-input builder (product lane).
 *
 * One planning path serves every family site: pinned object-graph fixture
 * (canonical business truth) + pinned production media manifest + optional
 * presentation observation (disposable signal, never authority) ->
 * scorer verdicts -> planPage -> FamilyRenderInput.
 *
 * Deterministic: no network, no clock, no randomness, no customer-name
 * conditionals. Same siteId + same pinned inputs -> same page.
 *
 * Evidence-source registry (SITE_SOURCES) is DATA, not policy: it locates
 * each site's graph fixture, observation file, and media manifest, and it
 * may carry owner-approved copy pins WITH provenance. All planning POLICY
 * (trade detection, capability derivation, theme selection, headline
 * precedence) is generic and evidence-driven; there are no per-site
 * branches anywhere below the registry.
 *
 * On the presentation observation (per the constitutional challenge):
 * the planner consumes the OBJECT GRAPH directly. The observation is a
 * disposable presentation-oriented projection (density bands, finish
 * tendencies, nav labels, CTA tiers) that may TUNE presentation signals
 * and NOTHING else: it never contributes business facts (phone, services,
 * locations, claims), it is always rebuildable from the source site, and
 * a missing or corrupt observation degrades to "no signal", never to a
 * failure. If it ever starts owning business truth, remove it.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";
import { HAPPY_PLACE_RICH_GRAPH } from "@/fyd/proceduralize/__fixtures__/happy-place-rich-graph";
import { getPipelineManifest } from "@/fyd/media/bundle-media";
import { scoreAsset, type MediaRole, type ScoreComponents } from "@/fyd/media/score";
import { isAcquirable, type FydMediaObject, type FydMediaRole, type MediaVariant } from "@/fyd/media/types";
import { keywordsForTrade, KNOWN_TRADES } from "@/fyd/media/trade-keywords";
import {
  detectEmergencyTrade,
  detectUrgencySignals,
  deriveGraphCapabilities,
  planPage,
  type DesignSignal,
  type HomePagePlan,
  type OwnerIntent,
  type PlannerCapability,
  type PlannerMediaRole,
  type ScoredMediaAsset,
} from "@/fyd/proceduralize/planner";
import { SCHEMA_ROLES } from "@/fyd/sitespec/schemas";
import type { ObjectGraph } from "@/fyd/sitespec/types";
import {
  SIGNAL_NOT_AUTHORITY,
  type PresentationObservation,
} from "@/fyd/proceduralize/presentation-observe";
import type { PingObject } from "@/lib/ping/types";
import type { FamilyRenderInput, MediaManifest } from "@/fyd/family/types";

// ---------------------------------------------------------------------------
// Evidence-source registry (data, not policy)
// ---------------------------------------------------------------------------

/** Owner-approved copy pin: verbatim site copy with its provenance. */
export interface OwnerCopyPin {
  text: string;
  provenance: string;
}

interface SiteEvidenceSource {
  /** Canonical business truth: the site's object graph. */
  graph: () => ObjectGraph;
  /**
   * Disposable presentation projection (signal, never authority).
   * Absent when the site has no observation: the planner runs on the
   * graph alone.
   */
  observationPath?: string;
  /** Media manifest namespace for getPipelineManifest. */
  manifestSiteId: string;
  /**
   * Owner-approved headline copy used ONLY when the graph carries no
   * tagline/headline evidence. Evidence, not policy.
   */
  headlinePin?: OwnerCopyPin;
}

export const TRADE_AUTHORITY_THEME_ID = "fyd/coppersmith-trade-authority@1";
export const WARM_CRAFTSMAN_THEME_ID = "fyd/hpp-warm-craftsman@1";

const SITE_SOURCES: Record<string, SiteEvidenceSource> = {
  "coppersmith-plumbing": {
    graph: () => COPPERSMITH_GRAPH,
    observationPath: join(
      "src",
      "fyd",
      "proceduralize",
      "__fixtures__",
      "coppersmith-presentation-observation.json",
    ),
    manifestSiteId: "coppersmith-plumbing",
    headlinePin: {
      text: "You Don't Need A Plumber, You Need A Coppersmith",
      // Verbatim source-site hero copy (two hero H2s in the live homepage
      // bytes, 2026-09-25): H1 source #2 per the planner's headline rule.
      provenance: "owner-approved source-site hero copy, observed 2026-09-25",
    },
  },
  "happy-place": {
    graph: () => HAPPY_PLACE_RICH_GRAPH,
    manifestSiteId: "happy-place",
    // No headline pin: the rich graph carries its own tagline evidence
    // ("Your favorite part of coming home should be the home itself.").
  },
};

/** Site ids the generic builder serves. */
export function supportedSiteIds(): string[] {
  return Object.keys(SITE_SOURCES).sort();
}

function sourceFor(siteId: string): SiteEvidenceSource {
  const source = SITE_SOURCES[siteId];
  if (!source) {
    throw new Error(
      "unknown family siteId \"" + siteId + "\"; supported: " + supportedSiteIds().join(", "),
    );
  }
  return source;
}

// ---------------------------------------------------------------------------
// Observation: disposable presentation projection (signal, never authority)
// ---------------------------------------------------------------------------

/**
 * Load the site's presentation observation when the registry points at one.
 * Missing file or bad authority marker -> null (no signal), never a
 * failure: the planner consumes the object graph directly, and the
 * observation only ever tunes presentation signals.
 */
export function loadSiteObservation(siteId: string): PresentationObservation | null {
  const source = sourceFor(siteId);
  if (!source.observationPath) return null;
  const p = join(process.cwd(), source.observationPath);
  if (!existsSync(p)) return null;
  const raw = JSON.parse(readFileSync(p, "utf8")) as PresentationObservation;
  if (raw.authority !== SIGNAL_NOT_AUTHORITY) return null;
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

// ---------------------------------------------------------------------------
// Generic evidence derivation (no per-site branches)
// ---------------------------------------------------------------------------

function fieldOf(o: PingObject, name: string): string {
  const v = o.fields[name];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join(",");
  return "";
}

function businessObject(graph: ObjectGraph): PingObject | undefined {
  // Canonical schema-role map (sitespec/schemas): both the social and the
  // knowledge business vocabularies project onto the owner role.
  return graph.objects.find(
    (o) => SCHEMA_ROLES.business.includes(o.schema) && o.visibility === "public",
  );
}

/** Tokenize graph text for trade-keyword matching. */
function graphTextTokens(graph: ObjectGraph): Set<string> {
  const chunks: string[] = [];
  for (const o of graph.objects) {
    chunks.push(o.title, o.description);
    for (const v of Object.values(o.fields)) {
      if (typeof v === "string") chunks.push(v);
      else if (Array.isArray(v)) chunks.push(v.join(" "));
    }
  }
  const tokens = new Set<string>();
  for (const word of chunks.join("\n").toLowerCase().split(/[^a-z0-9]+/)) {
    if (word !== "") tokens.add(word);
  }
  return tokens;
}

/**
 * Detect claimed trades from graph text using the media pipeline's
 * canonical trade vocabulary (KNOWN_TRADES/TRADE_KEYWORDS). Returns
 * trades ordered by keyword-hit count, strongest first.
 */
export function detectTradeEvidence(graph: ObjectGraph): string[] {
  const tokens = graphTextTokens(graph);
  const hits: Array<{ trade: string; count: number }> = [];
  for (const trade of KNOWN_TRADES) {
    const keywords = keywordsForTrade(trade);
    let count = 0;
    for (const kw of keywords) {
      if (tokens.has(kw)) count += 1;
    }
    if (count > 0) hits.push({ trade, count });
  }
  hits.sort((a, b) => b.count - a.count || (a.trade < b.trade ? -1 : 1));
  return hits.map((h) => h.trade);
}

/** Trades whose work is project/estimate-shaped (not urgency-shaped). */
const PROJECT_TRADES = new Set(["carpentry", "roofing", "landscaping", "painting"]);

function hasPhoneEvidence(graph: ObjectGraph): boolean {
  const owner = businessObject(graph);
  if (!owner) return false;
  const digits = fieldOf(owner, "phone").replace(/\D/g, "");
  return digits.length >= 10;
}

function hasBookingCtaEvidence(obs: PresentationObservation | null): boolean {
  if (!obs) return false;
  return obs.ctas.items.some((c) => /book|schedul|appointment/i.test(c.label));
}

/**
 * Derive the bounded planner capability set from graph + observation +
 * trade evidence. Graph evidence goes through the planner's canonical
 * deriveGraphCapabilities (one authority for what graph evidence means).
 * The observation contributes ONLY presentation-behavior evidence (CTA
 * tiers/labels observed on the source site), never business facts. Trade
 * evidence contributes the estimate path for project trades.
 * Every capability traces to evidence; nothing is invented.
 */
export function deriveCapabilities(
  graph: ObjectGraph,
  obs: PresentationObservation | null,
  trades: string[],
  urgency: boolean,
): PlannerCapability[] {
  const caps: PlannerCapability[] = deriveGraphCapabilities(graph);
  const push = (c: PlannerCapability) => {
    if (!caps.includes(c)) caps.push(c);
  };
  if (obs) {
    if (obs.ctas.primaryCount > 0) push("cta-primary");
    if (obs.ctas.items.some((c) => c.observedTier === "secondary")) push("cta-secondary");
    if (obs.ctas.items.some((c) => c.observedTier === "tertiary")) push("cta-tertiary");
    if (hasBookingCtaEvidence(obs)) push("schedule-path");
  }
  // Estimate-shaped work (project trades) that is NOT urgency-driven earns
  // the estimate path; urgency trades convert by phone.
  const emergency = urgency || detectEmergencyTrade(graph);
  if (!emergency && trades.some((t) => PROJECT_TRADES.has(t))) push("estimate-path");
  return caps;
}

/**
 * Derive owner intent from evidence. Theme and trade category follow the
 * urgency evidence (urgency phrases in graph text OR the emergency-trade
 * keyword table the planner itself consumes); the headline follows the
 * graph tagline first, the registry's owner-approved copy pin second, and
 * nothing third (the planner's deterministic headline chain then applies).
 */
export function deriveOwnerIntent(
  siteId: string,
  graph: ObjectGraph,
  trades: string[],
  urgency: boolean,
  caps: PlannerCapability[],
): OwnerIntent {
  const source = sourceFor(siteId);
  const owner = businessObject(graph);
  const tagline = owner ? fieldOf(owner, "tagline").trim() : "";
  const headline = tagline !== "" ? tagline : source.headlinePin?.text;
  const emergency = urgency || detectEmergencyTrade(graph);
  const intent: OwnerIntent = {
    themeName: emergency ? TRADE_AUTHORITY_THEME_ID : WARM_CRAFTSMAN_THEME_ID,
    tradeCategory: emergency ? "emergency" : trades.some((t) => PROJECT_TRADES.has(t)) ? "project" : undefined,
  };
  if (emergency && hasPhoneEvidence(graph)) {
    intent.primaryCta = "call";
  } else if (caps.includes("estimate-path")) {
    intent.primaryCta = "estimate";
  } else if (hasPhoneEvidence(graph)) {
    intent.primaryCta = "call";
  }
  if (headline) {
    intent.sourceHeadline = headline;
    intent.brandVoiceLine = headline;
  }
  return intent;
}

// ---------------------------------------------------------------------------
// Generic media scoring (producer side)
// ---------------------------------------------------------------------------

/**
 * Scorer roles with a matching planner role. The scorer's "gallery" role
 * has no planner counterpart, so gallery-only assets stay unbound (honest:
 * no role mapping is invented).
 *
 * "owner-portrait" is scored for the audit report but NEVER emitted as a
 * planner asset here: the planner enforces the depicts-person rule in its
 * binding audit (an asset binds to owner-portrait/team-photo only with a
 * depictsPersonId that references a person object), so emission would be
 * filtered there too; this producer-side exclusion is defense in depth.
 * Producers with real person evidence map it to ScoredMediaAsset.depictsPersonId.
 */
const BINDABLE_SCORER_ROLES: MediaRole[] = ["hero-documentary", "service-imagery", "project-photo", "owner-portrait"];
const EMITTED_SCORER_ROLES: MediaRole[] = ["hero-documentary", "service-imagery", "project-photo"];

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
 * Score every manifest asset under each detected trade and keep the best
 * verdict per role. A role passes only when the scorer's acceptance bar
 * passes; the planner never sees a failed asset as bindable. Assets with
 * no detected trade are scored under the empty trade (no trade signal
 * either way, never an error).
 */
export function scoreSiteMedia(
  media: FydMediaObject[],
  trades: string[],
  obs: PresentationObservation | null,
  businessTitle: string,
): { scored: ScoredMediaAsset[]; report: ScoredAssetReport[] } {
  const scored: ScoredMediaAsset[] = [];
  const report: ScoredAssetReport[] = [];
  const tradeList = trades.length > 0 ? trades : [""];

  for (const asset of media) {
    const roleVerdicts: ScoredAssetReport["roles"] = {};
    const bestByRole = new Map<MediaRole, { score: number; passed: boolean; components: ScoreComponents; trade: string }>();
    for (const trade of tradeList) {
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
    // cleared the rights gate (acquirable) and whose filename carries a
    // business-name token are the business's own marks; they bind as
    // logo-mark only.
    const file = fileNameOf(asset);
    if (asset.roles.includes("logo" as FydMediaRole) && isAcquirable(asset.rightsSource) && businessNameTokenIn(file, businessTitle)) {
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

/** Significant business-name tokens (length >= 4, non-generic) for the logo filename match. */
const LOGO_GENERIC_TOKENS = new Set([
  "the", "and", "company", "co", "llc", "inc", "group", "services", "service", "mechanical",
]);

function businessNameTokenIn(file: string, businessTitle: string): boolean {
  const tokens = businessTitle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !LOGO_GENERIC_TOKENS.has(t));
  return tokens.some((t) => file.includes(t));
}

// ---------------------------------------------------------------------------
// Render manifest + top-level builds
// ---------------------------------------------------------------------------

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

/** Alt text from evidence only: business title + observed asset title. Never invented. */
function altFor(asset: FydMediaObject, businessTitle: string): string {
  if (asset.roles.includes("logo" as FydMediaRole)) return businessTitle + " logo";
  const t = asset.title.trim();
  return t ? businessTitle + ": " + t : businessTitle;
}

/**
 * Render manifest: FYD-controlled derivative URLs for relevance-passing
 * assets only. Keyed by asset id; the planner's media bindings resolve
 * against these keys.
 */
export function buildRenderMediaManifest(
  media: FydMediaObject[],
  scored: ScoredMediaAsset[],
  businessTitle: string,
): MediaManifest {
  const passing = new Set(scored.filter((s) => s.passed).map((s) => s.assetId));
  const out: MediaManifest = {};
  for (const asset of media) {
    if (!passing.has(asset.id)) continue;
    const variant = pickRenderVariant(asset);
    if (!variant) continue;
    out[asset.id] = {
      url: variant.url,
      alt: altFor(asset, businessTitle),
      width: variant.width,
      height: variant.height,
    };
  }
  return out;
}

function businessTitleOf(graph: ObjectGraph, siteId: string): string {
  const owner = businessObject(graph);
  const title = owner?.title?.trim() ?? "";
  if (title !== "") return title;
  return siteId
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Plan-only build for audit tooling (no render manifest). */
export function buildFamilyPlan(siteId: string): HomePagePlan {
  const source = sourceFor(siteId);
  const graph = source.graph();
  const obs = loadSiteObservation(siteId);
  const manifest = getPipelineManifest(source.manifestSiteId);
  // Missing or empty manifest is tolerated: the planner fails closed on
  // media (no fake imagery), and zero-asset sites still plan.
  const mediaObjects = manifest?.media ?? [];
  const trades = detectTradeEvidence(graph);
  const urgency = detectUrgencySignals(graph);
  const caps = deriveCapabilities(graph, obs, trades, urgency);
  const intent = deriveOwnerIntent(siteId, graph, trades, urgency, caps);
  const { scored } = scoreSiteMedia(mediaObjects, trades, obs, businessTitleOf(graph, siteId));
  const plan = planPage({
    graph,
    capabilities: caps,
    media: { assets: scored },
    designSignal: obs ? toDesignSignal(obs) : null,
    ownerIntent: intent,
  });
  if (!plan) throw new Error("planPage returned null for site \"" + siteId + "\"");
  return plan;
}

/**
 * Full deterministic build: graph + manifest + observation -> scored media
 * -> plan -> render input. One planning path for every family site.
 */
export function buildFamilyInput(siteId: string): FamilyRenderInput {
  const source = sourceFor(siteId);
  const graph = source.graph();
  const obs = loadSiteObservation(siteId);
  const manifest = getPipelineManifest(source.manifestSiteId);
  const mediaObjects = manifest?.media ?? [];
  const title = businessTitleOf(graph, siteId);
  const trades = detectTradeEvidence(graph);
  const urgency = detectUrgencySignals(graph);
  const caps = deriveCapabilities(graph, obs, trades, urgency);
  const intent = deriveOwnerIntent(siteId, graph, trades, urgency, caps);
  const { scored } = scoreSiteMedia(mediaObjects, trades, obs, title);
  const plan = planPage({
    graph,
    capabilities: caps,
    media: { assets: scored },
    designSignal: obs ? toDesignSignal(obs) : null,
    ownerIntent: intent,
  });
  if (!plan) throw new Error("planPage returned null for site \"" + siteId + "\"");
  return {
    plan,
    graph,
    media: buildRenderMediaManifest(mediaObjects, scored, title),
    siteSlug: siteId,
    askHref: "#ask-fyd",
  };
}
