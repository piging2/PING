/**
 * FB-B — Facebook connector lane: Graph API surface constants.
 *
 * The single place that knows Meta's wire shape. Everything else in this
 * lane (adapter, envelope, compiler) speaks only in terms of the EdgeSpec
 * abstraction below, so adding a new read edge (e.g. facebook.conversations
 * for Messenger, which needs the `pages_messaging` scope this lane does NOT
 * request) is a stream-descriptor + EdgeSpec addition, never new machinery.
 *
 * Endpoint intel is cross-checked against
 * ping-build-program/fleet/work/fleet-con-1/social-meta.md (the harvest does
 * not own this file; this file is the connector's working copy and carries
 * the version constant FB-A's research confirms).
 */

import { FailureCode } from '../../../ping-build-program/lane-bcq/kit/types';

/** Graph API version. Overridable per config; default is the current pinned version. */
export const GRAPH_API_VERSION = 'v26.0';

export const GRAPH_BASE = 'https://graph.facebook.com';

export function graphBaseUrl(version: string = GRAPH_API_VERSION): string {
  return `${GRAPH_BASE}/${version}`;
}

/** Field sets: least privilege on the wire, not "everything available". */
export const PAGE_FIELDS =
  'id,name,about,category_list,phone,website,single_line_address,location,hours,verification_status,link';
export const POST_FIELDS =
  'id,message,story,created_time,updated_time,permalink_url,from,type,status_type,shares,comments.summary(true),likes.summary(true)';
export const COMMENT_FIELDS =
  'id,message,created_time,updated_time,from,like_count,comment_count,parent,is_hidden,message_tags';

export interface EdgeSpec {
  /** Stream-local edge name, e.g. 'feed' or 'comments'. */
  name: string;
  /** Provider object kind on this edge, for the source envelope. */
  objectType: 'page' | 'post' | 'comment';
  /** Capability string the adapter passes to fetchRaw (M2: declared, never probed). */
  capability: string;
  /** Build the edge URL for a parent object id. Cursor is opaque: echoed verbatim. */
  urlFor(base: string, parentId: string, opts: { after?: string; since?: string; limit: number }): string;
}

function qs(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export const PAGE_EDGE: EdgeSpec = {
  name: 'page',
  objectType: 'page',
  capability: 'read.page',
  urlFor: (base, parentId) => `${base}/${encodeURIComponent(parentId)}?${qs({ fields: PAGE_FIELDS })}`,
};

export const FEED_EDGE: EdgeSpec = {
  name: 'feed',
  objectType: 'post',
  capability: 'read.page-posts',
  urlFor: (base, parentId, opts) =>
    `${base}/${encodeURIComponent(parentId)}/feed?${qs({
      fields: POST_FIELDS,
      limit: String(opts.limit),
      ...(opts.after ? { after: opts.after } : {}),
      ...(opts.since ? { since: opts.since } : {}),
    })}`,
};

export const COMMENTS_EDGE: EdgeSpec = {
  name: 'comments',
  objectType: 'comment',
  capability: 'read.post-comments',
  urlFor: (base, parentId, opts) =>
    `${base}/${encodeURIComponent(parentId)}/comments?${qs({
      fields: COMMENT_FIELDS,
      filter: 'toplevel',
      order: 'chronological',
      limit: String(opts.limit),
      ...(opts.after ? { after: opts.after } : {}),
      ...(opts.since ? { since: opts.since } : {}),
    })}`,
};

/**
 * Extension hook: Messenger conversations live behind the `pages_messaging`
 * scope, which this connector does NOT request (least privilege; see
 * manifest). When a future manifest revision adds `read.conversations`,
 * this EdgeSpec slots into the same readEdge machinery with zero new code:
 * the cursor/checkpoint, envelope, idempotency, and failure paths are all
 * edge-agnostic.
 */
export const CONVERSATIONS_EDGE: EdgeSpec = {
  name: 'conversations',
  objectType: 'comment', // conversation messages map to the comment-ish envelope; refined on implementation
  capability: 'read.conversations', // NOT in the v1 manifest: declaring obliges conformance
  urlFor: (base, parentId, opts) =>
    `${base}/${encodeURIComponent(parentId)}/conversations?${qs({
      fields: 'id,updated_time,message_count,participants,messages{id,message,created_time,from}',
      limit: String(opts.limit),
      ...(opts.after ? { after: opts.after } : {}),
      ...(opts.since ? { since: opts.since } : {}),
    })}`,
};

/* ------------------------------------------------------------------ */
/* Wire shapes (minimal: only the fields we read)                      */
/* ------------------------------------------------------------------ */

export interface GraphPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
}

