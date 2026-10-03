/**
 * FB-B — Facebook connector: compiler leg.
 *
 * Facebook provider semantics -> PING canonical OBSERVATION CANDIDATES.
 *
 * DELIBERATE STOP: this leg ends at observation candidates. It does NOT
 * emit canonical events. The program's event-authority question (phase0) is
 * still converging: who sequences, hashes, and persists canonical events is
 * undecided by design, and a connector that minted canonical events would
 * fork that authority. The observation candidate is the honest boundary:
 * typed, graded, provenance-carrying, and explicitly pre-canonical.
 *
 * Confidence grading follows the connector contract §2.1:
 * - DIRECT: Meta asserts this about the Page itself (page fields, post
 *   metadata, comment timestamps/authors as recorded by the provider).
 * - INFERRED: anything computed from text (prospect-reply intent, topic
 *   extraction). Third-party comment text is hostile input; its factual
 *   content is at most INFERRED (contract §3).
 * - UNKNOWN: missing provider data, never defaulted.
 */
import { Confidence } from '../../../ping-build-program/lane-bcq/kit/types';
import { SourceEnvelope } from './envelope';

export type CandidateKind =
  | 'page-profile'
  | 'page-post'
  | 'post-comment'
  /** A comment whose author is NOT the Page: the prospect-reply surface. */
  | 'prospect-reply-signal';

/**
 * An observation candidate: the compiler's output. It is NOT a canonical
 * event, carries no sequence number, no canonical hash, no persistence
 * claim. The event authority (when converged) decides what becomes an
 * event; this type refuses to decide.
 */
export interface ObservationCandidate {
  candidate_kind: CandidateKind;
  /** Graded link to the provider record; never canonical identity (§2.5). */
  subject_ref: string;
  source_envelope: SourceEnvelope;
  confidence: Confidence;
  /** Rule id / method for DERIVED/INFERRED; omitted for DIRECT. */
  confidence_method?: string;
  /** Plain-text summary, sanitized at the ingestion boundary. */
  summary: string;
  /** Minimal Facebook semantics, typed for downstream compilers. */
  normalized: Record<string, unknown>;
  /** Field-level grades where confidence is not uniform. */
  field_confidence?: Record<string, Confidence>;
}

function fromRef(from: unknown): { id: string; name: string } | null {
  if (from && typeof from === 'object') {
    const f = from as Record<string, unknown>;
    if (typeof f['id'] === 'string') {
      return { id: f['id'], name: typeof f['name'] === 'string' ? f['name'] : '' };
    }
  }
  return null;
}

/** page fields -> page-profile candidate. All provider-asserted: DIRECT. */
export function compilePage(
  record: Record<string, unknown>,
  envelope: SourceEnvelope,
): ObservationCandidate {
  const name = typeof record['name'] === 'string' ? record['name'] : '';
  return {
    candidate_kind: 'page-profile',
    subject_ref: `facebook:page:${envelope.source_object_id}`,
    source_envelope: envelope,
    confidence: Confidence.DIRECT,
    summary: name,
    normalized: {
      name,
      about: record['about'] ?? null,
      category_list: record['category_list'] ?? null,
      phone: record['phone'] ?? null,
      website: record['website'] ?? null,
      single_line_address: record['single_line_address'] ?? null,
      verification_status: record['verification_status'] ?? null,
      link: record['link'] ?? null,
    },
  };
}

/** post fields -> page-post candidate. Metadata DIRECT; message text graded per-field. */
export function compilePost(
  record: Record<string, unknown>,
  envelope: SourceEnvelope,
): ObservationCandidate {
  const message = typeof record['message'] === 'string' ? record['message'] : '';
  return {
    candidate_kind: 'page-post',
    subject_ref: `facebook:post:${envelope.source_object_id}`,
    source_envelope: envelope,
    confidence: Confidence.DIRECT,
    summary: message.slice(0, 280),
    normalized: {
      message: message || null,
      story: record['story'] ?? null,
      created_time: record['created_time'] ?? null,
      updated_time: record['updated_time'] ?? null,
      permalink_url: record['permalink_url'] ?? null,
      type: record['type'] ?? null,
      status_type: record['status_type'] ?? null,
      author: fromRef(record['from']),
      engagement: {
        comments: summaryCount(record['comments']),
        likes: summaryCount(record['likes']),
        shares: typeof (record['shares'] as Record<string, unknown> | undefined)?.['count'] === 'number'
          ? ((record['shares'] as Record<string, unknown>)['count'] as number)
          : null,
      },
    },
    // The provider asserts the message EXISTS (DIRECT); what it MEANS is not
    // provider-asserted. Downstream text consumers re-grade as INFERRED.
    field_confidence: { message_text_meaning: Confidence.UNKNOWN },
  };
}

/**
 * comment fields -> post-comment candidate, or prospect-reply-signal when the
 * author is not the Page itself. The prospect-reply surface is the
 * high-value read target: replies to PING Social content from real people.
 * Reply INTENT is never graded above INFERRED; the comment's existence,
 * author, and timestamps are provider-recorded facts (DIRECT).
 */
export function compileComment(
  record: Record<string, unknown>,
  envelope: SourceEnvelope,
  pageId: string,
): ObservationCandidate {
  const author = fromRef(record['from']);
  const message = typeof record['message'] === 'string' ? record['message'] : '';
  const isPageAuthor = author !== null && author.id === pageId;
  const parent = record['parent'];
  const parentRef =
    parent && typeof parent === 'object' && typeof (parent as Record<string, unknown>)['id'] === 'string'
      ? `facebook:comment:${(parent as Record<string, unknown>)['id']}`
      : null;
  return {
    candidate_kind: isPageAuthor ? 'post-comment' : 'prospect-reply-signal',
    subject_ref: `facebook:comment:${envelope.source_object_id}`,
    source_envelope: envelope,
    confidence: Confidence.DIRECT,
    summary: message.slice(0, 280),
    normalized: {
      message: message || null,
      created_time: record['created_time'] ?? null,
      updated_time: record['updated_time'] ?? null,
      author,
      is_page_author: isPageAuthor,
      like_count: record['like_count'] ?? null,
      comment_count: record['comment_count'] ?? null,
      is_hidden: record['is_hidden'] ?? null,
      parent_comment_ref: parentRef,
    },
    field_confidence: {
      // Third-party comment text is hostile input (contract §3): factual
      // claims inside it are at most INFERRED, and reply INTENT (prospect vs
      // passerby, interest vs noise) is INFERRED with an explicit method.
      message_factual_content: Confidence.INFERRED,
      reply_intent: Confidence.INFERRED,
    },
    confidence_method: isPageAuthor ? undefined : 'fb-author-is-not-page',
  };
}

function summaryCount(edge: unknown): number | null {
  if (edge && typeof edge === 'object') {
    const s = (edge as Record<string, unknown>)['summary'];
    if (s && typeof s === 'object' && typeof (s as Record<string, unknown>)['total_count'] === 'number') {
      return (s as Record<string, unknown>)['total_count'] as number;
    }
  }
  return null;
}
