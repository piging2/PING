/**
 * SSRF RE-PROOF (P0 #3, FYD converge-now directive, 2026-10-02).
 *
 * FYD's core product begins with PASTE A URL. This file attacks the EXISTING
 * fetch boundary (src/safe-fetch.ts, the one canonical SSRF gate) with the
 * directive's attack matrix, one vector per test. Every test is mocked: DNS
 * and fetch are injected, no real socket is ever opened, nothing probes
 * production or private targets.
 *
 * Verdict per vector is recorded in the test name: BLOCKED or ALLOWED.
 * ALLOWED appears only where the boundary's evident intent permits it
 * (plain http/https to public space); the policy is pinned, not invented.
 */

import { safeFetchPage } from "../src/safe-fetch";
import { resolveSafeLink } from "../src/safe-link";

const PUBLIC_DNS = async (hostname: string) => {
  if (hostname === "example.com" || hostname === "example.org") {
    return [{ address: "93.184.216.34" }];
  }
  throw new Error("getaddrinfo ENOTFOUND " + hostname);
};

/** Faithful stub: models what production DNS returns for localhost. */
const LOCALHOST_DNS = async (hostname: string) => {
  if (hostname === "localhost") return [{ address: "127.0.0.1" }, { address: "::1" }];
  return PUBLIC_DNS(hostname);
};

const OK_PAGE = () =>
  new Response("<title>ok</title>", { headers: { "content-type": "text/html" } });

function stubFetch(
  handler: (url: string) => Promise<Response>,
): typeof fetch {
  return (async (url: string | URL | Request) => handler(String(url))) as unknown as typeof fetch;
}

async function expectBlocked(url: string, dnsLookup: typeof PUBLIC_DNS = PUBLIC_DNS) {
  const fetchImpl = jest.fn(stubFetch(async () => OK_PAGE()));
  const r = await safeFetchPage(url, {}, { dnsLookup, fetchImpl });
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.reason).toMatch(/not public routable|DNS rejected|URL rejected/);
  expect(fetchImpl).not.toHaveBeenCalled();
  return r;
}

describe("P0#3 loopback literals: BLOCKED", () => {
  test.each(["http://127.0.0.1/", "http://[::1]/", "http://0.0.0.0/"])(
    "BLOCKED %s without fetching",
    async (url) => {
      await expectBlocked(url);
    },
  );

  test("BLOCKED http://localhost/ when DNS answers loopback (faithful stub)", async () => {
    const r = await expectBlocked("http://localhost/", LOCALHOST_DNS);
    if (!r.ok) expect(r.reason).toMatch(/non-public 127\.0\.0\.1/);
  });

  test("BLOCKED http://localhost/ when DNS fails (fail closed, no NXDOMAIN fetch)", async () => {
    // PUBLIC_DNS throws ENOTFOUND for localhost: unresolvable names never fetch.
    await expectBlocked("http://localhost/");
  });
});

describe("P0#3 RFC1918: BLOCKED", () => {
  test.each(["http://10.9.8.7/", "http://172.16.4.2/", "http://192.168.0.10/"])(
    "BLOCKED %s without fetching",
    async (url) => {
      await expectBlocked(url);
    },
  );
});

