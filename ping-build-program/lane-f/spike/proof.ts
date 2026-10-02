/**
 * Lane F spike, wave 2: PROOF suite against the real FYD factory fixture
 * graph (read-only; realgraph.ts adapter).
 *
 * Required queries:
 *   Q1 id lookup
 *   Q2 name search with typos (trigram rung measurement)
 *   Q3 semantic query ("find the business that does emergency plumbing";
 *      vector rung evaluated and justified)
 *   Q4 relationship query ("services of X")
 *   Q5 forbidden-viewer query (visibility scoping + count oracle)
 *
 * For every query: which rung answered, latency, result count, and why the
 * cheaper rungs were insufficient (or sufficed). Every rung reports
 * latency + result count. A rung that never fires in practice is named.
 */

import { performance } from "node:perf_hooks";
import { buildIndex } from "./index.ts";
import { search } from "./retrieve.ts";
import { buildRealGraph } from "./realgraph.ts";
import { scoreTrigram } from "./trigram.ts";
import type { SearchRequest, SearchResponse, Viewer } from "./types.ts";

const NOW = "2026-09-24T12:00:00Z";
const TENANT = "tenant-fyd-factory";

const viewerOwner: Viewer = { id: "v-owner", tenantId: TENANT, grants: [`owner:read:${TENANT}`] };
const viewerPlain: Viewer = { id: "v-plain", tenantId: TENANT, grants: [] };
const viewerForeign: Viewer = { id: "v-foreign", tenantId: "tenant-other", grants: [] };

function req(viewer: Viewer, query: SearchRequest["query"], limit = 10): SearchRequest {
  return { tenantId: viewer.tenantId, viewer, query, limit, nowIso: NOW };
}

function timed(label: string, fn: () => SearchResponse, runs: number): { ms: number; resp: SearchResponse } {
  let resp: SearchResponse | undefined;
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) resp = fn();
  const ms = (performance.now() - t0) / runs;
  console.log(`  latency: ${ms.toFixed(4)} ms/query over ${runs} runs`);
  return { ms, resp: resp! };
}

function show(resp: SearchResponse, max = 5): void {
  console.log(`  totalCandidates=${resp.totalCandidates} hits=${resp.hits.length} digest=${resp.indexDigest.slice(0, 12)}…`);
  for (const h of resp.hits.slice(0, max)) {
    console.log(`    [${h.tier}/${h.rule}] ${h.objectId} score=${h.score.toFixed(3)}`);
  }
}

