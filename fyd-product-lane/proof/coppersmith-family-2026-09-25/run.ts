/**
 * One-off Coppersmith generation orchestrator (product lane).
 *
 * 1. Runs presentation observation on the pinned homepage bytes.
 * 2. Scores the authorized demo ingest manifest (score.ts, dual-trade union).
 * 3. Plans via planPage() with graph + capabilities + scored media +
 *    design signal + owner intent.
 * 4. Writes audit artifacts to proof/coppersmith-family-2026-09-25/.
 *
 * Pure steps are deterministic; the only wall-clock input is the
 * observation's observedAt, taken from the pinned file's mtime.
 */
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { observePresentation, validatePresentationObservation } from "@/fyd/proceduralize/presentation-observe";
import { getPipelineManifest } from "@/fyd/media/bundle-media";
import {
  buildFamilyPlan,
  detectTradeEvidence,
  scoreSiteMedia,
  toDesignSignal,
} from "@/app/sites/_shared/family-input";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";

const SITE_ID = "coppersmith-plumbing";

const PROOF = join(process.cwd(), "proof", "coppersmith-family-2026-09-25");
const FIXTURE = join(
  process.cwd(),
  "src",
  "fyd",
  "proceduralize",
  "__fixtures__",
  "coppersmith-presentation-observation.json",
);

function main() {
  // --- 1. Presentation observation on pinned bytes ---
  const htmlPath = join(PROOF, "homepage.html");
  const html = readFileSync(htmlPath, "utf8");
  const observedAt = statSync(htmlPath).mtime.toISOString();
  const obs = observePresentation({
    url: "https://www.coppersmithplumbing.com/",
    observedAt,
    html,
    cssTexts: [],
    level: 1,
  });
  if (!obs) throw new Error("observePresentation returned null for the pinned homepage bytes");
  validatePresentationObservation(obs);
  const obsJson = JSON.stringify(obs, null, 2) + "\n";
  writeFileSync(FIXTURE, obsJson);
  writeFileSync(join(PROOF, "presentation-observation.json"), obsJson);

  console.log("observation: sourceHash=" + obs.sourceHash.slice(0, 16) + " level=" + obs.levelUsed);
  console.log("  logos=" + obs.logo.length + " colors=" + obs.brandColors.length);
  console.log("  nav=[" + obs.navigation.labels.join(" | ") + "]");
  console.log("  navCta=" + JSON.stringify(obs.navigation.navCta));
  console.log("  sections=[" + obs.sectionSequence.map((s) => s.sectionKind + ":" + s.heading.slice(0, 34)).join(" / ") + "]");
  console.log("  dominantPrimaryLabel=" + JSON.stringify(obs.ctas.dominantPrimaryLabel));
  console.log("  imageDensity=" + obs.imageDensity.band + " finish=" + obs.imageTreatment.finish);

  // --- 2. Score the manifest ---
  const manifest = getPipelineManifest(SITE_ID);
  if (!manifest) throw new Error("production media manifest missing");
  const trades = detectTradeEvidence(COPPERSMITH_GRAPH);
  const ownerTitle =
    COPPERSMITH_GRAPH.objects.find(
      (o) => o.schema === "ping.social.business@1" && o.visibility === "public",
    )?.title?.trim() ?? "Coppersmith Plumbing - HVAC - Mechanical";
  const { scored, report } = scoreSiteMedia(manifest.media, trades, obs, ownerTitle);
  writeFileSync(join(PROOF, "scorecards.json"), JSON.stringify(report, null, 2) + "\n");

  const passingByRole = new Map<string, string[]>();
  for (const s of scored) {
    if (!s.passed) continue;
    const list = passingByRole.get(s.role) ?? [];
    list.push(s.assetId + " (" + s.score.toFixed(3) + ")");
    passingByRole.set(s.role, list);
  }
  console.log("\nscored assets: " + scored.length + " entries, passing by role:");
  for (const [role, ids] of [...passingByRole.entries()].sort()) {
    console.log("  " + role + ": " + ids.join(", "));
  }
  const failed = report.filter((r) =>
    Object.values(r.roles).every((v) => !v.passed),
  );
  console.log("assets passing no planner role: " + failed.length);
  for (const f of failed) {
    console.log("  - " + f.assetId + " " + f.sourceUrl.split("/").pop());
  }

  // --- 3. Plan ---
  const plan = buildFamilyPlan(SITE_ID);
  writeFileSync(join(PROOF, "plan.json"), JSON.stringify(plan, null, 2) + "\n");

  console.log("\nplan: theme=" + plan.theme.name);
  console.log("headline: " + JSON.stringify(plan.headline));
  console.log("primary CTA: " + JSON.stringify(plan.ctaHierarchy.primary));
  console.log("secondary CTAs: " + plan.ctaHierarchy.secondary.map((c) => c.kind + ":" + c.label).join(", "));
  console.log("sections:");
  for (const s of plan.sections) {
    const media = s.mediaBindings.map((m) => m.role + "=" + m.assetId.slice(0, 20)).join(",");
    console.log(
      "  [" + s.order + "] " + s.component + " / " + s.variant + " / " + s.status +
      " / job=" + s.job + (media ? " / media: " + media : ""),
    );
  }
  console.log("\nplanner notes:");
  for (const n of plan.plannerNotes) console.log("  - " + n);
}

main();
