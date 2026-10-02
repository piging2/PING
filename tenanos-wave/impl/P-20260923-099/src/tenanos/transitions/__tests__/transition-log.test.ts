/**
 * Tests for src/tenanos/transitions/transition-log.ts (P-20260923-099, I4).
 *
 * Proves: deterministic content-identified event_id (idempotent re-emission);
 * emit-first/fail-closed ordering (row update never runs when emission
 * fails); the spec's I4 acceptance test (candidate -> approved ->
 * rejected with correction marker, replayed out of order with a duplicate
 * and an interleaved non-transition event); backward transitions without a
 * correction marker are rejected; and the 096/102 conventions
 * (mint-candidates-only, conflict path never writes lifecycle state).
 */

import {
  CORRECTION_REASON_PREFIX,
  InMemoryEventStore,
  INITIAL_STATUS,
  isBackwardTransition,
  isTransitionEvent,
  mintCandidateNode,
  refreshProjectionFields,
  TRANSITION_EVENT_SOURCE,
  TRANSITION_EVENT_TYPE,
  TRANSITION_SCHEMA_VERSION,
  TransitionEvent,
  TransitionInput,
  TransitionLog,
  TransitionRejectedError,
  transitionEventId,
  buildTransitionEvent,
  LifecycleStatus,
  RawEvent,
  RowProjection,
  StoredEvent,
} from "../transition-log";

/* ------------------------------------------------------------------ */
/* Fakes                                                                */
/* ------------------------------------------------------------------ */

function manualClock(start = 1_000_000): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

/** Records the call order of sink appends vs projection applies. */
class OrderRecordingStore extends InMemoryEventStore {
  readonly order: string[] = [];

  append(event: StoredEvent): void {
    this.order.push(`append:${event.event_id.slice(0, 8)}`);
    super.append(event);
  }
}

class RecordingProjection implements RowProjection {
  readonly applied: TransitionEvent[] = [];
  readonly order: string[];

  constructor(order: string[]) {
    this.order = order;
  }

  applyTransition(event: TransitionEvent): void {
    this.order.push(`apply:${event.event_id.slice(0, 8)}`);
    this.applied.push(event);
  }
}

class FailingStore extends InMemoryEventStore {
  append(_event: StoredEvent): void {
    throw new Error("M1 unavailable");
  }
}

function baseInput(overrides: Partial<TransitionInput> = {}): TransitionInput {
  return {
    actor: "owner: Nolan",
    from_confidence: null,
    from_status: "candidate",
    namespace: "tenant::redlands",
    node_id: "node-1",
    to_confidence: 1.0,
    to_status: "approved",
    ...overrides,
  };
}

function setup() {
  const clock = manualClock();
  const store = new OrderRecordingStore();
  const order: string[] = store.order;
  const projection = new RecordingProjection(order);
  const log = new TransitionLog(store, projection, clock.now);
  return { clock, log, order, projection, store };
}

/* ------------------------------------------------------------------ */
/* Deterministic identity / idempotency                                 */
/* ------------------------------------------------------------------ */

