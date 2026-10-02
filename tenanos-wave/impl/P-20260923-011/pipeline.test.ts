/**
 * Unit tests for routing/pipeline.ts (convergence wave, E4).
 *
 * Proves: the router only ever selects from the capability-authorized set,
 * fallback is refused when disabled (typed, never silent), lease and
 * connection guards exclude (never down-rank), denials are typed values
 * (no throws), selection is deterministic, and the receipt carries the
 * journal-grade evidence (tenant_id + run_id + scores).
 */
import {
  AuthorizedCandidate,
  ProviderExecutionPolicy,
  route,
  RoutingRequest,
} from "../pipeline";

const POLICY: ProviderExecutionPolicy = {
  allowModelFallback: true,
  allowedModels: ["model-a", "model-b"],
  expectedConnectionId: "conn-1",
};

const CANDIDATES: AuthorizedCandidate[] = [
  { providerId: "prov-1", modelId: "model-a", connectionId: "conn-1" },
  { providerId: "prov-2", modelId: "model-b", connectionId: "conn-1" },
];

function request(over: Partial<RoutingRequest> = {}): RoutingRequest {
  return {
    tenantId: "t1",
    runId: "r1",
    requestedCapability: "llm.complete",
    requestedModelId: "model-a",
    candidates: CANDIDATES,
    policy: POLICY,
    ...over,
  };
}

describe("route", () => {
  it("selects the exact requested model from the authorized set", () => {
    const out = route(request(), () => 1_000_000);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.selected.modelId).toBe("model-a");
      expect(out.selected.providerId).toBe("prov-1");
      expect(out.receipt.tenantId).toBe("t1");
      expect(out.receipt.runId).toBe("r1");
      expect(out.receipt.requestedCapability).toBe("llm.complete");
      expect(out.receipt.scores.length).toBe(2);
      expect(out.receipt.at).toBe(new Date(1_000_000).toISOString());
    } else {
      throw new Error("expected a route");
    }
  });

  it("never selects outside the authorized set, even when asked", () => {
    const out = route(
      request({
        requestedModelId: "model-secret",
        candidates: [{ providerId: "prov-x", modelId: "model-secret", connectionId: "conn-1" }],
      }),
    );
    // model-secret is not in the allow-list: the router cannot widen it.
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.denial.code).toBe("MODEL_NOT_ALLOWED");
  });

  it("denies with NO_CANDIDATES on an empty authorized set and synthesizes nothing", () => {
    const out = route(request({ candidates: [] }));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.denial.code).toBe("NO_CANDIDATES");
      expect(out.denial.detail).toMatch(/synthesizes nothing/);
    }
  });

  it("refuses silent fallback when allowModelFallback is false", () => {
    const out = route(
      request({
        policy: { ...POLICY, allowModelFallback: false },
        candidates: [{ providerId: "prov-2", modelId: "model-b", connectionId: "conn-1" }],
      }),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.denial.code).toBe("MODEL_FALLBACK_NOT_ALLOWED");
  });

  it("applies fallback to an allowed model when fallback is enabled", () => {
    const out = route(
      request({
        requestedModelId: "model-a",
        candidates: [{ providerId: "prov-2", modelId: "model-b", connectionId: "conn-1" }],
      }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.selected.modelId).toBe("model-b");
  });

  it("excludes connection mismatches with a typed denial, never down-ranks them", () => {
    const out = route(
      request({
        candidates: [{ providerId: "prov-9", modelId: "model-a", connectionId: "conn-9" }],
      }),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.denial.code).toBe("CONNECTION_MISMATCH");
      if (out.denial.code === "CONNECTION_MISMATCH")
        expect(out.denial.expectedConnectionId).toBe("conn-1");
    }
  });

  it("enforces the lease-mismatch guard with a typed denial", () => {
    const leased: AuthorizedCandidate[] = [
      { providerId: "prov-1", modelId: "model-a", connectionId: "conn-1", leaseId: "lease-old" },
    ];
    const out = route(
      request({
        candidates: leased,
        policy: { ...POLICY, expectedLeaseId: "lease-new" },
      }),
    );
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.denial.code).toBe("LEASE_MISMATCH");
      if (out.denial.code === "LEASE_MISMATCH")
        expect(out.denial.expectedLeaseId).toBe("lease-new");
    }
  });

  it("prefers the candidate holding the expected lease", () => {
    const out = route(
      request({
        candidates: [
          { providerId: "prov-1", modelId: "model-a", connectionId: "conn-1" },
          { providerId: "prov-2", modelId: "model-a", connectionId: "conn-1", leaseId: "lease-7" },
        ],
        policy: { ...POLICY, expectedLeaseId: "lease-7" },
      }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.selected.providerId).toBe("prov-2");
  });

  it("is deterministic: identical inputs always pick the same candidate", () => {
    const tied: AuthorizedCandidate[] = [
      { providerId: "prov-b", modelId: "model-b", connectionId: "conn-1" },
      { providerId: "prov-a", modelId: "model-b", connectionId: "conn-1" },
    ];
    const first = route(request({ candidates: tied, requestedModelId: undefined }));
    const second = route(request({ candidates: tied, requestedModelId: undefined }));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      // Tie on score: lexicographic providerId wins, and it is stable.
      expect(first.selected.providerId).toBe("prov-a");
      expect(second.selected.providerId).toBe(first.selected.providerId);
    }
  });

  it("never throws for routing outcomes: denials are values", () => {
    const bad: RoutingRequest[] = [
      request({ candidates: [] }),
      request({ requestedModelId: "model-nope" }),
      request({ policy: { ...POLICY, expectedLeaseId: "lease-ghost" } }),
    ];
    for (const r of bad) {
      let threw = false;
      try {
        route(r);
      } catch {
        threw = true;
      }
      expect(threw).toBe(false);
    }
  });
});
