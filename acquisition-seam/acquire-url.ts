/**
 * acquire-url.ts: THE single SSRF-hardened acquisition seam for FYD intake.
 *
 * LOCKED DECISION (2026-09-24, Nolan CEO directive, URL TRUST):
 *   The operator is trusted to request a fetch. The URL and the returned
 *   content are hostile from day one. Exactly ONE seam serves operator
 *   intake and (later) customer intake. No second fetch path.
 *
 * This module is the whole seam: one exported function, `acquireUrl`.
 * Zero dependencies beyond the node standard library. It replaces ad-hoc
 * fetch() calls anywhere a URL comes from an operator, a customer, a
 * redirect, or any other untrusted source.
 *
 * Guard set (minimum real):
 *  - http/https only. file:, gopher:, ftp:, data:, javascript:, and every
 *    other scheme are rejected before any network happens.
 *  - Credential-bearing URLs (user:pass@host) are rejected.
 *  - DNS is resolved for the hostname, and EVERY resolved address must be
 *    public routable space. Loopback (127/8, ::1), RFC1918 (10/8,
 *    172.16/12, 192.168/16), link-local (169.254/16 incl. the
 *    169.254.169.254 cloud metadata endpoint, fe80::/10), unique-local
 *    (fc00::/7), multicast, reserved, "this network" (0/8), benchmarking
 *    (198.18.0.0/15), documentation ranges, CGNAT (100.64/10, treated as
 *    private so tailnet space is never fetched), and IPv4-mapped or
 *    translated IPv6 embedding any of the above are rejected. DNS failure
 *    is fail-closed: no resolution, no fetch.
 *  - DNS-rebinding TOCTOU is closed on the direct path by IP pinning: the
 *    socket is opened to a pinned vetted address (single custom lookup per
 *    hop; the TCP/TLS stack never re-resolves the hostname). The Host
 *    header and TLS SNI still carry the original hostname, and the
 *    certificate is verified against it.
 *  - Every redirect hop re-runs the full guard set (shape, credentials,
 *    DNS, pinning). Redirects are followed manually, bounded
 *    (default 5). A redirect into forbidden space is rejected, not
 *    followed. Redirect loops terminate at the bound.
 *  - Per-hop timeout (default 20s) via AbortSignal; covers connect stall,
 *    slowloris-style dribble, and hung servers.
 *  - Response size bounded twice: content-length pre-check plus an
 *    aborting streaming cap (default 15MB). Never buffers unboundedly.
 *  - Content-type must match the caller-supplied allowlist (prefix match
 *    on the media type, parameters stripped). Checked before buffering.
 *
 * Proxied egress (`proxyUrl`): when the deployment reaches the internet
 * through an egress proxy, pass its URL explicitly. Target vetting is
 * UNCHANGED (every hop's hostname is still DNS-vetted and forbidden
 * targets are never sent to the proxy), and the CONNECT target is asserted
 * to be exactly the vetted hostname:port. Caveat, stated plainly: through
 * a proxy the seam cannot pin the target socket, because the proxy
 * performs its own resolution. The operator-supplied-URL to internal
 * destination path stays closed (the seam never emits a forbidden
 * target); the residual is proxy-side DNS differing from seam-side DNS
 * for a public hostname, which is a property of the chosen proxy, not of
 * the URL. The seam never reads proxy config from the environment: env
 * sniffing in a security boundary is a footgun. Callers pass it
 * explicitly. Without this option the seam would be bypassed wherever
 * direct egress is blocked, and bypass is the real failure.
 *
 * The `dnsLookup` option exists ONLY for tests (the hostile battery uses
 * it to prove single-resolution). Production callers never pass it.
 */

