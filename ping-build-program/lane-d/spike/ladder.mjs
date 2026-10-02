/**
 * Lane D web-acquisition escalation-ladder SPIKE.
 *
 * Minimal, deterministic, dependency-light (only `jsonld`, the same library
 * PING uses in src/fyd/proceduralize/structured-data.ts). Implements
 * ESCALATION-LADDER.md rungs R0-R3 plus the R4/R5/R6 DECISION points;
 * R4 browser rendering is delegated (typed ESCALATE record, not executed).
 *
 * Provenance: L0/R1 logic mirrors src/fyd/net/safe-fetch.ts (the ONE
 * canonical fetch gate); R2 mirrors structured-data.ts (jsonld lib, remote
 * contexts refused); R3 mirrors onboarding/extractor.ts (script/style strip
 * first, bounded loops, tel:/mailto: precedence).
 *
 * Injectable deps { dnsLookup, fetchImpl, clock } make the ladder
 * fixture-testable without touching the SSRF gate's production defaults.
 */
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import jsonld from "jsonld";

export const sha256Hex = (b) =>
  createHash("sha256").update(b).digest("hex");

/* ---------------- R0: policy gate ---------------- */

export function isPublicIp(ip) {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255))
      return false;
    const [a, b] = p;
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
    if (a === 0) return false;
    return true;
  }
  if (v === 6) {
    const low = ip.toLowerCase();
    if (low === "::1") return false;
    if (low.startsWith("fe80:")) return false;
    if (low.startsWith("fc00:") || low.startsWith("fd00:")) return false;
    if (low.startsWith("ff00:")) return false;
    const m = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (m) return isPublicIp(m[1]);
    return true;
  }
  return false;
}

export function canonicalizeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a parseable URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    return { ok: false, reason: "Scheme not allowed: " + u.protocol };
  if (u.username || u.password)
    return { ok: false, reason: "Credential-bearing URLs are rejected" };
  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443"))
    u.port = "";
  return { ok: true, url: u.toString(), host: u.hostname };
}

async function hostResolvesPublic(hostname, dnsLookup) {
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (isIP(bare))
    return isPublicIp(bare)
      ? { ok: true }
      : { ok: false, reason: "IP literal is not public routable space: " + bare };
  let addrs;
  try {
    addrs = await dnsLookup(hostname);
  } catch {
    return { ok: false, reason: "DNS resolution failed for " + hostname };
  }
  if (!addrs || addrs.length === 0)
    return { ok: false, reason: "DNS returned no addresses for " + hostname };
  for (const a of addrs)
    if (!isPublicIp(a.address))
      return { ok: false, reason: `DNS for ${hostname} resolves to non-public ${a.address}` };
  return { ok: true };
}

/** Minimal robots.txt: parse Disallow lines for UA (ours, then *), honor crawl-delay. */
function parseRobots(txt, path) {
  const lines = txt.split("\n");
  let applies = false; // current UA section applies to us
  let sawOurs = false, sawStar = false, cur = null;
  let disallows = [], starDisallows = [];
  let crawlDelay = null, starDelay = null;
  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") {
      cur = v.toLowerCase();
      if (cur === "fyd-socialbot" || cur === "fyd") { sawOurs = true; applies = true; }
      else if (cur === "*") { sawStar = true; applies = !sawOurs; }
      else applies = false;
    } else if (k === "disallow" && applies) {
      (sawOurs && !cur.startsWith("*") ? disallows : starDisallows).push(v);
    } else if (k === "crawl-delay" && applies) {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) (cur === "*" ? (starDelay = n) : (crawlDelay = n));
    }
  }
  const active = sawOurs ? disallows : starDisallows;
  for (const d of active)
    if (d && path.startsWith(d))
      return { allowed: false, reason: "robots.txt disallows " + path, crawlDelay: crawlDelay ?? starDelay };
  return { allowed: true, crawlDelay: crawlDelay ?? starDelay };
}

const robotsCache = new Map(); // origin -> { at, txt }
export const USER_AGENT = "FYD-SocialBot/1.0 (+evidence-bound acquisition spike)";

