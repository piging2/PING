/**
 * LANE-CHAOS out-of-tree stage script. Read-only use of the Pig factory
 * machinery (branch fyd-factory): fact extraction, SiteSpec generation,
 * spec validation, owner-journal replay. No repo writes; artifacts go to
 * argv-specified paths outside the repo.
 *
 * Run from /home/nolan/projects/ping so node_modules/.bin/tsx resolves:
 *   node_modules/.bin/tsx /home/nolan/fyd-chaos-lane/stage.ts <mode> [args...]
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";

async function main(): Promise<void> {
const PING = "/home/nolan/projects/ping/src";
const { generateSiteSpec } = await import(PING + "/fyd/proceduralize/generator.ts");
const { validateSiteSpec, isRenderable } = await import(PING + "/fyd/sitespec/validator.ts");
const { extractSiteFacts } = await import(PING + "/fyd/owner-mode/facts.ts");
const { assertCorrection, applyCorrections } = await import(PING + "/fyd/owner-mode/corrections.ts");
const { canonicalJson, demoProvenance } = await import(PING + "/fyd/owner-mode/provenance.ts");

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function loadGraph(fixturePath: string): any {
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  if (!raw.graph || !Array.isArray(raw.graph.objects)) {
    throw new Error("fixture has no .graph.objects: " + fixturePath);
  }
  return raw.graph;
}

function out(o: unknown): void {
  console.log("CHAOS_STAGE " + JSON.stringify(o));
}

const mode = process.argv[2];

if (mode === "extract") {
  const [fixture, outPath, extractedAt] = process.argv.slice(3);
  const facts = extractSiteFacts(loadGraph(fixture), extractedAt);
  const bytes = JSON.stringify(facts);
  fs.writeFileSync(outPath, bytes);
  out({ mode, facts: facts.length, digest: sha256Hex(bytes) });
} else if (mode === "generate") {
  const [fixture, outPath, generatedAt] = process.argv.slice(3);
  const spec = generateSiteSpec(loadGraph(fixture), { generatedAt });
  const bytes = canonicalJson(spec);
  fs.writeFileSync(outPath, bytes);
  out({
    mode,
    digest: sha256Hex(bytes),
    pages: spec.pages.length,
    ownerObjectId: (spec as any).ownerObjectId ?? null,
  });
} else if (mode === "verify") {
  const [specPath, fixture] = process.argv.slice(3);
  const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  const graph = loadGraph(fixture);
  const schemas = new Set<string>(graph.objects.map((o: any) => o.schema));
  const findings = validateSiteSpec(spec, schemas);
  out({
    mode,
    findings: findings.length,
    errors: findings.filter((f: any) => f.severity === "error").length,
    renderable: isRenderable(findings),
  });
} else if (mode === "draft-journal") {
  // Draft one deterministic CORRECT assertion: phone -> owner value.
  // argv: <factsPath> <outJournalPath> <assertedAt> <newPhone> [sourceValueSeen]
  const [factsPath, outPath, assertedAt, newPhone, sourceValueSeen] = process.argv.slice(3);
  const facts = JSON.parse(fs.readFileSync(factsPath, "utf8"));
  const phoneFact = facts.find((f: any) => f.objectId === "cw-biz-01" && f.field === "phone");
  if (!phoneFact) throw new Error("phone fact missing");
  const a = assertCorrection({
    factRef: { objectId: "cw-biz-01", field: "phone" },
    op: "CORRECT",
    value: newPhone,
    provenance: demoProvenance(null, () => assertedAt),
    sourceValueSeen: sourceValueSeen ?? phoneFact.value ?? null,
  });
  const bytes = JSON.stringify([a]);
  fs.writeFileSync(outPath, bytes);
  out({ mode, assertions: 1, headId: a.assertionId, digest: sha256Hex(bytes) });
} else if (mode === "replay") {
  const [factsPath, journalPath] = process.argv.slice(3);
  const facts = JSON.parse(fs.readFileSync(factsPath, "utf8"));
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const r = applyCorrections(facts, journal);
  const phone = r.facts.find((f: any) => f.objectId === "cw-biz-01" && f.field === "phone");
  out({
    mode,
    applied: r.applied.length,
    conflicts: r.conflicts.length,
    orphaned: r.orphaned.length,
    hidden: r.hiddenFactIds.length,
    phone: phone ? phone.value : null,
  });
} else {
  console.error("unknown mode: " + mode);
  process.exit(2);
}
}

main().catch((e) => {
  console.error("CHAOS_STAGE_ERROR " + (e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