import { lookup as defaultLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { connect as netConnect, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupAddress } from "node:dns";

export interface AcquireOk {
  ok: true;
  bytes: Buffer;
  contentType: string;
  finalUrl: string;
  redirectChain: string[];
}

export interface AcquireFail {
  ok: false;
  reason: string;
  redirectChain: string[];
}

export type AcquireResult = AcquireOk | AcquireFail;

export interface AcquireOptions {
  /** Allowed content-type prefixes, e.g. ["image/jpeg", "image/"] or ["text/html"]. */
  allowContentTypes: string[];
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  userAgent?: string;
  /** Explicit egress proxy URL (http:). See the caveat in the header. */
  proxyUrl?: string;
  /** Test-only DNS override. Never passed by production callers. */
  dnsLookup?: (hostname: string) => Promise<LookupAddress[]>;
}

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_USER_AGENT = "FYD-acquire/1.0 (+evidence-bound fetch)";

function fail(reason: string, redirectChain: string[]): AcquireFail {
  return { ok: false, reason, redirectChain };
}

/** Expand the trailing 32 bits of an IPv6 address into a dotted quad, or null. */
function embeddedV4(low: string): string | null {
  // Strip any zone id.
  const addr = low.split("%")[0];
  const m = addr.match(/^::ffff:([0-9a-f:.]+)$/) ?? addr.match(/^64:ff9b::([0-9a-f:.]+)$/);
  if (!m) return null;
  const tail = m[1];
  if (tail.includes(".")) return tail; // already dotted
  // Hex form: last two hextets are the v4 bytes.
  const parts = tail.split(":");
  if (parts.length < 2) return null;
  const hi = parseInt(parts[parts.length - 2], 16);
  const lo = parseInt(parts[parts.length - 1], 16);
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join(".");
}

/** True when the numeric IP is public routable space. Fail-closed: unknown -> false. */
export function isPublicIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;
    const [a, b, c] = p;
    if (a === 0) return false; // "this network"
    if (a === 10) return false; // RFC1918
    if (a === 127) return false; // loopback
    if (a === 169 && b === 254) return false; // link-local + cloud metadata endpoint
    if (a === 172 && b >= 16 && b <= 31) return false; // RFC1918
    if (a === 192 && b === 168) return false; // RFC1918
    if (a === 192 && b === 0 && c <= 2) return false; // 192.0.0.0/24 IETF + 192.0.2.0/24 TEST-NET-1
    if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
    if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
    if (a === 198 && b >= 18 && b <= 19) return false; // benchmarking 198.18.0.0/15
    if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT; tailnet is never fetched
    if (a >= 224) return false; // multicast + reserved
    return true;
  }
  if (v === 6) {
    const low = ip.toLowerCase();
    if (low === "::1" || low === "::") return false; // loopback / unspecified
    if (low.startsWith("fe80:")) return false; // link-local
    if (low.startsWith("fc") || low.startsWith("fd")) return false; // unique-local fc00::/7
    if (low.startsWith("ff")) return false; // multicast
    if (low.startsWith("2001:db8")) return false; // documentation
    const v4 = embeddedV4(low);
    if (v4) return isPublicIp(v4); // v4-mapped / v4-translated: vet the embedded address
    return true;
  }
  return false;
}

/** Strip brackets from an IPv6 literal hostname for the IP check. */
function bareHost(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

async function resolvePublic(
  hostname: string,
  dnsLookup: (hostname: string) => Promise<LookupAddress[]>,
): Promise<{ ok: true; addrs: LookupAddress[] } | { ok: false; reason: string }> {
  const bare = bareHost(hostname);
  if (isIP(bare)) {
    return isPublicIp(bare)
      ? { ok: true, addrs: [{ address: bare, family: isIP(bare) as 4 | 6 }] }
      : { ok: false, reason: "IP literal is not public routable space: " + bare };
  }
  let addrs: LookupAddress[];
  try {
    addrs = await dnsLookup(hostname);
  } catch {
    return { ok: false, reason: "DNS resolution failed for " + hostname };
  }
  if (!addrs || addrs.length === 0) {
    return { ok: false, reason: "DNS returned no addresses for " + hostname };
  }
  for (const a of addrs) {
    if (!isPublicIp(a.address)) {
      return { ok: false, reason: "DNS for " + hostname + " resolves to non-public " + a.address };
    }
  }
  return { ok: true, addrs };
}

function checkUrlShape(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a parseable URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Scheme not allowed: " + url.protocol };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Credential-bearing URLs are rejected" };
  }
  return { ok: true, url };
}

interface HopFetch {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: AsyncIterable<Buffer> & { destroy(err?: Error): void };
}

/**
 * Open a CONNECT tunnel through the proxy to targetHost:targetPort.
 * The CONNECT target is exactly the vetted hostname:port, never a
 * substituted IP. Returns the raw tunnel socket.
 */
