/**
 * TenantOS Verification Engine — evidence constructors (swarm-16, P-20260923-089)
 *
 * Evidence is minted, not asserted. Each constructor performs the actual
 * inspection (schema walk, hash recompute, authoritative re-read) and
 * returns a check carrying the resulting grade. A bare `success: true`
 * in a tool payload is grade 'asserted' at best — which can never verify.
 */
import { createHash } from 'node:crypto';
import type { EvidenceCheck, EvidenceCheckKind } from './types.ts';

export type SchemaField = 'string' | 'number' | 'boolean' | 'object';

function matchesSchema(payload: unknown, schema: Record<string, SchemaField>): boolean {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  for (const [key, kind] of Object.entries(schema)) {
    const value = record[key];
    if (kind === 'object') {
      if (typeof value !== 'object' || value === null) return false;
    } else if (typeof value !== kind) {
      return false;
    }
  }
  return true;
}

export interface SchemaMatchInput {
  checkId: string;
  claimId: string;
  nonce: string;
  observedAtMs: number;
  payload: unknown;
  schema: Record<string, SchemaField>;
}

/**
 * Grade 'observed': the returned payload was actually inspected against the
 * expected shape. Passing a tool's self-reported `success: true` through
 * here does NOT help it — the schema must describe the claimed effect.
 */
export function schemaMatchEvidence(input: SchemaMatchInput): EvidenceCheck {
  const passed = matchesSchema(input.payload, input.schema);
  return {
    checkId: input.checkId,
    claimId: input.claimId,
    kind: 'schema-match',
    grade: 'observed',
    passed,
    observedAtMs: input.observedAtMs,
    nonce: input.nonce,
    detail: passed ? 'payload matches expected schema' : 'payload does not match expected schema',
  };
}

export interface HashRecomputeInput {
  checkId: string;
  claimId: string;
  nonce: string;
  observedAtMs: number;
  bytes: Uint8Array | string;
  expectedHex: string;
}

/**
 * Grade 'recomputed': sha256 is recomputed here, over the actual bytes,
 * and compared to the claimed digest. Detects corrupted or substituted
 * artifacts that a mere `verified: true` flag would miss.
 */
export function hashRecomputeEvidence(input: HashRecomputeInput): EvidenceCheck {
  const actual = createHash('sha256').update(input.bytes).digest('hex');
  const passed = actual.toLowerCase() === input.expectedHex.toLowerCase();
  return {
    checkId: input.checkId,
    claimId: input.claimId,
    kind: 'hash-recompute',
    grade: 'recomputed',
    passed,
    observedAtMs: input.observedAtMs,
    nonce: input.nonce,
    detail: passed ? `sha256 recompute matches ${actual.slice(0, 16)}…` : `digest mismatch: recomputed ${actual.slice(0, 16)}…`,
  };
}

export interface RequeryInput<T> {
  checkId: string;
  claimId: string;
  kind: Extract<EvidenceCheckKind, 'requery' | 'journal-readback'>;
  nonce: string;
  observedAtMs: number;
  /** re-read the authoritative source NOW, not the tool's echo of it */
  read: () => T | null | undefined;
  /** does the re-read state carry the claimed effect? */
  matches: (value: T) => boolean;
  describe?: (value: T) => string;
}

/**
 * Grade 'attested': the authoritative record (journal, store, filesystem)
 * is re-read and the claimed effect is found in it. This is the substrate
 * form of the attestation-gate pattern (C4 failure-honesty): the record
 * must actually carry the state before success is reported.
 */
export function requeryEvidence<T>(input: RequeryInput<T>): EvidenceCheck {
  const value = input.read();
  const passed = value !== null && value !== undefined && input.matches(value);
  return {
    checkId: input.checkId,
    claimId: input.claimId,
    kind: input.kind,
    grade: 'attested',
    passed,
    observedAtMs: input.observedAtMs,
    nonce: input.nonce,
    detail:
      value === null || value === undefined
        ? 'authoritative re-read returned nothing: effect not present'
        : passed
          ? `authoritative re-read carries the effect${input.describe ? `: ${input.describe(value)}` : ''}`
          : 'authoritative re-read does not match the claimed effect',
  };
}

export interface InvariantInput {
  checkId: string;
  claimId: string;
  nonce: string;
  observedAtMs: number;
  /** pure predicate over the actual result data */
  predicate: () => boolean;
  detail?: string;
}

/** Grade 'observed': a pure invariant evaluated against real data. */
export function invariantEvidence(input: InvariantInput): EvidenceCheck {
  const passed = input.predicate();
  return {
    checkId: input.checkId,
    claimId: input.claimId,
    kind: 'invariant',
    grade: 'observed',
    passed,
    observedAtMs: input.observedAtMs,
    nonce: input.nonce,
    detail: input.detail ?? (passed ? 'invariant holds' : 'invariant violated'),
  };
}
