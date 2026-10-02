/**
 * Transition log (P-20260923-099, I4): KNOWLEDGE_TRANSITIONED events make
 * knowledge-node lifecycle corrections replayable.
 *
 * Spec: ~/workspace/tenanos-wave/swarm-05/TRANSITION-LOG-SPEC.md (swarm-05).
 *
 * The promoter's lifecycle-write path (updateNodeBySourceEvent) overwrites
 * status/confidence in place, so prior lifecycle states are lost. This module
 * instruments that path: the promoter emits a KNOWLEDGE_TRANSITIONED event
 * FIRST, then applies the row update. If emission fails the row update must
 * not proceed (fail closed). The materialized row is a pure fold of the
 * ordered transition events for its node_id, so corrections are replayable
 * from the event log alone.
 *
 * Compatibility (verified against the integration branch):
 * - P-20260923-096 (integrated): re-emission on the graph-projection
 *   addNode conflict path must never demote lifecycle state. This module
 *   instruments exactly the promoter-owned path 096 protects; the
 *   refreshProjectionFields() adapter mirrors 096's ON CONFLICT clause
 *   (refreshes data/namespace/correlation_id/confidence_provenance, never
 *   status/confidence).
 * - P-20260923-102 (integrated): HTTP insert mints candidates only
 *   (status='candidate', confidence=null; caller-supplied values ignored;
 *   namespace required). mintCandidateNode() encodes that convention.
 * - P-20260923-009 (swarm-14, bitemporal supersession): 009 consumes the
 *   supersedes_node_id link; this module carries it and defines no second
 *   transition vocabulary.
 *
 * Precedented values (from the live gateway tree):
 * - approved <-> confidence 1.0, rejected <-> confidence 0.2
 *   (ping-runtime/knowledge/knowledge_promoter.js)
 * - candidate <-> confidence null (gateway/routes/knowledge.js, P-20260923-102)
 */

import { createHash } from "crypto";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const TRANSITION_EVENT_TYPE = "KNOWLEDGE_TRANSITIONED" as const;
export const TRANSITION_EVENT_SOURCE = "knowledge-promoter" as const;
export const TRANSITION_SCHEMA_VERSION = "1.0.0" as const;

/** Human-correction marker prefix required for backward transitions. */
export const CORRECTION_REASON_PREFIX = "correction:" as const;

/* ------------------------------------------------------------------ */
/* Status taxonomy                                                     */
/* ------------------------------------------------------------------ */

/**
 * Lifecycle status taxonomy. Ranks order lifecycle maturity; a transition
 * is BACKWARD when rank(to) < rank(from) and then requires an explicit
 * human-correction marker (reason starting with "correction:" plus a
 * non-empty actor).
 *
 * rejected ranks below approved: demoting a human-approved node is a
 * backward move (needs correction:wrong-approval style marker), while
 * rejecting a candidate is a forward resolution. superseded is terminal:
 * leaving it is backward. unknown sits below observed; the fold starts at
 * observed/null (spec: "initial = OBSERVED/UNKNOWN").
 */
export type LifecycleStatus =
  | "unknown"
  | "observed"
  | "candidate"
  | "rejected"
  | "approved"
  | "verified"
  | "superseded";

const LIFECYCLE_RANKS: Readonly<Record<LifecycleStatus, number>> = {
  unknown: -1,
  observed: 0,
  candidate: 1,
  rejected: 2,
  approved: 3,
  verified: 4,
  superseded: 5,
};

export const INITIAL_STATUS: LifecycleStatus = "observed";

function isLifecycleStatus(value: unknown): value is LifecycleStatus {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(LIFECYCLE_RANKS, value)
  );
}

export function lifecycleRank(status: LifecycleStatus): number {
  return LIFECYCLE_RANKS[status];
}

/** True when the transition moves to a lower maturity rank. */
export function isBackwardTransition(
  fromStatus: LifecycleStatus,
  toStatus: LifecycleStatus
): boolean {
  return LIFECYCLE_RANKS[toStatus] < LIFECYCLE_RANKS[fromStatus];
}

/* ------------------------------------------------------------------ */
/* Event shape                                                         */
/* ------------------------------------------------------------------ */

