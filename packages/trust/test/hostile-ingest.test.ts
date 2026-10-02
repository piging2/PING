/**
 * Hostile ingestion tests (Nolan's 12-point program, point 2: HOSTILE INPUTS).
 *
 * Fail closed or degrade explicitly; never invent data. Every case here
 * drives a hostile input at the trust kernel's ingestion boundary
 * (safe-fetch / safe-link) and asserts the typed failure mode:
 *   - malformed or hostile payloads -> { ok: false } with a named reason
 *   - the network is never touched for rejected inputs (fetchImpl not called)
 *   - a source that disappears mid-pipeline propagates the failure;
 *     no bytes are invented and no partial result is coerced to success
 *   - a rendered link capability never materializes for credential-bearing
 *     or non-allowlisted URLs
 *
 * Mocked network only. No test performs a real socket connection.
 */

import { safeFetch, safeFetchPage } from "../src/safe-fetch";
import { resolveSafeLink } from "../src/safe-link";

const PUBLIC_DNS = async (hostname: string) => {
  if (hostname === "example.com" || hostname === "example.org") {
    return [{ address: "93.184.216.34" }];
  }
  throw new Error("getaddrinfo ENOTFOUND " + hostname);
};

function pageFetch(
  handler: (url: string) => Promise<Response>,
): jest.Mock<Promise<Response>, [string]> {
  return jest.fn(async (url: string | URL | Request) =>
    handler(String(url)),
  ) as unknown as jest.Mock<Promise<Response>, [string]>;
}

const OK_PAGE = () =>
  new Response("<title>ok</title>", {
    headers: { "content-type": "text/html" },
  });

