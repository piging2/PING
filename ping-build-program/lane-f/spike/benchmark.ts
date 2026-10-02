/**
 * Lane F spike: benchmark.
 *
 * Runs the ground-truth query set against the built index:
 * - Tier 0 accuracy (identity queries must resolve at rank 1)
 * - recall@k for text queries against the generator's relevance sets
 * - latency p50/p99 per query over many runs
 * - negative queries must return empty, never a hallucinated best-effort hit
 *
 * Usage: node benchmark.ts
 */

import { performance } from "node:perf_hooks";
import { buildIndex } from "./index.ts";
import { search } from "./retrieve.ts";
import { generateCorpus } from "./corpus.ts";
import type { SearchRequest } from "./types.ts";

const NOW = "2026-09-23T19:00:00.000Z";
const TENANT = "tenant-a";

function baseRequest(text?: string): SearchRequest {
  return {
    tenantId: TENANT,
    viewer: { id: "viewer-1", tenantId: TENANT, grants: [] },
    query: text ? { text } : {},
    limit: 10,
    nowIso: NOW,
  };
}

function recallAtK(rankedIds: string[], relevant: Set<string>, k: number): number {
  if (relevant.size === 0) return 1;
  const top = rankedIds.slice(0, k);
  let hit = 0;
  for (const id of top) if (relevant.has(id)) hit++;
  return hit / Math.min(k, relevant.size);
}

export function runBenchmark(): Record<string, unknown> {
  const { objects, truth } = generateCorpus();
  const t0 = performance.now();
  const index = buildIndex(objects);
  const buildMs = performance.now() - t0;

  const results: Record<string, unknown> = {
    corpusSize: objects.length,
    buildMs: Math.round(buildMs * 100) / 100,
    indexDigest: index.digest,
  };

  // Fill the "generic trade" ground truth from the corpus itself.
  const treeServiceIds = objects
    .filter((o) => o.tenantId === TENANT && o.schema === "ping.social.business@1" && o.name.includes("Tree Service"))
    .map((o) => o.id);
  for (const tq of truth.textQueries) {
    if (tq.label === "generic trade") {
      tq.relevantIds = treeServiceIds;
      tq.bestId = treeServiceIds[0] ?? "";
    }
  }

  // ---- Tier 0 identity accuracy
  let tier0Ok = 0;
  const tier0Detail: string[] = [];
  for (const iq of truth.identityQueries) {
    const req = baseRequest();
    const q = iq.query as Record<string, unknown>;
    if (q["id"]) req.query.id = q["id"] as string;
    if (q["url"]) req.query.url = q["url"] as string;
    if (q["phone"]) req.query.phone = q["phone"] as string;
    if (q["text"]) req.query.text = q["text"] as string;
    if (q["sourceIdentity"]) {
      req.query.sourceIdentity = q["sourceIdentity"] as { provider: string; providerId: string };
    }
    const res = search(index, req);
    const top = res.hits[0]?.objectId ?? null;
    const ok = top === iq.expectId && res.hits[0]?.tier === "exact";
    if (ok) tier0Ok++;
    else tier0Detail.push(`${iq.label}: expected ${iq.expectId}, got ${top} (${res.hits[0]?.rule ?? "none"})`);
  }
  results["tier0"] = { passed: tier0Ok, total: truth.identityQueries.length, failures: tier0Detail };

  // ---- Text recall@k
  const ks = [1, 3, 5, 10];
  const recallSums: Record<number, number> = { 1: 0, 3: 0, 5: 0, 10: 0 };
  let bestAtRank1 = 0;
  const textDetail: string[] = [];
  for (const tq of truth.textQueries) {
    const req = baseRequest(tq.text);
    const res = search(index, req);
    const ranked = res.hits.map((h) => h.objectId);
    const relevant = new Set(tq.relevantIds);
    for (const k of ks) recallSums[k] += recallAtK(ranked, relevant, k);
    if (tq.bestId && ranked[0] === tq.bestId) bestAtRank1++;
    else if (tq.bestId) textDetail.push(`${tq.label}: best=${tq.bestId} rank=${ranked.indexOf(tq.bestId)} top=${ranked[0] ?? "none"}`);
  }
  const nText = truth.textQueries.length;
  results["text"] = {
    queries: nText,
    recall: Object.fromEntries(ks.map((k) => [`@${k}`, Math.round((recallSums[k] / nText) * 1000) / 1000])),
    bestAtRank1: `${bestAtRank1}/${truth.textQueries.filter((t) => t.bestId).length}`,
    notes: textDetail,
  };

  // ---- Negative queries: must be empty
  let negOk = 0;
  const negDetail: string[] = [];
  for (const nq of truth.negativeQueries) {
    const res = search(index, baseRequest(nq.text));
    if (res.hits.length === 0) negOk++;
    else negDetail.push(`${nq.label}: got ${res.hits.length} hits, top=${res.hits[0].objectId}`);
  }
  results["negative"] = { passed: negOk, total: truth.negativeQueries.length, failures: negDetail };

  // ---- Latency: 1000 runs over the full query set
  const allReqs: SearchRequest[] = [
    ...truth.identityQueries.map(() => baseRequest("Coppersmith Plumbing & HVAC")),
    ...truth.textQueries.map((t) => baseRequest(t.text)),
  ];
  const lat: number[] = [];
  for (let i = 0; i < 1000; i++) {
    for (const r of allReqs) {
      const s = performance.now();
      search(index, r);
      lat.push(performance.now() - s);
    }
  }
  lat.sort((a, b) => a - b);
  const pct = (p: number) => Math.round(lat[Math.floor((p / 100) * lat.length)] * 1000) / 1000;
  results["latencyMs"] = { runs: lat.length, p50: pct(50), p99: pct(99), max: Math.round(lat[lat.length - 1] * 1000) / 1000 };

  // ---- Determinism: same request twice => identical hit order and digest
  const d1 = search(index, baseRequest("plumbing grand junction"));
  const d2 = search(index, baseRequest("plumbing grand junction"));
  const sameOrder =
    d1.hits.length === d2.hits.length &&
    d1.hits.every((h, i) => h.objectId === d2.hits[i].objectId && h.score === d2.hits[i].score);
  const index2 = buildIndex(generateCorpus().objects);
  results["determinism"] = {
    sameRequestSameOrder: sameOrder,
    sameDigestOnRebuild: index.digest === index2.digest,
  };

  return results;
}

const out = runBenchmark();
console.log(JSON.stringify(out, null, 2));
