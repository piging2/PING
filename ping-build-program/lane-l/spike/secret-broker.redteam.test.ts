/**
 * Lane L red-team suite for the PING Secret Broker.
 * Run: tsx --test secret-broker.redteam.test.ts   (from the spike dir)
 *
 * Every test asserts the SECRET BOUNDARY: the secret value must never appear
 * in agent-visible context, logs, audit records, or observations.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  SecretBroker,
  BrokerError,
  EnvCredentialStore,
  type CredentialStore,
  MAX_TTL_SECONDS,
} from "./secret-broker.js";

const CANARY = "CANARY_SECRET_VALUE_9f8e7d6c5b4a"; // planted "real" secret
const CRED_ID = "TEST_CONNECTOR_TOKEN";
const SEAM = "connector-runtime-seam-1";
const PRINCIPAL = "connector:github:svc-1";

class MapStore implements CredentialStore {
  private m = new Map<string, string>();
  failGet = false;
  get(id: string) {
    if (this.failGet) return undefined;
    return this.m.get(id);
  }
  set(id: string, v: string) {
    this.m.set(id, v);
  }
  has(id: string) {
    return this.m.has(id);
  }
}

function brokerWith(store?: MapStore, now?: () => number) {
  const s = store ?? new MapStore();
  s.set(CRED_ID, CANARY);
  return {
    store: s,
    broker: new SecretBroker({
      authorize: ({ principal, operation, target, tenantId }) =>
        principal === PRINCIPAL &&
        operation === "fetch:issues" &&
        target === "github.com/ping-org/demo" &&
        tenantId === "tenant-acme",
      store: s,
      now,
      audiences: [SEAM],
    }),
  };
}

const SCOPE = {
  principal: PRINCIPAL,
  operation: "fetch:issues",
  target: "github.com/ping-org/demo",
  tenantId: "tenant-acme",
  audience: SEAM,
};

/** Fail the test if the canary appears anywhere in agent-visible surfaces. */
function assertNoCanary(label: string, ...surfaces: unknown[]) {
  for (const surface of surfaces) {
    const text = JSON.stringify(surface);
    assert.ok(!text.includes(CANARY), `${label}: CANARY LEAKED into ${text.slice(0, 200)}`);
  }
}

