/**
 * Lane F spike: retrieval.
 *
 * Tier 0 exact identity matching first, then Tier 1 BM25-lite text scoring,
 * then optional one-hop relationship expansion. Visibility filtering happens
 * INSIDE the scan loop, before any scoring, so scores and positions never
 * encode objects the viewer may not see. Total deterministic order follows
 * the feed-rank convention: score desc, eventTime desc, id asc.
 */

import type { BuiltIndex } from "./index.ts";
import type { RankedHit, SearchableObject, SearchRequest, SearchResponse, Viewer } from "./types.ts";
import { normalizeName, normalizePhone, normalizeSourceIdentity, normalizeUrl, tokenize } from "./normalize.ts";
import { TRIGRAM_THRESHOLD, scoreTrigram } from "./trigram.ts";

// Fixed, documented scoring constants. Boring on purpose.
//
// Tier 1 uses graded presence scoring, NOT BM25: score = sum over matched
// query tokens of idf(token) * maxFieldGrade(token) * schemaBoost. Term
// frequency is deliberately ignored: repetition is the cheapest manipulation
// available to ingested content (RT1), so the ranker must not reward it.
// Presence + field grade + idf captures relevance without a gameable counter.
const SCHEMA_BOOST: Record<string, number> = {
  "ping.social.business@1": 1.5,
  "ping.social.service@1": 1.2,
  "ping.social.post@1": 1.0,
};
const RELATIONSHIP_HOP_PENALTY = 0.5;

// Tier 0 rule order. Lower number = higher rank.
const TIER0_RULES: Array<{ rule: string; rank: number }> = [
  { rule: "exact-id", rank: 0 },
  { rule: "exact-url", rank: 1 },
  { rule: "exact-phone", rank: 2 },
  { rule: "exact-source", rank: 3 },
  { rule: "exact-name", rank: 4 },
];
const TIER0_BASE_SCORE = 1000;

function schemaBoost(schema: string): number {
  return SCHEMA_BOOST[schema] ?? 1.0;
}

/**
 * Visibility gate. Pure function of (object, viewer). Returns true when the
 * viewer may see the object. Tenant mismatch and hidden visibility are hard
 * denials; owner visibility requires the owner grant.
 */
export function maySee(o: SearchableObject, viewer: Viewer): boolean {
  if (o.tenantId !== viewer.tenantId) return false;
  if (o.visibility === "hidden") return false;
  if (o.visibility === "owner") {
    return viewer.grants.includes(`owner:read:${o.tenantId}`);
  }
  return true;
}

function schemaAllowed(o: SearchableObject, query: SearchRequest["query"]): boolean {
  if (!query.schema || query.schema.length === 0) return true;
  return query.schema.includes(o.schema);
}

interface Candidate {
  id: string;
  score: number;
  components: Record<string, number>;
  tier: "exact" | "text" | "relationship" | "fuzzy";
  rule: string;
  eventTime: string;
}

/** One-hop relationship expansion over seed candidates. Deterministic:
 * seeds iterate in candidate insertion order, edges are id-sorted at
 * build time, consider() gates every expanded object. Returns the number
 * of expanded candidates added. */
function expandOneHop(
  index: BuiltIndex,
  consider: (o: SearchableObject) => boolean,
  candidates: Map<string, Candidate>,
): number {
  const seeds = [...candidates.values()];
  let added = 0;
  for (const seed of seeds) {
    const edges = index.adjacency.get(seed.id) ?? [];
    for (const e of edges) {
      if (candidates.has(e.targetId)) continue;
      const o = index.objects.get(e.targetId);
      if (!o || !consider(o)) continue;
      const s = seed.score * RELATIONSHIP_HOP_PENALTY;
      added++;
      candidates.set(e.targetId, {
        id: e.targetId,
        score: s,
        components: { text: seed.score, hopPenalty: RELATIONSHIP_HOP_PENALTY },
        tier: "relationship",
        rule: `via_relationship:${e.predicate}`,
        eventTime: o.eventTime,
      });
    }
  }
  return added;
}

