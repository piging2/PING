#!/usr/bin/env node
// run.mjs — html-hardening fixture lab orchestrator (fleet-acq-1).
// Runs all 50 cases (one isolated child process each), asserts every manifest
// expectation plus the global no-guess invariants, and writes the run report.
// Exit 0 iff every case passes; exit 1 lists the failures.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { manifest as manifest1 } from "./cases.mjs";
import { manifest as manifest2 } from "./cases2.mjs";
import { manifest as manifestMeta } from "./meta-cases.mjs";
import { manifest as manifestSitemap } from "./sitemap-cases.mjs";
import { manifest as manifestFeed } from "./feed-cases.mjs";
import { manifest2 as manifestFeed2 } from "./feed-cases2.mjs";
import { manifest as manifestApi } from "./api-cases.mjs";
import { manifest2 as manifestApi2 } from "./api-cases2.mjs";
import { manifest3 as manifestApi3 } from "./api-cases3.mjs";
import { manifest4 as manifestApi4 } from "./api-cases4.mjs";
import { manifest as manifestPdf } from "./pdf-cases.mjs";
import { manifest2 as manifestPdf2 } from "./pdf-cases2.mjs";
import { manifest3 as manifestPdf3 } from "./pdf-cases3.mjs";
import { manifest4 as manifestPdf4 } from "./pdf-cases4.mjs";
import { manifestImg } from "./img-cases.mjs";
import { manifestImg2 } from "./img-cases2.mjs";
import { manifestSoc } from "./soc-cases.mjs";
import { manifestSoc2 } from "./soc-cases2.mjs";
import { manifestSoc3 } from "./soc-cases3.mjs";
import { manifestUpl } from "./upl-cases.mjs";
import { manifestUpl2 } from "./upl-cases2.mjs";
import { manifestUpl3 } from "./upl-cases3.mjs";
import { manifestCorr } from "./corr-cases.mjs";
import { manifestCorr2 } from "./corr-cases2.mjs";
import { manifestCon } from "./con-cases.mjs";
import { manifestCon2 } from "./con-cases2.mjs";
import { manifestCon3 } from "./con-cases3.mjs";
import { manifestCfl } from "./cfl-cases.mjs";
import { manifestCfl2 } from "./cfl-cases2.mjs";
import { manifestCfl3 } from "./cfl-cases3.mjs";
import { manifestRnm } from "./rnm-cases.mjs";
import { manifestRnm2 } from "./rnm-cases2.mjs";
import { manifestPrt } from "./prt-cases.mjs";
import { manifestPrt2 } from "./prt-cases2.mjs";
import { manifestJsh } from "./jsh-cases.mjs";
import { manifestJsh2 } from "./jsh-cases2.mjs";
import { manifestMkm } from "./mkm-cases.mjs";
import { manifestMkm2 } from "./mkm-cases2.mjs";
import { manifestRtl } from "./rtl-cases.mjs";
import { manifestRtl2 } from "./rtl-cases2.mjs";
import { manifestPvo } from "./pvo-cases.mjs";
import { PARSER_VERSION } from "./harness.mjs";
import { META_PARSER_VERSION } from "./meta-harness.mjs";
import { SITEMAP_PARSER_VERSION } from "./sitemap-harness.mjs";
import { FEED_PARSER_VERSION } from "./feed-harness.mjs";
import { API_PARSER_VERSION } from "./api-harness.mjs";
import { PDF_PARSER_VERSION } from "./pdf-harness.mjs";
import { IMG_PARSER_VERSION } from "./img-harness.mjs";
import { SOC_PARSER_VERSION } from "./soc-harness.mjs";
import { UPL_PARSER_VERSION } from "./upl-harness.mjs";
import { COR_PARSER_VERSION } from "./corr-harness.mjs";
import { CON_PARSER_VERSION } from "./con-harness.mjs";
import { CFL_PARSER_VERSION } from "./cfl-harness.mjs";
import { RNM_PARSER_VERSION } from "./rnm-harness.mjs";
import { PRT_PARSER_VERSION } from "./prt-harness.mjs";
import { JSH_PARSER_VERSION } from "./jsh-harness.mjs";
import { MKM_PARSER_VERSION } from "./mkm-harness.mjs";
import { RTL_PARSER_VERSION } from "./rtl-harness.mjs";
import { PVO_PARSER_VERSION } from "./pvo-harness.mjs";