describe("transition event identity", () => {
  it("is deterministic: the same human decision re-emitted yields the same event_id", () => {
    const clock = manualClock();
    const id1 = transitionEventId({
      actor: "owner: Nolan",
      namespace: "tenant::redlands",
      node_id: "node-1",
      to_confidence: 1.0,
      to_status: "approved",
    });
    clock.advance(60_000);
    const id2 = transitionEventId({
      actor: "owner: Nolan",
      namespace: "tenant::redlands",
      node_id: "node-1",
      to_confidence: 1.0,
      to_status: "approved",
    });
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("distinguishes decisions: different to_status / actor / confidence change the id", () => {
    const base = {
      actor: "owner: Nolan",
      namespace: "tenant::redlands",
      node_id: "node-1",
      to_confidence: 1.0,
      to_status: "approved" as LifecycleStatus,
    };
    const ids = new Set([
      transitionEventId(base),
      transitionEventId({ ...base, to_status: "rejected", to_confidence: 0.2 }),
      transitionEventId({ ...base, actor: "owner: someone-else" }),
      transitionEventId({ ...base, namespace: "tenant::other" }),
    ]);
    expect(ids.size).toBe(4);
  });

  it("treats null confidence as a value (candidate identity is stable)", () => {
    const id1 = transitionEventId({
      actor: "owner: Nolan",
      namespace: "tenant::redlands",
      node_id: "node-1",
      to_confidence: null,
      to_status: "candidate",
    });
    const id2 = transitionEventId({
      actor: "owner: Nolan",
      namespace: "tenant::redlands",
      node_id: "node-1",
      to_confidence: null,
      to_status: "candidate",
    });
    expect(id1).toBe(id2);
  });

  it("duplicate re-emission is a no-op: store keeps one event, projection applied once", () => {
    const { log, projection, store } = setup();
    const first = log.transition(baseInput());
    const second = log.transition(baseInput());
    expect(second.event_id).toBe(first.event_id);
    expect(store.size()).toBe(1);
    expect(projection.applied).toHaveLength(1);
    expect(log.reduce("node-1").event_count).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Emit-first / fail-closed                                             */
/* ------------------------------------------------------------------ */

describe("emit-first / fail-closed", () => {
  it("emits before applying the row update", () => {
    const { log, order } = setup();
    const event = log.transition(baseInput());
    const tag = event.event_id.slice(0, 8);
    expect(order).toEqual([`append:${tag}`, `apply:${tag}`]);
  });

  it("never applies the row update when emission fails", () => {
    const store = new FailingStore();
    const applied: TransitionEvent[] = [];
    const projection: RowProjection = {
      applyTransition: (event) => {
        applied.push(event);
      },
    };
    const log = new TransitionLog(store, projection, manualClock().now);

    let caught: unknown = null;
    try {
      log.transition(baseInput());
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TransitionRejectedError);
    expect((caught as TransitionRejectedError).code).toBe("EMISSION_FAILED");
    expect(applied).toHaveLength(0);
    expect(store.size()).toBe(0);
  });

  it("carries the required event shape (type, source, namespace, schema, actor)", () => {
    const { log } = setup();
    const event = log.transition(baseInput({ reason: "owner correction" }));
    expect(event.event_type).toBe(TRANSITION_EVENT_TYPE);
    expect(event.source).toBe(TRANSITION_EVENT_SOURCE);
    expect(event.namespace).toBe("tenant::redlands");
    expect(event.payload.schema_version).toBe(TRANSITION_SCHEMA_VERSION);
    expect(event.payload.actor).toBe("owner: Nolan");
    expect(event.payload.node_id).toBe("node-1");
    expect(event.payload.from_status).toBe("candidate");
    expect(event.payload.to_status).toBe("approved");
    expect(event.payload.from_confidence).toBeNull();
    expect(event.payload.to_confidence).toBe(1.0);
  });
});

/* ------------------------------------------------------------------ */
/* I4 acceptance test (from TRANSITION-LOG-SPEC.md)                     */
/* ------------------------------------------------------------------ */

describe("I4 acceptance: replayable lifecycle corrections", () => {
  it("candidate -> approved -> rejected(correction) replays to rejected/0.2", () => {
    const clock = manualClock();
    const store = new InMemoryEventStore();
    const applied: TransitionEvent[] = [];
    const log = new TransitionLog(store, { applyTransition: (e) => applied.push(e) }, clock.now);

    // Step 1: emit the transitions in order.
    const t1 = log.transition(
      baseInput({ from_status: "candidate", to_status: "approved", from_confidence: null, to_confidence: 1.0 })
    );
    clock.advance(1000);
    const t2 = log.transition(
      baseInput({
        from_status: "approved",
        to_status: "rejected",
        from_confidence: 1.0,
        to_confidence: 0.2,
        reason: "correction:wrong-approval",
      })
    );

    // Step 2: replay out of order, with a duplicate of the first event and
    // an interleaved non-transition re-emission (graph-projection addNode
    // conflict path, P0-fixed by 096).
    const replayStore = new InMemoryEventStore();
    const nonTransition: RawEvent = {
      event_id: "graph-upsert-node-1",
      event_type: "GRAPH_NODE_UPSERTED",
      occurred_at: t1.occurred_at + 500,
      payload: { node_id: "node-1", status: "candidate" },
    };
    replayStore.append(t2); // out of order: newest first
    replayStore.append(nonTransition); // not a transition event
    replayStore.append(t1);
    replayStore.append(t1); // duplicate re-emission: no-op

    const replayLog = new TransitionLog(replayStore, { applyTransition: () => undefined }, clock.now);

    // Step 3: final reduced state == last human transition (rejected, 0.2);
    // full ordered history recoverable from the log alone.
    const state = replayLog.reduce("node-1");
    expect(state.status).toBe("rejected");
    expect(state.confidence).toBe(0.2);
    expect(state.event_count).toBe(2);

    const history = replayLog.history("node-1");
    expect(history.map((e) => e.payload.to_status)).toEqual(["approved", "rejected"]);
    expect(history.map((e) => e.event_id)).toEqual([t1.event_id, t2.event_id]);
    expect(history[0]?.occurred_at).toBeLessThan(history[1]?.occurred_at ?? 0);
  });

  it("orders out-of-order delivery by timestamp, then event_id as tiebreak", () => {
    const store = new InMemoryEventStore();
    const log = new TransitionLog(store, { applyTransition: () => undefined }, manualClock().now);
    const at = 5_000_000;
    const e1 = buildTransitionEvent(
      baseInput({ to_status: "approved", to_confidence: 1.0 }),
      at
    );
    const e2 = buildTransitionEvent(
      baseInput({ from_status: "approved", from_confidence: 1.0, to_status: "verified", to_confidence: 1.0 }),
      at // same timestamp: tiebreak decides
    );
    store.append(e2);
    store.append(e1);
    const history = log.history("node-1");
    expect(history).toHaveLength(2);
    const expectedFirst = [e1.event_id, e2.event_id].sort()[0];
    expect(history[0]?.event_id).toBe(expectedFirst);
    // Deterministic: the fold is a pure function of the ordered events.
    expect(log.reduce("node-1")).toEqual(log.reduce("node-1"));
  });

  it("a non-transition re-emission can never alter lifecycle state", () => {
    const store = new InMemoryEventStore();
    const log = new TransitionLog(store, { applyTransition: () => undefined }, manualClock().now);
    const before = log.reduce("node-1");
    expect(before.status).toBe(INITIAL_STATUS);
    store.append({
      event_id: "graph-upsert-node-1",
      event_type: "GRAPH_NODE_UPSERTED",
      occurred_at: Date.now(),
      payload: { node_id: "node-1", status: "approved", confidence: 1.0 },
    });
    const after = log.reduce("node-1");
    expect(after).toEqual(before);
    expect(after.event_count).toBe(0);
    expect(log.history("node-1")).toHaveLength(0);
  });

  it("backward transition without a correction marker is rejected (fail closed)", () => {
    const { log, projection, store } = setup();
    let caught: unknown = null;
    try {
      log.transition(
        baseInput({
          from_status: "verified",
          to_status: "observed",
          from_confidence: 1.0,
          to_confidence: null,
        })
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TransitionRejectedError);
    expect((caught as TransitionRejectedError).code).toBe(
      "BACKWARD_TRANSITION_WITHOUT_CORRECTION"
    );
    // Nothing was emitted and the projection never ran.
    expect(store.size()).toBe(0);
    expect(projection.applied).toHaveLength(0);
    expect(log.reduce("node-1").status).toBe(INITIAL_STATUS);
  });

  it("backward transition with an explicit human-correction marker is accepted", () => {
    const { log } = setup();
    const event = log.transition(
      baseInput({
        from_status: "verified",
        to_status: "observed",
        from_confidence: 1.0,
        to_confidence: null,
        reason: "correction:source-retracted",
      })
    );
    expect(event.payload.to_status).toBe("observed");
    expect(log.reduce("node-1").status).toBe("observed");
  });

  it("a correction marker on a forward transition is harmless", () => {
    const { log } = setup();
    const event = log.transition(baseInput({ reason: "correction:double-check" }));
    expect(event.payload.to_status).toBe("approved");
  });
});

/* ------------------------------------------------------------------ */
/* Taxonomy                                                             */
/* ------------------------------------------------------------------ */

describe("lifecycle taxonomy", () => {
  it("classifies the spec's examples: verified->observed backward, candidate->approved forward", () => {
    expect(isBackwardTransition("verified", "observed")).toBe(true);
    expect(isBackwardTransition("approved", "rejected")).toBe(true);
    expect(isBackwardTransition("candidate", "approved")).toBe(false);
    expect(isBackwardTransition("candidate", "rejected")).toBe(false);
    expect(isBackwardTransition("approved", "approved")).toBe(false);
    expect(isBackwardTransition("observed", "superseded")).toBe(false);
    expect(isBackwardTransition("superseded", "approved")).toBe(true);
  });

  it("rejects unknown statuses fail-closed", () => {
    const { log, store } = setup();
    expect(() =>
      log.transition(
        baseInput({ to_status: "archived" as unknown as LifecycleStatus })
      )
    ).toThrowError(TransitionRejectedError);
    try {
      log.transition(baseInput({ to_status: "archived" as unknown as LifecycleStatus }));
    } catch (err) {
      expect((err as TransitionRejectedError).code).toBe("UNKNOWN_STATUS");
    }
    expect(store.size()).toBe(0);
  });

  it("rejects empty node_id / namespace / actor fail-closed", () => {
    const { log } = setup();
    const cases: Array<[Partial<TransitionInput>, string]> = [
      [{ node_id: "  " }, "EMPTY_NODE_ID"],
      [{ namespace: "" }, "EMPTY_NAMESPACE"],
      [{ actor: "" }, "EMPTY_ACTOR"],
    ];
    for (const [override, code] of cases) {
      try {
        log.transition(baseInput(override));
        throw new Error(`expected rejection for ${code}`);
      } catch (err) {
        expect((err as TransitionRejectedError).code).toBe(code);
      }
    }
  });

  it("carries the supersedes_node_id link for SUPERSEDED transitions (009 seam)", () => {
    const { log } = setup();
    const event = log.transition(
      baseInput({
        from_status: "approved",
        from_confidence: 1.0,
        to_status: "superseded",
        to_confidence: null,
        supersedes_node_id: "node-2",
        reason: "replaced by node-2",
      })
    );
    expect(event.payload.supersedes_node_id).toBe("node-2");
    expect(log.reduce("node-1").status).toBe("superseded");
    // The link is carried, not reinterpreted: no second transition vocabulary.
    expect(isTransitionEvent(event)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* 102 convention: HTTP insert mints candidates only                    */
/* ------------------------------------------------------------------ */

describe("102 convention: inserts mint candidates only", () => {
  it("ignores caller-supplied status/confidence", () => {
    const minted = mintCandidateNode({
      callerConfidence: 1.0,
      callerStatus: "approved",
      data: { text: "raw capture" },
      label: "snippet",
      namespace: "tenant::redlands",
      node_id: "node-9",
      node_type: "snippet",
    });
    expect(minted.status).toBe("candidate");
    expect(minted.confidence).toBeNull();
    expect(minted.namespace).toBe("tenant::redlands");
  });

  it("requires namespace (privacy boundary)", () => {
    expect(() =>
      mintCandidateNode({
        data: {},
        label: "x",
        namespace: "  ",
        node_id: "node-9",
        node_type: "snippet",
      })
    ).toThrowError(TransitionRejectedError);
  });
});

/* ------------------------------------------------------------------ */
/* 096 convention: conflict path never writes lifecycle state          */
/* ------------------------------------------------------------------ */

describe("096 convention: conflict path refreshes data, never lifecycle state", () => {
  it("refreshes data fields but drops status/confidence", () => {
    const row = {
      confidence: 1.0,
      correlation_id: "corr-1",
      data: { v: 1 },
      namespace: "tenant::redlands",
      node_id: "node-1",
      status: "approved" as LifecycleStatus,
    };
    const { row: next, dropped } = refreshProjectionFields(
      row,
      {
        confidence: 0.2, // hostile/buggy caller: must be dropped
        correlation_id: "corr-2",
        data: { v: 2 },
        status: "rejected", // pre-096 bug: must be dropped
      },
      () => 42
    );
    expect(next.status).toBe("approved");
    expect(next.confidence).toBe(1.0);
    expect(next.data).toEqual({ v: 2 });
    expect(next.correlation_id).toBe("corr-2");
    expect(next.updated_at).toBe(42);
    expect(dropped).toEqual(["status", "confidence"]);
  });

  it("a transition event still flows through the promoter path after a conflict refresh", () => {
    const { log } = setup();
    const row = {
      confidence: null,
      data: {},
      namespace: "tenant::redlands",
      node_id: "node-1",
      status: "candidate" as LifecycleStatus,
    };
    const refreshed = refreshProjectionFields(row, { data: { text: "richer" } });
    expect(refreshed.row.status).toBe("candidate");
    // Only the transition log (promoter-owned path) moves lifecycle state.
    log.transition(baseInput({ node_id: "node-1", namespace: "tenant::redlands" }));
    expect(log.reduce("node-1").status).toBe("approved");
    expect(refreshed.dropped).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Event hygiene                                                        */
/* ------------------------------------------------------------------ */

describe("event hygiene", () => {
  it("isTransitionEvent rejects forged or foreign events", () => {
    const { log } = setup();
    const good = log.transition(baseInput());
    expect(isTransitionEvent(good)).toBe(true);
    expect(
      isTransitionEvent({
        event_id: "x",
        event_type: "KNOWLEDGE_TRANSITIONED",
        occurred_at: 1,
        payload: { node_id: "node-1" },
      })
    ).toBe(false); // missing source/schema: not in the transition set
  });

  it("marks the correction prefix explicitly", () => {
    expect(CORRECTION_REASON_PREFIX).toBe("correction:");
  });
});
