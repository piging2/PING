/**
 * Lane F spike: shared types for the deterministic object retrieval layer.
 *
 * Erasable TypeScript only (interfaces + type aliases), so node runs it
 * with no build step and no dependencies.
 */

export type Visibility = "public" | "owner" | "hidden";

export interface SearchableObject {
  id: string;
  tenantId: string;
  schema: string;
  name: string;
  description: string;
  extra: string[];
  url: string | null;
  phone: string | null;
  sourceIdentity: { provider: string; providerId: string } | null;
  visibility: Visibility;
  relationships: Array<{ predicate: string; targetId: string }>;
  eventTime: string; // ISO 8601, used for recency tiebreak ordering
}

export interface Viewer {
  id: string | null;
  tenantId: string;
  grants: string[]; // grantsForViewer-style strings, e.g. "owner:read:<tenantId>"
}

export interface SearchQuery {
  text?: string;
  id?: string;
  url?: string;
  phone?: string;
  sourceIdentity?: { provider: string; providerId: string };
  schema?: string[];
  expandRelationships?: boolean;
}

export interface SearchRequest {
  tenantId: string;
  viewer: Viewer;
  query: SearchQuery;
  limit: number;
  nowIso: string; // pinned clock: same corpus + same request => same ordering
}

// "fuzzy" is the experimental candidate-producer tier (trigram experiment,
// lane-f wave 2). It fires ONLY when Tier 0 and Tier 1 return zero hits;
// hits are labeled suggestions (trigram-candidate), never resolutions.
export type HitTier = "exact" | "text" | "relationship" | "fuzzy";

export interface RankedHit {
  objectId: string;
  tier: HitTier;
  rule: string; // e.g. "exact-url", "bm25", "via_relationship:offers"
  score: number;
  scoreComponents: Record<string, number>;
  eventTime: string;
}

export interface SearchResponse {
  hits: RankedHit[];
  totalCandidates: number;
  indexDigest: string; // sha256 of (corpus digest + layer version)
}
