/**
 * Unit tests for src/tenanos/budgets.ts (SWARM 17).
 *
 * Proves: fail-closed reservation, typed exhaustion with named dimension and
 * scope, parent-chain composition (child blocked by parent remainder),
 * wall-clock checks with an injected clock, non-blocking worker slots, and
 * that defaults match the precedented values.
 *
 * Runs under src/tenanos/jest.config.cjs (swarm-19, P-20260923-001).
 * This proposal does not claim or modify that config.
 */
import {
  BudgetLedger,
  CHECKPOINTS,
  DEFAULT_MAX_RESULT_BYTES,
  DEFAULT_MISSION_BUDGET_POLICY,
  DEFAULT_RUN_BUDGET_POLICY,
  DEFAULT_TENANT_BUDGET_POLICY,
  missionPolicyLimits,
  runPolicyLimits,
  tenantPolicyLimits,
  WorkerSlots,
} from "../budgets";

const IDS = { tenantId: "t1", missionId: "m1", runId: "r1" };

function fixedClock(start = 1_000_000): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("BudgetLedger", () => {
  it("is fail-closed: consume past the limit returns typed BUDGET_EXHAUSTED", () => {
    const ledger = new BudgetLedger("run", runPolicyLimits({ ...DEFAULT_RUN_BUDGET_POLICY, maxAttempts: 2 }), null, IDS);
    expect(ledger.takeAttempt().ok).toBe(true);
    expect(ledger.takeAttempt().ok).toBe(true);
    const third = ledger.takeAttempt();
    expect(third.ok).toBe(false);
    if (!third.ok) {
      expect(third.exhaustion.state).toBe("BUDGET_EXHAUSTED");
      expect(third.exhaustion.dimension).toBe("attempts");
      expect(third.exhaustion.scope).toBe("run");
      expect(third.exhaustion.limit).toBe(2);
      expect(third.exhaustion.consumed).toBe(2);
      expect(third.exhaustion.runId).toBe("r1");
    }
  });

  it("check() does not spend", () => {
    const ledger = new BudgetLedger("run", { "tool-calls": 1 }, null, IDS);
    expect(ledger.check("tool-calls").ok).toBe(true);
    expect(ledger.check("tool-calls").ok).toBe(true);
    expect(ledger.takeToolCall().ok).toBe(true);
    expect(ledger.takeToolCall().ok).toBe(false);
  });

  it("fails closed on negative spend", () => {
    const ledger = new BudgetLedger("run", { context: 100 }, null, IDS);
    const r = ledger.addContextChars(-5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.exhaustion.dimension).toBe("context");
    expect(ledger.consumedOf("context")).toBe(0);
  });

  it("composition: child is blocked by the parent remainder and names the parent scope", () => {
    const tenant = new BudgetLedger("tenant", tenantPolicyLimits({ ...DEFAULT_TENANT_BUDGET_POLICY, maxToolCallsPerHour: 3 }), null, { tenantId: "t1" });
    const mission = new BudgetLedger("mission", missionPolicyLimits(DEFAULT_MISSION_BUDGET_POLICY), tenant, { tenantId: "t1", missionId: "m1" });
    const run = new BudgetLedger("run", runPolicyLimits(DEFAULT_RUN_BUDGET_POLICY), mission, IDS);
    // Run policy allows 30, but the tenant hour only has 3.
    expect(run.takeToolCall().ok).toBe(true);
    expect(run.takeToolCall().ok).toBe(true);
    expect(run.takeToolCall().ok).toBe(true);
    const fourth = run.takeToolCall();
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) {
      expect(fourth.exhaustion.dimension).toBe("tool-calls");
      expect(fourth.exhaustion.scope).toBe("tenant");
      expect(fourth.exhaustion.limit).toBe(3);
    }
    // R2: the spend was recorded up the chain exactly once per level.
    expect(run.consumedOf("tool-calls")).toBe(3);
    expect(mission.consumedOf("tool-calls")).toBe(3);
    expect(tenant.consumedOf("tool-calls")).toBe(3);
  });

  it("a fresh run draws from the mission remainder (R3)", () => {
    const mission = new BudgetLedger("mission", missionPolicyLimits({ ...DEFAULT_MISSION_BUDGET_POLICY, maxToolCalls: 4 }), null, { tenantId: "t1", missionId: "m1" });
    const run1 = new BudgetLedger("run", runPolicyLimits(DEFAULT_RUN_BUDGET_POLICY), mission, IDS);
    for (let i = 0; i < 4; i++) expect(run1.takeToolCall().ok).toBe(true);
    const run2 = new BudgetLedger("run", runPolicyLimits(DEFAULT_RUN_BUDGET_POLICY), mission, { tenantId: "t1", missionId: "m1", runId: "r2" });
    const denied = run2.takeToolCall();
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.exhaustion.scope).toBe("mission");
  });

  it("wall-clock check passes before the deadline and exhausts after (injected clock)", () => {
    const c = fixedClock();
    const ledger = new BudgetLedger("attempt", {}, null, IDS, c.now);
    const deadline = c.now() + 5 * 60 * 1000;
    const early = ledger.checkWallClock(deadline);
    expect(early.ok).toBe(true);
    c.advance(5 * 60 * 1000 + 1);
    const late = ledger.checkWallClock(deadline);
    expect(late.ok).toBe(false);
    if (!late.ok) {
      expect(late.exhaustion.dimension).toBe("wall-time");
      expect(late.exhaustion.scope).toBe("attempt");
    } else {
      throw new Error("expected wall-clock exhaustion");
    }
  });

  it("snapshot exposes limits and consumption for observability", () => {
    const ledger = new BudgetLedger("run", { "tool-calls": 30 }, null, IDS);
    ledger.takeToolCall();
    const s = ledger.snapshot();
    expect(s.scope).toBe("run");
    expect(s.limits["tool-calls"]).toBe(30);
    expect(s.consumed["tool-calls"]).toBe(1);
  });
});

