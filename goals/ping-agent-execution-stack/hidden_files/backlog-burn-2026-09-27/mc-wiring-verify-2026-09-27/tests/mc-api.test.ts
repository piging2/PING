/**
 * mc-api.test.ts — mock-based verification of the staged wiring patch's
 * dispatch-plane client (mc-api.ts).
 *
 * Falsifiable claims under test (from SEAM-PROPOSAL.md):
 *  1. mcApiBase: explicit override > NEXT_PUBLIC_MC_API_BASE > same-origin ("").
 *     Trailing slashes are stripped so `${base}/api/...` never double-slashes.
 *  2. MC_TERMINAL is exactly {SUCCEEDED, FAILED, UNKNOWN, DENIED}: UNKNOWN is
 *     terminal and is never collapsed into FAILED.
 *  3. postMcDispatch maps the wire shapes to the documented result union:
 *     - HTTP 403 (or j.status === "DENIED") -> DENIED, "not failed"
 *     - j.ok + status SUCCEEDED/FAILED/UNKNOWN -> ok:true with that status
 *     - transport throw -> REJECTED with http 0
 *     - unrecognized shape -> REJECTED (never silently ok)
 *  4. The POST body carries exactly {prompt, agent, capability, tenant} with
 *     tenant supplied by the caller (the page's fixed SITE_ID). No
 *     idempotency key exists by design (no blind POST retry), so the test
 *     pins the body's exact key set to catch accidental additions.
 *  5. fetchMcCatalog throws when the catalog is unavailable (!ok).
 *  6. fetchMcMission returns null (not throw) when the mission is absent.
 */
import {
  MC_TERMINAL,
  fetchMcCatalog,
  fetchMcMission,
  fetchMcMissions,
  mcApiBase,
  postMcDispatch,
} from "../src/app/sites/_shared/mc-api";

// ---------------------------------------------------------------------------
// fetch mock harness
// ---------------------------------------------------------------------------

type MockResp = { status: number; json: unknown | Error };

let calls: { url: string; init?: RequestInit }[] = [];
let queue: MockResp[] = [];

function enqueue(r: MockResp) {
  queue.push(r);
}

function lastCall() {
  return calls[calls.length - 1];
}

function postBody() {
  const c = lastCall();
  return JSON.parse(String(c.init?.body));
}

