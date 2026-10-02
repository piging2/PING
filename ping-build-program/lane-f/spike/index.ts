/**
 * Lane F spike: index build.
 *
 * The index is a pure projection of a frozen object set. Rebuild, never
 * mutate. Two builds of the same corpus produce the same indexDigest byte
 * for byte (postings id-sorted at build time, canonical JSON hashing).
 */

import { createHash } from "node:crypto";
import type { SearchableObject } from "./types.ts";
import { normalizeName, normalizePhone, normalizeSourceIdentity, normalizeUrl, tokenize } from "./normalize.ts";
import { buildTrigramIndex, type TrigramEntry } from "./trigram.ts";

export const LAYER_VERSION = "object-search-v2"; // v2: Tier 3 trigram fallback rung added

export const FIELD_GRADES: Record<string, number> = {
  name: 4.0,
  description: 1.0,
  extra: 0.5,
};

export interface Posting {
  id: string;
  grade: number; // max field grade this token reached in this object
  field: string; // the field where the max grade was reached
}

export interface BuiltIndex {
  version: string;
  digest: string;
  docCount: number;
  avgDocLen: number;
  objects: Map<string, SearchableObject>;
  byId: Map<string, string>; // id -> id (equality check)
  byUrl: Map<string, string[]>; // normalized url -> ids (id-sorted)
  byPhone: Map<string, string[]>;
  byName: Map<string, string[]>; // normalized name -> ids, per tenant key
  bySource: Map<string, string[]>; // provider|providerId -> ids
  postings: Map<string, Posting[]>; // token -> postings (id-sorted)
  docFreq: Map<string, number>; // token -> number of docs containing it
  docLen: Map<string, number>; // id -> weighted token count
  adjacency: Map<string, Array<{ predicate: string; targetId: string }>>;
  trigramEntries: TrigramEntry[]; // id-sorted, for the Tier 3 fuzzy fallback
}

function pushSorted(map: Map<string, string[]>, key: string, id: string): void {
  if (!key) return;
  const arr = map.get(key);
  if (arr) {
    arr.push(id);
    arr.sort();
  } else {
    map.set(key, [id]);
  }
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(rec[k])}`).join(",")}}`;
  }
  return "null";
}

export function buildIndex(objects: SearchableObject[]): BuiltIndex {
  const byId = new Map<string, string>();
  const byUrl = new Map<string, string[]>();
  const byPhone = new Map<string, string[]>();
  const byName = new Map<string, string[]>();
  const bySource = new Map<string, string[]>();
  const objs = new Map<string, SearchableObject>();
  const adjacency = new Map<string, Array<{ predicate: string; targetId: string }>>();

  // Token accumulation per object before postings are finalized.
  // Per token we keep ONLY the max field grade, never a cross-field sum:
  // repeating a token in extra text must not amplify its weight (RT1).
  const termStats = new Map<string, Map<string, { grade: number; field: string }>>();
  const docLen = new Map<string, number>();
  let totalLen = 0;

  // Deterministic insertion order: sort objects by id first.
  const sorted = [...objects].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  for (const o of sorted) {
    objs.set(o.id, o);
    byId.set(o.id, o.id);
    pushSorted(byUrl, normalizeUrl(o.url), o.id);
    pushSorted(byPhone, normalizePhone(o.phone), o.id);
    pushSorted(byName, `${o.tenantId}|${normalizeName(o.name)}`, o.id);
    if (o.sourceIdentity) {
      pushSorted(
        bySource,
        normalizeSourceIdentity(o.sourceIdentity.provider, o.sourceIdentity.providerId),
        o.id,
      );
    }
    adjacency.set(
      o.id,
      [...o.relationships].sort((a, b) =>
        a.predicate < b.predicate ? -1 : a.predicate > b.predicate ? 1 : a.targetId < b.targetId ? -1 : 1,
      ),
    );

    const tokenMap = new Map<string, { grade: number; field: string }>();
    const fields: Array<{ grade: string; text: string }> = [
      { grade: "name", text: o.name },
      { grade: "description", text: o.description },
    ];
    for (const e of o.extra) fields.push({ grade: "extra", text: e });

    let len = 0;
    for (const f of fields) {
      const grade = FIELD_GRADES[f.grade] ?? 1.0;
      for (const tok of tokenize(f.text)) {
        len += 1;
        const cur = tokenMap.get(tok);
        // Max grade only: cross-field repetition never amplifies weight.
        if (!cur || grade > cur.grade) tokenMap.set(tok, { grade, field: f.grade });
      }
    }
    termStats.set(o.id, tokenMap);
    docLen.set(o.id, len);
    totalLen += len;
  }

  const postings = new Map<string, Posting[]>();
  const docFreq = new Map<string, number>();
  for (const [id, tokenMap] of termStats) {
    for (const [tok, stat] of tokenMap) {
      const list = postings.get(tok);
      const p: Posting = { id, grade: stat.grade, field: stat.field };
      if (list) list.push(p);
      else postings.set(tok, [p]);
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
    }
  }
  // Postings were accumulated in id-sorted object order, so they are
  // already id-sorted; enforce it explicitly for the digest guarantee.
  for (const list of postings.values()) {
    list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  const docCount = sorted.length;
  const avgDocLen = docCount === 0 ? 0 : totalLen / docCount;

  // Trigram entries are a pure deterministic function of (id, normalized
  // name). The indexDigest changes via the LAYER_VERSION bump above, so
  // replay consumers (lane G's digests.searchIndex) can tell v1 and v2
  // corpora apart even on identical object sets.
  const trigramEntries = buildTrigramIndex(sorted.map((o) => ({ id: o.id, name: o.name })));

  const digestInput = {
    layer: LAYER_VERSION,
    normalizer: "lane-f-spike-v1",
    docCount,
    avgDocLen,
    ids: sorted.map((o) => o.id),
    tokens: [...postings.keys()].sort(),
  };
  const digest = createHash("sha256").update(canonicalize(digestInput), "utf8").digest("hex");

  return {
    version: LAYER_VERSION,
    digest,
    docCount,
    avgDocLen,
    objects: objs,
    byId,
    byUrl,
    byPhone,
    byName,
    bySource,
    postings,
    docFreq,
    docLen,
    adjacency,
    trigramEntries,
  };
}