export async function policyGate(rawUrl, deps = {}) {
  const dnsLookup = deps.dnsLookup ?? ((h) => lookup(h, { all: true }));
  const fetchImpl = deps.fetchImpl ?? fetch;
  const canon = canonicalizeUrl(rawUrl);
  if (!canon.ok) return { allowed: false, reason: canon.reason, failureClass: "PERMISSION_DENIED" };
  const u = new URL(canon.url);
  const dns = await hostResolvesPublic(u.hostname, dnsLookup);
  if (!dns.ok) return { allowed: false, reason: "DNS rejected: " + dns.reason, failureClass: "PERMISSION_DENIED" };
  // robots.txt (honored, cached per origin)
  let robotsNote = "robots: none/allowed";
  try {
    const origin = u.origin;
    let entry = robotsCache.get(origin);
    if (!entry || Date.now() - entry.at > 3600_000) {
      const r = await fetchImpl(origin + "/robots.txt", {
        redirect: "manual", signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": USER_AGENT },
      });
      const txt = r.ok ? await r.text() : "";
      entry = { at: Date.now(), txt };
      robotsCache.set(origin, entry);
    }
    if (entry.txt) {
      const pr = parseRobots(entry.txt, u.pathname || "/");
      robotsNote = "robots: " + (pr.allowed ? "allowed" : "DISALLOWED " + u.pathname) +
        (pr.crawlDelay != null ? ` (crawl-delay ${pr.crawlDelay}s)` : "");
      if (!pr.allowed)
        return { allowed: false, reason: pr.reason, failureClass: "PERMISSION_DENIED", robotsNote };
    }
  } catch (e) {
    robotsNote = "robots: fetch failed (" + e.message + "), proceeding (fail-open on robots fetch only)";
  }
  return { allowed: true, normalizedUrl: canon.url, failureClass: null, robotsNote };
}

/* ---------------- R1: HTTP static fetch ---------------- */

export async function fetchStatic(normalizedUrl, opts = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const maxBytes = opts.maxBytes ?? 5 * 1024 * 1024;
  const timeoutMs = opts.timeoutMs ?? 20000;
  const maxRedirects = opts.maxRedirects ?? 5;
  const redirectChain = [];
  let current = normalizedUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const gate = await policyGate(current, deps); // every hop re-runs R0
    if (!gate.allowed)
      // A hop rejected by the policy gate (e.g. DNS-rebinding into private
      // space) aborts the acquisition: recorded, never retried.
      return { ok: false, reason: gate.reason, failureClass: gate.failureClass, redirectChain, terminal: true };
    let res;
    try {
      res = await fetchImpl(gate.normalizedUrl, {
        redirect: "manual", signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" },
      });
    } catch (e) {
      return { ok: false, reason: "Fetch failed: " + e.message, failureClass: "TRANSIENT", redirectChain };
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      try { await res.arrayBuffer(); } catch {}
      if (!loc) return { ok: false, reason: "Redirect without location (" + res.status + ")", failureClass: "INVALID_PAYLOAD", redirectChain };
      redirectChain.push(current + " -> " + loc);
      try { current = new URL(loc, gate.normalizedUrl).toString(); }
      catch { return { ok: false, reason: "Unparseable redirect target", failureClass: "INVALID_PAYLOAD", redirectChain }; }
      continue;
    }
    if (res.status === 404)
      return { ok: false, reason: "HTTP 404", failureClass: "SOURCE_UNAVAILABLE", redirectChain, terminal: true };
    if (res.status < 200 || res.status >= 300)
      return { ok: false, reason: "HTTP " + res.status, failureClass: res.status === 429 ? "RATE_LIMITED" : res.status === 403 ? "PERMISSION_DENIED" : "TRANSIENT", redirectChain, terminal: res.status === 403 };
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("text/html") && !contentType.startsWith("application/xhtml+xml")) {
      try { await res.arrayBuffer(); } catch {}
      return { ok: false, reason: "Content-type not allowed: " + (contentType || "(missing)"), failureClass: "INVALID_PAYLOAD", redirectChain, terminal: true };
    }
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > maxBytes) {
      try { await res.arrayBuffer(); } catch {}
      return { ok: false, reason: `Declared size ${declared} exceeds limit ${maxBytes}`, failureClass: "INVALID_PAYLOAD", redirectChain, terminal: true };
    }
    // Streaming abort on DECODED bytes: the gzip-bomb defense.
    const reader = res.body?.getReader();
    if (!reader) return { ok: false, reason: "No response body", failureClass: "TRANSIENT", redirectChain };
    const chunks = []; let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch {}
        return { ok: false, reason: `Body exceeded size limit ${maxBytes} (decoded bytes)`, failureClass: "INVALID_PAYLOAD", redirectChain, terminal: true };
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return {
      ok: true, bytes, contentType, finalUrl: gate.normalizedUrl,
      statusCode: res.status, redirectChain,
      evidenceHash: sha256Hex(bytes),
    };
  }
  return { ok: false, reason: "Too many redirects (>" + maxRedirects + ")", failureClass: "INVALID_PAYLOAD", redirectChain, terminal: true };
}

