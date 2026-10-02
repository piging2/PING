#!/usr/bin/env node
/**
 * Lane D RED TEAM: hostile-input fixtures against the escalation ladder.
 *
 * All fixtures run through injected { dnsLookup, fetchImpl } deps, so no
 * real network is touched and no SSRF gate is bypassed: the fixtures ARE
 * the remote server. Each case asserts a fail-closed, typed outcome.
 */
import { acquire, verifyRungInputConsistency } from "./ladder.mjs";

const PUB = [{ address: "93.184.216.34" }];
const deps = { dnsLookup: async () => PUB };

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  PASS " + name); }
  else { fail++; console.log("  FAIL " + name + " :: " + (detail ?? "")); }
}

const htmlDoc = (body) =>
  `<!DOCTYPE html><html><head><title>Fixture</title></head><body>${body}</body></html>`;
const resp = (body, status = 200, headers = {}) =>
  new Response(body, { status, headers: { "content-type": "text/html", ...headers } });
const streamResp = (totalBytes, chunk = 65536) => {
  let sent = 0;
  const stream = new ReadableStream({
    pull(c) {
      if (sent >= totalBytes) { c.close(); return; }
      const n = Math.min(chunk, totalBytes - sent);
      c.enqueue(new Uint8Array(n).fill(65));
      sent += n;
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/html" } });
};

let calls = [];
function fixtureFetch(routes) {
  return async (url, init) => {
    calls.push(url);
    const u = new URL(url);
    if (u.pathname === "/robots.txt") return resp("", 200);
    const h = routes[u.pathname];
    if (h) return h(u);
    return resp("not found", 404);
  };
}
const acq = (path, routes, opts) =>
  acquire("https://fixture.test" + path, opts, { ...deps, fetchImpl: fixtureFetch(routes) });

console.log("RED-TEAM: hostile input vs the escalation ladder");

// 1. JS injection: phone inside <script> must never become a fact.
{
  calls = [];
  const o = await acq("/inject", {
    "/inject": () => resp(htmlDoc(
      `<script>var evil="(555) 999-0000"; document.write("call now");</script>` +
      `<h1>Real Business</h1><p>` + "Call us today for great service and honest pricing. ".repeat(12) + `</p>` +
      `<a href="tel:+15551234567">Call</a>`
    )),
  });
  check("inject: tel: phone wins", o.pageEvidence?.phone?.value === "+15551234567", JSON.stringify(o.pageEvidence?.phone));
  check("inject: script phone absent", !JSON.stringify(o.pageEvidence).includes("999-0000"));
  check("inject: terminal at cheap rung", o.terminal.reason === "sufficient-at-R3" && !o.terminal.escalated);
}

// 2. Meta-refresh loop: recorded, never followed.
{
  calls = [];
  const o = await acq("/refresh-loop", {
    "/refresh-loop": () => resp(htmlDoc(
      `<meta http-equiv="refresh" content="0;url=/refresh-loop">` +
      `<h1>Thin page</h1><p>` + "x ".repeat(300) + `</p>`
    )),
  });
  check("refresh: no follow (exactly one page fetch; refresh never re-fetched)",
    calls.filter((u) => !u.endsWith("/robots.txt")).length === 1,
    "page-fetches=" + calls.filter((u) => !u.endsWith("/robots.txt")).length);
  check("refresh: recorded in policyNotes", o.policyNotes.some((n) => n.startsWith("META_REFRESH_SEEN")));
}

// 3. 10MB HTML: streaming abort, terminal, no escalation.
{
  calls = [];
  const o = await acq("/big", { "/big": () => streamResp(10 * 1024 * 1024) }, { maxBytes: 5 * 1024 * 1024 });
  check("big: aborted at cap", /exceeded size limit/.test(o.terminal.detail), o.terminal.detail);
  check("big: typed INVALID_PAYLOAD", o.terminal.failureClass === "INVALID_PAYLOAD");
  check("big: no escalation", o.terminal.escalated === false && o.escalation.length === 0);
}

// 4. Gzip bomb (simulated decoded stream > cap): same abort on DECODED bytes.
{
  const o = await acq("/gzipbomb", { "/gzipbomb": () => streamResp(6 * 1024 * 1024, 16384) }, { maxBytes: 5 * 1024 * 1024 });
  check("bomb: aborted on decoded bytes", /exceeded size limit/.test(o.terminal.detail), o.terminal.detail);
}

// 5. Redirect chain: 6 hops -> too many.
{
  const routes = {};
  for (let i = 0; i < 6; i++) routes["/r" + i] = () => resp("", 302, { location: "/r" + (i + 1) });
  const o = await acq("/r0", routes);
  check("redir: too many redirects", /Too many redirects/.test(o.terminal.detail), o.terminal.detail);
  check("redir: chain recorded", o.policyNotes.length >= 5, "hops=" + o.policyNotes.length);
}

// 6. Redirect to private IP (DNS-rebinding attempt): R0 re-validation rejects.
{
  const evilDns = async (h) => (h === "evil.test" ? [{ address: "169.254.169.254" }] : PUB);
  const o = await acquire("https://fixture.test/start", {}, {
    dnsLookup: evilDns,
    fetchImpl: fixtureFetch({
      "/start": () => resp("", 302, { location: "https://evil.test/meta" }),
      "/meta": () => resp("secret"),
    }),
  });
  check("rebind: rejected", /non-public/.test(o.terminal.detail), o.terminal.detail);
  check("rebind: terminal, no retry", o.terminal.noEscalation !== false && o.terminal.escalated === false);
}

// 7. Redirect to javascript: scheme: rejected at R0.
{
  const o = await acq("/jsredir", { "/jsredir": () => resp("", 302, { location: "javascript:alert(1)" }) });
  check("js-scheme: rejected", /Scheme not allowed/.test(o.terminal.detail), o.terminal.detail);
}

// 8. Fake JSON-LD vs visible content: both preserved, conflict flagged, no silent winner.
{
  const o = await acq("/fake-jsonld", {
    "/fake-jsonld": () => resp(`<!DOCTYPE html><html><head><title>Biz</title>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Plumber",
      "name":"Real Plumbing Co","telephone":"+1-800-000-0000"}</script></head>
      <body><h1>Real Plumbing Co</h1><p>` + "Quality plumbing for over 20 years. ".repeat(30) + `</p>
      <a href="tel:+13035551212">Call now</a></body></html>`),
  });
  check("conflict: visible tel: preserved", o.pageEvidence?.phone?.value === "+13035551212");
  check("conflict: json-ld phone preserved separately",
    o.pageEvidence?.phoneJsonLd?.some((p) => p.value === "+1-800-000-0000" && p.source === "json-ld"),
    JSON.stringify(o.pageEvidence?.phoneJsonLd));
  check("conflict: flagged, not adjudicated",
    o.policyNotes.some((n) => n.startsWith("CONFLICTING_SOURCES")) && /adjudication belongs to the resolution lane/.test(o.policyNotes.join(" ")));
}

// 9. 404 mid-ladder: terminal SOURCE_UNAVAILABLE, never escalates to R4.
{
  const o = await acq("/gone", { "/gone": () => resp("nope", 404) });
  check("404: typed SOURCE_UNAVAILABLE", o.terminal.failureClass === "SOURCE_UNAVAILABLE", o.terminal.failureClass);
  check("404: no escalation attempted", o.terminal.escalated === false && !o.escalation.some((e) => e.to === "R4"));
  check("404: stopped at R1", o.levelUsed === 1 && o.jsonLd.length === 0);
}

// 10. Content changing between rungs: per-rung hashes catch it.
{
  let n = 0;
  const mutFetch = fixtureFetch({ "/mut": () => { n++; return resp(htmlDoc(`<h1>Version ${n}</h1><p>` + "content ".repeat(100) + "</p>")); } });
  const a = await acquire("https://fixture.test/mut", {}, { ...deps, fetchImpl: mutFetch });
  const b = await acquire("https://fixture.test/mut", {}, { ...deps, fetchImpl: mutFetch });
  check("mutating: hashes differ across fetches", a.evidenceHash !== b.evidenceHash);
  const mixed = { ...b, rungHashes: { R1: b.evidenceHash, R2: a.evidenceHash, R3: b.evidenceHash } };
  const v = verifyRungInputConsistency(mixed);
  check("mutating: CONTENT_CHANGED detected", v.consistent === false && v.gap === "CONTENT_CHANGED", JSON.stringify(v));
  const clean = verifyRungInputConsistency(a);
  check("stable: consistent passes", clean.consistent === true);
}

console.log(`\nRED-TEAM RESULT: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