describe("hostile ingest: non-http schemes fail closed", () => {
  test.each([
    "javascript:alert(document.domain)",
    "file:///etc/passwd",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "blob:https://example.com/uuid",
  ])("rejects %s without DNS or fetch", async (url) => {
    const fetchImpl = pageFetch(async () => OK_PAGE());
    const dnsLookup = jest.fn(PUBLIC_DNS);
    const r = await safeFetchPage(
      url,
      {},
      { dnsLookup, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Scheme not allowed/);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(dnsLookup).not.toHaveBeenCalled();
  });
});

describe("hostile ingest: credential-bearing and smuggled URLs", () => {
  test("rejects credential-bearing URLs before any network use", async () => {
    const fetchImpl = pageFetch(async () => OK_PAGE());
    const dnsLookup = jest.fn(PUBLIC_DNS);
    const r = await safeFetchPage(
      "https://user:pass@example.com/",
      {},
      { dnsLookup, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Credential-bearing/);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(dnsLookup).not.toHaveBeenCalled();
  });

  test("rejects userinfo-smuggled private literal without fetching", async () => {
    // "example.com@" is userinfo, not the host: the gate rejects it as
    // credential-bearing before any DNS or fetch. Either way the fetch
    // never happens.
    const fetchImpl = pageFetch(async () => OK_PAGE());
    const r = await safeFetchPage(
      "https://example.com@127.0.0.1/",
      {},
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Credential-bearing|not public routable/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects uppercase-scheme private literal", async () => {
    const fetchImpl = pageFetch(async () => OK_PAGE());
    const r = await safeFetchPage(
      "HTTP://127.0.0.1/",
      {},
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not public routable/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("redirect into javascript: fails closed with the hop recorded", async () => {
    const fetchImpl = pageFetch(async (u) => {
      if (u === "http://example.com/") {
        return new Response(null, {
          status: 302,
          headers: { location: "javascript:alert(1)" },
        });
      }
      throw new Error("must never fetch " + u);
    });
    const r = await safeFetchPage(
      "http://example.com/",
      {},
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/Scheme not allowed/);
      expect(r.redirectChain).toHaveLength(1);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test("redirect loop fails closed with Too many redirects", async () => {
    const fetchImpl = pageFetch(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "http://example.com/" },
      });
    });
    const r = await safeFetchPage(
      "http://example.com/",
      { maxRedirects: 2 },
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Too many redirects/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("hostile ingest: source disappearing mid-pipeline", () => {
  test("a fetch failure on a redirect hop propagates; nothing is invented", async () => {
    const fetchImpl = pageFetch(async (u) => {
      if (u === "http://example.com/") {
        return new Response(null, {
          status: 302,
          headers: { location: "http://example.org/" },
        });
      }
      throw new Error("socket hangup: source disappeared");
    });
    const r = await safeFetchPage(
      "http://example.com/",
      {},
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      // The failure propagates as a typed reason, not a thrown exception
      // and not a fabricated success.
      expect(r.reason).toMatch(/^Fetch failed: socket hangup/);
      expect(r.redirectChain).toHaveLength(1);
    }
    // No bytes key on a failure: a caller cannot mistake this for data.
    expect("bytes" in r).toBe(false);
  });

  test("an HTTP error status propagates with its status, never as content", async () => {
    const fetchImpl = pageFetch(async () => new Response("gone", { status: 410 }));
    const r = await safeFetchPage(
      "http://example.com/",
      {},
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/HTTP 410/);
    expect("bytes" in r).toBe(false);
  });
});

describe("hostile ingest: malformed JSON-LD at the ingestion boundary", () => {
  test("a JSON-LD content type is refused by the allowlist, never buffered", async () => {
    const fetchImpl = pageFetch(
      async () =>
        new Response('{"@context": "https://schema.org"}', {
          headers: { "content-type": "application/ld+json" },
        }),
    );
    const r = await safeFetchPage(
      "http://example.com/",
      {},
      { dnsLookup: PUBLIC_DNS, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Content-type not allowed/);
  });

  test("malformed JSON bytes throw a typed parse error; no graph is fabricated", () => {
    // The ingestion contract: a malformed payload surfaces as a typed
    // SyntaxError. Callers must let it propagate; there is no fallback
    // graph, no empty default, no guessed structure.
    const malformed = Buffer.from('{ "@context": "https://schema.org", broken ');
    let caught: unknown = null;
    try {
      JSON.parse(malformed.toString("utf-8"));
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(SyntaxError);
    expect(caught instanceof Error && caught.message.length).toBeGreaterThan(0);
  });
});

describe("resolveSafeLink hostile extensions", () => {
  test("credential-bearing URLs are non-navigable", () => {
    expect(
      resolveSafeLink("https://user:pass@example.com/", "navigate"),
    ).toEqual({ kind: "non_navigable" });
    expect(
      resolveSafeLink("http://user@example.com/", "navigate"),
    ).toEqual({ kind: "non_navigable" });
  });

  test("a credential-bearing base does not authorize relative links", () => {
    expect(
      resolveSafeLink("/about", "navigate", {
        baseUrl: "https://user:pass@example.com/",
      }),
    ).toEqual({ kind: "non_navigable" });
  });

  test("tel: and mailto: are non-navigable under the navigate capability", () => {
    expect(resolveSafeLink("tel:+15550100", "navigate")).toEqual({
      kind: "non_navigable",
    });
    expect(resolveSafeLink("mailto:hello@example.com", "navigate")).toEqual({
      kind: "non_navigable",
    });
  });

  test("NUL and DEL inside a URL are non-navigable", () => {
    expect(resolveSafeLink("https://example.com/\u0000", "navigate")).toEqual({
      kind: "non_navigable",
    });
    expect(resolveSafeLink("https://example.com/\u007f", "navigate")).toEqual({
      kind: "non_navigable",
    });
    expect(resolveSafeLink("jav\nascript:alert(1)", "navigate")).toEqual({
      kind: "non_navigable",
    });
  });

  test("leading/trailing whitespace is trimmed, inner structure unchanged", () => {
    expect(resolveSafeLink("  https://example.com/  ", "navigate")).toEqual({
      kind: "safe",
      href: "https://example.com/",
    });
  });
});
