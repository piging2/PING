// Required contract tests for the bounded UI/contract slice.
// Run: node --test tests/contract.test.mjs
// Proves: public client incapability, maturity propagation, no proof
// inflation, synthetic isolation, missing run identity, gateway boundary.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const schemas = await import(join(root, "packages/schemas/src/index.mjs"));
const apiClient = await import(join(root, "packages/api-client/src/index.mjs"));
const mc = await import(join(root, "apps/mission-control/src/index.mjs"));

const {
  PublicPingClient,
  AuthenticatedPingClient,
  OperatorPingClient,
  createGatewayTransport,
} = apiClient;
const {
  withEnvelope,
  failClosedProjection,
  gapProjection,
  assertNoProofInflation,
  validate,
  schemaNames,
  MATURITY,
  STAGES,
  ProofMetadataError,
  ProofInflationError,
} = schemas;

function stubTransport() {
  const calls = [];
  return {
    baseUrl: "http://gateway.test",
    calls,
    request({ method, path, query, headers }) {
      calls.push({ method, path, query, headers: headers ? Object.keys(headers) : [] });
      return Promise.resolve({ ok: true, path, method });
    },
  };
}

describe("public client incapability", () => {
  it("exposes no method that can construct POST/PATCH/DELETE or mutation requests", () => {
    const client = new PublicPingClient(stubTransport());
    const names = new Set();
    let proto = Object.getPrototypeOf(client);
    while (proto && proto !== Object.prototype) {
      for (const n of Object.getOwnPropertyNames(proto)) {
        if (n !== "constructor") names.add(n);
      }
      proto = Object.getPrototypeOf(proto);
    }
    const suspicious = [...names].filter((n) =>
      /post|put|patch|delete|create|emit|approve|retry|mutat|write|grant|deny|lift|dispatch/i.test(n)
    );
    assert.deepEqual(suspicious, [], `mutation-capable names on public surface: ${suspicious}`);
  });

  it("every describe() operation is GET-only", () => {
    const client = new PublicPingClient(stubTransport());
    for (const op of client.describe()) {
      assert.equal(op.method, "GET", `${op.op} is not GET`);
    }
  });

  it("the internal request path hard-rejects non-GET even if reached", () => {
    const client = new PublicPingClient(stubTransport());
    assert.throws(() => client._readVia("POST", "/missions"), /read-only by construction/);
    assert.throws(() => client._readVia("DELETE", "/missions/x"), /read-only by construction/);
  });

  it("issues only GET requests through the transport", async () => {
    const t = stubTransport();
    const client = new PublicPingClient(t);
    await client.getHealth();
    await client.getOpsDashboard();
    await client.getMissionControlIndex();
    await client.getSchedulerStatus();
    for (const c of t.calls) assert.equal(c.method, "GET");
  });

  it("does not wrap auth-only or unevidenced routes", () => {
    const client = new PublicPingClient(stubTransport());
    for (const m of ["listMissions", "getMission", "listEvents", "getEvent", "getCorrelation", "getDashboard", "getSystemState"]) {
      assert.equal(typeof client[m], "undefined", `public client must not expose ${m}`);
    }
    for (const op of client.describe()) {
      assert.equal(op.authSurface, "public", `${op.op} is not a public route`);
      assert.ok(op.routeProof, `${op.op} carries no route proof`);
    }
  });
});