/* ---------------- R2: structured-data extraction ---------------- */

const JSONLD_RE = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const BUSINESS_TYPES = /localbusiness|organization|store|restaurant|plumber|hvac|contractor|homeandconstructionbusiness|professionalservice|dentist|attorney|auto/i;

function metaContent(html, attr, value) {
  const tagRe = new RegExp('<meta\\s+[^>]*' + attr + '=["\']' + value + '["\'][^>]*>', "i");
  const tag = tagRe.exec(html);
  if (!tag) return null;
  const c = /content=["']([\s\S]*?)["']/i.exec(tag[0]);
  return c ? c[1].trim() : null;
}

export async function extractStructured(html) {
  const blocks = [];
  let m; let idx = 0;
  while ((m = JSONLD_RE.exec(html)) !== null && idx < 25) {
    if (m[1].length > 256 * 1024) { blocks.push({ index: idx++, ok: false, error: "block exceeds 256KB" }); continue; }
    try {
      let doc = JSON.parse(m[1]);
      // Offline: rewrite schema.org @context to inline @vocab; refuse others.
      const rewrite = (d) => {
        if (Array.isArray(d)) return d.map(rewrite);
        if (d && typeof d === "object") {
          const out = {};
          for (const [k, v] of Object.entries(d)) {
            if (k === "@context" && (v === "https://schema.org" || v === "http://schema.org" || v?.["@vocab"] === "https://schema.org/"))
              out[k] = { "@vocab": "https://schema.org/" };
            else if (k === "@context") out[k] = "__REMOTE_CONTEXT_REFUSED__";
            else out[k] = rewrite(v);
          }
          return out;
        }
        return d;
      };
      doc = rewrite(doc);
      const flat = await jsonld.flatten(doc);
      // flatten() returns the node array directly (no @graph envelope).
      const graph = Array.isArray(flat) ? flat : (flat["@graph"] ?? []);
      const val = (n, pred) => {
        const vs = n["https://schema.org/" + pred] ?? n[pred] ?? [];
        return vs.map((v) => (v && typeof v === "object" && "@value" in v ? v["@value"] : v))
          .filter((v) => typeof v === "string" && v.trim()).slice(0, 3);
      };
      const nodes = graph.filter(
        (n) => [].concat(n["@type"] ?? []).some((t) => BUSINESS_TYPES.test(String(t).replace("https://schema.org/", "")))
      );
      const facts = nodes.slice(0, 5).map((n) => {
        const addr = val(n, "address").join(" ");
        return {
          types: [].concat(n["@type"] ?? []).map((t) => String(t).replace("https://schema.org/", "")),
          name: val(n, "name")[0] ?? null,
          telephone: val(n, "telephone")[0] ?? null,
          email: val(n, "email")[0] ?? null,
          address: addr || null,
        };
      });
      blocks.push({ index: idx++, ok: true, businessNodes: nodes.length, facts });
    } catch (e) {
      blocks.push({ index: idx++, ok: false, error: "JSON parse failed: " + e.message.slice(0, 120) });
    }
    if (blocks.length >= 25) break;
  }
  const og = {};
  for (const p of ["og:title", "og:description", "og:type", "og:site_name", "og:locale", "og:image"])
    { const v = metaContent(html, "property", p); if (v) og[p] = v; }
  const meta = {};
  for (const n of ["description", "keywords"])
    { const v = metaContent(html, "name", n); if (v) meta[n] = v; }
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const rawTitle = titleM ? titleM[1].replace(/\s+/g, " ").trim().slice(0, 200) : null;
  const canonM = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(html)
    ?? /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i.exec(html);
  return {
    jsonLdBlocks: blocks,
    businessNodeCount: blocks.reduce((a, b) => a + (b.businessNodes ?? 0), 0),
    title: rawTitle ? decodeEntities(rawTitle) : null,
    openGraph: og, meta,
    canonicalUrl: canonM ? canonM[1] : null,
  };
}

/* ---------------- R3: HTML deep parse (extractor.ts semantics) ---------------- */

function stripScriptsAndStyles(html) {
  return html
    .replace(/<script[\s>][\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, " ");
}
const decodeEntities = (s) => s
  .replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;/gi, " ")
  .replace(/&#(\d+);/g, (_mm, n) => String.fromCharCode(parseInt(n, 10)))
  .replace(/\s+/g, " ").trim();
const stripTags = (s) => s.replace(/<[^>]*>/g, " ");
const cleanText = (s) => decodeEntities(stripTags(s));

export function extractHtmlEvidence(html) {
  const t0 = Date.now();
  const safe = stripScriptsAndStyles(html);
  const text = cleanText(safe);
  const truncated = text.length > 1024 * 1024;
  const cappedText = truncated ? text.slice(0, 1024 * 1024) : text;
  const headings = [];
  { const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi; let mm;
    while ((mm = re.exec(safe)) && headings.length < 10) {
      const t = cleanText(mm[1]);
      if (t && t.length <= 140 && !headings.includes(t)) headings.push(t);
    } }
  const items = [];
  { const re = /<li[^>]*>([\s\S]*?)<\/li>/gi; let mm;
    while ((mm = re.exec(safe)) && items.length < 20) {
      const t = cleanText(mm[1]);
      if (t && t.length > 2 && t.length <= 120 && !items.includes(t)) items.push(t);
    } }
  const telM = /<a\s+[^>]*href=["']tel:([^"']+)["']/i.exec(safe);
  const mailM = /<a\s+[^>]*href=["']mailto:([^"'>?]+)/i.exec(safe);
  const phoneRe = /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.exec(cappedText);
  const emailRe = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.exec(cappedText);
  const links = [];
  { const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let mm;
    while ((mm = re.exec(safe)) && links.length < 2000) {
      links.push({ href: mm[1].slice(0, 500), anchor: cleanText(mm[2]).slice(0, 120) });
    } }
  const linksTruncated = links.length >= 2000;
  return {
    textChars: cappedText.length, truncated,
    headings, listItems: items,
    phone: telM ? { value: decodeEntities(telM[1].trim()), source: "tel:" }
      : phoneRe ? { value: phoneRe[0], source: "body-regex" } : null,
    email: mailM ? { value: decodeEntities(mailM[1].trim()), source: "mailto:" }
      : emailRe && !/example\./i.test(emailRe[0]) ? { value: emailRe[0], source: "body-regex" } : null,
    linkCount: links.length, linksTruncated,
    sampleLinks: links.slice(0, 10),
    parseMs: Date.now() - t0,
  };
}

/* ---------------- Sufficiency gate ---------------- */

export function sufficiencyGate(structured, htmlEv) {
  const gaps = [];
  const identity = !!(structured.title || structured.openGraph["og:title"] || structured.openGraph["og:site_name"]);
  const contact = !!(htmlEv.phone || htmlEv.email || structured.businessNodeCount > 0);
  const offerings = htmlEv.textChars >= 200 || htmlEv.headings.length >= 3 ||
    htmlEv.listItems.length >= 3 || structured.businessNodeCount > 0;
  if (!identity) gaps.push("MISSING_IDENTITY");
  if (!contact) gaps.push("MISSING_CONTACT");
  if (!offerings) gaps.push("MISSING_OFFERINGS");
  // Typed JS-content gaps: trivial visible text + JS-app markers in bytes.
  if (!offerings && htmlEv.textChars < 200) gaps.push("EMPTY_BODY_AFTER_JS?");
  return { sufficient: gaps.length === 0, gaps };
}

const JS_APP_MARKERS = [/id=["']root["']>\s*<\/div>/i, /id=["']app["']>\s*<\/div>/i, /id=["']__next["']/i, /__NEXT_DATA__/i, /ng-app/i, /data-reactroot/i];

/* ---------------- Rung-input consistency (CONTENT_CHANGED) ---------------- */

/**
 * Every rung must operate on the same byte set. If a later rung's input hash
 * differs from R1's evidenceHash (e.g. an R4 re-render fetched fresh bytes),
 * that is CONTENT_CHANGED: fail closed, never merge observations from two
 * different byte sets.
 */
export function verifyRungInputConsistency(obs) {
  const hashes = Object.values(obs.rungHashes || {});
  const base = obs.evidenceHash;
  const mismatched = [...new Set(hashes.filter((h) => h && h !== base))];
  return mismatched.length === 0
    ? { consistent: true }
    : { consistent: false, gap: "CONTENT_CHANGED", expected: base, got: mismatched };
}

/* ---------------- The ladder ---------------- */

export async function acquire(rawUrl, opts = {}, deps = {}) {
  const t0 = Date.now();
  const escalation = [];
  const policyNotes = [];
  const rungHashes = {};

  // R0
  const gate = await policyGate(rawUrl, deps);
  if (!gate.allowed) {
    return terminal(rawUrl, null, 1, gate.failureClass, gate.reason, escalation, policyNotes, [gate.robotsNote].filter(Boolean), t0, rungHashes);
  }
  policyNotes.push(gate.robotsNote);
  const url = gate.normalizedUrl;

  // R1
  const f = await fetchStatic(url, opts, deps);
  if (!f.ok) {
    return terminal(rawUrl, null, 1, f.failureClass, f.reason, escalation, policyNotes, f.redirectChain, t0, rungHashes, f.terminal);
  }
  rungHashes.R1 = f.evidenceHash;
  escalation.push({ from: "R0", to: "R1", reason: "policy-allowed", inputHash: f.evidenceHash });
  const html = f.bytes.toString("utf8");
  const decodedTruncated = f.bytes.length > (opts.maxBytes ?? 5 * 1024 * 1024);
  // Meta-refresh is client behavior: recorded, never followed by the static path.
  const mrM = /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\s*\d+\s*;\s*url=([^"']+)["']/i.exec(html)
    ?? /<meta[^>]*content=["']\s*\d+\s*;\s*url=([^"']+)["'][^>]*http-equiv=["']refresh["']/i.exec(html);
  if (mrM) policyNotes.push("META_REFRESH_SEEN -> " + mrM[1].slice(0, 200) + " (not followed; static path never executes refresh)");

  // R2
  const structured = await extractStructured(html);
  rungHashes.R2 = f.evidenceHash; // R2 input == R1 bytes; recorded for CONTENT_CHANGED checks
  escalation.push({ from: "R1", to: "R2", reason: "structured-extraction", inputHash: f.evidenceHash });
  let gate2 = sufficiencyGate(structured, { textChars: 0, headings: [], listItems: [], phone: null, email: null });
  // R2-only sufficiency: structured signals alone rarely suffice; proceed to R3 cheaply.
  if (structured.businessNodeCount > 0 && structured.title && structured.openGraph["og:description"]) {
    return done(rawUrl, f, structured, null, 2, "sufficient-at-R2", escalation, policyNotes, t0, rungHashes);
  }

  // R3
  const htmlEv = extractHtmlEvidence(html);
  rungHashes.R3 = f.evidenceHash;
  escalation.push({ from: "R2", to: "R3", reason: "INSUFFICIENT_STRUCTURED_DATA", inputHash: f.evidenceHash });
  if (htmlEv.truncated) policyNotes.push("TEXT_TRUNCATED at 1MB decoded text");
  if (htmlEv.linksTruncated) policyNotes.push("LINKS_TRUNCATED at 2000");
  const g3 = sufficiencyGate(structured, htmlEv);
  // Conflict rule: structured vs visible claims are BOTH preserved with
  // distinct provenance; acquisition never silently picks a winner.
  const digits = (s) => (s || "").replace(/\D/g, "").replace(/^1(\d{10})$/, "$1");
  const jsonLdPhones = (structured.jsonLdBlocks ?? [])
    .flatMap((b) => b.facts ?? []).map((x) => x.telephone).filter(Boolean);
  const visiblePhone = htmlEv.phone?.value ?? null;
  let conflictingSources = false;
  for (const jp of jsonLdPhones) {
    if (visiblePhone && digits(jp) && digits(visiblePhone) && digits(jp) !== digits(visiblePhone)) {
      conflictingSources = true;
      policyNotes.push(`CONFLICTING_SOURCES: json-ld telephone "${jp.slice(0, 40)}" vs visible ${htmlEv.phone.source} phone "${visiblePhone.slice(0, 40)}" (both preserved; adjudication belongs to the resolution lane)`);
      break;
    }
  }
  if (conflictingSources) policyNotes.push("CONFLICT_FLAG_SET");
  if (g3.sufficient) {
    return done(rawUrl, f, structured, htmlEv, 3, "sufficient-at-R3", escalation, policyNotes, t0, rungHashes);
  }

  // R4 decision (delegated): typed JS gap?
  const jsMarkers = JS_APP_MARKERS.filter((re) => re.test(html)).map((re) => re.source);
  const emptyBody = htmlEv.textChars < 200;
  if (emptyBody && jsMarkers.length > 0) {
    escalation.push({ from: "R3", to: "R4", reason: "CONTENT_BEHIND_CLIENT_RENDER", inputHash: f.evidenceHash });
    return delegated(rawUrl, f, structured, htmlEv, 3, "CONTENT_BEHIND_CLIENT_RENDER",
      "R4 browser render DELEGATED to the factory browser worker (typed ESCALATE record; this spike does not execute renders).",
      jsMarkers, escalation, policyNotes, t0, rungHashes);
  }
  if (emptyBody) {
    escalation.push({ from: "R3", to: "R4?", reason: "EMPTY_BODY_NO_JS_MARKERS", inputHash: f.evidenceHash });
    return delegated(rawUrl, f, structured, htmlEv, 3, "EMPTY_BODY_AFTER_JS",
      "Empty body with no JS-app markers: likely blocked/thin page. R4 not justified; recorded as blocked-insufficient.",
      jsMarkers, escalation, policyNotes, t0, rungHashes);
  }
  return done(rawUrl, f, structured, htmlEv, 3, "partial-insufficient-no-escalation", escalation, policyNotes, t0, rungHashes, g3.gaps);
}

function base(rawUrl, f, structured, htmlEv, levelUsed, escalation, policyNotes, t0, rungHashes) {
  return {
    url: rawUrl,
    finalUrl: f ? f.finalUrl : null,
    fetchedAt: new Date(t0).toISOString(),
    statusCode: f ? f.statusCode : null,
    contentType: f ? f.contentType : null,
    bytes: f ? f.bytes.length : 0,
    truncated: htmlEv ? !!htmlEv.truncated : false,
    levelUsed,
    depth: 0,
    title: structured ? structured.title : null,
    meta: structured ? structured.meta : {},
    openGraph: structured ? structured.openGraph : {},
    jsonLd: structured ? structured.jsonLdBlocks : [],
    canonicalUrl: structured ? structured.canonicalUrl : null,
    policyNotes,
    evidenceHash: f ? f.evidenceHash : null,
    escalation,
    rungHashes,
    ms: Date.now() - t0,
  };
}

function done(rawUrl, f, structured, htmlEv, levelUsed, terminalReason, escalation, policyNotes, t0, rungHashes, gaps) {
  const o = base(rawUrl, f, structured, htmlEv, levelUsed, escalation, policyNotes, t0, rungHashes);
  o.terminal = { reason: terminalReason, escalated: false, gaps: gaps ?? [] };
  o.pageEvidence = htmlEv ? {
    headings: htmlEv.headings, listItems: htmlEv.listItems,
    phone: htmlEv.phone, email: htmlEv.email,
    textChars: htmlEv.textChars, linkCount: htmlEv.linkCount,
    // Both sides of any conflict, with distinct provenance labels.
    phoneJsonLd: (structured?.jsonLdBlocks ?? []).flatMap((b) => b.facts ?? [])
      .map((x) => x.telephone).filter(Boolean).map((v) => ({ value: v, source: "json-ld" })),
  } : null;
  return o;
}

function delegated(rawUrl, f, structured, htmlEv, levelUsed, gap, note, jsMarkers, escalation, policyNotes, t0, rungHashes) {
  const o = done(rawUrl, f, structured, htmlEv, levelUsed, "escalation-decided", escalation, policyNotes, t0, rungHashes, [gap]);
  o.terminal.escalated = true;
  o.terminal.escalateTo = "R4";
  o.terminal.gap = gap;
  o.terminal.note = note;
  o.terminal.jsMarkers = jsMarkers;
  return o;
}

function terminal(rawUrl, f, levelUsed, failureClass, reason, escalation, policyNotes, extraNotes, t0, rungHashes, isTerminal) {
  const o = base(rawUrl, f, null, null, levelUsed, escalation, policyNotes.concat(extraNotes || []), t0, rungHashes);
  o.terminal = { reason: "blocked-or-failed", escalated: false, failureClass, detail: reason, noEscalation: !!isTerminal };
  return o;
}
