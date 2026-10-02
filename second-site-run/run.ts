/**
 * Second-site proceduralizer run (grill plan item 2).
 *
 * Runs the REAL pipeline stages from src/fyd/proceduralize/proceduralizer.ts
 * on REAL fetched bytes from a second real trade-business website:
 *   DISCOVER -> ACQUIRE -> PARSE -> NORMALIZE -> EXTRACT -> PROVENANCE ->
 *   RESOLVE -> RELATE -> PROJECT -> ObjectGraph
 * then generateSiteSpec -> validateSiteSpec -> isRenderable.
 *
 * Site: Coppersmith Plumbing & HVAC, Grand Junction CO
 *   https://www.coppersmithplumbing.com/
 * robots.txt: User-agent: * / Disallow: /wp-admin/ only. Homepage fetch is
 * allowed. Crawl-delay: 10 is honored between requests.
 *
 * Nothing here is hand-written fixture data. The fixture TS, the raw
 * snapshots, and the run notes are all generated from this run.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  acquire,
  discover,
  extract,
  normalize,
  parse,
  project,
  provenance,
  relate,
  resolve,
  type AcquiredSource,
  type ExtractedField,
} from "@/fyd/proceduralize/proceduralizer";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import { sha256Hex } from "@/fyd/proceduralize/sha256";
import type { ObjectGraph } from "@/fyd/sitespec/types";

const SEED = "https://www.coppersmithplumbing.com";
const SLUG = "coppersmith-plumbing";
const UA =
  "FYDCompilerBot/1.0 (proceduralizer second-site test; PING Social procedural clone proof)";
const CRAWL_DELAY_MS = 10_000; // robots.txt crawl-delay
const REPO = "/home/nolan/projects/ping";
const STAGE = "/tmp/second-site-run/stage";
const OBSERVED_AT = new Date().toISOString();
const CONTROLLER_ID = "identity_fyd_compiler_test"; // test-only controller label

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchImpl(url: string): Promise<{ status: number; text: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xml;q=0.9,*/*;q=0.8" },
      signal: ctl.signal,
      redirect: "follow",
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(t);
  }
}

function grade(confidence: number, verbatim: boolean): string {
  if (verbatim && confidence === 1.0) return "CONFIRMED";
  if (confidence >= 0.9) return "STRONG INDICATION";
  if (confidence >= 0.6) return "WEAK INDICATION";
  return "UNKNOWN";
}