export interface TransitionPayload {
  readonly node_id: string;
  readonly from_status: LifecycleStatus;
  readonly to_status: LifecycleStatus;
  /** null is a value, not a missing field (e.g. candidate confidence). */
  readonly from_confidence: number | null;
  readonly to_confidence: number | null;
  /** Human/owner identity behind the transition. Required, non-empty. */
  readonly actor: string;
  readonly reason?: string;
  /**
   * For SUPERSEDED transitions: links the superseded node to its
   * replacement. Consumed by P-20260923-009's bitemporal model; this
   * module defines no second transition vocabulary around it.
   */
  readonly supersedes_node_id?: string;
  readonly schema_version: typeof TRANSITION_SCHEMA_VERSION;
}

/**
 * A foreign (non-transition) event. The store can hold these alongside
 * transition events (M1 holds SNIPPET_APPROVED rows, graph-projection
 * markers, etc.); they are never in the transition set, so reduce ignores
 * them. Kept structurally separate from TransitionEvent on purpose: a
 * fixed-shape payload is not a Record<string, unknown>, and conflating
 * them would weaken the transition contract.
 */
export interface RawEvent {
  readonly event_id: string;
  readonly event_type: string;
  readonly occurred_at: number;
  readonly payload: Record<string, unknown>;
}

export interface TransitionEvent {
  readonly event_id: string;
  readonly event_type: typeof TRANSITION_EVENT_TYPE;
  readonly source: typeof TRANSITION_EVENT_SOURCE;
  readonly namespace: string;
  readonly occurred_at: number;
  readonly payload: TransitionPayload;
}

/** Anything the event store may hold. */
export type StoredEvent = TransitionEvent | RawEvent;

export interface LifecycleState {
  readonly status: LifecycleStatus;
  readonly confidence: number | null;
  readonly event_count: number;
  readonly last_event_id: string | null;
}

/* ------------------------------------------------------------------ */
/* Errors (fail-closed, typed)                                         */
/* ------------------------------------------------------------------ */

export type TransitionRejectionCode =
  | "EMPTY_NODE_ID"
  | "EMPTY_NAMESPACE"
  | "EMPTY_ACTOR"
  | "UNKNOWN_STATUS"
  | "INVALID_EVENT"
  | "BACKWARD_TRANSITION_WITHOUT_CORRECTION"
  | "EMISSION_FAILED";

export class TransitionRejectedError extends Error {
  readonly code: TransitionRejectionCode;

  constructor(code: TransitionRejectionCode, message: string) {
    super(message);
    this.name = "TransitionRejectedError";
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Deterministic event identity                                        */
/* ------------------------------------------------------------------ */

/** Canonical JSON: sorted keys, null preserved, no whitespace. */
function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)
    );
    return (
      "{" +
      entries
        .map(([k, v]) => JSON.stringify(k) + ":" + canonicalJson(v))
        .join(",") +
      "}"
    );
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new TransitionRejectedError(
      "INVALID_EVENT",
      "event identity input contains an unserializable value"
    );
  }
  return encoded;
}

export interface TransitionIdentity {
  readonly namespace: string;
  readonly node_id: string;
  readonly to_status: LifecycleStatus;
  readonly to_confidence: number | null;
  readonly actor: string;
}

/**
 * Deterministic event_id over
 * {eventType, source, namespace, node_id, to_status, to_confidence, actor}
 * (spec: identity never depends on the timestamp, so the same human
 * decision re-emitted yields the same event and is idempotent).
 */
