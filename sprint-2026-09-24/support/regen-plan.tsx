/**
 * Regenerate proof/coppersmith-family-2026-09-25/plan.json from the pinned
 * inputs, using the worktree's current planner.
 *
 * Faithful replication of buildCoppersmithPlan() (family-input.ts), minus
 * the media-pipeline read: the scored-media inputs are reconstructed from
 * the pinned scorecards.json (same run that produced the pinned plan).
 * Media scoring inputs are unchanged by this lane; only the planner changed.
 *
 * Validation protocol: with the planner fix stashed, the regenerated
 * plan.json must be byte-identical to the pinned one. With the fix applied,
 * the diff must show exactly the intended CTA binding changes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { planPage } from "@/fyd/proceduralize/planner";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";

const LANE = "/home/nolan/worktrees/fyd-family-converge/fyd-product-lane";
const PROOF = join(LANE, "proof/coppersmith-family-2026-09-25");
const FIXTURE = join(LANE, "src/fyd/proceduralize/__fixtures__/coppersmith-presentation-observation.json");

// Mirrors family-input.ts CAPABILITIES (verbatim, 2026-09-25 comments).
const CAPABILITIES = [
  "ask-affordance",
  "cta-primary",
  "cta-secondary",
  "cta-tertiary",
  "phone-tap",
  "schedule-path",
  "hours-display",
  "address-display",
];

// Mirrors family-input.ts OWNER_INTENT (verbatim).
const OWNER_INTENT = {
  themeName: "fyd/coppersmith-trade-authority@1",
  tradeCategory: "emergency",
  primaryCta: "call",
  sourceHeadline: "You Don't Need A Plumber, You Need A Coppersmith",
};

// Mirrors family-input.ts EMITTED_SCORER_ROLES.
const EMITTED_SCORER_ROLES = ["hero-documentary", "service-imagery", "project-photo"];
// The one asset the scorer emits as logo-mark (pinned plan.json binds it as
// logo-mark in Navigation/Hero/Footer; filename coppersmith-logo-black-n-copper.png).
const LOGO_MARK_ASSET = "fyd-media-36e4ff5cab1bafa8";

function main() {
  const obs = JSON.parse(readFileSync(FIXTURE, "utf8"));
  if (obs.authority !== "signal-not-authority") {
    throw new Error("coppersmith presentation observation missing the signal-not-authority marker");
  }
  // Mirrors family-input.ts toDesignSignal (verbatim).
  const designSignal = {
    authority: "signal-not-authority",
    logoCandidates: obs.logo.map((l: any) => ({ position: l.position, confidence: l.confidence })),
    dominantPrimaryLabel: obs.ctas.dominantPrimaryLabel,
    navLabels: obs.navigation.labels,
    imageDensityBand: obs.imageDensity.band,
    imageFinish:
      obs.imageTreatment.finish === "documentary" || obs.imageTreatment.finish === "polished"
        ? obs.imageTreatment.finish
        : "mixed",
    sectionKinds: obs.sectionSequence.map((s: any) => s.sectionKind),
  };

  // Reconstruct scoreCoppersmithMedia()'s `scored` output from the pinned
  // scorecards.json (same scoring run). Per-asset order mirrors the original:
  // emitted roles first, then the logo-mark emission.
  const scorecards = JSON.parse(readFileSync(join(PROOF, "scorecards.json"), "utf8"));
  const scored: Array<{ assetId: string; role: string; score: number; passed: boolean }> = [];
  for (const sc of scorecards) {
    for (const role of EMITTED_SCORER_ROLES) {
      const v = sc.roles[role];
      if (!v) continue;
      scored.push({ assetId: sc.assetId, role, score: v.score, passed: v.passed });
    }
    if (sc.assetId === LOGO_MARK_ASSET) {
      scored.push({ assetId: sc.assetId, role: "logo-mark", score: 1, passed: true });
    }
  }

  const plan = planPage({
    graph: COPPERSMITH_GRAPH as any,
    capabilities: CAPABILITIES as any,
    media: { assets: scored as any },
    designSignal: designSignal as any,
    ownerIntent: OWNER_INTENT as any,
  });
  if (!plan) throw new Error("planPage returned null");
  writeFileSync(join(PROOF, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
  console.log("plan.json regenerated: " + plan.sections.length + " sections");
  const ctas: string[] = [];
  for (const s of plan.sections as any[]) {
    for (const c of s.ctaBindings ?? []) {
      if (c.kind === "call") ctas.push(s.component + "/" + (c.placement ?? "?"));
    }
  }
  console.log("call bindings now on: " + (ctas.join(", ") || "(none)"));
}

main();