function connectTunnel(
  proxy: URL,
  targetHost: string,
  targetPort: number,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const proxyPort = proxy.port ? Number(proxy.port) : 80;
    const socket = netConnect(proxyPort, proxy.hostname);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("proxy connect timeout"));
    }, timeoutMs);
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.removeAllListeners();
    };
    const abort = (): void => {
      cleanup();
      socket.destroy();
      reject(new Error("timeout"));
    };
    signal.addEventListener("abort", abort, { once: true });
    socket.once("error", (e) => {
      cleanup();
      signal.removeEventListener("abort", abort);
      reject(e);
    });
    socket.once("connect", () => {
      const lines = ["CONNECT " + targetHost + ":" + targetPort + " HTTP/1.1", "Host: " + targetHost + ":" + targetPort];
      if (proxy.username) {
        const creds = Buffer.from(
          decodeURIComponent(proxy.username) + ":" + decodeURIComponent(proxy.password),
        ).toString("base64");
        lines.push("Proxy-Authorization: Basic " + creds);
      }
      lines.push("", "");
      socket.write(lines.join("\r\n"));
      let buf = "";
      const onData = (d: Buffer): void => {
        buf += d.toString("latin1");
        const idx = buf.indexOf("\r\n\r\n");
        if (idx === -1) return;
        socket.off("data", onData);
        const statusLine = buf.slice(0, buf.indexOf("\r\n"));
        const m = statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/);
        cleanup();
        signal.removeEventListener("abort", abort);
        if (m && m[1] === "200") {
          const rest = buf.slice(idx + 4);
          if (rest.length > 0) {
            cleanup();
            socket.destroy();
            reject(new Error("proxy sent unexpected bytes after CONNECT"));
            return;
          }
          resolve(socket);
        } else {
          socket.destroy();
          reject(new Error("proxy CONNECT failed: " + statusLine));
        }
      };
      socket.on("data", onData);
    });
  });
}