export function transitionEventId(identity: TransitionIdentity): string {
  const canonical = canonicalJson({
    actor: identity.actor,
    eventType: TRANSITION_EVENT_TYPE,
    namespace: identity.namespace,
    node_id: identity.node_id,
    source: TRANSITION_EVENT_SOURCE,
    to_confidence: identity.to_confidence,
    to_status: identity.to_status,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/* ------------------------------------------------------------------ */
/* Event construction + validation                                     */
/* ------------------------------------------------------------------ */

export interface TransitionInput {
  readonly node_id: string;
  readonly namespace: string;
  readonly from_status: LifecycleStatus;
  readonly to_status: LifecycleStatus;
  readonly from_confidence: number | null;
  readonly to_confidence: number | null;
  readonly actor: string;
  readonly reason?: string;
  readonly supersedes_node_id?: string;
}

function requireNonEmpty(
  value: string,
  code: TransitionRejectionCode,
  field: string
): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TransitionRejectedError(code, `${field} is required and non-empty`);
  }
}

function requireStatus(
  value: unknown,
  field: string
): asserts value is LifecycleStatus {
  if (!isLifecycleStatus(value)) {
    throw new TransitionRejectedError(
      "UNKNOWN_STATUS",
      `${field} is not in the lifecycle taxonomy: ${String(value)}`
    );
  }
}

/**
 * Build (but do not emit) a transition event. Validates fail-closed:
 * unknown statuses, empty node_id/namespace/actor, and backward
 * transitions without an explicit human-correction marker are rejected.
 *
 * from_status is provenance, not a chain link: the reduce fold is
 * last-event-wins by (occurred_at, event_id), so a stale from_status on a
 * concurrent promoter write does not corrupt the fold.
 */
export function buildTransitionEvent(
  input: TransitionInput,
  occurredAt: number
): TransitionEvent {
  requireNonEmpty(input.node_id, "EMPTY_NODE_ID", "node_id");
  requireNonEmpty(input.namespace, "EMPTY_NAMESPACE", "namespace");
  requireNonEmpty(input.actor, "EMPTY_ACTOR", "actor");
  requireStatus(input.from_status, "from_status");
  requireStatus(input.to_status, "to_status");

  if (isBackwardTransition(input.from_status, input.to_status)) {
    const marked =
      typeof input.reason === "string" &&
      input.reason.startsWith(CORRECTION_REASON_PREFIX) &&
      input.actor.trim().length > 0;
    if (!marked) {
      throw new TransitionRejectedError(
        "BACKWARD_TRANSITION_WITHOUT_CORRECTION",
        `backward transition ${input.from_status} -> ${input.to_status} requires ` +
          `an explicit human-correction marker (reason starting with ` +
          `"${CORRECTION_REASON_PREFIX}" and a non-empty actor)`
      );
    }
  }

  const eventId = transitionEventId({
    actor: input.actor,
    namespace: input.namespace,
    node_id: input.node_id,
    to_confidence: input.to_confidence,
    to_status: input.to_status,
  });

  const payload: TransitionPayload = {
    actor: input.actor,
    from_confidence: input.from_confidence,
    from_status: input.from_status,
    node_id: input.node_id,
    schema_version: TRANSITION_SCHEMA_VERSION,
    to_confidence: input.to_confidence,
    to_status: input.to_status,
  };
  const withOptionals: TransitionPayload =
    input.reason !== undefined || input.supersedes_node_id !== undefined
      ? {
          ...payload,
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
          ...(input.supersedes_node_id !== undefined
            ? { supersedes_node_id: input.supersedes_node_id }
            : {}),
        }
      : payload;

  return Object.freeze({
    event_id: eventId,
    event_type: TRANSITION_EVENT_TYPE,
    namespace: input.namespace,
    occurred_at: occurredAt,
    payload: Object.freeze(withOptionals),
    source: TRANSITION_EVENT_SOURCE,
  });
}

/** Narrow a stored event to a transition event (fail-closed hygiene). */
export function isTransitionEvent(event: StoredEvent): event is TransitionEvent {
  if (event.event_type !== TRANSITION_EVENT_TYPE) return false;
  const source = (event as unknown as { source?: unknown }).source;
  if (source !== TRANSITION_EVENT_SOURCE) return false;
  const payload = event.payload as Partial<TransitionPayload>;
  return (
    payload.schema_version === TRANSITION_SCHEMA_VERSION &&
    isLifecycleStatus(payload.to_status) &&
    isLifecycleStatus(payload.from_status) &&
    typeof payload.node_id === "string"
  );
}

/* ------------------------------------------------------------------ */
/* Store (M1 stand-in: append-only, content-identified)                */
/* ------------------------------------------------------------------ */

export interface EventStore {
  /** Append; duplicate event_id is a no-op (M1 DO NOTHING). Throws on failure. */
  append(event: StoredEvent): void;
  has(eventId: string): boolean;
  get(eventId: string): StoredEvent | undefined;
  /** All events mentioning node_id, ordered by (occurred_at, event_id). */
  eventsForNode(nodeId: string): StoredEvent[];
}

/** In-memory append-only store. Production target is M1 (append-only). */
export class InMemoryEventStore implements EventStore {
  private readonly byId = new Map<string, StoredEvent>();

  append(event: StoredEvent): void {
    if (!event || typeof event.event_id !== "string" || event.event_id === "") {
      throw new TransitionRejectedError("INVALID_EVENT", "cannot append event without an event_id");
    }
    if (this.byId.has(event.event_id)) return; // idempotent: duplicate is a no-op
    this.byId.set(event.event_id, event);
  }

  has(eventId: string): boolean {
    return this.byId.has(eventId);
  }

  get(eventId: string): StoredEvent | undefined {
    return this.byId.get(eventId);
  }

  eventsForNode(nodeId: string): StoredEvent[] {
    const matched: StoredEvent[] = [];
    for (const event of this.byId.values()) {
      const payloadNodeId: unknown = event.payload["node_id"];
      if (payloadNodeId === nodeId) matched.push(event);
    }
    matched.sort((a, b) =>
      a.occurred_at === b.occurred_at
        ? a.event_id < b.event_id
          ? -1
          : a.event_id > b.event_id
            ? 1
            : 0
        : a.occurred_at - b.occurred_at
    );
    return matched;
  }

  size(): number {
    return this.byId.size;
  }
}

/* ------------------------------------------------------------------ */
/* Row projection (the materialized M2 row writer)                     */
/* ------------------------------------------------------------------ */

/**
 * The materialized-row writer. In production this is the promoter's
 * updateNodeBySourceEvent call; here it is an injected seam so tests can
 * prove emission happens FIRST and never happens when emission fails.
 */
export interface RowProjection {
  applyTransition(event: TransitionEvent): void;
}

/* ------------------------------------------------------------------ */
/* TransitionLog: emit-first, fail-closed                              */
/* ------------------------------------------------------------------ */

export class TransitionLog {
  private readonly store: EventStore;
  private readonly projection: RowProjection;
  private readonly clock: () => number;

  constructor(store: EventStore, projection: RowProjection, clock?: () => number) {
    this.store = store;
    this.projection = projection;
    this.clock = clock ?? Date.now;
  }

  /**
   * Emit the KNOWLEDGE_TRANSITIONED event FIRST, then apply the row update.
   * Fail-closed: if emission throws, the row update never runs. Duplicate
   * re-emission (same event_id) is a no-op: the stored event is returned
   * without re-applying the projection.
   */
  transition(input: TransitionInput): TransitionEvent {
    const event = buildTransitionEvent(input, this.clock());

    const existing = this.store.get(event.event_id);
    if (existing !== undefined) {
      if (!isTransitionEvent(existing)) {
        throw new TransitionRejectedError(
          "INVALID_EVENT",
          `event_id collision with a non-transition event: ${event.event_id}`
        );
      }
      return existing; // duplicate: no-op, do not re-apply the row update
    }

    let emitted = false;
    try {
      this.store.append(event);
      emitted = true;
    } catch (err) {
      throw new TransitionRejectedError(
        "EMISSION_FAILED",
        `transition event emission failed; row update aborted: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // Emission succeeded: now (and only now) update the materialized row.
    if (emitted) {
      this.projection.applyTransition(event);
    }
    return event;
  }

  /** Ordered transition events for a node (full history recoverable from the log). */
  history(nodeId: string): TransitionEvent[] {
    return this.store.eventsForNode(nodeId).filter(isTransitionEvent);
  }

  /**
   * Pure fold: state(node_id) = fold of ordered KNOWLEDGE_TRANSITIONED
   * events, initial observed/null, apply = take to_status/to_confidence of
   * the last event. Non-transition events (e.g. the graph-projection
   * addNode conflict path, P0-fixed by 096) are not in the transition set
   * and can never alter lifecycle state.
   */
  reduce(nodeId: string): LifecycleState {
    const events = this.history(nodeId);
    let status: LifecycleStatus = INITIAL_STATUS;
    let confidence: number | null = null;
    let lastEventId: string | null = null;
    for (const event of events) {
      status = event.payload.to_status;
      confidence = event.payload.to_confidence;
      lastEventId = event.event_id;
    }
    return {
      confidence,
      event_count: events.length,
      last_event_id: lastEventId,
      status,
    };
  }
}

/* ------------------------------------------------------------------ */
/* 102 convention: HTTP insert mints candidates only                   */
/* ------------------------------------------------------------------ */

export interface MintNodeInput {
  readonly node_id: string;
  readonly node_type: string;
  readonly label: string;
  readonly data: unknown;
  readonly namespace: string;
  readonly entity_type?: string;
  readonly entity_id?: string;
  /**
   * Caller-supplied lifecycle fields, as the pre-102 route accepted them.
   * They are ignored: inserts mint candidates only.
   */
  readonly callerStatus?: unknown;
  readonly callerConfidence?: unknown;
}

export interface MintedNode {
  readonly node_id: string;
  readonly node_type: string;
  readonly label: string;
  readonly data: unknown;
  readonly namespace: string;
  readonly entity_type?: string;
  readonly entity_id?: string;
  readonly status: "candidate";
  readonly confidence: null;
}

/**
 * Mirror of gateway/routes/knowledge.js POST /nodes after P-20260923-102:
 * inserts mint status='candidate'/confidence=null; caller-supplied
 * status/confidence are dropped; namespace is required (privacy boundary).
 */
export function mintCandidateNode(input: MintNodeInput): MintedNode {
  requireNonEmpty(input.node_id, "EMPTY_NODE_ID", "node_id");
  requireNonEmpty(
    input.namespace,
    "EMPTY_NAMESPACE",
    "namespace (privacy boundary)"
  );
  const minted: MintedNode = {
    confidence: null,
    data: input.data,
    label: input.label,
    namespace: input.namespace,
    node_id: input.node_id,
    node_type: input.node_type,
    status: "candidate",
  };
  return input.entity_type !== undefined || input.entity_id !== undefined
    ? {
        ...minted,
        ...(input.entity_type !== undefined
          ? { entity_type: input.entity_type }
          : {}),
        ...(input.entity_id !== undefined ? { entity_id: input.entity_id } : {}),
      }
    : minted;
}

/* ------------------------------------------------------------------ */
/* 096 convention: conflict path refreshes data, never lifecycle state */
/* ------------------------------------------------------------------ */

export interface MaterializedNodeRow {
  node_id: string;
  status: LifecycleStatus;
  confidence: number | null;
  data: unknown;
  namespace: string;
  correlation_id?: string;
  confidence_provenance?: unknown;
  updated_at?: number;
}

export interface ProjectionRefresh {
  readonly data?: unknown;
  readonly namespace?: string;
  readonly correlation_id?: string;
  readonly confidence_provenance?: unknown;
  /**
   * Lifecycle fields a buggy caller might pass (the pre-096 ON CONFLICT
   * clause wrote status here). They are dropped and reported, never
   * written: status is promoter-owned via the transition log.
   */
  readonly status?: LifecycleStatus;
  readonly confidence?: number | null;
}

/**
 * Mirror of ping-runtime/knowledge/knowledge_graph.js addNode after
 * P-20260923-096: ON CONFLICT DO UPDATE SET data, namespace,
 * correlation_id, confidence_provenance (status NOT in the SET clause).
 * Lifecycle fields in the refresh input are dropped and reported; the
 * row's status/confidence are never touched by this path.
 */
export function refreshProjectionFields(
  row: MaterializedNodeRow,
  refresh: ProjectionRefresh,
  clock?: () => number
): { row: MaterializedNodeRow; dropped: string[] } {
  const dropped: string[] = [];
  const next: MaterializedNodeRow = { ...row };
  if (refresh.data !== undefined) next.data = refresh.data;
  if (refresh.namespace !== undefined) next.namespace = refresh.namespace;
  if (refresh.correlation_id !== undefined)
    next.correlation_id = refresh.correlation_id;
  if (refresh.confidence_provenance !== undefined)
    next.confidence_provenance = refresh.confidence_provenance;
  if (refresh.status !== undefined) dropped.push("status");
  if (refresh.confidence !== undefined) dropped.push("confidence");
  next.updated_at = (clock ?? Date.now)();
  return { row: next, dropped };
}