describe("WorkerSlots", () => {
  it("denies past max with typed exhaustion and never queues", () => {
    const slots = new WorkerSlots(2, "run", IDS);
    const a = slots.tryAcquire();
    const b = slots.tryAcquire();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const c = slots.tryAcquire();
    expect(c.ok).toBe(false);
    if (!c.ok) {
      expect(c.exhaustion.state).toBe("BUDGET_EXHAUSTED");
      expect(c.exhaustion.dimension).toBe("parallel-workers");
      expect(c.exhaustion.scope).toBe("run");
    } else {
      throw new Error("expected worker-slot exhaustion");
    }
    if (a.ok) a.release();
    const d = slots.tryAcquire();
    expect(d.ok).toBe(true);
  });

  it("double release is a no-op", () => {
    const slots = new WorkerSlots(1, "run", IDS);
    const a = slots.tryAcquire();
    expect(a.ok).toBe(true);
    if (a.ok) {
      a.release();
      a.release();
    }
    expect(slots.inFlightCount()).toBe(0);
  });
});

describe("defaults and contract", () => {
  it("defaults match the precedented values", () => {
    expect(DEFAULT_RUN_BUDGET_POLICY.maxAttempts).toBe(3);
    expect(DEFAULT_RUN_BUDGET_POLICY.maxAttemptWallMs).toBe(5 * 60 * 1000);
    expect(DEFAULT_RUN_BUDGET_POLICY.maxArtifactBytes).toBe(8 * 1024 * 1024);
    expect(DEFAULT_MISSION_BUDGET_POLICY.maxArtifactBytes).toBe(15 * 1024 * 1024);
    expect(DEFAULT_TENANT_BUDGET_POLICY.maxParallelMissions).toBe(6);
    expect(DEFAULT_MAX_RESULT_BYTES).toBe(1024 * 1024);
  });

  it("CHECKPOINTS carries the C1..C8 contract with the C5 ordering invariant", () => {
    expect(CHECKPOINTS.map((c) => c.id)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]);
    const c5 = CHECKPOINTS.find((c) => c.id === "C5");
    expect(c5?.point).toMatch(/BEFORE capability decision/);
  });
});