const BATCH = process.env.HTML_BATCH || "1";
const PDF_BATCH = process.env.PDF_BATCH || "1";
const LAB = process.env.HTML_LAB || "html"; // html | meta | sitemap | feed | api | pdf | img | soc | upl | corr | con | cfl | rnm | prt | jsh | mkm | rtl | pvo
const FEED_BATCH = process.env.FEED_BATCH || "1";
const API_BATCH = process.env.API_BATCH || "1";
const IMG_BATCH = process.env.IMG_BATCH || "1";
const SOC_BATCH = process.env.SOC_BATCH || "1";
const UPL_BATCH = process.env.UPL_BATCH || "1";
const COR_BATCH = process.env.COR_BATCH || "1";
const CON_BATCH = process.env.CON_BATCH || "1";
const CFL_BATCH = process.env.CFL_BATCH || "1";
const RNM_BATCH = process.env.RNM_BATCH || "1";
const PRT_BATCH = process.env.PRT_BATCH || "1";
const RTL_BATCH = process.env.RTL_BATCH || "1";
const MKM_BATCH = process.env.MKM_BATCH || "1";
const JSH_BATCH = process.env.JSH_BATCH || "1";
const manifest = LAB === "meta" ? manifestMeta : LAB === "sitemap" ? manifestSitemap : LAB === "feed" ? (FEED_BATCH === "2" ? manifestFeed2 : manifestFeed) : LAB === "api" ? (API_BATCH === "4" ? manifestApi4 : API_BATCH === "3" ? manifestApi3 : API_BATCH === "2" ? manifestApi2 : manifestApi) : LAB === "pdf" ? (PDF_BATCH === "4" ? manifestPdf4 : PDF_BATCH === "3" ? manifestPdf3 : PDF_BATCH === "2" ? manifestPdf2 : manifestPdf) : LAB === "img" ? (IMG_BATCH === "2" ? manifestImg2 : manifestImg) : LAB === "soc" ? (SOC_BATCH === "3" ? manifestSoc3 : SOC_BATCH === "2" ? manifestSoc2 : manifestSoc) : LAB === "upl" ? (UPL_BATCH === "3" ? manifestUpl3 : UPL_BATCH === "2" ? manifestUpl2 : manifestUpl) : LAB === "corr" ? (COR_BATCH === "2" ? manifestCorr2 : manifestCorr) : LAB === "con" ? (CON_BATCH === "3" ? manifestCon3 : CON_BATCH === "2" ? manifestCon2 : manifestCon) : LAB === "cfl" ? (CFL_BATCH === "3" ? manifestCfl3 : CFL_BATCH === "2" ? manifestCfl2 : manifestCfl) : LAB === "rnm" ? (RNM_BATCH === "2" ? manifestRnm2 : manifestRnm) : LAB === "prt" ? (PRT_BATCH === "2" ? manifestPrt2 : manifestPrt) : LAB === "mkm" ? (MKM_BATCH === "2" ? manifestMkm2 : manifestMkm) : LAB === "rtl" ? (RTL_BATCH === "2" ? manifestRtl2 : manifestRtl) : LAB === "pvo" ? manifestPvo : LAB === "jsh" ? (JSH_BATCH === "2" ? manifestJsh2 : manifestJsh) : (BATCH === "2" ? manifest2 : manifest1);
const REPORT_NAME = LAB === "meta" ? "run-report-meta.json" : LAB === "sitemap" ? "run-report-sitemap.json" : LAB === "feed" ? (FEED_BATCH === "2" ? "run-report-feed-batch2.json" : "run-report-feed.json") : LAB === "api" ? (API_BATCH === "4" ? "run-report-api-batch4.json" : API_BATCH === "3" ? "run-report-api-batch3.json" : API_BATCH === "2" ? "run-report-api-batch2.json" : "run-report-api.json") : LAB === "pdf" ? (PDF_BATCH === "4" ? "run-report-pdf-batch4.json" : PDF_BATCH === "3" ? "run-report-pdf-batch3.json" : PDF_BATCH === "2" ? "run-report-pdf-batch2.json" : "run-report-pdf.json") : LAB === "img" ? (IMG_BATCH === "2" ? "run-report-img-batch2.json" : "run-report-img.json") : LAB === "soc" ? (SOC_BATCH === "3" ? "run-report-soc-batch3.json" : SOC_BATCH === "2" ? "run-report-soc-batch2.json" : "run-report-soc.json") : LAB === "upl" ? (UPL_BATCH === "3" ? "run-report-upl-batch3.json" : UPL_BATCH === "2" ? "run-report-upl-batch2.json" : "run-report-upl.json") : LAB === "corr" ? (COR_BATCH === "2" ? "run-report-cor-batch2.json" : "run-report-cor.json") : LAB === "con" ? (CON_BATCH === "3" ? "run-report-con-batch3.json" : CON_BATCH === "2" ? "run-report-con-batch2.json" : "run-report-con.json") : LAB === "cfl" ? (CFL_BATCH === "3" ? "run-report-cfl-batch3.json" : CFL_BATCH === "2" ? "run-report-cfl-batch2.json" : "run-report-cfl.json") : LAB === "rnm" ? (RNM_BATCH === "2" ? "run-report-rnm-batch2.json" : "run-report-rnm.json") : LAB === "prt" ? (PRT_BATCH === "2" ? "run-report-prt-batch2.json" : "run-report-prt.json") : LAB === "mkm" ? (MKM_BATCH === "2" ? "run-report-mkm-batch2.json" : "run-report-mkm.json") : LAB === "rtl" ? (RTL_BATCH === "2" ? "run-report-rtl-batch2.json" : "run-report-rtl.json") : LAB === "pvo" ? "run-report-pvo.json" : LAB === "jsh" ? (JSH_BATCH === "2" ? "run-report-jsh-batch2.json" : "run-report-jsh.json") : (BATCH === "2" ? "run-report-batch2.json" : "run-report.json");
const ONE_SCRIPT = LAB === "meta" ? "meta-one.mjs" : LAB === "sitemap" ? "sitemap-one.mjs" : LAB === "feed" ? "feed-one.mjs" : LAB === "api" ? "api-one.mjs" : LAB === "pdf" ? "pdf-one.mjs" : LAB === "img" ? "img-one.mjs" : LAB === "soc" ? "soc-one.mjs" : LAB === "upl" ? "upl-one.mjs" : LAB === "corr" ? "corr-one.mjs" : LAB === "con" ? "con-one.mjs" : LAB === "cfl" ? "cfl-one.mjs" : LAB === "rnm" ? "rnm-one.mjs" : LAB === "prt" ? "prt-one.mjs" : LAB === "jsh" ? "jsh-one.mjs" : LAB === "mkm" ? "mkm-one.mjs" : LAB === "rtl" ? "rtl-one.mjs" : LAB === "pvo" ? "pvo-one.mjs" : "one.mjs";
const EXPECTED_PARSER = LAB === "meta" ? META_PARSER_VERSION : LAB === "sitemap" ? SITEMAP_PARSER_VERSION : LAB === "feed" ? FEED_PARSER_VERSION : LAB === "api" ? API_PARSER_VERSION : LAB === "pdf" ? PDF_PARSER_VERSION : LAB === "img" ? IMG_PARSER_VERSION : LAB === "soc" ? SOC_PARSER_VERSION : LAB === "upl" ? UPL_PARSER_VERSION : LAB === "corr" ? COR_PARSER_VERSION : LAB === "con" ? CON_PARSER_VERSION : LAB === "cfl" ? CFL_PARSER_VERSION : LAB === "rnm" ? RNM_PARSER_VERSION : LAB === "prt" ? PRT_PARSER_VERSION : LAB === "jsh" ? JSH_PARSER_VERSION : LAB === "mkm" ? MKM_PARSER_VERSION : LAB === "rtl" ? RTL_PARSER_VERSION : LAB === "pvo" ? PVO_PARSER_VERSION : PARSER_VERSION;
const EVID_SUBDIR = LAB === "meta" ? "structured-metadata" : LAB === "sitemap" ? "sitemaps" : LAB === "feed" ? "feeds" : LAB === "api" ? "public-apis" : LAB === "pdf" ? "documents-pdf" : LAB === "img" ? "image-metadata" : LAB === "soc" ? "permitted-social" : LAB === "upl" ? "owner-uploads" : LAB === "corr" ? "owner-corrections" : LAB === "con" ? "software-connectors" : LAB === "cfl" ? "conflict-sources" : LAB === "rnm" ? "renames-redirects" : LAB === "prt" ? "partial-pages" : LAB === "jsh" ? "js-heavy" : LAB === "mkm" ? "malformed-markup" : LAB === "rtl" ? "rate-limits" : LAB === "pvo" ? "provider-outage" : "html-hardening";
const LAB_LABEL = LAB === "meta" ? "structured-metadata" : LAB === "sitemap" ? "sitemaps" : LAB === "feed" ? "feeds" : LAB === "api" ? "public-apis" : LAB === "pdf" ? "documents-pdf" : LAB === "img" ? "image-metadata" : LAB === "soc" ? "permitted-social" : LAB === "upl" ? "owner-uploads" : LAB === "corr" ? "owner-corrections" : LAB === "con" ? "software-connectors" : LAB === "cfl" ? "conflict-sources" : LAB === "rnm" ? "renames-redirects" : LAB === "prt" ? "partial-pages" : LAB === "jsh" ? "js-heavy" : LAB === "mkm" ? "malformed-markup" : LAB === "rtl" ? "rate-limits" : LAB === "pvo" ? "provider-outage" : "html-hardening";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "evidence", EVID_SUBDIR);
mkdirSync(EVID, { recursive: true });