describe("P0#3 link-local + cloud metadata endpoint: BLOCKED", () => {
  test.each(["http://169.254.10.20/", "http://169.254.169.254/"])(
    "BLOCKED %s without fetching",
    async (url) => {
      await expectBlocked(url);
    },
  );

  test("BLOCKED public URL 302-redirecting to the metadata endpoint", async () => {
    const fetchImpl = jest.fn(
      stubFetch(async (u) => {
        if (u === "http://example.com/") {
          return new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest/meta-data/" },
          });
        }
        throw new Error("must never fetch " + u);
      }),
    );
    const r = await safeFetchPage("http://example.com/", {}, { dnsLookup: PUBLIC_DNS, fetchImpl });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/not public routable/);
      expect(r.redirectChain).toHaveLength(1);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("BLOCKED public URL 302-redirecting to private space via alternate encoding", async () => {
    const fetchImpl = jest.fn(
      stubFetch(async (u) => {
        if (u === "http://example.com/") {
          return new Response(null, { status: 302, headers: { location: "http://0x7f.1/" } });
        }
        throw new Error("must never fetch " + u);
      }),
    );
    const r = await safeFetchPage("http://example.com/", {}, { dnsLookup: PUBLIC_DNS, fetchImpl });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not public routable/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("BLOCKED public URL 302-redirecting to a credentialed private URL", async () => {
    const fetchImpl = jest.fn(
      stubFetch(async (u) => {
        if (u === "http://example.com/") {
          return new Response(null, {
            status: 302,
            headers: { location: "http://user:pass@169.254.169.254/" },
          });
        }
        throw new Error("must never fetch " + u);
      }),
    );
    const r = await safeFetchPage("http://example.com/", {}, { dnsLookup: PUBLIC_DNS, fetchImpl });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Credential-bearing URLs are rejected/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("P0#3 alternate numeric IP representations: BLOCKED", () => {
  // 2130706433 / 0x7f000001 / 0177.0.0.1 / 127.1 are covered in
  // ssrf-adversarial.test.ts; these two close the remaining spellings.
  test.each(["http://0x7f.1/", "http://017700000001/"])(
    "BLOCKED %s (parser normalizes to 127.0.0.1) without fetching",
    async (url) => {
      expect(new URL(url).hostname).toBe("127.0.0.1");
      await expectBlocked(url);
    },
  );
});

describe("P0#3 credential-bearing URLs stay REJECTED", () => {
  test("BLOCKED http://user@example.com/ (bare user, no password)", async () => {
    await expectBlocked("http://user@example.com/");
  });

  test("safe-link keeps credential-bearing URLs non-navigable", () => {
    expect(resolveSafeLink("https://user:pass@example.com/", "navigate")).toEqual({
      kind: "non_navigable",
    });
    expect(resolveSafeLink("https://user@example.com/", "navigate")).toEqual({
      kind: "non_navigable",
    });
  });
});

describe("P0#3 unsupported schemes: BLOCKED", () => {
  // ftp/file/javascript/data are covered in safe-fetch.test.ts; gopher closes the list.
  test("BLOCKED gopher://example.com/", async () => {
    const fetchImpl = jest.fn(stubFetch(async () => OK_PAGE()));
    const r = await safeFetchPage("gopher://example.com/", {}, { dnsLookup: PUBLIC_DNS, fetchImpl });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Scheme not allowed/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("safe-link keeps non-navigable schemes non-navigable", () => {
    for (const raw of ["ftp://example.com/x", "file:///etc/passwd", "gopher://example.com/", "javascript:alert(1)", "data:text/html,<h1>x</h1>"]) {
      expect(resolveSafeLink(raw, "navigate")).toEqual({ kind: "non_navigable" });
    }
  });
});

describe("P0#3 scheme policy pin: http AND https to public space are ALLOWED", () => {
  // Evident intent of the existing boundary: NAVIGABLE_SCHEMES = http/https,
  // safe-fetch header "HTTP/HTTPS only". This test pins the policy so a
  // future change (e.g. https-only) is a deliberate, reviewed decision.
  test.each(["http://example.com/", "https://example.com/"])(
    "ALLOWED %s (public, no credentials)",
    async (url) => {
      const fetchImpl = jest.fn(stubFetch(async () => OK_PAGE()));
      const r = await safeFetchPage(url, {}, { dnsLookup: PUBLIC_DNS, fetchImpl });
      expect(r.ok).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );
});

describe("P0#3 DNS rebinding assumption: PROVEN, not claimed", () => {
  test("each redirect hop re-resolves AND re-checks (no pinning across hops)", async () => {
    const seen: string[] = [];
    const dnsLookup = async (hostname: string) => {
      seen.push(hostname);
      if (hostname === "evil.example") return [{ address: "10.0.0.5" }];
      return PUBLIC_DNS(hostname);
    };
    const fetchImpl = jest.fn(
      stubFetch(async (u) => {
        if (u === "http://example.com/") {
          return new Response(null, { status: 302, headers: { location: "http://evil.example/" } });
        }
        throw new Error("must never fetch " + u);
      }),
    );
    const r = await safeFetchPage("http://example.com/", {}, { dnsLookup, fetchImpl });
    // The SECOND hop's fresh DNS answer (private) is checked, not trusted
    // from hop one. A boundary that pinned hop one's resolution would fetch.
    expect(seen).toEqual(["example.com", "evil.example"]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/non-public 10\.0\.0\.5/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("ASSUMPTION: the gate validates its own DNS view; the socket resolves independently", async () => {
    // Models production: safeFetch's dnsLookup is the gate's check, but the
    // real fetch re-resolves on its own socket stack. Between the two
    // resolutions the answer can change (DNS rebinding). The stub fetchImpl
    // simulates the socket stack by consulting a SECOND resolver.
    const gateDns = async (_h: string) => [{ address: "93.184.216.34" }];
    const socketDns = async (_h: string) => [{ address: "169.254.169.254" }];
    const dialed: string[] = [];
    const fetchImpl = stubFetch(async (url) => {
      const host = new URL(String(url)).hostname;
      dialed.push((await socketDns(host))[0]!.address);
      return OK_PAGE();
    });
    const r = await safeFetchPage("http://rebind.example/", {}, { dnsLookup: gateDns, fetchImpl });
    // The gate passed: its DNS view was public, so it authorized the fetch.
    expect(r.ok).toBe(true);
    // But the socket layer resolved the same hostname to an address the gate
    // never validated. This is the documented residual TOCTOU: the boundary
    // assumes check-time DNS answers hold at connect time. Production
    // deployments needing atomicity must pin the validated address at the
    // socket layer (see the module header); the gate does not claim it away.
    expect(dialed).toEqual(["169.254.169.254"]);
  });
});
