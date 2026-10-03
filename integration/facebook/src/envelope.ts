/**
 * FB-B — Facebook connector: source envelope.
 *
 * Every record this connector emits carries this envelope, mapping the
 * connector contract §2 provenance envelope onto the task's required source
 * identity fields. The envelope answers: WHERE did this observation come
 * from, WHOSE grant made it visible, and WHAT provider state was it read
 * under — without inventing canonical identity (contract §2.5: a Facebook
 * page id is a link record, never a PING business object id).
 *
 * Principal: the named party that granted access (Nolan's bootstrap
 * identity). It is read from the connector config at call time; it is NEVER
 * hardcoded here and never fabricated. Tests pass an explicit fixture
 * principal; production resolves it from config/env by the host.
 */
import { sha256Hex } from '../../../ping-build-program/lane-bcq/kit/harness';
import { CursorState, Provenance } from '../../../ping-build-program/lane-bcq/kit/types';

export interface SourceEnvelope {
  source_system: 'facebook';
  /** The connected Page id: the account context the grant authorizes. */
  source_account: string;
  source_object_type: 'page' | 'post' | 'comment';
  /** The provider's own id for the record. */
  source_object_id: string;
  /** Provider version marker: updated_time, else created_time, else ''. */
  source_version: string;
  /** When we fetched it (ISO-8601). */
  observed_at: string;
  /** When we emitted it (ISO-8601). */
  ingested_at: string;
  /** Named party that granted access; config-resolved, never fabricated. */
  principal: string;
  /** Envelope namespace: keeps facebook envelopes unambiguous in mixed pipelines. */
  namespace: 'ping:facebook';
  /** sha256 of the verbatim record JSON bytes (replayable raw evidence). */
  raw_payload_hash: string;
  /** The opaque cursor state this record was read under; null on full_refresh. */
  cursor: CursorState | null;
}

export interface EnvelopeInput {
  sourceAccount: string;
  sourceObjectType: 'page' | 'post' | 'comment';
  sourceObjectId: string;
  sourceVersion: string;
  observedAt: string;
  ingestedAt: string;
  principal: string;
  rawRecordJson: string;
  cursor: CursorState | null;
}

export function buildSourceEnvelope(input: EnvelopeInput): SourceEnvelope {
  return {
    source_system: 'facebook',
    source_account: input.sourceAccount,
    source_object_type: input.sourceObjectType,
    source_object_id: input.sourceObjectId,
    source_version: input.sourceVersion,
    observed_at: input.observedAt,
    ingested_at: input.ingestedAt,
    principal: input.principal,
    namespace: 'ping:facebook',
    raw_payload_hash: `sha256:${sha256Hex(input.rawRecordJson)}`,
    cursor: input.cursor ? { ...input.cursor } : null,
  };
}

/** Contract §2 provenance envelope derived from the same facts. */
export function provenanceFor(
  envelope: SourceEnvelope,
  fetchAttemptId: string,
  connectorVersion: string,
): Provenance {
  return {
    provider: 'facebook',
    sourceRecordId: envelope.source_object_id,
    fetchedAt: envelope.observed_at,
    fetchAttemptId,
    connectorVersion,
    rawEvidenceRef: `raw:${envelope.raw_payload_hash}`,
  };
}

/** The provider's own record version: updated_time > created_time > ''. */
export function sourceVersionOf(record: Record<string, unknown>): string {
  const updated = record['updated_time'];
  const created = record['created_time'];
  if (typeof updated === 'string' && updated.length > 0) return updated;
  if (typeof created === 'string' && created.length > 0) return created;
  return '';
}
