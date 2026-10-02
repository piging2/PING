/**
 * Q-J-04 contract invariant tests: SOURCE -> EVIDENCE seam.
 *
 * Each test falsifies one claim of Q-J-04-CONTRACT.md. Implemented claims
 * (C1-C5) are guarded by tests that fail if the implementation is removed.
 * CONTRACT-GAP claims (C6, C7) have tests that FAIL NOW BY DESIGN until a
 * writer lane implements asOf/revision/checkpoint and redirectChain
 * surfacing. Do not "fix" the gap tests by weakening them; implement the
 * contract fields.
 *
 * No real network: every case injects dnsLookup/fetchImpl stubs through
 * SafeFetchDeps, same as hostile.test.ts.
 */

import { createHash } from "node:crypto";
import { StaticAcquisitionAdapter } from "../static-adapter";
import { classifyFetchFailure, LiveAcquisitionError } from "../errors";
import type {
  AcquisitionPolicy,
  AcquisitionRequest,
  AcquiredObservation,
} from "../acquisition-adapter";
import type { SafeFetchDeps } from "@/fyd/net/safe-fetch";

const PUBLIC_DNS: SafeFetchDeps["dnsLookup"] = async () => [{ address: "93.184.216.34" }];

function stubFetch(handler: (url: string) => Response): SafeFetchDeps["fetchImpl"] {
  return (async (input: unknown) => handler(String(input))) as SafeFetchDeps["fetchImpl"];
}

const GOOD_HTML =
  "<html><head><title>Test Trade Co</title>" +
  '<meta name="robots" content="noindex">' +
  '<meta property="og:description" content="We fix pipes in Grand Junction.">' +
  '<meta property="og:url" content="https://www.testtradeco.example/">' +
  '</head><body><h1>Test Trade Co</h1><a href="/services">Services</a></body></html>';

