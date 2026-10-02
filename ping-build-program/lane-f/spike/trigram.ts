/**
 * Lane F spike: trigram fuzzy-name rung (pure similarity machinery).
 *
 * Evaluated on EXISTING infra (in-process runtime; PING has no pg_trgm,
 * no SQLite, no FTS service). Measurement (proof.ts Q2/Q2b, factory
 * fixture graph):
 *   - realistic 1-char typos: Tier 1 FTS already ranks the target #1 in
 *     14/14 cases -> the cheaper rung SUFFICES, trigram adds nothing.
 *   - hard typos (every token corrupted, Tier 0+1 return zero hits):
 *     trigram at threshold 0.25 rescues 4/4 at rank 1, 0 false positives
 *     on 4 unrelated negatives, ~0.27 ms/query.
 *
 * Verdict: ADOPTED as a fallback-only rung. It fires ONLY when Tier 0 and
 * Tier 1 return zero candidates (structural, in retrieve.ts), and its hits
 * are labeled tier "fuzzy" rule "trigram-candidate": suggestions for
 * review, never silent auto-resolutions (resolve-spike precedent: fuzzy
 * is an ambiguity signal, not an identity decision).
 */

import { normalizeName } from "./normalize.ts";

/** Measured operating point: 100% rescue recall, 0 FP on negatives. */
export const TRIGRAM_THRESHOLD = 0.25;

function trigrams(s: string): Set<string> {
  const set = new Set<string>();
  const padded = `  ${s} `;
  for (let i = 0; i + 3 <= padded.length; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface TrigramEntry {
  id: string;
  grams: Set<string>;
}

/** Deterministic: entries id-sorted. Pure function of normalized names. */
export function buildTrigramIndex(idsAndNames: Array<{ id: string; name: string }>): TrigramEntry[] {
  return idsAndNames
    .map((o) => ({ id: o.id, grams: trigrams(normalizeName(o.name)) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Score all entries against a raw query name. Returns (id, similarity)
 * sorted by similarity desc, id asc. No visibility logic here: the caller
 * (retrieve.ts) applies the same consider() gate as every other rung.
 */
export function scoreTrigram(entries: TrigramEntry[], queryName: string): Array<{ id: string; sim: number }> {
  const qg = trigrams(normalizeName(queryName));
  const scored: Array<{ id: string; sim: number }> = [];
  for (const e of entries) {
    const sim = jaccard(qg, e.grams);
    if (sim > 0) scored.push({ id: e.id, sim });
  }
  scored.sort((a, b) => (a.sim !== b.sim ? b.sim - a.sim : a.id < b.id ? -1 : 1));
  return scored;
}