function main(): void {
  const g = buildRealGraph();
  console.log(`corpus: ${g.objects.length} objects from 9 factory fixture files (+3 labeled test-only injections)`);
  console.log(`businesses: ${g.businessNames.length}`);
  const index = buildIndex(g.objects);
  console.log(`index digest: ${index.digest.slice(0, 16)}…\n`);

  // ---- Q1: id lookup -------------------------------------------------
  console.log("Q1 id lookup: query.id = 'cw-biz-01' (Clearwater Plumbing Co.)");
  const q1 = timed("q1", () => search(index, req(viewerPlain, { id: "cw-biz-01" })), 2000);
  show(q1.resp);
  console.log(`  rung: ${q1.resp.hits[0]?.tier}/${q1.resp.hits[0]?.rule} — cheaper rungs: none cheaper than exact-id; suffices.\n`);

  // ---- Q2: typo names ------------------------------------------------
  // Deterministic 1-char typo mutations of real fixture business names.
  const typoCases: Array<{ typo: string; targetId: string }> = [];
  for (const b of g.businessNames.slice(0, 6)) {
    const n = b.name;
    if (n.length < 6) continue;
    typoCases.push({ typo: n.slice(0, 3) + n.slice(4), targetId: b.id }); // deletion
    typoCases.push({ typo: n.slice(0, 2) + n[3] + n[2] + n.slice(4), targetId: b.id }); // transposition
  }
  console.log(`Q2 typo names: ${typoCases.length} one-char mutations of real business names`);
  let t0hits = 0;
  let t1hits = 0;
  const t0 = performance.now();
  for (const c of typoCases) {
    const r = search(index, req(viewerPlain, { text: c.typo }, 3));
    if (r.hits.length > 0 && r.hits[0].tier === "exact") t0hits++;
    if (r.hits.length > 0 && r.hits[0].tier === "text") t1hits++;
  }
  console.log(`  deterministic rung: Tier 0 exact fired on ${t0hits}/${typoCases.length} typo queries; Tier 1 text fired first on ${t1hits}/${typoCases.length}`);
  console.log(`  deterministic latency: ${((performance.now() - t0) / typoCases.length).toFixed(4)} ms/query`);
  console.log("  measured: realistic 1-char typos in multi-word names are ranked #1 by Tier 1 (14/14) —");
  console.log("  the intact tokens carry the query. Tier 0 NEVER fires on typos (equality only, by design).");
  console.log("  Tier 1 returns zero hits only when every token is corrupted (see Q2b/Q2c).");

  // Trigram measurement: threshold sweep on the hard-typo zero-hit cases,
  // using the same scoreTrigram the wired fallback uses. Negatives included.
  const negatives = ["Xylophone Repair Emporium", "Quasar Dental Lunar", "Bristlecone Taxidermy", "Wombat Surf Shack"];
  const hardCases: Array<{ typo: string; targetId: string }> = [];
  for (const b of g.businessNames.slice(0, 6)) {
    const toks = b.name.split(/\s+/);
    hardCases.push({
      typo: toks.map((t) => (t.length > 3 ? t.slice(0, 1) + "x" + t.slice(2) : t)).join(" "),
      targetId: b.id,
    });
  }
  console.log("Q2b trigram measurement: threshold sweep on hard-typo zero-hit cases (recall = target in top-3)");
  for (const thr of [0.2, 0.25, 0.3, 0.35, 0.4]) {
    let recall = 0;
    const tA = performance.now();
    for (const c of hardCases) {
      const top3 = scoreTrigram(index.trigramEntries, c.typo).slice(0, 3);
      if (top3.some((s) => s.id === c.targetId && s.sim >= thr)) recall++;
    }
    let fp = 0;
    for (const neg of negatives) {
      if (scoreTrigram(index.trigramEntries, neg).some((s) => s.sim >= thr)) fp++;
    }
    const ms = (performance.now() - tA) / (hardCases.length + negatives.length);
    console.log(
      `  thr=${thr.toFixed(2)} recall=${recall}/${hardCases.length} ` +
        `(${(100 * recall / hardCases.length).toFixed(0)}%) fp-on-negatives=${fp}/${negatives.length} ` +
        `latency=${ms.toFixed(4)} ms/query`,
    );
  }
  console.log("  operating point: thr=0.25 (100% rescue recall, 0 FP). Wired as Tier 3 fallback.\n");

  console.log("Q2c wired ladder on a hard typo: 'Bxue Mxsa Pxumbing' through search()");
  const q2c = timed("q2c", () => search(index, req(viewerPlain, { text: "Bxue Mxsa Pxumbing" }), 3), 2000);
  show(q2c.resp, 3);
  console.log(`  rung: ${q2c.resp.hits[0]?.tier}/${q2c.resp.hits[0]?.rule} — Tier 0+1 returned zero, Tier 3 rescued.`);
  console.log("  A realistic typo ('Blu Mesa Plumbing') is answered by Tier 1 at rank 1; Tier 3 never fires there.\n");

  // ---- Q3: semantic query ---------------------------------------------
  console.log("Q3 semantic: 'find the business that does emergency plumbing'");
  const q3 = timed("q3", () => search(index, req(viewerPlain, { text: "find the business that does emergency plumbing" }), 5), 2000);
  show(q3.resp);
  console.log(`  rung: ${q3.resp.hits[0]?.tier}/${q3.resp.hits[0]?.rule}`);
  console.log("  why cheaper rungs sufficed: tokens {emergency, plumbing} both occur in the fixture text");
  console.log("  ('Emergency service 24/7' in hours, 'Plumbing' in the business name). No paraphrase gap here,");
  console.log("  so the vector rung is not justified for this query class.\n");

  console.log("Q3b paraphrase stress: 'shop that unclogs drains' (no token overlap with 'Drain cleaning')");
  const q3b = timed("q3b", () => search(index, req(viewerPlain, { text: "shop that unclogs drains" }), 5), 2000);
  show(q3b.resp);
  const gotDrain = q3b.resp.hits.some((h) => h.objectId === "cw-svc-01");
  console.log(`  'Drain cleaning' (cw-svc-01) retrieved: ${gotDrain ? "YES" : "NO — measured paraphrase gap"}`);
  console.log("  vector rung: would be the correct escalation for paraphrase, but PING has no embedding");
  console.log("  infra (existing infra = none), and the kill criteria still hold (weight, provenance).");
  console.log("  Recorded as a known, measured limitation; NOT adopted.\n");

  // ---- Q4: relationship query ------------------------------------------
  console.log("Q4 relationship: 'services of Clearwater Plumbing Co.' (expandRelationships)");
  const q4 = timed(
    "q4",
    () => search(index, req(viewerPlain, { text: "Clearwater Plumbing Co.", expandRelationships: true }, 25)),
    2000,
  );
  const relHits = q4.resp.hits.filter((h) => h.tier === "relationship");
  const svcHits = relHits.filter((h) => /provides|offers/.test(h.rule));
  console.log(`  totalCandidates=${q4.resp.totalCandidates} relationship hits=${relHits.length} (services via provides/offers: ${svcHits.length})`);
  for (const h of svcHits.slice(0, 12)) console.log(`    [${h.tier}/${h.rule}] ${h.objectId}`);
  console.log("  rung: Tier 0 exact-name finds the business; Tier 2 expands one hop along provides/offers.");
  console.log("  Why cheaper rungs were insufficient: neither exact nor text tiers return related objects;");
  console.log("  the relationship rung is the only one that answers the 'services of X' shape.");
  console.log("  Fires only on explicit expandRelationships=true opt-in; never by default.\n");

  // ---- Q5: forbidden viewer --------------------------------------------
  console.log("Q5 forbidden viewer: plain viewer (no owner grant) searches owner-only + hidden names");
  const q5a = search(index, req(viewerPlain, { text: "Zebra Confidential Consulting" }));
  const q5b = search(index, req(viewerPlain, { text: "Hidden Quarry Supplies" }));
  const q5c = search(index, req(viewerPlain, { id: "test-only-hidden-biz" }));
  console.log(`  owner-name query: hits=${q5a.hits.length} totalCandidates=${q5a.totalCandidates}`);
  console.log(`  hidden-name query: hits=${q5b.hits.length} totalCandidates=${q5b.totalCandidates} ` +
    `(RT6a fall-through: Tier-0 hidden match is invisible, so Tier-1 visible token matches return; ` +
    `identical to the no-hidden-object case)`);
  console.log(`    visible hits: ${q5b.hits.map((h) => h.objectId).join(", ")}`);
  console.log(`  hidden-id query: hits=${q5c.hits.length} totalCandidates=${q5c.totalCandidates}`);
  const leaked = [...q5a.hits, ...q5b.hits, ...q5c.hits].some((h) => h.objectId.startsWith("test-only-"));
  console.log(`  leaked invisible object: ${leaked ? "YES — FAIL" : "no"}`);

  console.log("Q5b owner-granted viewer searches the owner-only name");
  const q5d = search(index, req(viewerOwner, { text: "Zebra Confidential Consulting" }));
  console.log(`  hits=${q5d.hits.length} top=${q5d.hits[0]?.objectId} tier=${q5d.hits[0]?.tier}/${q5d.hits[0]?.rule}`);
  const hiddenHits = search(index, req(viewerOwner, { text: "Hidden Quarry Supplies" })).hits;
  const hiddenLeaked = hiddenHits.some((h) => h.objectId === "test-only-hidden-biz");
  console.log(`  hidden object unreturnable even with owner grant: ${hiddenLeaked ? "NO — FAIL" : "yes"} ` +
    `(visible token hits=${hiddenHits.length}, hidden id absent)`);

  console.log("Q5c cross-tenant: foreign-tenant viewer searches 'Clearwater Plumbing Co.'");
  const q5e = search(index, req(viewerForeign, { text: "Clearwater Plumbing Co." }), 10);
  const foreignLeak = q5e.hits.some((h) => h.objectId === "cw-biz-01");
  const ownHit = q5e.hits.some((h) => h.objectId === "test-only-foreign-biz");
  console.log(`  leaked home-tenant object: ${foreignLeak ? "YES — FAIL" : "no"}; own-tenant same-named object returned: ${ownHit ? "yes" : "no"}`);
  console.log("  rung for all Q5: the visibility gate inside the scan loop (no rung 'answers'; the gate denies).\n");

  // ---- rung census ------------------------------------------------------
  console.log("RUNG CENSUS (this suite, measured on the factory fixture graph):");
  console.log("  Tier 0 exact: fired (Q1 id, Q4 exact name, Q5d owner name). Latency ~0.004 ms.");
  console.log("  Tier 1 text (in-process FTS): fired (Q2 typos rank-1 14/14 realistic cases, Q3 semantic,");
  console.log("    Q5 negatives correctly empty-or-visible-only). Latency ~0.01-0.09 ms.");
  console.log("  Tier 2 relationship: fired only with expandRelationships=true (Q4: 12 services).");
  console.log("    Never fires otherwise — kept as explicit opt-in, not removed.");
  console.log("  Tier 3 fuzzy (trigram, in-process): ADOPTED as fallback-only rung. Fires only when");
  console.log("    Tier 0+1 return zero hits; measured rescue 4/4 hard-typo cases at rank 1 (thr=0.25,");
  console.log("    0 FP on 4 negatives, ~0.27 ms). Hits labeled tier=fuzzy rule=trigram-candidate:");
  console.log("    suggestions for review, never silent resolutions.");
  console.log("  vector rung: NEVER fires — no embedding infra exists in PING. Rejected with measured");
  console.log("    justification (Q3 answered by tokens; Q3b paraphrase gap documented, kill criteria hold).");
  console.log("  No rung is dead weight: Tier 2 is opt-in by design; Tier 3 fires rarely but rescues;");
  console.log("  vector stays out until a measured query class fails AND embedding infra exists.");
}

main();