describe("maturity propagation", () => {
  it("envelope round-trips all proof fields", () => {
    const p = withEnvelope({ id: "m1" }, {
      maturity: "PROVEN",
      proof_status: "verified",
      verified_at: "2026-09-17T00:00:00Z",
      evidence_ref: "GET /missions",
      source: "ping_missions via MissionRuntime",
      stage: "IMPLEMENTED",
    });
    assert.equal(p._envelope.maturity, "PROVEN");
    assert.equal(p._envelope.verified_at, "2026-09-17T00:00:00Z");
    assert.equal(p._envelope.evidence_ref, "GET /missions");
    assert.equal(p._envelope.source, "ping_missions via MissionRuntime");
    assert.equal(p._envelope.stage, "IMPLEMENTED");
  });

  it("PROVEN without verified_at or evidence_ref fails closed", () => {
    assert.throws(
      () => withEnvelope({ id: "m1" }, { maturity: "PROVEN", source: "x" }),
      ProofMetadataError
    );
    assert.throws(
      () => withEnvelope({ id: "m1" }, { maturity: "BUILT_NOT_LIVE", source: "x", verified_at: "t" }),
      ProofMetadataError
    );
  });

  it("unknown maturity vocabulary is rejected", () => {
    assert.throws(
      () => withEnvelope({ id: "m1" }, { maturity: "LIVE", source: "x" }),
      ProofMetadataError
    );
  });

  it("failClosedProjection renders UNKNOWN, never a silent zero", () => {
    const p = failClosedProjection("automation-health", "unreadable", "test");
    assert.equal(p._envelope.maturity, "UNKNOWN");
    assert.ok(p.reason.length > 0);
  });

  it("all schema files parse and the registry is complete", () => {
    const names = schemaNames();
    assert.ok(names.length >= 17, `expected >= 17 schemas, got ${names.length}`);
    for (const n of names) {
      const s = schemas.getSchema(n);
      assert.ok(s.title, `${n} has no title`);
    }
    assert.deepEqual([...MATURITY].sort(), ["BUILT_NOT_LIVE","DIRECTION","EXPERIMENTAL","FALSIFIED","PROVEN","UNKNOWN","UNPROVEN"].sort());
    assert.deepEqual([...STAGES].sort(), ["CONTRACT_DEFINED","DEPLOYED","HARVESTED","IMPLEMENTED","RUNTIME_VERIFIED","WIRED"].sort());
  });
});

describe("no proof inflation", () => {
  it("UNPROVEN/EXPERIMENTAL/BUILT_NOT_LIVE cannot render as PROVEN", () => {
    for (const b of ["UNPROVEN", "EXPERIMENTAL", "BUILT_NOT_LIVE", "DIRECTION", "UNKNOWN"]) {
      assert.throws(() => assertNoProofInflation("PROVEN", b), ProofInflationError, `backend ${b}`);
    }
  });

  it("BUILT_NOT_LIVE cannot render as LIVE-equivalent PROVEN", () => {
    assert.throws(() => assertNoProofInflation("PROVEN", "BUILT_NOT_LIVE"), ProofInflationError);
  });

  it("equal or weaker display is allowed", () => {
    assert.equal(assertNoProofInflation("PROVEN", "PROVEN"), true);
    assert.equal(assertNoProofInflation("EXPERIMENTAL", "PROVEN"), true);
    assert.equal(assertNoProofInflation("UNKNOWN", "PROVEN"), true);
  });
});

describe("synthetic isolation", () => {
  it("ORCA synthetic metrics cannot satisfy the operational metric contract", () => {
    const orcaMetric = withEnvelope(
      { mission_closure_rate: 0.92 },
      {
        maturity: "FALSIFIED",
        proof_status: "synthetic: disabled loop fabricates findings",
        source: "ORCA orig-engine.js (disabled)",
        stage: "HARVESTED",
      }
    );
    // The operational contract requires PROVEN operational truth.
    assert.throws(
      () => assertNoProofInflation("PROVEN", orcaMetric._envelope.maturity),
      ProofInflationError
    );
    assert.equal(orcaMetric._envelope.maturity, "FALSIFIED");
  });
});

