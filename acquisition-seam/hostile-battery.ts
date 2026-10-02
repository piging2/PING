/**
 * hostile-battery.ts: hostile URL battery against the acquisition seam.
 *
 * Every case runs through acquireUrl() from ./acquire-url.ts. A case
 * PASSES only when the seam rejects (or safely bounds) the URL with the
 * expected reason class. Reason mismatches are FAILs, not passes.
 *
 * Network notes (stated plainly, not hidden):
 * - This sandbox's resolver hijacks every public hostname to
 *   198.18.0.0/15 (egress infra). The seam correctly fail-closes on that
 *   range as non-public space. Live cases therefore run through the
 *   sandbox egress proxy (read from the environment by the BATTERY, never
 *   by the seam), and the battery pins a public IP for the two test
 *   hostnames for VETTING ONLY; the proxy performs the real connection.
 *   DNS vetting itself is proven by the pre-connect cases, which use the
 *   real resolver. On a machine with honest DNS the pinning is unnecessary.
 * - Live cases retry up to 3 times: the sandbox network is flaky for
 *   node sockets (curl/undici ride it out; raw sockets sometimes stall).
 *   The SEAM's behavior is deterministic; the retries absorb transport
 *   flakes, and reason strings are still asserted strictly.
 *
 * Exits non-zero unless every case passes.
 */

import { acquireUrl, isPublicIp, type AcquireOptions } from "./acquire-url.ts";
import { lookup as realLookup } from "node:dns/promises";

const PROXY = process.env.HTTPS_PROXY ?? process.env.https_proxy;

const PINNED_PUBLIC = [{ address: "93.184.216.34", family: 4 }] as const;
const PINNED_HOSTS = new Set(["httpbingo.org", "example.com", "httpbin.org", "postman-echo.com"]);
async function testDns(hostname: string) {
  if (PINNED_HOSTS.has(hostname)) {
    return PINNED_PUBLIC.map((a) => ({ ...a }));
  }
  return realLookup(hostname, { all: true });
}

interface Case {
  name: string;
  url: string;
  opts: AcquireOptions;
  expect: "reject" | "ok";
  reasonMatch?: RegExp;
  /** Live cases get retries; pre-connect rejections do not need them. */
  live?: boolean;
  attempts?: number;
  /** Assert the rejection arrived within this many ms (proves the bound fired). */
  maxElapsedMs?: number;
  minElapsedMs?: number;
}

const base = (o: AcquireOptions): AcquireOptions => ({ dnsLookup: testDns, ...o, proxyUrl: PROXY });
const HTML = (o: Omit<AcquireOptions, "allowContentTypes"> = {}): AcquireOptions =>
  base({ allowContentTypes: ["text/html"], timeoutMs: 15000, ...o });