beforeEach(() => {
  calls = [];
  queue = [];
  (global as any).fetch = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = queue.shift();
    if (!r) throw new Error("fetch mock: no response queued");
    if (r.json instanceof Error) throw r.json;
    return {
      status: r.status,
      json: async () => r.json,
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// mcApiBase
// ---------------------------------------------------------------------------

describe("mcApiBase", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.NEXT_PUBLIC_MC_API_BASE;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test("defaults to same-origin empty string", () => {
    expect(mcApiBase()).toBe("");
    expect(mcApiBase("")).toBe("");
  });

  test("explicit override wins and trailing slash is stripped", () => {
    expect(mcApiBase("https://mc.example.com/")).toBe("https://mc.example.com");
    expect(mcApiBase("https://mc.example.com")).toBe("https://mc.example.com");
  });

  test("env var is honored when no explicit override", () => {
    process.env.NEXT_PUBLIC_MC_API_BASE = "https://mc.internal:3100/";
    expect(mcApiBase()).toBe("https://mc.internal:3100");
  });

  test("explicit override beats env var", () => {
    process.env.NEXT_PUBLIC_MC_API_BASE = "https://env.example.com";
    expect(mcApiBase("https://explicit.example.com/")).toBe("https://explicit.example.com");
  });
});

// ---------------------------------------------------------------------------
// MC_TERMINAL
// ---------------------------------------------------------------------------

describe("MC_TERMINAL", () => {
  test("is exactly the four documented terminal states", () => {
    expect(new Set(MC_TERMINAL)).toEqual(new Set(["SUCCEEDED", "FAILED", "UNKNOWN", "DENIED"]));
  });

  test("UNKNOWN is terminal (polling must stop on it)", () => {
    expect(MC_TERMINAL.has("UNKNOWN")).toBe(true);
  });

  test("non-terminal states are not members", () => {
    for (const s of ["RUNNING", "QUEUED", "CREATED", "CANCELLED", ""]) {
      expect(MC_TERMINAL.has(s)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// fetchMcCatalog
// ---------------------------------------------------------------------------

describe("fetchMcCatalog", () => {
  const catalog = {
    ok: true,
    agents: [
      {
        id: "ollama",
        family: "local",
        status: "ok",
        allowedCapabilities: ["summarize"],
        claim: "proven",
        claim_note: "n",
      },
    ],
    tenants: ["happy-place", "coppersmith-plumbing"],
    constraints: { no_network: true },
    prompt_max: 2000,
    deadlines_seconds: { ollama: 120 },
  };

  test("returns the catalog on ok:true", async () => {
    enqueue({ status: 200, json: catalog });
    const c = await fetchMcCatalog("https://mc.example.com");
    expect(c.agents[0].id).toBe("ollama");
    expect(c.tenants).toContain("happy-place");
    expect(lastCall().url).toBe("https://mc.example.com/api/mc/dispatch");
  });

  test("throws when the catalog body is not ok", async () => {
    enqueue({ status: 200, json: { ok: false, error: "down" } });
    await expect(fetchMcCatalog()).rejects.toThrow("dispatch catalog unavailable");
  });

  test("throws on empty body", async () => {
    enqueue({ status: 200, json: null });
    await expect(fetchMcCatalog()).rejects.toThrow("dispatch catalog unavailable");
  });
});

// ---------------------------------------------------------------------------
// fetchMcMissions / fetchMcMission
// ---------------------------------------------------------------------------

describe("fetchMcMissions", () => {
  test("returns missions and as_of", async () => {
    enqueue({ status: 200, json: { ok: true, missions: [{ mission_id: "m1" }], as_of: "t" } });
    const { missions, as_of } = await fetchMcMissions();
    expect(missions).toHaveLength(1);
    expect(as_of).toBe("t");
    expect(lastCall().url).toBe("/api/mc/missions");
  });

  test("defaults missing missions to []", async () => {
    enqueue({ status: 200, json: { ok: true, as_of: "t" } });
    const { missions } = await fetchMcMissions();
    expect(missions).toEqual([]);
  });

  test("throws when the list is unavailable", async () => {
    enqueue({ status: 200, json: { ok: false } });
    await expect(fetchMcMissions()).rejects.toThrow("missions list unavailable");
  });
});

describe("fetchMcMission", () => {
  test("returns the detail on ok", async () => {
    enqueue({ status: 200, json: { ok: true, mission: { mission_id: "m1", status: "SUCCEEDED" } } });
    const d = await fetchMcMission("", "m1");
    expect(d?.mission_id).toBe("m1");
    expect(lastCall().url).toBe("/api/mc/missions/m1");
  });

  test("URL-encodes the mission id", async () => {
    enqueue({ status: 200, json: { ok: true, mission: { mission_id: "a/b" } } });
    await fetchMcMission("", "a/b");
    expect(lastCall().url).toBe("/api/mc/missions/a%2Fb");
  });

  test("returns null (not throw) when the mission is absent", async () => {
    enqueue({ status: 200, json: { ok: false, error: "not found" } });
    await expect(fetchMcMission("", "nope")).resolves.toBeNull();
  });

  test("returns null when ok but mission missing", async () => {
    enqueue({ status: 200, json: { ok: true } });
    await expect(fetchMcMission("", "nope")).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// postMcDispatch — the safety-critical mapping
// ---------------------------------------------------------------------------

describe("postMcDispatch", () => {
  const input = {
    prompt: "Summarize today's jobs",
    agent: "ollama",
    capability: "summarize",
    tenant: "happy-place",
  };

  test("POSTs JSON to /api/mc/dispatch with exactly the four caller-bound fields", async () => {
    enqueue({
      status: 200,
      json: { ok: true, status: "SUCCEEDED", mission_id: "m", run_id: "r", execution_id: "e", work_order_id: "w" },
    });
    await postMcDispatch("", input);
    const c = lastCall();
    expect(c.url).toBe("/api/mc/dispatch");
    expect(c.init?.method).toBe("POST");
    expect(c.init?.headers).toEqual({ "content-type": "application/json" });
    const b = postBody();
    expect(Object.keys(b).sort()).toEqual(["agent", "capability", "prompt", "tenant"]);
    expect(b.tenant).toBe("happy-place");
    // No idempotency key by design: the UI never blind-retries a POST.
    expect(b).not.toHaveProperty("idempotency_key");
    expect(b).not.toHaveProperty("idempotencyKey");
  });

  test("tenant is caller-bound: the page's fixed SITE_ID flows through untouched", async () => {
    enqueue({
      status: 200,
      json: { ok: true, status: "SUCCEEDED", mission_id: "m", run_id: "r", execution_id: "e", work_order_id: "w" },
    });
    await postMcDispatch("", { ...input, tenant: "coppersmith-plumbing" });
    expect(postBody().tenant).toBe("coppersmith-plumbing");
  });

  test("HTTP 403 maps to DENIED (not failed), carrying mission_id and reason", async () => {
    enqueue({ status: 403, json: { status: "DENIED", mission_id: "m-denied", reason: "identity_5 not allowed" } });
    const r = await postMcDispatch("", input);
    expect(r).toEqual({ ok: false, status: "DENIED", mission_id: "m-denied", reason: "identity_5 not allowed" });
  });

  test("200 + j.status DENIED also maps to DENIED", async () => {
    enqueue({ status: 200, json: { status: "DENIED", mission_id: "m2", reason: "capability not granted" } });
    const r = await postMcDispatch("", input);
    expect(r.ok).toBe(false);
    expect(r.status).toBe("DENIED");
  });

  test("SUCCEEDED maps to ok:true", async () => {
    enqueue({
      status: 200,
      json: {
        ok: true,
        status: "SUCCEEDED",
        mission_id: "m",
        run_id: "r",
        execution_id: "e",
        work_order_id: "w",
        output_digest: "abc",
      },
    });
    const r = await postMcDispatch("", input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe("SUCCEEDED");
      expect(r.output_digest).toBe("abc");
    }
  });

  test("FAILED maps to ok:true with status FAILED (terminal, honest)", async () => {
    enqueue({
      status: 200,
      json: { ok: true, status: "FAILED", mission_id: "m", run_id: "r", execution_id: "e", work_order_id: "w", error: "boom" },
    });
    const r = await postMcDispatch("", input);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.status).toBe("FAILED");
  });

  test("UNKNOWN is returned as UNKNOWN — never collapsed to FAILED or REJECTED", async () => {
    enqueue({
      status: 200,
      json: {
        ok: true,
        status: "UNKNOWN",
        mission_id: "m",
        run_id: "r",
        execution_id: "e",
        work_order_id: "w",
        reconciliation_state: "RECONCILIATION IN PROGRESS",
      },
    });
    const r = await postMcDispatch("", input);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.status).toBe("UNKNOWN");
      expect(r.reconciliation_state).toBe("RECONCILIATION IN PROGRESS");
    }
    // And the UNKNOWN status is in the terminal set, so the UI must stop polling.
    expect(MC_TERMINAL.has("UNKNOWN")).toBe(true);
  });

  test("transport throw maps to REJECTED with http 0 (outcome unknown, not failed)", async () => {
    enqueue({ status: 0, json: new Error("socket hang up") });
    const r = await postMcDispatch("", input);
    expect(r).toEqual({ ok: false, status: "REJECTED", http: 0, error: "dispatch_error", detail: "Error: socket hang up" });
  });

  test("unrecognized shape maps to REJECTED, never silently ok", async () => {
    enqueue({ status: 200, json: { hello: "world" } });
    const r = await postMcDispatch("", input);
    expect(r.ok).toBe(false);
    expect(r.status).toBe("REJECTED");
  });

  test("ok:true with an unknown status string maps to REJECTED", async () => {
    enqueue({ status: 200, json: { ok: true, status: "RUNNING", mission_id: "m" } });
    const r = await postMcDispatch("", input);
    expect(r.status).toBe("REJECTED");
  });
});