const LANE_K_13 = new Set(["AUTH_REQUIRED","AUTH_EXPIRED","PERMISSION_DENIED","RATE_LIMITED",
  "SOURCE_UNAVAILABLE","SOURCE_CHANGED","SCHEMA_CHANGED","INVALID_PAYLOAD","UNSUPPORTED",
  "CONFLICT","TIMEOUT","TRANSIENT","PERMANENT"]);

const results = [];

for (const m of manifest) {
  const caseRes = { case_id: m.case_id, mission: m.mission, title: m.title,
                    threat: m.threat, fixture_sha256: m.fixture_sha256,
                    assertions: [], pass: true };
  const fail = (name, detail) => { caseRes.assertions.push({ name, ok: false, detail }); caseRes.pass = false; };
  const ok = (name, detail = "") => caseRes.assertions.push({ name, ok: true, detail });

  let r;
  try {
    const env = { ...process.env };
    if (m.expect.tight_budget_ms) env.HTML_HARNESS_BUDGET_MS = String(m.expect.tight_budget_ms);
    const out = execFileSync("node", [join(HERE, ONE_SCRIPT), m.case_id],
      { env, maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
    r = JSON.parse(out.toString());
  } catch (e) {
    fail("harness-executed", `child failed: ${String(e.message).slice(0, 300)}`);
    results.push(caseRes);
    continue;
  }
  caseRes.harness_outcome = r.outcome;
  ok("harness-executed", `outcome=${r.outcome}`);
  const e = m.expect;

  // ---- outcome-level assertions ----
  if (r.outcome !== e.outcome) fail("outcome-matches", `expected ${e.outcome}, got ${r.outcome}`);
  else ok("outcome-matches");

  if (e.outcome === "typed_failure") {
    const f = r.failure || {};
    if (f.record_type !== "ping.connector.failure.v1") fail("failure-record-shape", `record_type=${f.record_type}`);
    else ok("failure-record-shape");
    if (!LANE_K_13.has(f.class)) fail("failure-class-canonical", `class=${f.class} not in lane-K 13`);
    else ok("failure-class-canonical", f.class);
    if (f.class !== e.failure_class) fail("failure-class-expected", `expected ${e.failure_class}, got ${f.class}`);
    else ok("failure-class-expected");
    const sig = String((f.provider_signal || {}).native_code || "");
    if (!sig.includes(e.failure_signal)) fail("failure-signal", `native_code=${sig}`);
    else ok("failure-signal", sig);
    if ((r.claims || []).length !== 0) fail("no-claims-on-failure", `${r.claims.length} claims leaked on failure path`);
    else ok("no-claims-on-failure");
    if (f.terminal !== true) fail("failure-terminal", "bound-violation failures must be terminal");
    else ok("failure-terminal");
  }

  if (e.outcome === "bounded_success") {
    if (r.failure) fail("no-failure-record", `unexpected failure: ${r.failure.class}`);
    else ok("no-failure-record");
    const claims = r.claims || [];
    // expected claims present with exact values
    for (const [field, value] of Object.entries(e.claims || {})) {
      const hit = claims.find((c) => c.field === field && c.value === value);
      if (!hit) fail(`claim:${field}`, `expected value ${JSON.stringify(value)} not found`);
      else ok(`claim:${field}`, `${claims.filter((c) => c.field === field).length} candidate(s)`);
    }
    // absent claims
    for (const field of e.absent_claims || []) {
      const hit = claims.find((c) => c.field === field);
      if (hit) fail(`absent:${field}`, `forbidden claim emitted: ${JSON.stringify(hit.value)}`);
      else ok(`absent:${field}`);
    }
    // forbidden values must not appear as any CLAIM value (they may appear in unresolved candidates)
    const claimVals = claims.map((c) => c.value);
    for (const fv of e.forbidden_values || []) {
      const hit = claimVals.find((v) => v === fv || String(v).includes(fv));
      if (hit) fail("forbidden-value", `parser guess became fact: ${JSON.stringify(hit)}`);
      else ok("forbidden-value", JSON.stringify(fv));
    }
    // unresolved conflicts recorded, never silently dropped
    for (const field of e.required_unresolved || []) {
      const hit = (r.unresolved || []).find((u) => u.field === field);
      if (!hit) fail(`unresolved:${field}`, "conflict not recorded");
      else if (!hit.candidates || hit.candidates.length < 2 && hit.reason !== "uncorroborated-single-source-no-guess")
        fail(`unresolved:${field}`, "conflict record malformed");
      else ok(`unresolved:${field}`, hit.reason);
    }
    // truncation flags
    for (const t of e.required_truncated || []) {
      if (!r.truncated || r.truncated[t] !== true) fail(`truncated:${t}`, `flag not set`);
      else ok(`truncated:${t}`);
    }
    // flags that must NOT be set (at-cap boundary cases)
    for (const t of e.truncated_absent || []) {
      if (r.truncated && r.truncated[t] === true) fail(`not-truncated:${t}`, `flag unexpectedly set`);
      else ok(`not-truncated:${t}`);
    }
    // notes
    for (const nn of e.required_notes || []) {
      const v = (r.notes || {})[nn];
      const present = Array.isArray(v) ? v.length > 0 : !!v;
      if (!present) fail(`note:${nn}`, "note missing");
      else ok(`note:${nn}`, Array.isArray(v) ? `${v.length} item(s)` : String(v).slice(0, 80));
    }
    // exact note values
    for (const [nk, nv] of Object.entries(e.notes_equal || {})) {
      const v = (r.notes || {})[nk];
      if (JSON.stringify(v) !== JSON.stringify(nv)) fail(`note-eq:${nk}`, `expected ${JSON.stringify(nv)}, got ${JSON.stringify(v)}`);
      else ok(`note-eq:${nk}`, String(v));
    }
    // quarantined entries (typed, never claims)
    for (const q of e.required_quarantined || []) {
      const hit = (r.quarantined || []).find((x) =>
        (!q.property || x.property === q.property) && (!q.reason || x.reason === q.reason));
      if (!hit) fail(`quarantined:${q.property || "*"}:${q.reason || "*"}`, "expected quarantine not recorded");
      else ok(`quarantined:${q.property}:${q.reason}`, `${hit.where}`);
    }
    // soc_signal presence/absence (permitted-social signal ids)
    for (const s of e.required_signals || []) {
      const hit = claims.find((c) => c.field === "soc_signal" && c.value === s);
      if (!hit) fail(`signal:${s}`, "required signal not emitted");
      else ok(`signal:${s}`, hit.provenance[0]?.locator || "");
    }
    for (const s of e.absent_signals || []) {
      const hit = claims.find((c) => c.field === "soc_signal" && c.value === s);
      if (hit) fail(`absent-signal:${s}`, "forbidden signal emitted");
      else ok(`absent-signal:${s}`);
    }
    // claim-count assertions (for labs with repeated claim fields)
    for (const [field, n] of Object.entries(e.min_claims || {})) {
      const got = claims.filter((c) => c.field === field).length;
      if (got < n) fail(`min-claims:${field}`, `got ${got} < ${n}`);
      else ok(`min-claims:${field}`, `${got}`);
    }
    for (const [field, n] of Object.entries(e.exact_claims || {})) {
      const got = claims.filter((c) => c.field === field).length;
      if (got !== n) fail(`exact-claims:${field}`, `got ${got}, want ${n}`);
      else ok(`exact-claims:${field}`, `${got}`);
    }
    if (e.expect_no_claims) {
      if (claims.length !== 0) fail("expect-no-claims", `${claims.length} claims emitted`);
      else ok("expect-no-claims");
    }
    // min provenance depth
    for (const [field, n] of Object.entries(e.min_provenance || {})) {
      const hit = claims.find((c) => c.field === field);
      const depth = hit ? hit.provenance.length : 0;
      if (depth < n) fail(`provenance-depth:${field}`, `depth ${depth} < ${n}`);
      else ok(`provenance-depth:${field}`, `depth=${depth}`);
    }
    for (const [field, n] of Object.entries(e.min_provenance || {})) {
      const hit = claims.find((c) => c.field === field);
      const depth = hit ? hit.provenance.length : 0;
      if (depth < n) fail(`provenance-depth:${field}`, `depth ${depth} < ${n}`);
      else ok(`provenance-depth:${field}`, `depth=${depth}`);
    }
  }

  // ---- global no-guess invariants (every case, every outcome) ----
  for (const c of r.claims || []) {
    if (c.value === undefined || c.value === null || (typeof c.value === "string" && !c.value) || (typeof c.value !== "string" && typeof c.value !== "number")) fail("invariant:claim-value", `empty/non-string claim for ${c.field}`);
    if (!Array.isArray(c.provenance) || c.provenance.length === 0) fail("invariant:claim-provenance", `claim ${c.field} has no provenance`);
    else if (c.provenance.some((p) => !p.source || !p.locator)) fail("invariant:provenance-shape", `claim ${c.field} provenance missing source/locator`);
    if (c.parser !== EXPECTED_PARSER) fail("invariant:parser-version", `claim ${c.field} parser=${c.parser}`);
  }
  if ((r.claims || []).some((c) => !c.value || !c.provenance?.length)) { /* already failed above */ }
  else if ((r.claims || []).length > 0) ok("invariant:claims-grounded", `${r.claims.length} claim(s), all with provenance`);
  else ok("invariant:claims-grounded", "zero claims (legitimate empty or failure path)");

  results.push(caseRes);
}

const passed = results.filter((r) => r.pass).length;
const report = {
  lab: LAB_LABEL,
  worker: "fleet-acq-1",
  parser: EXPECTED_PARSER,
  generated_at: new Date().toISOString(),
  cases_total: results.length,
  cases_passed: passed,
  cases_failed: results.length - passed,
  doctrine: "NEVER turn parser guess into fact: hostile inputs get typed lane-K failure records or bounded extraction with per-claim provenance; conflicts stay unresolved; uncorroborated identity signals stay unclaimed.",
  contract_ref: "lane-d HOSTILE-INPUT-CONTRACT.md parse bounds P1-P8; lane-k FAILURE-TAXONOMY.md v1.0.0 (13 classes)",
  results,
};
const reportPath = join(EVID, REPORT_NAME);
writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`report: ${reportPath}`);
console.log(`passed ${passed}/${results.length}`);
for (const r of results.filter((x) => !x.pass)) {
  console.log(`FAIL ${r.case_id} (${r.mission}):`);
  for (const a of r.assertions.filter((a) => !a.ok)) console.log(`  - ${a.name}: ${a.detail}`);
}
process.exit(passed === results.length ? 0 : 1);