/** Feed-rank ordering: score desc, eventTime desc, id asc. Total order. */
function compareCandidates(a: Candidate, b: Candidate): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.eventTime !== b.eventTime) return a.eventTime < b.eventTime ? 1 : -1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function search(index: BuiltIndex, req: SearchRequest): SearchResponse {
  const limit = Math.max(1, Math.min(50, Math.floor(req.limit) || 10));
  const q = req.query;
  const candidates = new Map<string, Candidate>();
  let totalCandidates = 0;

  const consider = (o: SearchableObject): boolean => {
    // Visibility + tenant + schema gate: inside the scan loop, before scoring.
    return maySee(o, req.viewer) && schemaAllowed(o, q);
  };

  // ---- Tier 0: exact identity matching (full equality only, never prefix)
  const tier0Hits: Array<{ ids: string[]; rule: string; rank: number }> = [];
  if (q.id && index.byId.has(q.id)) {
    tier0Hits.push({ ids: [q.id], rule: "exact-id", rank: 0 });
  }
  const nUrl = normalizeUrl(q.url);
  if (nUrl && index.byUrl.has(nUrl)) {
    tier0Hits.push({ ids: index.byUrl.get(nUrl)!, rule: "exact-url", rank: 1 });
  }
  const nPhone = normalizePhone(q.phone);
  if (nPhone && index.byPhone.has(nPhone)) {
    tier0Hits.push({ ids: index.byPhone.get(nPhone)!, rule: "exact-phone", rank: 2 });
  }
  if (q.sourceIdentity) {
    const nSrc = normalizeSourceIdentity(q.sourceIdentity.provider, q.sourceIdentity.providerId);
    if (nSrc && index.bySource.has(nSrc)) {
      tier0Hits.push({ ids: index.bySource.get(nSrc)!, rule: "exact-source", rank: 3 });
    }
  }
  if (q.text) {
    const nName = normalizeName(q.text);
    const key = `${req.tenantId}|${nName}`;
    if (nName && index.byName.has(key)) {
      tier0Hits.push({ ids: index.byName.get(key)!, rule: "exact-name", rank: 4 });
    }
  }

  if (tier0Hits.length > 0) {
    // Best (lowest-rank) rule wins; ties across ids break by id asc.
    tier0Hits.sort((a, b) => a.rank - b.rank);
    const best = tier0Hits[0];
    const score = TIER0_BASE_SCORE - best.rank;
    const ids = [...best.ids].sort();
    for (const id of ids) {
      const o = index.objects.get(id);
      if (!o || !consider(o)) continue;
      totalCandidates++;
      candidates.set(id, {
        id,
        score,
        components: { tier0: score, ruleRank: best.rank },
        tier: "exact",
        rule: best.rule,
        eventTime: o.eventTime,
      });
    }
    // All Tier-0 hits were invisible to this viewer: fall through to
    // Tier 1 instead of returning empty. Returning empty here would make
    // the response differ from the no-identity-match case, letting the
    // hidden object's existence be read from the difference (RT6a oracle).
    // The fall-through makes "hidden identity match" indistinguishable
    // from "no identity match".
    if (candidates.size > 0) {
      // Tier 0 seeds are also expansion seeds: "services of X" must work
      // when X resolves by exact name, not only via the text path.
      if (q.expandRelationships) {
        totalCandidates += expandOneHop(index, consider, candidates);
      }
      return finalize(index, req, candidates, totalCandidates, limit);
    }
  }

  // ---- Tier 1: BM25-lite text scoring over the inverted index
  if (q.text) {
    const tokens = tokenize(q.text);
    const scores = new Map<string, { score: number; text: number }>();
    for (const tok of tokens) {
      const list = index.postings.get(tok);
      if (!list) continue;
      const df = index.docFreq.get(tok) ?? 1;
      const idf = Math.log(1 + (index.docCount - df + 0.5) / (df + 0.5));
      for (const p of list) {
        const o = index.objects.get(p.id);
        if (!o || !consider(o)) continue;
        const boost = schemaBoost(o.schema);
        const s = idf * p.grade * boost;
        const cur = scores.get(p.id);
        if (cur) {
          cur.score += s;
          cur.text += s;
        } else {
          scores.set(p.id, { score: s, text: s });
        }
      }
    }
    for (const [id, sc] of scores) {
      const o = index.objects.get(id)!;
      totalCandidates++;
      candidates.set(id, {
        id,
        score: sc.score,
        components: { text: sc.text, schemaBoost: schemaBoost(o.schema) },
        tier: "text",
        rule: "graded-match",
        eventTime: o.eventTime,
      });
    }
  }

  // ---- Tier 3 (fallback ONLY): trigram fuzzy-name candidates
  // Structural fire condition: Tier 0 and Tier 1 returned zero candidates.
  // Measured (proof.ts Q2/Q2b): realistic 1-char typos are already ranked
  // #1 by Tier 1, so this rung adds nothing there; it rescues only the
  // hard-typo zero-hit cases (4/4 at rank 1, 0 FP, thr=0.25). Hits are
  // labeled tier "fuzzy" rule "trigram-candidate": suggestions for review,
  // never silent resolutions. Same consider() gate as every other rung.
  if (q.text && candidates.size === 0) {
    const scored = scoreTrigram(index.trigramEntries, q.text);
    for (const s of scored) {
      if (s.sim < TRIGRAM_THRESHOLD) break;
      if (candidates.size >= limit) break;
      const o = index.objects.get(s.id);
      if (!o || !consider(o)) continue;
      totalCandidates++;
      candidates.set(s.id, {
        id: s.id,
        score: s.sim,
        components: { trigramJaccard: s.sim, threshold: TRIGRAM_THRESHOLD },
        tier: "fuzzy",
        rule: "trigram-candidate",
        eventTime: o.eventTime,
      });
    }
  }

  // ---- Tier 2 (optional): one-hop relationship expansion, penalized
  // Seeds are whatever Tier 0/1/3 found (Tier 0 seeds were expanded above).
  if (q.expandRelationships) {
    totalCandidates += expandOneHop(index, consider, candidates);
  }

  return finalize(index, req, candidates, totalCandidates, limit);
}

function finalize(
  index: BuiltIndex,
  req: SearchRequest,
  candidates: Map<string, Candidate>,
  totalCandidates: number,
  limit: number,
): SearchResponse {
  const ordered = [...candidates.values()].sort(compareCandidates).slice(0, limit);
  const hits: RankedHit[] = ordered.map((c) => ({
    objectId: c.id,
    tier: c.tier,
    rule: c.rule,
    score: c.score,
    scoreComponents: c.components,
    eventTime: c.eventTime,
  }));
  return { hits, totalCandidates, indexDigest: index.digest };
}
