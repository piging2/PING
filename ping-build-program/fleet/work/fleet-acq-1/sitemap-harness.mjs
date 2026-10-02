#!/usr/bin/env node
// sitemaps fixture lab harness — fleet-acq-1
// Parses XML sitemaps (urlset) and sitemap indexes (sitemapindex) under the
// acquisition no-guess doctrine: classify, bound, or quarantine.
//
// Fail-closed XML rules:
//  - Any <!DOCTYPE is a typed INVALID_PAYLOAD failure (XXE / billion-laughs
//    can never reach expansion: entities are never declared or processed).
//  - Only the 5 predefined XML entities + numeric charrefs are decoded, in a
//    SINGLE pass (no recursive expansion by construction).
//  - Wrong root element -> typed UNSUPPORTED failure (never parsed as HTML).
//  - gzip-magic input -> typed UNSUPPORTED failure (never decompressed here).
// Entry rules:
//  - A discovered_url claim needs an absolute http(s) loc; relative,
//    bad-scheme, credential-bearing, empty, or overlong (>2048, the spec cap)
//    locs are quarantined with typed reasons, never claimed.
//  - lastmod/changefreq/priority are validated; bad values are quarantined
//    per-entry while the loc itself still claims (field isolation).
//  - Duplicate locs dedupe to one claim (dedupe is not a conflict).
//  - Conflicting lastmods for one loc -> unresolved, no canonical lastmod.
//  - Extension namespaces (news/image/xhtml) are ignored (documented).
//  - Case-sensitive tags per XML: <URL>/<LOC> are not recognized entries.
// Bounds: 5MiB doc (over -> PERMANENT), 10k entries (over -> truncate+flag).
import { createHash } from "node:crypto";

export const SITEMAP_PARSER_VERSION = "sitemap-harness@1.0.0";

const SM_LIMITS = {
  maxDocBytes: 5 * 1024 * 1024,
  maxEntries: 10000,
  maxLocChars: 2048, // sitemap spec cap
};

const CHANGEFREQ = new Set(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]);
const LASTMOD_RE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const PRIORITY_RE = /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/;

function makeFailure(klass, nativeCode, detail, startedAt, sourceId) {
  const failedAt = new Date().toISOString();
  return {
    record_type: "ping.connector.failure.v1",
    class: klass,
    connector: "sitemap-harness",
    connector_version: SITEMAP_PARSER_VERSION,
    source_id: sourceId,
    operation: "parse",
    attempt: 1,
    max_attempts: 1,
    started_at: startedAt,
    failed_at: failedAt,
    duration_ms: Date.now() - Date.parse(startedAt),
    provider_signal: { native_code: nativeCode },
    evidence_refs: [],
    detail_redacted: String(detail).slice(0, 300),
    terminal: true,
    dead_lettered: false,
  };
}

function decodeXmlEntities(s) {
  // single pass only: no recursive expansion, ever.
  return s.replace(/&(amp|lt|gt|quot|apos);|&#(\d+);|&#x([0-9a-fA-F]+);/g,
    (m, named, dec, hex) => {
      if (named) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[named];
      const c = parseInt(dec ?? hex, dec ? 10 : 16);
      return c <= 0x10ffff ? String.fromCodePoint(c) : m;
    });
}

function stripInnerTags(s) {
  let out = "", i = 0;
  while (i < s.length) {
    const lt = s.indexOf("<", i);
    if (lt === -1) { out += s.slice(i); break; }
    out += s.slice(i, lt);
    const gt = s.indexOf(">", lt + 1);
    i = gt === -1 ? s.length : gt + 1;
  }
  return out;
}

function localName(tag) {
  // case-SENSITIVE per XML: <URL> is not <url>. Only the namespace prefix
  // (before ':') is stripped.
  const c = tag.indexOf(":");
  return c === -1 ? tag : tag.slice(c + 1);
}