function fetchPinned(
  url: URL,
  pinned: LookupAddress,
  proxy: URL | null,
  opts: { timeoutMs: number; userAgent: string },
): Promise<HopFetch> {
  return new Promise((resolve, reject) => {
    const isTls = url.protocol === "https:";
    const port = url.port ? Number(url.port) : isTls ? 443 : 80;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("timeout")), opts.timeoutMs);
    const hostHeader = url.hostname + (url.port ? ":" + url.port : "");
    // Pin the connection to the vetted address. The resolver below answers
    // exactly one address, so the TCP/TLS stack cannot re-resolve the
    // hostname (DNS-rebinding TOCTOU closed). Host header and SNI still
    // carry the real hostname; the cert is verified against it.
    const doLookup = (
      _host: string,
      _options: unknown,
      cb: (err: null, address: string, family: number) => void,
    ): void => {
      cb(null, pinned.address, pinned.family);
    };
    const baseOpts = {
      method: "GET",
      headers: { Host: hostHeader, "User-Agent": opts.userAgent },
      signal: controller.signal as never,
    };

    const onResponse = (res: {
      statusCode?: number;
      headers: Record<string, string | string[] | undefined>;
      socket: { remoteAddress?: string };
    }): void => {
      const headers: Record<string, string | string[] | undefined> = {};
      for (const [k, v] of Object.entries(res.headers)) headers[k] = v;
      resolve({ status: res.statusCode ?? 0, headers, body: res as unknown as HopFetch["body"] });
    };
    const done = (err: Error): void => {
      clearTimeout(timer);
      // The only abort source on this controller is our per-hop timeout
      // timer, so an aborted signal here means the timeout fired: report it
      // plainly instead of the generic AbortError.
      const timedOut = (err as { name?: string }).name === "AbortError" || controller.signal.aborted;
      reject(timedOut ? new Error("timeout") : err);
    };

    (async () => {
      try {
        if (proxy) {
          // Uniform proxy transport: CONNECT tunnel to the vetted
          // hostname:port, then plain HTTP or TLS-over-tunnel on top.
          // options.host stays the TARGET so the Host header validates;
          // createConnection supplies the already-open tunnel socket, so
          // node never resolves or dials options.host itself.
          const tunnel = await connectTunnel(proxy, url.hostname, port, opts.timeoutMs, controller.signal);
          const connOpts = {
            ...baseOpts,
            host: url.hostname,
            port,
            path: url.pathname + url.search,
          };
          if (isTls) {
            const secure = tlsConnect({ socket: tunnel, servername: url.hostname });
            await new Promise<void>((res2, rej2) => {
              secure.once("secureConnect", () => res2());
              secure.once("error", rej2);
              controller.signal.addEventListener("abort", () => rej2(new Error("timeout")), { once: true });
            });
            const req = httpsRequest(
              { ...connOpts, servername: url.hostname, createConnection: () => secure },
              onResponse,
            );
            req.on("error", done);
            controller.signal.addEventListener("abort", () => req.destroy(), { once: true });
            req.end();
          } else {
            const req = httpRequest({ ...connOpts, createConnection: () => tunnel }, onResponse);
            req.on("error", done);
            controller.signal.addEventListener("abort", () => req.destroy(), { once: true });
            req.end();
          }
          return;
        }
        const req = (isTls ? httpsRequest : httpRequest)(
          {
            ...baseOpts,
            host: pinned.address,
            port,
            path: url.pathname + url.search,
            servername: isTls ? url.hostname : undefined,
            lookup: doLookup as never,
          },
          onResponse,
        );
        req.on("error", done);
        controller.signal.addEventListener("abort", () => req.destroy(), { once: true });
        req.end();
      } catch (e) {
        done(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  });
}

/**
 * Fetch a URL through the SSRF gate. One seam for operator and customer
 * intake. Follows redirects manually so every hop is re-validated.
 */
export async function acquireUrl(rawUrl: string, opts: AcquireOptions): Promise<AcquireResult> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
  const dnsLookup =
    opts.dnsLookup ?? ((h: string) => defaultLookup(h, { all: true }) as Promise<LookupAddress[]>);
  const redirectChain: string[] = [];

  let proxy: URL | null = null;
  if (opts.proxyUrl) {
    try {
      proxy = new URL(opts.proxyUrl);
    } catch {
      return fail("Invalid proxyUrl", redirectChain);
    }
    if (proxy.protocol !== "http:") return fail("Proxy must be http:", redirectChain);
  }

  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const shape = checkUrlShape(current);
    if (!shape.ok) return fail("URL rejected: " + shape.reason, redirectChain);
    const url = shape.url;

    const dns = await resolvePublic(url.hostname, dnsLookup);
    if (!dns.ok) return fail("DNS rejected: " + dns.reason, redirectChain);

    // Try vetted addresses in order; each attempt is pinned to that address.
    let hopRes: HopFetch | null = null;
    let lastErr = "";
    for (const addr of dns.addrs) {
      try {
        hopRes = await fetchPinned(url, addr, proxy, { timeoutMs, userAgent });
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }
    if (!hopRes) return fail("Fetch failed: " + lastErr, redirectChain);

    if (hopRes.status >= 300 && hopRes.status < 400) {
      const loc = hopRes.headers["location"];
      hopRes.body.destroy();
      const locStr = Array.isArray(loc) ? loc[0] : loc;
      if (!locStr) return fail("Redirect without location (status " + hopRes.status + ")", redirectChain);
      redirectChain.push(current + " -> " + locStr);
      try {
        current = new URL(locStr, url.toString()).toString();
      } catch {
        return fail("Unparseable redirect target", redirectChain);
      }
      continue;
    }

    if (hopRes.status < 200 || hopRes.status >= 300) {
      hopRes.body.destroy();
      return fail("HTTP " + hopRes.status, redirectChain);
    }

    const ctRaw = hopRes.headers["content-type"];
    const contentType = (Array.isArray(ctRaw) ? ctRaw[0] : ctRaw ?? "").split(";")[0].trim().toLowerCase();
    if (!opts.allowContentTypes.some((p) => contentType.startsWith(p.toLowerCase()))) {
      hopRes.body.destroy();
      return fail("Content-type not allowed: " + (contentType || "(missing)"), redirectChain);
    }
    const declared = Number(
      Array.isArray(hopRes.headers["content-length"])
        ? hopRes.headers["content-length"][0]
        : hopRes.headers["content-length"] ?? "0",
    );
    if (declared > maxBytes) {
      hopRes.body.destroy();
      return fail("Declared size " + declared + " exceeds limit " + maxBytes, redirectChain);
    }

    // Stream with an aborting size cap; never buffer unboundedly.
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for await (const chunk of hopRes.body as AsyncIterable<Buffer>) {
        total += chunk.byteLength;
        if (total > maxBytes) {
          hopRes.body.destroy();
          return fail("Body exceeded size limit " + maxBytes, redirectChain);
        }
        chunks.push(chunk);
      }
    } catch (e) {
      return fail("Body read failed: " + (e instanceof Error ? e.message : String(e)), redirectChain);
    }
    return {
      ok: true,
      bytes: Buffer.concat(chunks),
      contentType,
      finalUrl: url.toString(),
      redirectChain,
    };
  }
  return fail("Too many redirects (>" + maxRedirects + ")", redirectChain);
}