function pageDeps(body: string = GOOD_HTML): SafeFetchDeps {
  return {
    dnsLookup: PUBLIC_DNS,
    fetchImpl: stubFetch((url) => {
      if (url.endsWith("/robots.txt"))
        return new Response("User-agent: *\nDisallow:\n", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }),
  };
}

const POLICY: AcquisitionPolicy = {
  maxBodyBytes: 5 * 1024 * 1024,
  timeoutMs: 10000,
  acquisitionTimeoutMs: 60000,
  maxRedirects: 5,
  blockPrivateNetworks: true,
  requireRobotsTxt: true,
  userAgent: "FYD-QJ04-Test/1.0",
  rateLimitPerDomainMs: 0,
  allowedContentTypes: ["text/html"],
  browserWallClockMs: 15000,
};

const REQUEST: AcquisitionRequest = {
  url: "https://www.testtradeco.example/",
  allowedDomains: ["testtradeco.example"],
  purpose: "q-j-04 contract test",
  allowDiscovery: false,
  pageBudget: 1,
  maxDepth: 0,
};

async function acquireOne(body: string = GOOD_HTML): Promise<AcquiredObservation> {
  const adapter = new StaticAcquisitionAdapter();
  const obs = await adapter.acquire(REQUEST, POLICY, pageDeps(body));
  if (obs.length !== 1) throw new Error("expected exactly one observation, got " + obs.length);
  return obs[0];
}

describe("Q-J-04 C1: evidenceHash = sha256(exact stored bytes)", () => {
  it("T-digest-exact: hash equals sha256 of the raw fetched bytes", async () => {
    const obs = await acquireOne();
    const expected = createHash("sha256").update(Buffer.from(GOOD_HTML, "utf8")).digest("hex");
    expect(obs.evidenceHash).toBe(expected);
  });

  it("T-digest-exact: a one-byte change in the body changes the hash", async () => {
    const a = await acquireOne();
    const b = await acquireOne(GOOD_HTML + " ");
    expect(a.evidenceHash).not.toBe(b.evidenceHash);
  });

  it("T-digest-format: 64 lowercase hex chars", async () => {
    const obs = await acquireOne();
    expect(obs.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Q-J-04 C2: provenance never silently empty", () => {
  it("T-provenance-complete: every required field present and non-degenerate", async () => {
    const obs = await acquireOne();
    expect(obs.url).toBe(REQUEST.url);
    expect(typeof obs.finalUrl).toBe("string");
    expect(obs.finalUrl.length).toBeGreaterThan(0);
    expect(new Date(obs.fetchedAt).toISOString()).toBe(obs.fetchedAt);
    expect(obs.statusCode).toBe(200);
    expect(obs.contentType).toContain("text/html");
    expect(obs.bytes).toBe(Buffer.byteLength(GOOD_HTML, "utf8"));
    expect(typeof obs.levelUsed).toBe("number");
    expect(Array.isArray(obs.policyNotes)).toBe(true);
    expect(obs.policyNotes.length).toBeGreaterThanOrEqual(1);
    for (const n of obs.policyNotes) expect(n.trim().length).toBeGreaterThan(0);
    expect(obs.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Array.isArray(obs.escalation)).toBe(true);
  });

  it("T-refusal-throws: hostile seeds throw typed errors, never return observations", async () => {
    const adapter = new StaticAcquisitionAdapter();
    const hostile: Array<[string, string]> = [
      ["http://10.0.0.5/", "ACQ_PRIVATE_IP"],
      ["ftp://example.com/file", "ACQ_SCHEME_REJECTED"],
      ["http://user:pass@example.com/", "ACQ_CREDENTIAL_URL"],
    ];
    for (const [url, code] of hostile) {
      const req = { ...REQUEST, url };
      let thrown: unknown = null;
      try {
        await adapter.acquire(req, POLICY, pageDeps());
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(LiveAcquisitionError);
      expect((thrown as LiveAcquisitionError).code).toBe(code);
    }
  });
});

describe("Q-J-04 C3: deterministic-extraction boundary (the L4 line)", () => {
  it("T-determinism: identical bytes twice -> identical observation modulo fetchedAt", async () => {
    const a = await acquireOne();
    const b = await acquireOne();
    const { fetchedAt: _fa, ...ra } = a as Record<string, unknown>;
    const { fetchedAt: _fb, ...rb } = b as Record<string, unknown>;
    void _fa;
    void _fb;
    expect(ra).toEqual(rb);
  });

  it("T-closed-shape: observation has exactly the contracted fields (no interpretive smuggling)", async () => {
    const obs = await acquireOne();
    const contracted = [
      "bytes",
      "canonicalUrl",
      "contentType",
      "depth",
      "escalation",
      "evidenceHash",
      "fetchedAt",
      "finalUrl",
      "html",
      "jsonLd",
      "levelUsed",
      "links",
      "meta",
      "openGraph",
      "policyNotes",
      "statusCode",
      "title",
      "truncated",
      "url",
    ].sort();
    expect(Object.keys(obs).sort()).toEqual(contracted);
  });
});

describe("Q-J-04 C4: visibility EXCLUSION (acquisition never decides presentation privacy)", () => {
  it("T-noindex-recorded-not-acted: a noindex page still yields a full observation", async () => {
    const obs = await acquireOne();
    // Recorded as evidence...
    expect(obs.meta["robots"]).toBe("noindex");
    // ...never acted on: the observation is complete, not suppressed.
    expect(obs.title).toBe("Test Trade Co");
    expect(obs.evidenceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(obs.policyNotes.length).toBeGreaterThanOrEqual(1);
  });

  it("T-no-visibility-field: the closed shape carries no presentation-privacy decision", async () => {
    const obs = await acquireOne();
    const keys = Object.keys(obs);
    for (const forbidden of ["visibility", "publishable", "hidden", "redacted", "suppress", "noindex_action"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe("Q-J-04 C5: 17-code status taxonomy pinned", () => {
  const PINNED_17 = [
    "ACQ_INVALID_URL",
    "ACQ_SCHEME_REJECTED",
    "ACQ_CREDENTIAL_URL",
    "ACQ_PRIVATE_IP",
    "ACQ_DNS_FAILED",
    "ACQ_HTTP_STATUS",
    "ACQ_REDIRECT_LOOP",
    "ACQ_CONTENT_TYPE_REJECTED",
    "ACQ_TOO_LARGE",
    "ACQ_TIMEOUT",
    "ACQ_NETWORK_ERROR",
    "ACQ_ROBOTS_DISALLOWED",
    "ACQ_EMPTY_CONTENT",
    "ACQ_NO_GRAPH",
    "ACQ_VERIFY_FAILED",
    "ACQ_PLAN_FAILED",
    "MEDIA_RIGHTS_SCOPE",
  ];

  it("T-taxonomy-pinned: the classifier only ever emits pinned codes", () => {
    const reasons = [
      "URL rejected: Not a parseable URL",
      "URL rejected: Scheme not allowed: ftp:",
      "URL rejected: Credential-bearing URLs are rejected",
      "DNS rejected: IP literal is not public routable space: 10.0.0.1",
      "DNS rejected: DNS for x resolves to non-public 192.168.0.1",
      "DNS rejected: DNS resolution failed for x",
      "Fetch failed: The operation was aborted due to timeout",
      "Fetch failed: connect ECONNREFUSED",
      "HTTP 404",
      "Content-type not allowed: application/pdf",
      "Body exceeded size limit 5242880",
      "Too many redirects (>5)",
    ];
    for (const r of reasons) {
      expect(PINNED_17).toContain(classifyFetchFailure(r));
    }
  });

  it("T-taxonomy-pinned: every gate-reachable code is reachable", () => {
    const pairs: Array<[string, string]> = [
      ["URL rejected: Not a parseable URL", "ACQ_INVALID_URL"],
      ["URL rejected: Scheme not allowed: ftp:", "ACQ_SCHEME_REJECTED"],
      ["URL rejected: Credential-bearing URLs are rejected", "ACQ_CREDENTIAL_URL"],
      ["DNS rejected: IP literal is not public", "ACQ_PRIVATE_IP"],
      ["DNS rejected: DNS resolution failed", "ACQ_DNS_FAILED"],
      ["HTTP 500", "ACQ_HTTP_STATUS"],
      ["Too many redirects (>5)", "ACQ_REDIRECT_LOOP"],
      ["Content-type not allowed: x", "ACQ_CONTENT_TYPE_REJECTED"],
      ["Body exceeded size limit 1", "ACQ_TOO_LARGE"],
      ["Fetch failed: timed out", "ACQ_TIMEOUT"],
      ["Fetch failed: boom", "ACQ_NETWORK_ERROR"],
    ];
    for (const [reason, code] of pairs) {
      expect(classifyFetchFailure(reason)).toBe(code);
    }
  });

  it("T-fallback-closed: an unrecognized reason fails closed to ACQ_NETWORK_ERROR", () => {
    expect(classifyFetchFailure("something completely unexpected")).toBe("ACQ_NETWORK_ERROR");
    expect(classifyFetchFailure("")).toBe("ACQ_NETWORK_ERROR");
  });
});

describe("Q-J-04 C6: temporal identity (CONTRACT-GAP, fails by design)", () => {
  it("T-asof: observation carries an explicit asOf instant", async () => {
    const obs = await acquireOne();
    expect((obs as unknown as Record<string, unknown>)["asOf"]).toEqual(expect.any(String));
  });

  it("T-revision: observation carries a content revision bound to evidenceHash", async () => {
    const obs = await acquireOne();
    expect((obs as unknown as Record<string, unknown>)["revision"]).toEqual(expect.any(String));
  });

  it("T-checkpoint: observation carries the acquisition-run checkpoint identity", async () => {
    const obs = await acquireOne();
    expect((obs as unknown as Record<string, unknown>)["checkpoint"]).toEqual(expect.any(String));
  });
});

describe("Q-J-04 C7: redirectChain surfacing (CONTRACT-GAP, fails by design)", () => {
  it("T-redirect-chain: observation surfaces the gate's per-hop redirect chain", async () => {
    const obs = await acquireOne();
    const chain = (obs as unknown as Record<string, unknown>)["redirectChain"];
    expect(Array.isArray(chain)).toBe(true);
  });
});
