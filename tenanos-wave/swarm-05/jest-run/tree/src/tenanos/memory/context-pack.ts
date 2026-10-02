/**
 * context-pack.ts — minimal memory-to-worker context pack assembler (swarm-05).
 *
 * Pipeline stage: RETRIEVAL -> CONTEXT PACK -> WORKER.
 * Pure function: ranked retrieval results in, worker-safe pack out. No I/O,
 * no events, no store writes. This is NOT a store, NOT an orchestrator,
 * NOT an authority. Promotion authority stays with the memory owner.
 *
 * Enforces the converged-pipeline contract (CONVERGED-PIPELINE.md):
 *  - I3: rank_score is presentation-only and dies here. The pack carries
 *        {text, status, confidence, confidence_provenance, evidence, verified}
 *        and nothing rank-derived. confidence is never fabricated
 *        (null stays null); verified is a strict boolean from the evidence
 *        trace, never inferred from rank.
 *  - I5: tenant boundary re-enforced. Items whose namespace does not equal
 *        the requested tenant are dropped and counted, never passed through.
 *
 * Alignment: pack_id uses the `pack:<sha256-16>` format from S18-11
 * (swarm-18 owns the manifest/version surface; this assembler consumes that
 * format and does not redefine it). The pack does not carry rank order as
 * data: input order is preserved and that is the only ordering signal.
 */

import { createHash } from 'crypto';

export const CONTEXT_PACK_SCHEMA_VERSION = '1.0.0' as const;

export const DEFAULT_MAX_ITEMS = 12;
export const DEFAULT_MAX_CHARS_PER_ITEM = 2000;

/**
 * One ranked hit from the retrieval front door (HybridSearch results after
 * EvidenceAuthority.rank). Extra legs may add fields; everything not listed
 * on PackItem is dropped.
 */
export interface RetrievalItem {
  id?: string;
  text?: string | null;
  label?: string | null;
  status?: string | null;
  confidence?: number | null;
  confidence_provenance?: string | null;
  evidence?: unknown;
  verified?: unknown;
  namespace?: string | null;
  /** Presentation-only score. Always dropped (I3). */
  rank_score?: unknown;
  /** Raw semantic score. Always dropped (I3). */
  score?: unknown;
  [key: string]: unknown;
}

/** Worker-safe pack item. Closed shape: nothing rank-derived survives. */
export interface PackItem {
  text: string;
  status: string;
  confidence: number | null;
  confidence_provenance: string | null;
  evidence: string[];
  verified: boolean;
  truncated: boolean;
}

export interface AssembleOptions {
  /** Required tenant namespace, e.g. 'tenant::hpp'. Fail-closed: empty throws. */
  tenant: string;
  maxItems?: number;
  maxCharsPerItem?: number;
}

export interface ContextPack {
  pack_id: string;
  schema_version: typeof CONTEXT_PACK_SCHEMA_VERSION;
  tenant: string;
  /** ISO-8601 UTC. Recording time only; NOT part of pack_id. */
  created_at: string;
  item_count: number;
  dropped_cross_namespace: number;
  items: PackItem[];
  budgets: { maxItems: number; maxCharsPerItem: number };
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Deterministic pack identity over the tenant and the exact item payload.
 * Key order is fixed by construction (no JSON.stringify key-order dependence).
 */
export function packIdFor(tenant: string, items: PackItem[]): string {
  const canonical = JSON.stringify([
    tenant,
    items.map((it) => [
      it.text,
      it.status,
      it.confidence,
      it.confidence_provenance,
      it.evidence,
      it.verified,
    ]),
  ]);
  return 'pack:' + sha256Hex(canonical).slice(0, 16);
}

function coerceEvidence(evidence: unknown): string[] {
  if (!Array.isArray(evidence)) return [];
  return evidence.filter((e): e is string => typeof e === 'string' && e.length > 0);
}

function toPackItem(item: RetrievalItem, maxCharsPerItem: number): PackItem {
  const rawText = item.text ?? item.label ?? '';
  const text = typeof rawText === 'string' ? rawText : String(rawText);
  const truncated = text.length > maxCharsPerItem;
  return {
    text: truncated ? text.slice(0, maxCharsPerItem) : text,
    status: typeof item.status === 'string' && item.status.length > 0 ? item.status : 'unknown',
    // I3: null confidence stays null. Never fabricate a number.
    confidence: typeof item.confidence === 'number' ? item.confidence : null,
    confidence_provenance:
      typeof item.confidence_provenance === 'string' ? item.confidence_provenance : null,
    evidence: coerceEvidence(item.evidence),
    // I3: verified is a strict boolean from the evidence trace.
    // Truthy-but-not-true (1, 'yes', null from an unverified leg) is false.
    verified: item.verified === true,
    truncated,
  };
}

/**
 * Assemble a worker context pack from ranked retrieval results.
 * Pure: does not mutate its input. Input order (rank order) is preserved.
 */
export function assembleContextPack(
  results: RetrievalItem[],
  options: AssembleOptions
): ContextPack {
  const tenant = options.tenant;
  if (!tenant || typeof tenant !== 'string') {
    throw new Error('assembleContextPack: options.tenant is required (I5: no tenant-ambiguous packs)');
  }
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxCharsPerItem = options.maxCharsPerItem ?? DEFAULT_MAX_CHARS_PER_ITEM;
  if (!Number.isInteger(maxItems) || maxItems < 0) {
    throw new Error('assembleContextPack: maxItems must be a non-negative integer');
  }
  if (!Number.isInteger(maxCharsPerItem) || maxCharsPerItem <= 0) {
    throw new Error('assembleContextPack: maxCharsPerItem must be a positive integer');
  }

  let dropped_cross_namespace = 0;
  const items: PackItem[] = [];
  for (const result of results || []) {
    if (result.namespace !== tenant) {
      dropped_cross_namespace++;
      continue;
    }
    items.push(toPackItem(result, maxCharsPerItem));
    if (items.length >= maxItems) break;
  }

  return {
    pack_id: packIdFor(tenant, items),
    schema_version: CONTEXT_PACK_SCHEMA_VERSION,
    tenant,
    created_at: new Date().toISOString(),
    item_count: items.length,
    dropped_cross_namespace,
    items,
    budgets: { maxItems, maxCharsPerItem },
  };
}
