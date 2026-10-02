/**
 * W-PRESENT proof tool. Uses the repo's own machinery (proposeSitePatch,
 * canonicalize) to inject a digest-valid approved reorder_section directive
 * into a site projection's presentationIntent block, or to clear it back to
 * the backed-up original.
 *
 * Usage:
 *   tsx prove-intent.tsx <siteId> inspect
 *   tsx prove-intent.tsx <siteId> inject
 *   tsx prove-intent.tsx <siteId> clear
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { getPingObjectGraph } from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { proposeSitePatch } from "@/fyd/proceduralize/patch";
import { canonicalize } from "@/lib/ping/ask-composer";
import type { PresentationIntentBlock, PresentationIntentDirective } from "@/fyd/customize/types";

const PROJ_DIR = "/home/nolan/ping/var/fyd-projections";
const BAK_SUFFIX = ".w-present-bak";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

async function compileBase(siteId: string) {
  const { graph, meta } = await getPingObjectGraph(siteId);
  const spec = generateSiteSpec(graph, {
    generatedAt: meta.generatedAt,
    eventSequences: meta.eventSequences ?? undefined,
  });
  return { graph, meta, spec };
}

async function inspect(siteId: string) {
  const { spec } = await compileBase(siteId);
  for (const p of spec.pages) {
    console.log("PAGE " + p.slug + " (" + p.sections.length + " sections)");
    p.sections.forEach((s, i) => console.log("  " + i + "  " + s.id + "  [" + s.component + "]"));
  }
}

async function inject(siteId: string) {
  const path = PROJ_DIR + "/" + siteId + ".json";
  const bak = path + BAK_SUFFIX;
  if (!existsSync(bak)) copyFileSync(path, bak);

  const { spec } = await compileBase(siteId);
  const page = spec.pages.find((p) => p.slug === "home") ?? spec.pages[0];
  // Target: a services-like section that is not already first.
  const target =
    page.sections.find(
      (s, i) => i > 0 && /service/i.test(s.component + " " + s.id),
    ) ?? page.sections[1];
  const toIndex = 0;
  const siteIntent = {
    kind: "reorder_section",
    pageSlug: page.slug,
    sectionId: target.id,
    toIndex,
  } as const;
  const res = proposeSitePatch(spec, siteIntent);
  if (!res.ok || !res.proposal) {
    console.error("proposeSitePatch failed: " + res.error);
    process.exit(1);
  }
  const proposal = res.proposal;
  const intentId = "pi-" + sha256Hex(siteId + proposal.proposalDigest).slice(0, 16);
  const directive: PresentationIntentDirective = {
    intentId,
    siteIntent,
    proposal,
    approval: {
      proposalDigest: proposal.proposalDigest,
      approvedBy: "w-present proof (demo-owner, seeded, unverified)",
      approvedAt: new Date().toISOString(),
      note: "DEMO OWNER MODE - not real authentication",
    },
  };

  const doc = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const existing = doc["presentationIntent"] as PresentationIntentBlock | null;
  const block: PresentationIntentBlock = existing ?? {
    directives: [],
    provenance: {
      kind: "owner-presentation-intent",
      note: "Owner-approved presentation intents (PRESENTATION INTENT layer). Re-applied over the base graph on every dump.",
      eventIds: [],
    },
  };
  block.directives = block.directives.filter((d) => d.intentId !== intentId);
  block.directives.push(directive);
  (doc["meta"] as Record<string, unknown>)["presentationIntentDigest"] =
    sha256Hex(canonicalize(block));
  doc["presentationIntent"] = block;
  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
  console.log(
    "INJECTED " + intentId + ": move section " + target.id +
    " (component " + target.component + ") to index 0 on page " + page.slug,
  );
}

function clear(siteId: string) {
  const path = PROJ_DIR + "/" + siteId + ".json";
  const bak = path + BAK_SUFFIX;
  if (!existsSync(bak)) {
    console.error("no backup found; nothing to clear");
    process.exit(1);
  }
  copyFileSync(bak, path);
  console.log("CLEARED: restored original projection from backup");
}

async function main() {
  const [siteId, mode] = process.argv.slice(2);
  if (!siteId || !mode) {
    console.error("usage: tsx prove-intent.tsx <siteId> <inspect|inject|clear>");
    process.exit(1);
  }
  if (mode === "inspect") return inspect(siteId);
  if (mode === "inject") return inject(siteId);
  if (mode === "clear") return clear(siteId);
  console.error("unknown mode " + mode);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