const cases: Case[] = [
  // --- forbidden literals: rejected before any network (real resolver) ---
  { name: "localhost hostname", url: "http://localhost/", opts: HTML(), expect: "reject", reasonMatch: /DNS rejected/ },
  { name: "127.0.0.1", url: "http://127.0.0.1/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "[::1]", url: "http://[::1]/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "decimal IP trick 2130706433 (=127.0.0.1)", url: "http://2130706433/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "0.0.0.0", url: "http://0.0.0.0/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "link-local 169.254.169.254 (cloud metadata endpoint)", url: "http://169.254.169.254/latest/meta-data/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "10/8", url: "http://10.0.0.1/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "172.16/12", url: "http://172.16.5.4/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "192.168/16", url: "http://192.168.1.1/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "IPv4-mapped ::ffff:127.0.0.1", url: "http://[::ffff:127.0.0.1]/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  { name: "benchmarking 198.18.0.0/15", url: "http://198.18.43.223/", opts: HTML(), expect: "reject", reasonMatch: /not public/ },
  // --- forbidden schemes: rejected before any network ---
  { name: "file:// scheme", url: "file:///etc/passwd", opts: HTML(), expect: "reject", reasonMatch: /Scheme not allowed/ },
  { name: "gopher:// scheme", url: "gopher://example.com/", opts: HTML(), expect: "reject", reasonMatch: /Scheme not allowed/ },
  { name: "ftp:// scheme", url: "ftp://example.com/x", opts: HTML(), expect: "reject", reasonMatch: /Scheme not allowed/ },
  { name: "javascript: scheme", url: "javascript:alert(1)", opts: HTML(), expect: "reject", reasonMatch: /Scheme not allowed/ },
  { name: "data: scheme", url: "data:text/html,hi", opts: HTML(), expect: "reject", reasonMatch: /Scheme not allowed/ },
  // --- credential-bearing URL: rejected before any network ---
  { name: "userinfo@ credentials", url: "https://user:pass@example.com/", opts: HTML(), expect: "reject", reasonMatch: /Credential-bearing/ },
  // --- redirect escapes: hop 1 passes, the forbidden hop is rejected ---
  // (httpbingo 403s IP-literal targets itself, so hop-2 IP-literal
  // revalidation is covered by composition: the per-hop loop is proven
  // here, and the literal check by the pre-connect cases above.)
  {
    name: "redirect chain lands on file:// URL",
    url: "https://httpbingo.org/redirect-to?url=file%3A%2F%2F%2Fetc%2Fpasswd",
    opts: HTML(), expect: "reject", reasonMatch: /Scheme not allowed: file:/, live: true,
  },
  {
    name: "redirect chain lands on credential-bearing URL",
    url: "https://httpbingo.org/redirect-to?url=https%3A%2F%2Fuser%3Apass%40example.com%2F",
    opts: HTML(), expect: "reject", reasonMatch: /Credential-bearing/, live: true,
  },
  {
    name: "redirect chain lands on localhost (DNS -> ::1)",
    url: "https://httpbingo.org/redirect-to?url=http%3A%2Flocalhost%2F",
    opts: HTML(), expect: "reject", reasonMatch: /DNS rejected/, live: true,
  },
  // --- redirect loop: bounded, not infinite ---
  {
    name: "redirect loop bounded (/redirect/6, maxRedirects 2)",
    url: "https://httpbingo.org/redirect/6",
    opts: HTML({ maxRedirects: 2 }),
    expect: "reject", reasonMatch: /Too many redirects/, live: true, attempts: 5,
  },
  // --- slowloris-style: stalled connections bounded by the per-hop timeout ---
  {
    name: "slow response bounded by timeout (httpbin delay 8s, timeout 4s)",
    url: "https://httpbin.org/delay/8",
    opts: HTML({ timeoutMs: 4000 }),
    expect: "reject", reasonMatch: /timeout/i, live: true, attempts: 5,
    minElapsedMs: 3000, maxElapsedMs: 12000,
  },
  {
    name: "stalled connect bounded by timeout (example.com:81, timeout 4s)",
    url: "https://example.com:81/",
    opts: HTML({ timeoutMs: 4000 }),
    expect: "reject", reasonMatch: /timeout/i, live: true, attempts: 5,
    minElapsedMs: 3000, maxElapsedMs: 12000,
  },
  // --- oversized response: bounded by the size cap ---
  {
    name: "oversized body bounded (300KB served, 64KB cap)",
    url: "https://httpbingo.org/bytes/300000",
    opts: base({ allowContentTypes: ["application/octet-stream"], timeoutMs: 20000, maxBytes: 65536 }),
    expect: "reject", reasonMatch: /exceeds limit/, live: true,
  },
  // --- content-type expectations ---
  {
    name: "unexpected content-type rejected (png served, html allowed)",
    url: "https://httpbingo.org/image/png",
    opts: HTML(),
    expect: "reject", reasonMatch: /Content-type not allowed/, live: true,
  },
  // --- positive control: legitimate public fetch still works ---
  {
    name: "CONTROL: public https page fetched",
    url: "https://example.com/",
    opts: HTML(), expect: "ok", live: true,
  },
];

let pass = 0;
let failCount = 0;
const failures: string[] = [];

async function runCase(c: Case): Promise<{ verdict: string; detail: string }> {
  const attempts = c.attempts ?? (c.live ? 3 : 1);
  let last: { verdict: string; detail: string } = { verdict: "FAIL", detail: "no attempts ran" };
  for (let a = 0; a < attempts; a++) {
    const t0 = Date.now();
    try {
      const res = await acquireUrl(c.url, c.opts);
      const elapsed = Date.now() - t0;
      if (c.expect === "reject" && !res.ok) {
        const reasonOk = !c.reasonMatch || c.reasonMatch.test(res.reason);
        const timeOk =
          (c.minElapsedMs === undefined || elapsed >= c.minElapsedMs) &&
          (c.maxElapsedMs === undefined || elapsed <= c.maxElapsedMs);
        if (reasonOk && timeOk) {
          return { verdict: "PASS", detail: `rejected in ${elapsed}ms: ${res.reason}` };
        }
        last = {
          verdict: "FAIL",
          detail: `attempt ${a + 1}: rejected but ${!reasonOk ? "REASON MISMATCH: " + res.reason + " (wanted " + c.reasonMatch + ")" : "elapsed " + elapsed + "ms outside bound"} `,
        };
      } else if (c.expect === "ok" && res.ok) {
        return { verdict: "PASS", detail: `ok, ${res.bytes.length} bytes, ${res.contentType}` };
      } else if (c.expect === "reject" && res.ok) {
        return { verdict: "FAIL", detail: `SEAM ACCEPTED HOSTILE URL, ${res.bytes.length} bytes from ${res.finalUrl}` };
      } else {
        last = { verdict: "FAIL", detail: `attempt ${a + 1}: control failed: ${(res as { reason: string }).reason}` };
      }
    } catch (e) {
      last = { verdict: "FAIL", detail: `attempt ${a + 1}: threw: ${e instanceof Error ? e.message : String(e)}` };
    }
    if (a < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
  }
  return last;
}

for (const c of cases) {
  const { verdict, detail } = await runCase(c);
  if (verdict === "PASS") pass++;
  else { failCount++; failures.push(c.name + ": " + detail); }
  console.log(verdict + " | " + c.name + " | " + detail);
}

// --- isPublicIp unit spot-checks (no network) ---
const ipCases: Array<[string, boolean, string]> = [
  ["127.0.0.1", false, "loopback"], ["10.1.2.3", false, "RFC1918"], ["172.16.0.1", false, "RFC1918"],
  ["172.31.255.255", false, "RFC1918"], ["172.15.0.1", true, "public"], ["172.32.0.1", true, "public"],
  ["192.168.0.1", false, "RFC1918"], ["169.254.169.254", false, "link-local/metadata"],
  ["100.64.0.1", false, "CGNAT"], ["100.127.255.255", false, "CGNAT"], ["100.128.0.1", true, "public"],
  ["0.0.0.0", false, "this-network"], ["224.0.0.1", false, "multicast"], ["240.0.0.1", false, "reserved"],
  ["198.18.0.1", false, "benchmarking"], ["198.19.255.255", false, "benchmarking"],
  ["::1", false, "loopback"], ["::", false, "unspecified"], ["fe80::1", false, "link-local"],
  ["fc00::1", false, "unique-local"], ["fd12::1", false, "unique-local"],
  ["ff02::1", false, "multicast"], ["2001:db8::1", false, "documentation"],
  ["::ffff:127.0.0.1", false, "v4-mapped dotted"], ["::ffff:7f00:1", false, "v4-mapped hex"],
  ["::ffff:10.0.0.1", false, "v4-mapped dotted"], ["::ffff:5db8:d822", true, "v4-mapped public hex (93.184.216.34)"],
  ["::ffff:5d.b8.d8.22", false, "hybrid form unparseable: fail-closed"],
  ["93.184.216.34", true, "public"], ["2606:2800:220:1:248:1893:25c8:1946", true, "public"],
];
for (const [ip, want, why] of ipCases) {
  const got = isPublicIp(ip);
  if (got === want) { pass++; }
  else { failCount++; failures.push(`isPublicIp(${ip})`); console.log(`FAIL | isPublicIp(${ip}) = ${got}, wanted ${want} (${why})`); }
}

// --- DNS single-resolution property: the seam must resolve exactly once
// per hop. The injected resolver throws if called twice, so any
// re-resolution at the socket layer (the rebinding window) fails loudly.
{
  let calls = 0;
  const res = await acquireUrl("https://example.com/", {
    allowContentTypes: ["text/html"],
    timeoutMs: 15000,
    proxyUrl: PROXY,
    dnsLookup: async (h: string) => {
      calls++;
      if (calls > 1) throw new Error("re-resolved: rebinding window open");
      if (h !== "example.com") throw new Error("unexpected host " + h);
      return [{ address: "93.184.216.34", family: 4 }];
    },
  });
  if (res.ok && calls === 1) {
    pass++;
    console.log("PASS | single-resolution: exactly one lookup per hop, fetch ok (" + res.bytes.length + " bytes)");
  } else {
    failCount++; failures.push("single-resolution");
    console.log("FAIL | single-resolution: " + (res.ok ? "calls=" + calls : (res as { reason: string }).reason));
  }
}

// --- Rebinding simulation: the resolver flips to 127.0.0.1 AFTER the
// seam's vetting lookup. A seam that re-resolves at connect time would
// be steered to the loopback. The seam must succeed using only its
// vetted first answer.
{
  let calls = 0;
  const res = await acquireUrl("https://example.com/", {
    allowContentTypes: ["text/html"],
    timeoutMs: 15000,
    proxyUrl: PROXY,
    dnsLookup: async () => {
      calls++;
      return calls === 1
        ? [{ address: "93.184.216.34", family: 4 }]
        : [{ address: "127.0.0.1", family: 4 }]; // attacker flips the record
    },
  });
  if (res.ok) {
    pass++;
    console.log("PASS | rebinding flip: fetch succeeded on vetted answer despite DNS flip (" + res.bytes.length + " bytes)");
  } else {
    failCount++; failures.push("rebinding flip");
    console.log("FAIL | rebinding flip: " + (res as { reason: string }).reason);
  }
}

const total = pass + failCount;
console.log("\nBATTERY: " + pass + "/" + total + (failCount === 0 ? " ALL PASS" : " FAILURES PRESENT"));
if (failures.length > 0) console.log("failures:\n- " + failures.join("\n- "));
process.exit(failCount === 0 ? 0 : 1);
