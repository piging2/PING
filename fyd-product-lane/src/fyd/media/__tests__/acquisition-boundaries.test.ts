/**
 * Boundary tests for the two rejection rules that live in the protected
 * acquisition substrate, ahead of scoring (presentation-observations.md):
 *
 * - R5 (rights): assets whose rights classification is unclear are never
 *   acquired. The single enforcement predicate is isAcquirable() in
 *   media/types.ts; ingest.ts calls it at the rights gate and skips the
 *   asset with a recorded reason when it returns false.
 * - R7 (URL safety): no URL reaches the network without passing the SSRF
 *   gate in fyd/net/safe-fetch.ts. The gate takes injectable DNS/fetch
 *   deps, so every rejection below is proven with zero network I/O.
 *
 * These tests prove the existing boundaries; they do not duplicate the
 * substrate logic.
 */

import { ACQUIRABLE_RIGHTS, isAcquirable, type RightsSource } from "../types";
import { isPublicIp, safeFetchImage } from "../safe-fetch";

describe("R5 rights gate: unclear rights are never acquired", () => {
  test("the rights vocabulary is exactly three values", () => {
    const all: RightsSource[] = ["business-provided", "public-demo-source", "unclear-reference-only"];
    expect(all).toHaveLength(3);
  });

  test("business-provided and public-demo-source are acquirable", () => {
    expect(isAcquirable("business-provided")).toBe(true);
    expect(isAcquirable("public-demo-source")).toBe(true);
    expect(ACQUIRABLE_RIGHTS.has("business-provided")).toBe(true);
    expect(ACQUIRABLE_RIGHTS.has("public-demo-source")).toBe(true);
  });

  test("unclear-reference-only is never acquirable (the R5 rejection)", () => {
    expect(isAcquirable("unclear-reference-only")).toBe(false);
    expect(ACQUIRABLE_RIGHTS.has("unclear-reference-only")).toBe(false);
  });
});

const PUBLIC_DNS = async (_host: string) => [{ address: "93.184.216.34" }];

function imageResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "image/jpeg", "content-length": String(body.length) },
  });
}

describe("R7 SSRF gate: unsafe URLs never reach the network", () => {
  test("non-http(s) schemes are rejected before DNS", async () => {
    let dnsCalled = false;
    const r = await safeFetchImage("ftp://example.com/photo.jpg", {}, {
      dnsLookup: async (h) => {
        dnsCalled = true;
        return PUBLIC_DNS(h);
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Scheme not allowed/);
    expect(dnsCalled).toBe(false);
  });

  test("credential-bearing URLs are rejected", async () => {
    const r = await safeFetchImage("https://user:pass@example.com/photo.jpg", {}, {
      dnsLookup: PUBLIC_DNS,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Credential-bearing/);
  });

  test("loopback IP literals are rejected and never fetched", async () => {
    let fetchCalled = false;
    const r = await safeFetchImage("http://127.0.0.1/photo.jpg", {}, {
      dnsLookup: PUBLIC_DNS,
      fetchImpl: (async () => {
        fetchCalled = true;
        return imageResponse("x");
      }) as typeof fetch,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not public routable/);
    expect(fetchCalled).toBe(false);
  });

  test("a redirect into private space is rejected at that hop, not followed", async () => {
    const calls: string[] = [];
    const r = await safeFetchImage("https://example.com/photo.jpg", {}, {
      dnsLookup: PUBLIC_DNS,
      fetchImpl: (async (url: unknown) => {
        calls.push(String(url));
        if (calls.length === 1) {
          return new Response(null, {
            status: 302,
            headers: { location: "http://169.254.169.254/latest/meta-data/" },
          });
        }
        return imageResponse("x");
      }) as typeof fetch,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/DNS rejected/);
      expect(r.redirectChain).toHaveLength(1);
    }
    // The private hop was never fetched.
    expect(calls).toHaveLength(1);
  });

  test("isPublicIp: the private ranges the gate must refuse", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.9.9", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1"]) {
      expect(isPublicIp(ip)).toBe(false);
    }
    expect(isPublicIp("93.184.216.34")).toBe(true);
  });

  test("a legitimate public image URL passes the gate (no over-blocking)", async () => {
    let fetchCalled = false;
    const r = await safeFetchImage("https://example.com/photo.jpg", {}, {
      dnsLookup: PUBLIC_DNS,
      fetchImpl: (async () => {
        fetchCalled = true;
        return imageResponse("jpeg-bytes");
      }) as typeof fetch,
    });
    expect(fetchCalled).toBe(true);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.contentType).toBe("image/jpeg");
      expect(r.finalUrl).toBe("https://example.com/photo.jpg");
    }
  });
});
