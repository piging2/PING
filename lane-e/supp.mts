import { safeFetch, safeFetchPage } from "/home/nolan/projects/ping/src/fyd/net/safe-fetch.ts";
async function probe(label: string, url: string, opts: any = {}) {
  const r = await safeFetch(url, { allowContentTypes: ["text/html"], maxBytes: 200_000, timeoutMs: 8000, ...opts });
  if (r.ok) console.log(`[OK] ${label} :: ${r.bytes.length}b final=${r.finalUrl}`);
  else console.log(`[BLOCK] ${label} :: reason="${r.reason}" hops=${r.redirectChain.length}`);
}
await probe("redirect -> credentialed URL", "https://httpbin.org/redirect-to?url=http://user:pass@example.com/");
await probe("redirect -> bad scheme", "https://httpbin.org/redirect-to?url=file:///etc/passwd");
await probe("uppercase scheme+host", "HTTP://EXAMPLE.COM/");
await probe("trailing-dot host", "http://example.com./");
await probe("userinfo empty", "http://@example.com/");
