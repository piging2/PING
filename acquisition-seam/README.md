# Acquisition seam (LANE ACQ-1, 2026-09-24)

The single SSRF-hardened URL acquisition seam for FYD intake, built per
Nolan's 2026-09-24 CEO directive (decision 3: URL TRUST).

Locked decision: the operator is trusted to request a fetch; the URL and
the returned content are hostile from day one. Exactly ONE seam serves
operator intake and (later) customer intake. No second fetch path.

## Files

- `acquire-url.ts` — the seam. One exported function, `acquireUrl(url, opts)`.
  Zero dependencies beyond the node standard library. `tsc --strict` clean.
- `hostile-battery.ts` — hostile URL battery run against the seam.
- `battery-results-2026-09-24.txt` — 58/58 ALL PASS evidence.
- `package.json` / `node_modules` — local only, for `@types/node` (tsc check).

## API

```ts
import { acquireUrl } from "./acquire-url.ts";

const res = await acquireUrl("https://example.com/", {
  allowContentTypes: ["text/html"], // required: content-type allowlist
  maxBytes: 5 * 1024 * 1024,        // default 15MB
  timeoutMs: 20000,                 // default 20s, per hop
  maxRedirects: 5,                 // default 5
  userAgent: "FYD-acquire/1.0",
  proxyUrl: process.env.HTTPS_PROXY, // optional, explicit only
});
// res = { ok: true, bytes, contentType, finalUrl, redirectChain }
//    or { ok: false, reason, redirectChain }
```

## Guard set (minimum real)

http/https only; no credential-bearing URLs; DNS resolved per hop and
EVERY address must be public (loopback, RFC1918, link-local incl.
169.254.169.254, unique-local, multicast, reserved, 0/8, 198.18.0.0/15,
CGNAT 100.64/10, documentation ranges, v4-mapped/v4-translated IPv6 all
rejected; DNS failure is fail-closed); DNS-rebinding TOCTOU closed on the
direct path by IP pinning (single custom lookup per hop, Host header + TLS
SNI keep the real hostname, cert verified against it); every redirect hop
re-runs the full guard set, manual redirect following, bounded;
per-hop timeout; content-length pre-check plus aborting streaming size
cap; content-type allowlist checked before buffering.

Proxied egress: pass `proxyUrl` explicitly (never read from env by the
seam). Target vetting is unchanged; the CONNECT target is asserted to be
exactly the vetted hostname:port. Stated caveat: through a proxy the seam
cannot pin the target socket (the proxy resolves); the residual is
proxy-side DNS differing from seam-side DNS for a public hostname.

## Adoption (for the factory owner)

This was built in scratch because the FYD repo worktree
(/home/nolan/build-acq @ e474c89b) could not be created in this sandbox.
To adopt:

1. Copy `acquire-url.ts` into the FYD repo as the canonical seam
   (suggested: `src/fyd/acquire/acquire-url.ts`).
2. Converge with the existing `src/fyd/media/safe-fetch.ts`: that module
   already implements most of this guard set for the media pipeline but
   lacks IP pinning (TOCTOU) and the proxy transport. One of them must go;
   the directive says never two fetch paths. Recommended: rebase
   `safeFetch`/`safeFetchImage`/`safeFetchPage` as thin wrappers over
   `acquireUrl`, then delete the duplicate logic.
3. Delete or quarantine `work/new/media-module/safe-fetch.ts` (stale
   duplicate copy found in the lane tree; not imported anywhere).
4. Wire the operator factory intake (one-click, currently design-only)
   through `acquireUrl` from day one. No second fetch path.
5. Bring `hostile-battery.ts` along as the seam's regression battery.

## Battery

`node hostile-battery.ts` — 58/58 ALL PASS on 2026-09-24, covering:
localhost, 127.0.0.1, [::1], decimal-IP trick, 0.0.0.0, 169.254.169.254,
10/8, 172.16/12, 192.168/16, ::ffff:127.0.0.1, 198.18.0.0/15, file:/gopher:/
ftp:/javascript:/data: schemes, userinfo@ URLs, redirect-to-file://,
redirect-to-credentials, redirect-to-localhost, redirect loop bound,
slow-response timeout, stalled-connect timeout, oversized body,
content-type mismatch, public-fetch control, 33 isPublicIp unit cases,
single-DNS-resolution property, DNS-rebinding-flip simulation.
