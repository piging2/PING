# Lane F: Performance measurements — 2026-09-21 ~19:35-19:55 MDT

Measured on the real server (Next dev, port 3100 via Pig Tailscale forward)
through the Pig's headed Chrome, plus a production build for honest weight.

## Browser measurements (dev server)

| page | viewport | TTFB | DCL | load | LCP | reqs | total | images |
|---|---|---|---|---|---|---|---|---|
| / | desktop | 371ms | 544ms | 1134ms | 632ms | 13 | 14928KB | 2KB |
| / | mobile | 167ms | 311ms | 870ms | 336ms | 13 | 14927KB | 2KB |
| /sites/happy-place | desktop | 115ms | 121ms | 589ms | 216ms | 11 | 15396KB | 0KB |
| /sites/happy-place | mobile | 78ms | 82ms | 819ms | 176ms | 11 | 15396KB | 0KB |
| /sites/coppersmith-plumbing | desktop | 119ms | 135ms | 718ms | 220ms | 13 | 15313KB | 87KB |
| /sites/coppersmith-plumbing | mobile | 96ms | 105ms | 625ms | 212ms | 13 | 15313KB | 87KB |

Thresholds: mobile LCP-equivalent > 3s flag, total page weight > 2MB flag.

- LCP: 176-632ms everywhere. PASS, far under 3s.
- Weight: ~15MB in DEV. Breakdown: main-app.js 7.4MB + page.js 3.5MB +
  layout.js 3.1MB, all unminified Next dev bundles with HMR. This is a
  dev-server artifact, NOT a product defect. No product-code change can or
  should "fix" dev bundle size.

## Production build (honest weight)

`npx next build` succeeded (BUILD_ID 0_gTAgRfj3CSF0opqRklR).

- All JS chunks: 1.38MB uncompressed (~400KB gzipped est.)
- All CSS: 115KB
- Per-page load (framework + main + layout + page chunks): ~600-800KB
  uncompressed, ~200-250KB gzipped. Well under the 2MB flag.
- Largest single chunk: 174KB (1255-fc6c00ab2f765339.js).

Attempted to serve the prod build on :3101 for browser LCP, but WSL<->Windows
networking for the new port failed (portproxy added, connection reset; server
bound to :: then 0.0.0.0, still refused through the forward). Per the
route-around rule: the LCP numbers that matter were already captured on the
dev server (fast), and weight was proven from the build output. No further
attempts; the temporary 3101 portproxy was removed, only the 3100 forward
remains. No stray prod server processes left.

## Image derivative weights

- / : 2KB images (no photographic hero on the PING template)
- happy-place: 0KB (honest typographic hero, no images)
- coppersmith-plumbing: 87KB (photographic hero + blur derivative)

## Verdict

No generic performance defect found in product code. LCP is fast on all
pages and viewports. Production weight is healthy. Image pipeline is lean.
Lane F closes with no fix required. Raw logs: /tmp/lane-f-perf2.log,
/tmp/lane-f-breakdown.log.
