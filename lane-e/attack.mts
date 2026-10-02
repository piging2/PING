import { safeFetch, safeFetchPage, isPublicIp } from "/home/nolan/projects/ping/src/fyd/net/safe-fetch.ts";

const ALLOW = ["text/html", "application/octet-stream", "application/json", "text/plain"];

let n = 0;
async function probe(label: string, url: string, opts: { maxBytes?: number; timeoutMs?: number; allow?: string[]; page?: boolean } = {}) {
  n++;
  const t0 = Date.now();
  let r;
  try {
    r = opts.page
      ? await safeFetchPage(url, { maxBytes: opts.maxBytes, timeoutMs: opts.timeoutMs })
      : await safeFetch(url, {
          allowContentTypes: opts.allow ?? ALLOW,
          maxBytes: opts.maxBytes ?? 200_000,
          timeoutMs: opts.timeoutMs ?? 8000,
        });
  } catch (e) {
    console.log(`[THROW] ${label} :: threw ${(e as Error).message}`);
    return;
  }
  const ms = Date.now() - t0;
  if (r.ok) console.log(`[OK] ${label} :: ${r.bytes.length}b final=${r.finalUrl} ct=${r.contentType} hops=${r.redirectChain.length} (${ms}ms)`);
  else console.log(`[BLOCK] ${label} :: reason="${r.reason}" hops=${r.redirectChain.length} (${ms}ms)`);
}

console.log("=== A. isPublicIp classifier probes (real function) ===");
for (const ip of ["::ffff:7f00:1", "::ffff:127.0.0.1", "::FFFF:127.0.0.1", "::", "2001:db8::1", "64:ff9b::7f00:1", "127.0.0.1", "::1", "fe80::1", "100.79.154.43"]) {
  console.log(`isPublicIp("${ip}") = ${isPublicIp(ip)}`);
}

console.log("=== B. loopback / private literals (listener on 127.0.0.1:18923 must see ZERO connects) ===");
await probe("loopback literal", "http://127.0.0.1:18923/");
await probe("loopback literal no port", "http://127.0.0.1/");
await probe("localhost", "http://localhost:18923/");
await probe("ipv6 loopback", "http://[::1]:18923/");
await probe("rfc1918 10/8", "http://10.0.0.1/");
await probe("rfc1918 192.168/16", "http://192.168.1.1/");
await probe("rfc1918 172.16/12", "http://172.16.5.4/");
await probe("link-local literal", "http://169.254.169.254/");
await probe("metadata path", "http://169.254.169.254/latest/meta-data/");

console.log("=== C. IPv4-mapped IPv6 bypass attempts (listener SHOULD see connects if LEAKED) ===");
await probe("v4mapped dotted", "http://[::ffff:127.0.0.1]:18923/");
await probe("v4mapped hex", "http://[::ffff:7f00:1]:18923/");
await probe("v4mapped hex upper", "http://[::FFFF:7F00:1]:18923/");

console.log("=== D. IP obfuscation forms ===");
await probe("decimal ip 2130706433", "http://2130706433:18923/");
await probe("hex ip 0x7f000001", "http://0x7f000001:18923/");
await probe("octal ip 017700000001", "http://017700000001:18923/");

console.log("=== E. bad schemes ===");
for (const u of ["file:///etc/passwd", "data:text/html,<h1>x</h1>", "javascript:alert(1)", "ftp://example.com/x", "gopher://example.com/"]) {
  await probe("scheme " + u.split(":")[0], u);
}

console.log("=== F. credential-bearing ===");
await probe("creds on public host", "http://user:pass@example.com/");
await probe("creds on loopback", "https://user:pass@127.0.0.1:18923/");

console.log("=== G. DNS pivots (real DNS, hostile hostnames) ===");
await probe("nip.io rfc1918", "http://10.0.0.1.nip.io:18923/");
await probe("nip.io loopback", "http://127.0.0.1.nip.io:18923/");
await probe("nip.io metadata", "http://169.254.169.254.nip.io/latest/meta-data");

console.log("=== H. redirect pivots (safe first hop -> unsafe target) ===");
await probe("redirect httpbin->loopback", "https://httpbin.org/redirect-to?url=http://127.0.0.1:9/");
await probe("redirect httpbin->metadata", "https://httpbin.org/redirect-to?url=http://169.254.169.254/latest/meta-data");
await probe("redirect httpbin->nip-private", "https://httpbin.org/redirect-to?url=http://10.0.0.1.nip.io/");
await probe("redirect stays public", "https://httpbin.org/redirect-to?url=https://example.com/");

console.log("=== I. oversize / timeout (real network) ===");
await probe("declared oversize", "https://httpbin.org/bytes/300000", { maxBytes: 100_000 });
await probe("streaming oversize chunked", "https://httpbin.org/stream-bytes/300000", { maxBytes: 100_000 });
await probe("slow timeout", "https://httpbin.org/delay/10", { timeoutMs: 2500 });

console.log("=== J. happy path (must SUCCEED) ===");
await probe("example.com page", "https://example.com/", { page: true });

console.log(`=== done, ${n} probes ===`);