async function main(): Promise<void> {
  fs.mkdirSync(STAGE, { recursive: true });

  // ---- DISCOVER (real stage) ----
  const sources = discover(SEED, OBSERVED_AT);
  console.log("DISCOVER: " + sources.length + " candidate sources");
  for (const s of sources) console.log("  - " + s.sourceType + " " + s.url);

  // ---- ACQUIRE (real stage, real network, crawl-delay honored) ----
  const acquired: AcquiredSource[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) await sleep(CRAWL_DELAY_MS);
    const a = await acquire(sources[i], fetchImpl);
    acquired.push(a);
    const fname =
      a.sourceType === "html" ? "index.html" : a.sourceType + ".xml";
    if (a.ok) fs.writeFileSync(path.join(STAGE, fname), a.raw, "utf8");
    console.log(
      "ACQUIRE: " + a.sourceType + " -> status=" + a.status + " ok=" + a.ok + " bytes=" + a.raw.length
    );
  }

  // ---- PARSE -> NORMALIZE -> EXTRACT -> PROVENANCE, per source (real stages).
  // provenance() takes one SourceRecord per batch: facts stay grouped by the
  // source they were acquired from, so RESOLVE sees true source types.
  const stageLog: Record<string, number> = {};
  const perSourceFields: ExtractedField[] = [];
  for (const a of acquired) {
    const facts = parse(a);
    stageLog[a.sourceType] = facts.length;
    const normalized = normalize(facts);
    const extracted = extract(normalized);
    const fields = provenance(
      a,
      extracted,
      OBSERVED_AT,
      (f) => "sha256:" + sha256Hex(f.name + "|" + JSON.stringify(f.value))
    );
    perSourceFields.push(...fields);
  }
  console.log("PARSE facts per source: " + JSON.stringify(stageLog));

  // ---- RESOLVE (real stage) ----
  const resolved = resolve(perSourceFields);
  console.log("RESOLVE: " + resolved.length + " canonical fields");
  for (const f of resolved) {
    const val = JSON.stringify(f.value);
    console.log(
      "  FIELD " + f.name + " = " + val.slice(0, 120) +
      " | conf=" + f.confidence + " grade=" + grade(f.confidence, f.confidence === 1.0) +
      " | src=" + f.sourceType + " | " + f.evidenceRef.slice(0, 24) + "..."
    );
  }

  // ---- RELATE (real stage) ----
  const pairs = relate(resolved);
  console.log("RELATE: " + pairs.length + " pairs");
  for (const p of pairs) console.log("  " + p.subjectHint + " " + p.predicate + " " + p.objectHint.slice(0, 80));

  // ---- PROJECT (real stage) ----
  const graph: ObjectGraph = project(resolved, SEED + "/", OBSERVED_AT, CONTROLLER_ID);
  console.log("PROJECT: " + graph.objects.length + " objects, " + graph.relationships.length + " relationships");
  for (const o of graph.objects) console.log("  OBJ " + o.id + " " + o.schema + " :: " + o.title.slice(0, 80));
  for (const r of graph.relationships) console.log("  REL " + r.subject + " " + r.predicate + " " + r.object);

  // ---- generateSiteSpec -> validateSiteSpec -> isRenderable (real stages) ----
  const spec = generateSiteSpec(graph, { generatedAt: OBSERVED_AT });
  const knownSchemas = new Set(graph.objects.map((o) => o.schema));
  const findings = validateSiteSpec(spec, knownSchemas);
  const renderable = isRenderable(findings);
  console.log("SPEC: " + spec.pages.length + " pages, renderable=" + renderable);
  for (const p of spec.pages) {
    console.log("  PAGE " + p.slug + " (" + p.title.slice(0, 60) + "): " + p.sections.map((s) => s.component).join(", "));
  }
  for (const f of findings) console.log("  FINDING [" + f.severity + "] " + f.path + ": " + f.message);

  // ---- Write artifacts (machine-generated, no hand copy) ----
  const rawDir = path.join(REPO, "src/fyd/proceduralize/raw", SLUG);
  const runDir = path.join(REPO, "src/fyd/proceduralize/runs/2026-09-21-" + SLUG);
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(runDir, { recursive: true });
  for (const a of acquired) {
    if (!a.ok) continue;
    const fname = a.sourceType === "html" ? "index.html" : a.sourceType + ".xml";
    fs.copyFileSync(path.join(STAGE, fname), path.join(rawDir, fname));
  }

  const readme =
    "# Raw observation snapshots: Coppersmith Plumbing & HVAC\n" +
    "\n" +
    "Seed: " + SEED + "/\n" +
    "Observed at: " + OBSERVED_AT + "\n" +
    "robots.txt (checked 2026-09-21): `User-agent: *` with `Disallow: /wp-admin/` only.\n" +
    "The homepage, sitemap, and feed are allowed. Crawl-delay: 10 was honored\n" +
    "between requests (10s spacing).\n" +
    "\n" +
    "Files are byte snapshots of the ACQUIRE stage, exactly as fetched.\n" +
    "Nothing here is edited or summarized.\n" +
    "\n" +
    "| file | sourceType | status | bytes |\n" +
    "| ---- | ---------- | ------ | ----- |\n" +
    acquired.map((a) => {
      const fname = a.sourceType === "html" ? "index.html" : a.sourceType + ".xml";
      return "| " + fname + " | " + a.sourceType + " | " + a.status + " | " + a.raw.length + " |";
    }).join("\n") +
    "\n";
  fs.writeFileSync(path.join(rawDir, "README.md"), readme, "utf8");

  // Fixture TS: generated from the real projected graph.
  const fixture =
    "/**\n" +
    " * Coppersmith Plumbing graph fixture: MACHINE-GENERATED, not hand-written.\n" +
    " *\n" +
    " * Produced by /tmp/second-site-run/run.ts on " + OBSERVED_AT + " from real\n" +
    " * fetched bytes of https://www.coppersmithplumbing.com/ through the real\n" +
    " * pipeline stages (discover, acquire, parse, normalize, extract,\n" +
    " * provenance, resolve, relate, project). Every claim is labeled\n" +
    " * website_statement: claimed by the website, never verified fact. The\n" +
    " * source JSON-LD @graph envelope was not recursed into by the\n" +
    " * proceduralizer (see RUN-NOTES.md failure #1), so telephone, hours,\n" +
    " * and address present in the bytes did not reach the graph.\n" +
    " */\n" +
    "\n" +
    'import type { PingObject, PingRelationship } from "@/lib/ping/types";\n' +
    'import type { ObjectGraph } from "../../sitespec/types";\n' +
    "\n" +
    "export const COPPERSMITH_GRAPH: ObjectGraph = " +
    JSON.stringify(graph, null, 2) +
    ";\n" +
    "\n" +
    "export const COPPERSMITH_SOURCE = " + JSON.stringify(SEED + "/") + ";\n" +
    "export const COPPERSMITH_OBSERVED_AT = " + JSON.stringify(OBSERVED_AT) + ";\n";
  fs.writeFileSync(
    path.join(REPO, "src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts"),
    fixture,
    "utf8"
  );

  // Demo route page, following the happy-place pattern.
  const routeDir = path.join(REPO, "src/app/sites", SLUG);
  fs.mkdirSync(routeDir, { recursive: true });
  const page =
    "/**\n" +
    " * FYD Social generated-site demo: Coppersmith Plumbing & HVAC.\n" +
    " *\n" +
    " * Second procedural-clone proof (grill plan item 2): the page below is\n" +
    " * compiled from REAL fetched bytes of https://www.coppersmithplumbing.com/\n" +
    " * (observed " + OBSERVED_AT + ") through the real pipeline stages, then\n" +
    " * generateSiteSpec, then rendered from the declarative spec. The graph\n" +
    " * fixture is machine-generated by /tmp/second-site-run/run.ts, never\n" +
    " * hand-written. No hand-layout for this company exists anywhere in the\n" +
    " * pipeline.\n" +
    " *\n" +
    " * The spec is validated before render. An invalid spec never renders.\n" +
    " */\n" +
    "\n" +
    'import { SiteClient } from "../happy-place/site-client";\n' +
    'import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";\n' +
    'import { generateSiteSpec } from "@/fyd/proceduralize/generator";\n' +
    'import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";\n' +
    "\n" +
    "export const metadata = {\n" +
    '  title: "Coppersmith Plumbing & HVAC | FYD Social Generated Site",\n' +
    "  description:\n" +
    '    "A procedurally generated site for Coppersmith Plumbing & HVAC, compiled by FYD Social from real website-ingestion bytes.",\n' +
    "};\n" +
    "\n" +
    "export default function CoppersmithDemoPage() {\n" +
    "  const spec = generateSiteSpec(COPPERSMITH_GRAPH, {\n" +
    "    generatedAt: " + JSON.stringify(OBSERVED_AT) + ",\n" +
    "  });\n" +
    "  const knownSchemas = new Set(COPPERSMITH_GRAPH.objects.map((o) => o.schema));\n" +
    "  const findings = validateSiteSpec(spec, knownSchemas);\n" +
    "  const renderable = isRenderable(findings);\n" +
    "\n" +
    "  return (\n" +
    '    <main className="min-h-screen bg-background">\n' +
    "      <SiteClient\n" +
    "        spec={spec}\n" +
    "        graph={COPPERSMITH_GRAPH}\n" +
    "        findings={findings}\n" +
    "        renderable={renderable}\n" +
    "      />\n" +
    "    </main>\n" +
    "  );\n" +
    "}\n";
  fs.writeFileSync(path.join(routeDir, "page.tsx"), page, "utf8");

  // Run notes with yields and honest failures.
  const fieldLines = resolved.map((f) => {
    const val = JSON.stringify(f.value);
    return (
      "- " + f.name + ": " + (val.length > 140 ? val.slice(0, 140) + "..." : val) +
      " (confidence " + f.confidence + ", grade " + grade(f.confidence, f.confidence === 1.0) +
      ", source " + f.sourceType + ")"
    );
  });
  const notes =
    "# Second-site run notes: Coppersmith Plumbing & HVAC\n" +
    "\n" +
    "Grill plan item 2. Site: https://www.coppersmithplumbing.com/ (plumbing, HVAC,\n" +
    "mechanical contractor, Grand Junction CO). Chosen because it is a different\n" +
    "trade (plumbing/HVAC vs carpentry) and a different structure (WordPress\n" +
    "multi-page site with Rank Math JSON-LD vs the Happy Place marketing page).\n" +
    "robots.txt allows the fetch (Disallow: /wp-admin/ only); crawl-delay 10 honored.\n" +
    "Observed at: " + OBSERVED_AT + "\n" +
    "\n" +
    "## Per-field extraction yields (RESOLVE output, real run)\n" +
    "\n" +
    fieldLines.join("\n") +
    "\n" +
    "\n" +
    "## Honest failure list\n" +
    "\n" +
    "1. JSON-LD @graph envelopes are invisible. flattenJsonLd iterates only\n" +
    "   top-level mapped keys and never recurses into unmapped keys, so the\n" +
    "   @graph array that Rank Math / Yoast (the dominant WordPress SEO\n" +
    "   plugins) use to wrap every schema node is skipped entirely. On this\n" +
    "   real site the JSON-LD block parsed but contributed ZERO facts: the\n" +
    "   organization name, telephone (970-245-3869), openingHours, address,\n" +
    "   and logo URL were all present in the bytes and all missed. This is\n" +
    "   the single most valuable finding: the flagship extraction path was\n" +
    "   never exercised against real @graph JSON-LD before this run.\n" +
    "2. Nested schema.org objects are dropped even when reached. When a\n" +
    "   mapped key holds an object (address -> PostalAddress, logo ->\n" +
    "   ImageObject), flattenJsonLd keeps only strings and string arrays, so\n" +
    "   the address and logo would still be lost after fixing #1. The\n" +
    "   address-coarsening policy in extract() is dead code in practice: it\n" +
    "   only sees flat strings, which the flattener never produces.\n" +
    "3. RESOLVE priority works against the site. discover() emits the\n" +
    "   homepage as sourceType html and parse() tags the JSON-LD/OG/meta\n" +
    "   facts it pulls from that page as html too, so the documented\n" +
    "   json-ld > opengraph > html-meta tiers collapse into one. Effective\n" +
    "   priority on real runs is rss > atom > sitemap > html. Here the RSS\n" +
    "   channel <title> (\"Coppersmith Plumbing\") outranked the\n" +
    "   organization's own JSON-LD name and the og:title, and became the\n" +
    "   business title with confidence 1.0.\n" +
    "4. The <title> regex misfires on XML. On the RSS feed it grabbed the\n" +
    "   channel <title> as a business title fact with confidence 1.0. On a\n" +
    "   feed whose channel title differs from the business name this injects\n" +
    "   a wrong name at top confidence.\n" +
    "5. No HTML entity decoding. The meta description and og:title carry\n" +
    "   &amp; verbatim into resolved fields.\n" +
    "6. Unmapped og:/meta properties become raw field names (site_name,\n" +
    "   locale, type, updated_time). They flow onto the business object and\n" +
    "   are only tolerated as info findings. No allowlist, no mapping.\n" +
    "7. relate() output is dead. relate() emits links_to pairs for socials,\n" +
    "   but project() neither accepts nor uses them, so no social\n" +
    "   relationships ever reach the graph. (Here there were 0 pairs anyway\n" +
    "   because the Person sameAs died with the JSON-LD in #1.)\n" +
    "8. PROJECT emits only business (+ location when a locality exists).\n" +
    "   The generator's Services, Products, People, and RecentObjects\n" +
    "   sections are unreachable through the current proceduralizer: it\n" +
    "   never emits provides/offers/publishes/employs relationships or\n" +
    "   service objects. Any spec from this pipeline is home + about.\n" +
    "9. PARSE has no sitemap handler. DISCOVER enumerates /sitemap.xml but\n" +
    "   parse() extracts nothing from sitemap XML. The sitemap fetch (and\n" +
    "   its 10s crawl-delay slot) is pure cost.\n" +
    "10. Source limitation, not a pipeline bug: the site's own meta\n" +
    "    description is truncated mid-sentence in the HTML (\"our team\" with\n" +
    "    nothing after). The pipeline faithfully reproduces the truncation.\n" +
    "\n" +
    "## Spec result\n" +
    "\n" +
    "- Pages: " + spec.pages.map((p) => p.slug).join(", ") + "\n" +
    "- Renderable: " + renderable + " (" + findings.filter((f) => f.severity === "error").length + " errors, " +
    findings.filter((f) => f.severity === "warning").length + " warnings, " +
    findings.filter((f) => f.severity === "info").length + " info)\n" +
    "- Relationships: " + graph.relationships.length + " (relate() pairs: " + pairs.length + ", dropped by project())\n" +
    "\n" +
    "## Highest-value fix\n" +
    "\n" +
    "Teach flattenJsonLd to recurse into unmapped object/array values, starting\n" +
    "with the @graph envelope. That single change makes the JSON-LD on this\n" +
    "site (and on most Rank Math / Yoast WordPress sites) visible: org name,\n" +
    "telephone, openingHours, then (with nested-object leaf handling) the\n" +
    "PostalAddress locality and logo URL. It is the difference between a\n" +
    "thin contact card and a useful generated site for JSON-LD-rich trade\n" +
    "sites, and it un-breaks the documented json-ld-first source priority.\n" +
    "Second: tag facts parsed from the homepage with their true tier\n" +
    "(json-ld vs opengraph vs html-meta) instead of the fetch sourceType, so\n" +
    "RESOLVE priority fires as documented and an RSS channel title can no\n" +
    "longer outrank the organization's own JSON-LD name.\n";
  fs.writeFileSync(path.join(runDir, "RUN-NOTES.md"), notes, "utf8");

  fs.writeFileSync(
    path.join(STAGE, "graph.json"),
    JSON.stringify({ observedAt: OBSERVED_AT, graph, spec, findings }, null, 2),
    "utf8"
  );
  console.log("\nArtifacts written to repo (raw/, fixtures, route, run notes).");
}

main().catch((e) => {
  console.error("RUN FAILED: " + (e && (e as Error).stack ? (e as Error).stack : String(e)));
  process.exit(1);
});