describe("missing run identity", () => {
  it("mission window emits a gap for the Run layer, never a fabricated run", () => {
    const w = mc.buildMissionWindow({
      missionRow: { id: "m-1", objective: "test", status: "running" },
      correlationEvents: [
        { event_id: "e-1", event_type: "X", ts: "2026-09-17T00:00:00Z" },
      ],
    });
    assert.equal(w.run_layer._envelope.maturity, "UNPROVEN");
    assert.ok(w.run_layer.gap.length > 0);
    assert.ok(!("run_id" in w.run_layer) || w.run_layer.run_id === undefined);
  });

  it("pass-local ids are not promoted to run identities", () => {
    const found = mc.findRunIdentity([
      { run_id: "ig-20260917-pass44" },
      { run_id: "fb-20260914-200458" },
    ]);
    assert.equal(found, null);
  });

  it("findRunIdentity returns null for records without authority flag", () => {
    assert.equal(mc.findRunIdentity([]), null);
    assert.equal(mc.findRunIdentity(null), null);
  });
});

describe("gateway boundary", () => {
  it("no UI package reaches backend internals directly: static source scan", () => {
    // The contract requires every projection to NAME its source authority
    // (e.g. "ping_missions via MissionRuntime"), so bare mentions of
    // authority/store names are expected. What is banned is direct access:
    // database drivers, process spawning, raw SQL, direct file reads inside
    // the shared contract packages.
    const sharedPackages = [
      "packages/schemas/src/index.mjs",
      "packages/api-client/src/transport.mjs",
      "packages/api-client/src/public-client.mjs",
      "packages/api-client/src/authenticated-client.mjs",
      "packages/api-client/src/operator-client.mjs",
      "packages/api-client/src/index.mjs",
    ];
    const appFiles = [
      "apps/mission-control/src/automation-health.mjs",
      "apps/mission-control/src/mission-list.mjs",
      "apps/mission-control/src/mission-window.mjs",
      "apps/mission-control/src/approval-queue.mjs",
      "apps/mission-control/src/intent-ledger.mjs",
      "apps/mission-control/src/index.mjs",
    ];
    const directAccess = [
      /\brequire\(['"](pg|postgres|child_process)['"]\)/,
      /\bfrom ['"](pg|postgres|child_process)['"]/,
      /new\s+(Client|Pool)\s*\(/,
      /child_process/,
      /\bSELECT\b[\s\S]{0,200}\bFROM\b/i,
      /dockerode/,
    ];
    const fsInShared = [/from ['"]node:fs['"]/, /require\(['"]fs['"]\)/];
    for (const f of sharedPackages) {
      const src = readFileSync(join(root, f), "utf8");
      for (const re of directAccess) {
        assert.ok(!re.test(src), `${f} matches banned pattern ${re}`);
      }
      // The schemas package may read its own bundled contract JSON
      // (its own directory only). No other filesystem reads allowed.
      if (f === "packages/schemas/src/index.mjs") {
        assert.ok(src.includes('join(schemaDir'), `${f} must confine reads to its own schemas dir`);
        assert.ok(!/\.\.\//.test(src), `${f} must not traverse out of its own directory`);
      } else {
        for (const re of fsInShared) {
          assert.ok(!re.test(src), `${f} matches banned pattern ${re}`);
        }
      }
    }
    // apps/mission-control reads workspace evidence FILES as projections
    // (ADR section 8: file-based machinery is read as projections, not
    // migrated). It must still never touch database drivers, process
    // spawning, or raw SQL.
    for (const f of appFiles) {
      const src = readFileSync(join(root, f), "utf8");
      for (const re of directAccess) {
        assert.ok(!re.test(src), `${f} matches banned pattern ${re}`);
      }
    }
  });

  it("operator mutations return gap-labeled intents, never fabricated requests", () => {
    const t = stubTransport();
    const op = new OperatorPingClient(t, "test-token");
    const a = op.requestApprovalGrant("194a2b85bde957ed", "grant");
    assert.equal(a.disposition, "GAP");
    assert.equal(a._envelope.maturity, "UNPROVEN");
    assert.ok(a.gap.includes("SNIPPET_APPROVED"));
    const d = op.requestDeadLetterRetry("dlq-1");
    assert.equal(d.disposition, "GAP");
    const q = op.requestQuarantineLift("instagram");
    assert.equal(q.disposition, "GAP");
    assert.equal(t.calls.length, 0, "no gateway request was issued for gap mutations");
  });

  it("authenticated client redacts the token", () => {
    const op = new AuthenticatedPingClient(stubTransport(), "secret-token-123");
    assert.ok(!JSON.stringify(op).includes("secret-token-123"));
  });

  it("authenticated client wraps only evidenced auth GETs, stays read-only", async () => {
    const t = stubTransport();
    const client = new AuthenticatedPingClient(t, "token");
    await client.listMissions();
    await client.getMission("abc");
    await client.listEvents();
    await client.getEvent("e1");
    await client.getEventDescendants("e1");
    await client.getEventAncestors("e1");
    await client.getCorrelation("c1");
    for (const c of t.calls) {
      assert.equal(c.method, "GET");
      assert.ok(c.headers.includes("Authorization"), `authed call to ${c.path} carries the bearer header`);
    }
    // Unevidenced routes were removed, not left to drift.
    for (const m of ["getEventStats", "getRecentEvents", "listTenantMissions"]) {
      assert.equal(typeof client[m], "undefined", `authenticated client must not expose ${m}`);
    }
    const authed = client.describe().filter((o) => o.authSurface === "auth");
    assert.ok(authed.length === 7, `expected 7 authed ops, got ${authed.length}`);
    for (const op of authed) assert.equal(op.method, "GET");
  });
});

describe("honest projections", () => {
  it("mission list builder normalizes rows and rejects unknown shapes", () => {
    const rows = mc.buildMissionList(
      [{ id: "m1", objective: "o1", status: "running" }, { mission_id: "m2", description: "o2", state: "bogus" }],
      { verifiedAt: "2026-09-17T00:00:00Z", evidenceRef: "test" }
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].current_status, "running");
    assert.equal(rows[1].current_status, "UNKNOWN");
    assert.throws(() => mc.buildMissionList({ nope: true }), /unrecognized/);
  });

  it("approval queue labels the dispatch gap on PENDING_HUMAN items", () => {
    const q = mc.buildApprovalQueue([
      { id: "194a2b85bde957ed", kind: "playbook-revision", title: "v1.1.0", status: "PENDING_HUMAN", decided_by: null },
    ]);
    assert.equal(q[0].dispatch._envelope.maturity, "UNPROVEN");
    assert.ok(q[0].dispatch.gap.includes("SNIPPET_APPROVED"));
  });

  it("intent ledger keeps unresolved intents explicitly visible", () => {
    const view = mc.buildIntentLedgerView([
      { intent_id: "a", platform: "facebook", action: "like", record_type: "intent", stage: "ACTION_INTENT_DURABLE", ts: "t" },
      { intent_id: "a", record_type: "execution", stage: "EXECUTION", ts: "t" },
    ]);
    assert.equal(view.summary.UNRESOLVED, 1);
    assert.equal(view.unresolved.length, 1);
    assert.equal(view.unresolved_visible, true);
  });

  it("automation health renders UNKNOWN when sources are unreadable", () => {
    const [p] = mc.buildAutomationHealth({ workspaceRoot: "/nonexistent-root" });
    assert.equal(p._envelope.maturity, "UNKNOWN");
  });
});


describe("envelope placement is canonical", () => {
  for (const name of schemas.schemaNames()) {
    if (name === "envelope") continue;
    it(`schema ${name} places the envelope under _envelope`, () => {
      const s = schemas.getSchema(name);
      assert.ok(
        s.properties && s.properties._envelope && s.properties._envelope.$ref === "envelope.json",
        `schema '${name}' must place the envelope under _envelope via $ref to envelope.json`
      );
      assert.ok(
        (s.required || []).includes("_envelope"),
        `schema '${name}' must require _envelope`
      );
      // The old divergence: maturity/source must NOT be required at top level.
      assert.ok(
        !(s.required || []).includes("maturity"),
        `schema '${name}' must not require top-level maturity`
      );
    });
  }
});