export interface GraphEdgeResponse<T> {
  data: T[];
  paging?: GraphPaging;
}

export interface GraphErrorBody {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface GraphErrorEnvelope {
  error: GraphErrorBody;
}

/* ------------------------------------------------------------------ */
/* Failure taxonomy: Graph API errors -> lane K FailureCode.           */
/* The connector never invents its own failure vocabulary.             */
/* ------------------------------------------------------------------ */

/** Graph error codes that mean "slow down", never "try harder". */
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
/** Graph error codes/subcodes that mean "you may not". */
const PERMISSION_SUBCODES = new Set([458, 460, 463, 467]);

export interface ClassifiedFailure {
  failureCode: FailureCode;
  /** Terminal or retryable-with-backoff. */
  disposition: 'retry' | 'terminal';
  reason: string;
}

export function classifyGraphFailure(status: number, body: string): ClassifiedFailure {
  if (status === 429) {
    return {
      failureCode: FailureCode.RATE_LIMITED,
      disposition: 'terminal',
      reason: 'http-429: provider rate limit; honor Retry-After, report up',
    };
  }
  if (status === 408) {
    return {
      failureCode: FailureCode.TIMEOUT,
      disposition: 'retry',
      reason: 'http-408: request timeout',
    };
  }
  if (status >= 500 && status <= 599) {
    // Contract §5: ambiguous 5xx. Read-only, but the response is
    // authoritative about nothing; bounded retry then OUTCOME_UNKNOWN.
    return {
      failureCode: FailureCode.TRANSIENT,
      disposition: 'retry',
      reason: `http-${status}: ambiguous server error`,
    };
  }
  let parsed: GraphErrorEnvelope | null = null;
  try {
    parsed = JSON.parse(body) as GraphErrorEnvelope;
  } catch {
    // not JSON at all: malformed-response
  }
  const err = parsed?.error;
  if (err && typeof err.code === 'number') {
    if (err.code === 190) {
      return {
        failureCode: FailureCode.AUTH_EXPIRED,
        disposition: 'terminal',
        reason: `graph-190: OAuth token invalid/expired (${err.message.slice(0, 120)})`,
      };
    }
    if (RATE_LIMIT_CODES.has(err.code)) {
      return {
        failureCode: FailureCode.RATE_LIMITED,
        disposition: 'terminal',
        reason: `graph-${err.code}: application/page rate limit`,
      };
    }
    if (
      err.code === 10 ||
      err.code === 200 ||
      (err.error_subcode !== undefined && PERMISSION_SUBCODES.has(err.error_subcode))
    ) {
      return {
        failureCode: FailureCode.PERMISSION_DENIED,
        disposition: 'terminal',
        reason: `graph-${err.code}${err.error_subcode ? `/${err.error_subcode}` : ''}: permission denied`,
      };
    }
    if (err.code >= 100 && err.code < 200) {
      return {
        failureCode: FailureCode.INVALID_PAYLOAD,
        disposition: 'terminal',
        reason: `graph-${err.code}: invalid parameter/object`,
      };
    }
  }
  if (status >= 400 && status <= 499) {
    return {
      failureCode: FailureCode.PERMANENT,
      disposition: 'terminal',
      reason: `http-${status}: non-retryable client error`,
    };
  }
  return {
    failureCode: FailureCode.INVALID_PAYLOAD,
    disposition: 'terminal',
    reason: 'malformed-response: body did not parse as a Graph edge response',
  };
}

/* ------------------------------------------------------------------ */
/* Retry policy (contract §5: max 3 attempts per fetch, never infinite) */
/* ------------------------------------------------------------------ */

export const MAX_ATTEMPTS = 3;
export const BASE_DELAY_MS = 2000;
export const MAX_DELAY_MS = 30_000;

/** Deterministic jitter: decorrelated without randomness (testable). */
export function jitterMs(attempt: number): number {
  return (attempt * 137) % 500;
}

export function backoffDelayMs(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
  return Math.min(MAX_DELAY_MS, exp + jitterMs(attempt));
}

/** Honor the provider's Retry-After when present (seconds or HTTP-date). */
export function retryAfterMs(headers: Record<string, string>): number | null {
  const raw = headers['retry-after'] ?? headers['Retry-After'];
  if (!raw) return null;
  const secs = Number(raw);
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs, 300) * 1000;
  return null;
}