describe("issuance", () => {
  it("denies by default when the policy port denies", () => {
    const { broker } = brokerWith();
    assert.throws(
      () =>
        broker.request({
          ...SCOPE,
          operation: "delete:everything",
          credentialId: CRED_ID,
        }),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("confused deputy: authorized principal cannot mint a broader handle than policy allows", () => {
    const { broker } = brokerWith();
    // Attacker (prompt-injected agent) tries to escalate op at request time.
    assert.throws(
      () =>
        broker.request({
          principal: PRINCIPAL,
          operation: "write:issues",
          target: "github.com/ping-org/demo",
          tenantId: "tenant-acme",
          audience: SEAM,
          credentialId: CRED_ID,
        }),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
    // And cannot mint for a different target.
    assert.throws(
      () =>
        broker.request({
          principal: PRINCIPAL,
          operation: "fetch:issues",
          target: "github.com/other-org/other",
          tenantId: "tenant-acme",
          audience: SEAM,
          credentialId: CRED_ID,
        }),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("caps TTL at the hard ceiling", () => {
    let t = 1_700_000_000_000;
    const { broker } = brokerWith(undefined, () => t);
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 999_999 });
    t += MAX_TTL_SECONDS * 1000 + 1;
    return assert.rejects(
      broker.execute(h, SCOPE, async () => "x"),
      (e: unknown) => e instanceof BrokerError && e.code === "EXPIRED",
    );
  });

  it("handle format is opaque and non-guessable", () => {
    const { broker } = brokerWith();
    const a = broker.request({ ...SCOPE, credentialId: CRED_ID });
    const b = broker.request({ ...SCOPE, credentialId: CRED_ID });
    assert.ok(a.startsWith("pingsec_1_"));
    assert.notEqual(a, b);
    assert.ok(!a.includes(CANARY) && !a.includes(CRED_ID));
  });
});

describe("execution scope binding", () => {
  it("replay outside scope: wrong operation is rejected", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    await assert.rejects(
      broker.execute(h, { ...SCOPE, operation: "fetch:admin" }, async (s) => s),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("cross-tenant: different principal is rejected", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    await assert.rejects(
      broker.execute(h, { ...SCOPE, principal: "connector:github:svc-2" }, async (s) => s),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("wrong audience (seam) is rejected — stolen handle is useless elsewhere", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    await assert.rejects(
      broker.execute(h, { ...SCOPE, audience: "attacker-seam" }, async (s) => s),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("expired handle is rejected", async () => {
    let t = 1_700_000_000_000;
    const { broker } = brokerWith(undefined, () => t);
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 60 });
    t += 61_000;
    await assert.rejects(
      broker.execute(h, SCOPE, async () => "x"),
      (e: unknown) => e instanceof BrokerError && e.code === "EXPIRED",
    );
  });

  it("unknown handle is rejected", async () => {
    const { broker } = brokerWith();
    await assert.rejects(
      broker.execute("pingsec_1_forged", SCOPE, async () => "x"),
      (e: unknown) => e instanceof BrokerError && e.code === "AUTH_REQUIRED",
    );
  });

  it("single-use default: second execution is rejected", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    await broker.execute(h, SCOPE, async () => "first");
    await assert.rejects(
      broker.execute(h, SCOPE, async () => "second"),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("revoked handle is rejected", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    broker.revoke(h);
    await assert.rejects(
      broker.execute(h, SCOPE, async () => "x"),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("revokeAll kills every outstanding handle for the principal", async () => {
    const { broker } = brokerWith();
    const h1 = broker.request({ ...SCOPE, credentialId: CRED_ID });
    const h2 = broker.request({ ...SCOPE, credentialId: CRED_ID, maxUses: 5 });
    assert.equal(broker.revokeAll(PRINCIPAL), 2);
    await assert.rejects(broker.execute(h1, SCOPE, async () => "x"));
    await assert.rejects(broker.execute(h2, SCOPE, async () => "x"));
  });

  it("unreachable secret backend fails closed WITHOUT running the work", async () => {
    const store = new MapStore();
    const { broker } = brokerWith(store);
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    store.failGet = true;
    let ran = false;
    await assert.rejects(
      broker.execute(h, SCOPE, async () => {
        ran = true;
        return "x";
      }),
      (e: unknown) => e instanceof BrokerError && e.code === "SOURCE_UNAVAILABLE",
    );
    assert.equal(ran, false, "work must not run when the secret is unavailable");
  });
});

describe("attenuation", () => {
  it("can narrow ttl/uses but never broaden scope or time", () => {
    const { broker } = brokerWith();
    const parent = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 600, maxUses: 5 });
    const child = broker.attenuate(parent, { ttlSeconds: 60, maxUses: 1 });
    assert.notEqual(parent, child);
    // Child still bound to the same scope axes.
    return broker.execute(child, SCOPE, async () => "ok").then((v) => assert.equal(v, "ok"));
  });

  it("cannot attenuate an expired parent", () => {
    let t = 1_700_000_000_000;
    const { broker } = brokerWith(undefined, () => t);
    const parent = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 60 });
    t += 61_000;
    assert.throws(
      () => broker.attenuate(parent, { ttlSeconds: 30 }),
      (e: unknown) => e instanceof BrokerError && e.code === "EXPIRED",
    );
  });
});

describe("rotation", () => {
  it("unexecuted handles resolve the NEW value; executed handles are sealed", async () => {
    const { broker } = brokerWith();
    const h1 = broker.request({ ...SCOPE, credentialId: CRED_ID });
    await broker.execute(h1, SCOPE, async (s) => {
      assert.equal(s, CANARY);
      return "done";
    });
    const h2 = broker.request({ ...SCOPE, credentialId: CRED_ID });
    broker.rotate(CRED_ID, "ROTATED_VALUE_abcdef1234");
    const seen = await broker.execute(h2, SCOPE, async (s) => s);
    assert.equal(seen, "ROTATED_VALUE_abcdef1234");
    assert.ok(!JSON.stringify(broker.auditTrail()).includes("ROTATED_VALUE_abcdef1234"));
    assert.ok(!JSON.stringify(broker.auditTrail()).includes(CANARY));
  });
});

describe("secret boundary (the whole point)", () => {
  it("end-to-end agent fetch: secret never in agent context, logs, observation, or audit", async () => {
    const agentLog: string[] = [];
    const { broker } = brokerWith();

    // --- "agent" code: only ever sees the handle string + broker.execute ---
    const handle = broker.request({ ...SCOPE, credentialId: CRED_ID });
    agentLog.push(`agent received handle: ${handle}`);

    // Mock provider: requires the real secret, returns issues JSON.
    async function providerFetch(authHeader: string) {
      if (authHeader !== `Bearer ${CANARY}`) {
        const err = new Error("401 unauthorized") as Error & { status?: number };
        err.status = 401;
        throw err;
      }
      return { issues: [{ id: 1, title: "leaky faucet" }, { id: 2, title: "dead outlet" }] };
    }

    // The connector runtime seam: secret enters ONLY inside this closure.
    const observation = await broker.execute(handle, SCOPE, async (secret) => {
      const res = await providerFetch(`Bearer ${secret}`);
      return {
        type: "github.issues",
        source: SCOPE.target,
        fetchedAt: new Date().toISOString(),
        records: res.issues,
      };
    });
    agentLog.push(`agent built observation: ${JSON.stringify(observation)}`);

    const audit = broker.auditTrail();
    agentLog.push(`agent read audit: ${JSON.stringify(audit)}`);

    // THE BOUNDARY ASSERTIONS
    assertNoCanary("agent log", agentLog);
    assertNoCanary("observation", observation);
    assertNoCanary("audit trail", audit);
    assertNoCanary("handle string", handle);
    assert.equal(observation.records.length, 2);
    assert.ok(
      audit.some((r) => r.event === "executed" && r.outcome === "OK"),
      "audit must record the execution",
    );
    const execRec = audit.find((r) => r.event === "executed")!;
    assert.equal(execRec.principal, PRINCIPAL);
    assert.equal(execRec.operation, "fetch:issues");
    assert.equal(execRec.target, "github.com/ping-org/demo");
  });

  it("audit trail is correlatable but not replayable", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    await broker.execute(h, SCOPE, async () => "ok");
    const audit = broker.auditTrail();
    const issued = audit.find((r) => r.event === "issued")!;
    const executed = audit.find((r) => r.event === "executed")!;
    assert.equal(issued.handleFp, executed.handleFp, "same handle correlates");
    assert.ok(!issued.handleFp.includes("pingsec_1_"), "fingerprint is not the handle");
    // Fingerprint alone cannot execute.
    await assert.rejects(
      broker.execute(issued.handleFp, SCOPE, async () => "x"),
      (e: unknown) => e instanceof BrokerError && e.code === "AUTH_REQUIRED",
    );
  });
});

describe("renewal", () => {
  it("extends a live lease with full scope re-check", async () => {
    let t = 1_700_000_000_000;
    const { broker } = brokerWith(undefined, () => t);
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 60 });
    t += 50_000;
    broker.renew(h, SCOPE, 60);
    t += 50_000;
    const v = await broker.execute(h, SCOPE, async () => "ok");
    assert.equal(v, "ok");
  });

  it("renewal beyond max total lease lifetime is denied", () => {
    let t = 1_700_000_000_000;
    const { broker } = brokerWith(undefined, () => t);
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 900, maxUses: 500 });
    // walk the lease forward near the 24h cap
    for (let i = 0; i < 95; i++) {
      t += 900_000;
      broker.renew(h, SCOPE, 900);
    }
    // t is still inside the lease; one more 900s extension would breach the 24h cap
    assert.throws(
      () => broker.renew(h, SCOPE, 900),
      (e: unknown) => e instanceof BrokerError && e.code === "PERMISSION_DENIED",
    );
  });

  it("renewal of an expired handle is denied", () => {
    let t = 1_700_000_000_000;
    const { broker } = brokerWith(undefined, () => t);
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID, ttlSeconds: 60 });
    t += 61_000;
    assert.throws(
      () => broker.renew(h, SCOPE, 60),
      (e: unknown) => e instanceof BrokerError && e.code === "EXPIRED",
    );
  });
});

describe("seam error masking (RT-1)", () => {
  it("provider error echoing the secret never crosses the seam", async () => {
    const { broker } = brokerWith();
    const h = broker.request({ ...SCOPE, credentialId: CRED_ID });
    let caught: unknown;
    try {
      await broker.execute(h, SCOPE, async (secret) => {
        const cause = new Error(`refresh token ${secret} rejected`);
        throw new Error(`401 unauthorized: bad api key ${secret}`, { cause } as never);
      });
    } catch (e) {
      caught = e;
    }
    assert.ok(caught instanceof BrokerError);
    assert.equal((caught as BrokerError).code, "TRANSIENT");
    assertNoCanary("masked error", caught, (caught as Error).message, (caught as Error).stack);
    const audit = broker.auditTrail();
    assertNoCanary("audit after masked error", audit);
    assert.ok(audit.some((r) => r.event === "executed" && r.outcome === "TRANSIENT"));
  });
});