export function runSitemapCase(xml, sourceId) {
  const startedAt = new Date().toISOString();
  const fail = (klass, code, detail) => ({
    case_id: sourceId, outcome: "typed_failure",
    failure: makeFailure(klass, code, detail, startedAt, sourceId),
    claims: [], unresolved: [], quarantined: [],
    provenance: { parser: SITEMAP_PARSER_VERSION, fixture: sourceId },
    parser_version: SITEMAP_PARSER_VERSION,
  });

  let doc = xml.replace(/^﻿/, ""); // strip BOM
  if (doc.charCodeAt(0) === 0x1f && doc.charCodeAt(1) === 0x8b)
    return fail("UNSUPPORTED", "gzip-magic-not-decompressed", "binary input is not decompressed in the lab");
  if (Buffer.byteLength(doc, "utf8") > SM_LIMITS.maxDocBytes)
    return fail("PERMANENT", "doc-bytes-over-cap", `>${SM_LIMITS.maxDocBytes} bytes`);
  if (/<!DOCTYPE/i.test(doc))
    return fail("INVALID_PAYLOAD", "doctype-decl-not-processed", "DOCTYPE (XXE/entity risk) is never processed");

  // root element
  let ri = doc.search(/<(?!!--|\?|!\[CDATA\[)[A-Za-z_][\w:.-]*/);
  if (ri === -1) return fail("UNSUPPORTED", "unsupported-root", "no root element");
  const rm = /^<([A-Za-z_][\w:.-]*)/.exec(doc.slice(ri));
  const root = localName(rm[1]);
  const isIndex = root === "sitemapindex";
  if (root !== "urlset" && !isIndex)
    return fail("UNSUPPORTED", "unsupported-root", `root <${rm[1]}> is not urlset/sitemapindex`);

  const claims = [];
  const unresolved = [];
  const quarantined = [];
  const notes = { indexEntries: [], orphanLocs: 0, duplicateLocs: 0, nestedUrl: 0, futureLastmod: 0, commentsSkipped: 0 };
  const truncated = { entries: false };
  const seen = new Map(); // loc -> {lastmods:Set, locator}
  let validLocOccurrences = 0;
  const quar = (entry, reason, detail) => quarantined.push({ entry, reason, detail: String(detail ?? "").slice(0, 160) });

  const entryTag = isIndex ? "sitemap" : "url";
  const n = doc.length;
  let i = 0, entryCount = 0;

  const readLeafText = (tagRaw, from) => {
    // returns {text, next} reading until the exact matching close tag.
    const closeTag = `</${tagRaw}>`;
    const rest = doc.slice(from);
    let mIdx = rest.indexOf(closeTag);
    // tolerate whitespace before '>' in the close tag
    let closeLen = closeTag.length;
    if (mIdx === -1) {
      const wsRe = new RegExp(`</${tagRaw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*>`);
      const wm = wsRe.exec(rest);
      if (wm) { mIdx = wm.index; closeLen = wm[0].length; }
    }
    const raw = mIdx === -1 ? rest : rest.slice(0, mIdx);
    let text = "";
    let j = 0;
    while (j < raw.length) {
      const cd = raw.indexOf("<![CDATA[", j);
      if (cd === -1) { text += raw.slice(j); break; }
      text += raw.slice(j, cd);
      const ce = raw.indexOf("]]>", cd + 9);
      if (ce === -1) { text += raw.slice(cd + 9); break; }
      text += raw.slice(cd + 9, ce); // CDATA is literal
      j = ce + 3;
    }
    text = decodeXmlEntities(stripInnerTags(text));
    return { text, next: from + (mIdx === -1 ? raw.length : mIdx + closeLen) };
  };

  while (i < n) {
    const lt = doc.indexOf("<", i);
    if (lt === -1) break;
    i = lt;
    if (doc.startsWith("<!--", i)) {
      const end = doc.indexOf("-->", i + 4);
      notes.commentsSkipped++;
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (doc.startsWith("<?", i)) { const end = doc.indexOf("?>", i + 2); i = end === -1 ? n : end + 2; continue; }
    if (doc.startsWith("<![CDATA[", i)) { const end = doc.indexOf("]]>", i + 9); i = end === -1 ? n : end + 3; continue; }
    const gt = doc.indexOf(">", i + 1);
    if (gt === -1) break;
    const rawTag = doc.slice(i + 1, gt);
    const isClose = rawTag[0] === "/";
    const tm = /^([A-Za-z_][\w:.-]*)/.exec(isClose ? rawTag.slice(1) : rawTag);
    const tagRaw = tm ? tm[1] : "";
    const tagLocal = localName(tagRaw);
    i = gt + 1;
    if (isClose || tagLocal !== entryTag) {
      // orphan loc detection: <loc> outside any entry
      if (!isClose && tagLocal === "loc") {
        const { next } = readLeafText(tagRaw, i);
        notes.orphanLocs++;
        i = next;
      }
      continue;
    }
    // entry open
    entryCount++;
    if (entryCount > SM_LIMITS.maxEntries) { truncated.entries = true; continue; }
    const entry = { loc: null, lastmod: null, changefreq: null, priority: null };
    const locator = `${entryTag}[${entryCount}]`;
    // scan until matching close
    let depth = 1;
    while (i < n && depth > 0) {
      const lt2 = doc.indexOf("<", i);
      if (lt2 === -1) { i = n; break; }
      i = lt2;
      if (doc.startsWith("<!--", i)) { const end = doc.indexOf("-->", i + 4); i = end === -1 ? n : end + 3; continue; }
      if (doc.startsWith("<![CDATA[", i)) { const end = doc.indexOf("]]>", i + 9); i = end === -1 ? n : end + 3; continue; }
      const gt2 = doc.indexOf(">", i + 1);
      if (gt2 === -1) { i = n; break; }
      const rt2 = doc.slice(i + 1, gt2);
      const isClose2 = rt2[0] === "/";
      const tm2 = /^([A-Za-z_][\w:.-]*)/.exec(isClose2 ? rt2.slice(1) : rt2);
      const tagRaw2 = tm2 ? tm2[1] : "";
      const t2 = localName(tagRaw2);
      const selfClose = /\/\s*$/.test(rt2);
      i = gt2 + 1;
      if (isClose2) {
        if (t2 === entryTag) depth--;
        continue;
      }
      if (selfClose) continue;
      if (t2 === entryTag) { depth++; notes.nestedUrl++; quar(locator, "nested-entry", "nested <url> is not a separate entry"); continue; }
      if (depth === 1 && (t2 === "loc" || t2 === "lastmod" || t2 === "changefreq" || t2 === "priority")) {
        const { text, next } = readLeafText(tagRaw2, i);
        i = next;
        entry[t2] = text;
      }
      // other tags (extensions): ignored, documented
    }
    // validate entry
    if (isIndex) {
      if (entry.loc) notes.indexEntries.push(entry.loc.trim().slice(0, 300));
      else quar(locator, "index-missing-loc", "sitemap entry without loc");
      continue;
    }
    const rawLoc = entry.loc == null ? null : entry.loc.trim();
    if (rawLoc == null || rawLoc === "") { quar(locator, "missing-loc", "url entry without loc"); continue; }
    const loc = rawLoc;
    if (loc.length > SM_LIMITS.maxLocChars) { quar(locator, "overlong-loc", `${loc.length} chars`); continue; }
    if (/^https?:\/\//i.test(loc)) {
      if (/^https?:\/\/[^/]*@/i.test(loc)) { quar(locator, "credential-loc", loc.replace(/^(https?:\/\/)[^/]*@/, "$1<redacted>@").slice(0, 120)); continue; }
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(loc)) { quar(locator, "bad-scheme-loc", loc.slice(0, 80)); continue; }
    else { quar(locator, "relative-loc", loc.slice(0, 80)); continue; }
    validLocOccurrences++;
    // field isolation: bad optional fields quarantine per-entry, loc still claims
    if (entry.lastmod != null && entry.lastmod.trim() !== "") {
      const lm = entry.lastmod.trim();
      if (!LASTMOD_RE.test(lm)) quar(locator, "bad-lastmod", lm.slice(0, 60));
      else {
        if (Date.parse(lm) > Date.now()) notes.futureLastmod++;
        const s = seen.get(loc);
        if (s) s.lastmods.add(lm); else seen.set(loc, { lastmods: new Set([lm]), locator });
      }
    } else if (!seen.has(loc)) seen.set(loc, { lastmods: new Set(), locator });
    if (entry.changefreq != null && entry.changefreq.trim() !== "" && !CHANGEFREQ.has(entry.changefreq.trim().toLowerCase()))
      quar(locator, "bad-changefreq", entry.changefreq.trim().slice(0, 40));
    if (entry.priority != null && entry.priority.trim() !== "" && !PRIORITY_RE.test(entry.priority.trim()))
      quar(locator, "bad-priority", entry.priority.trim().slice(0, 40));
    if (!seen.has(loc)) seen.set(loc, { lastmods: new Set(), locator });
  }

  for (const [loc, s] of seen) {
    claims.push({ field: "discovered_url", value: loc, provenance: [{ source: "sitemap", locator: s.locator }], parser: SITEMAP_PARSER_VERSION });
    if (s.lastmods.size > 1) {
      unresolved.push({
        field: "lastmod",
        candidates: [...s.lastmods].map((v) => ({ value: v, provenance: [{ source: "sitemap", locator: s.locator }] })),
        reason: "conflicting-candidates-no-guess",
      });
    }
  }
  // duplicates collapsed into one claim each; extras counted, never conflicted.
  notes.duplicateLocs = Math.max(0, validLocOccurrences - seen.size);

  return {
    case_id: sourceId, outcome: "bounded_success", claims, unresolved, quarantined,
    truncated, notes,
    provenance: { parser: SITEMAP_PARSER_VERSION, fixture: sourceId },
    parser_version: SITEMAP_PARSER_VERSION,
  };
}
