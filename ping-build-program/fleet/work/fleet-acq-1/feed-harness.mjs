#!/usr/bin/env node
// feeds fixture lab harness — fleet-acq-1
// Parses RSS 2.0 (<rss><channel><item>) and Atom (<feed><entry>) under the
// acquisition no-guess doctrine: classify, bound, or quarantine.
//
// Fail-closed XML front-end (same pins as the sitemap lab, own copy):
//  - Any <!DOCTYPE -> typed INVALID_PAYLOAD (XXE / entity attacks die here).
//  - Only the 5 predefined XML entities + numeric charrefs, single pass.
//  - Wrong root -> typed UNSUPPORTED. gzip-magic -> typed UNSUPPORTED.
// Entry rules:
//  - An entry_link claim needs an absolute http(s) link (RSS <link> text or
//    Atom rel=alternate href); relative / bad-scheme / credential-bearing /
//    missing links are quarantined with typed reasons.
//  - guid is an opaque identity: isPermaLink=false (or non-URL guid) is never
//    claimed as a link; duplicate guids with differing content -> unresolved.
//  - Two differing Atom alternates -> unresolved (no preferred link guessed).
//  - Bad dates quarantine per-entry; the link still claims (field isolation).
//  - content:encoded / content HTML is tag-stripped; scripts never survive.
//  - Extension namespaces (itunes, dc, media) are evidence/ignored (documented).
//  - Tags are case-sensitive per XML: <ITEM> is not an entry.
// Bounds: 5MiB doc (over -> PERMANENT), 10k entries (over -> truncate+flag).

export const FEED_PARSER_VERSION = "feed-harness@1.0.0";

const F_LIMITS = {
  maxDocBytes: 5 * 1024 * 1024,
  maxEntries: 10000,
  maxTextChars: 4096,
};

function makeFailure(klass, nativeCode, detail, startedAt, sourceId) {
  const failedAt = new Date().toISOString();
  return {
    record_type: "ping.connector.failure.v1",
    class: klass,
    connector: "feed-harness",
    connector_version: FEED_PARSER_VERSION,
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
  const c = tag.indexOf(":");
  return c === -1 ? tag : tag.slice(c + 1);
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([A-Za-z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

export function runFeedCase(xml, sourceId) {
  const startedAt = new Date().toISOString();
  const fail = (klass, code, detail) => ({
    case_id: sourceId, outcome: "typed_failure",
    failure: makeFailure(klass, code, detail, startedAt, sourceId),
    claims: [], unresolved: [], quarantined: [],
    provenance: { parser: FEED_PARSER_VERSION, fixture: sourceId },
    parser_version: FEED_PARSER_VERSION,
  });

  let doc = xml.replace(/^﻿/, "");
  if (doc.charCodeAt(0) === 0x1f && doc.charCodeAt(1) === 0x8b)
    return fail("UNSUPPORTED", "gzip-magic-not-decompressed", "binary input is not decompressed in the lab");
  if (Buffer.byteLength(doc, "utf8") > F_LIMITS.maxDocBytes)
    return fail("PERMANENT", "doc-bytes-over-cap", `>${F_LIMITS.maxDocBytes} bytes`);
  if (/<!DOCTYPE/i.test(doc))
    return fail("INVALID_PAYLOAD", "doctype-decl-not-processed", "DOCTYPE (XXE/entity risk) is never processed");

  let ri = doc.search(/<(?!!--|\?|!\[CDATA\[)[A-Za-z_][\w:.-]*/);
  if (ri === -1) return fail("UNSUPPORTED", "unsupported-root", "no root element");
  const rm = /^<([A-Za-z_][\w:.-]*)/.exec(doc.slice(ri));
  const root = localName(rm[1]);
  const isAtom = root === "feed";
  const isRss = root === "rss";
  if (!isAtom && !isRss)
    return fail("UNSUPPORTED", "unsupported-root", `root <${rm[1]}> is not rss/feed`);

  const claims = [];
  const unresolved = [];
  const quarantined = [];
  const notes = { feedFormat: isAtom ? "atom" : "rss", feedTitle: null, entryCount: 0, guidsSeen: 0, enclosures: 0, commentsSkipped: 0, externalContent: 0 };
  const truncated = { entries: false, fields: false };
  const quar = (entry, reason, detail) => quarantined.push({ entry, reason, detail: String(detail ?? "").slice(0, 160) });

  const n = doc.length;
  // Bound all scanning to the FIRST root element: concatenated trailing
  // documents are not re-entered (documented).
  const rootLocal = root;
  let rootEnd = n;
  {
    let d = 1, j = doc.indexOf(">", ri) + 1;
    while (j < n && d > 0) {
      const lt = doc.indexOf("<", j);
      if (lt === -1) break;
      j = lt;
      if (doc.startsWith("<!--", j)) { const e = doc.indexOf("-->", j + 4); j = e === -1 ? n : e + 3; continue; }
      if (doc.startsWith("<?", j)) { const e = doc.indexOf("?>", j + 2); j = e === -1 ? n : e + 2; continue; }
      if (doc.startsWith("<![CDATA[", j)) { const e = doc.indexOf("]]>", j + 9); j = e === -1 ? n : e + 3; continue; }
      const gt = doc.indexOf(">", j + 1);
      if (gt === -1) { j = n; break; }
      const rt = doc.slice(j + 1, gt);
      const isClose = rt[0] === "/";
      const tm = /^([A-Za-z_][\w:.-]*)/.exec(isClose ? rt.slice(1) : rt);
      const tl = tm ? localName(tm[1]) : "";
      const selfClose = /\/\s*$/.test(rt);
      if (!isClose && !selfClose && tl === rootLocal) d++;
      else if (isClose && tl === rootLocal) d--;
      j = gt + 1;
    }
    rootEnd = j;
  }
  const end = rootEnd;

  const entryTag = isAtom ? "entry" : "item";
  let i = 0, entryCount = 0;
  const seenLinks = new Map(); // link -> locator
  const seenGuids = new Map(); // guid -> {title, link}

  const readLeafText = (tagRaw, from) => {
    const closeTag = `</${tagRaw}>`;
    const rest = doc.slice(from);
    let mIdx = rest.indexOf(closeTag);
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
      text += raw.slice(cd + 9, ce);
      j = ce + 3;
    }
    text = stripInnerTags(decodeXmlEntities(text)).replace(/\s+/g, " ").trim();
    if (text.length > F_LIMITS.maxTextChars) { text = text.slice(0, F_LIMITS.maxTextChars); truncated.fields = true; }
    return { text, next: from + (mIdx === -1 ? raw.length : mIdx + closeLen) };
  };

  // feed-level title (the title element itself, not its channel wrapper)
  {
    let titleIdx = -1, titleTag = null;
    const tmAtom = /<title[^>]*>/.exec(doc);
    if (isAtom) {
      if (tmAtom) { titleIdx = tmAtom.index + tmAtom[0].length; titleTag = /^<([A-Za-z_][\w:.-]*)/.exec(tmAtom[0])[1]; }
    } else {
      const cm = /<channel[^>]*>/.exec(doc);
      if (cm) {
        const tm = /<title[^>]*>/.exec(doc.slice(cm.index));
        // must appear before the first entry to be the channel title
        const firstEntry = doc.search(/<(item|entry)[\s>]/);
        if (tm && (firstEntry === -1 || cm.index + tm.index < firstEntry)) {
          titleIdx = cm.index + tm.index + tm[0].length;
          titleTag = /^<([A-Za-z_][\w:.-]*)/.exec(tm[0])[1];
        }
      }
    }
    if (titleIdx !== -1 && localName(titleTag) === "title") {
      const { text } = readLeafText(titleTag, titleIdx);
      if (text) notes.feedTitle = text.slice(0, 200);
    }
  }

  while (i < end) {
    const lt = doc.indexOf("<", i);
    if (lt === -1) break;
    i = lt;
    if (doc.startsWith("<!--", i)) { const end = doc.indexOf("-->", i + 4); notes.commentsSkipped++; i = end === -1 ? n : end + 3; continue; }
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
    if (isClose || tagLocal !== entryTag) continue;

    entryCount++;
    notes.entryCount = entryCount;
    if (entryCount > F_LIMITS.maxEntries) { truncated.entries = true; continue; }
    const locator = `${entryTag}[${entryCount}]`;
    const entry = { title: null, link: null, guid: null, guidPerma: true, date: null, alternates: [] };
    let depth = 1;
    while (i < end && depth > 0) {
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
      const attrs = isClose2 ? {} : parseAttrs(rt2.slice(tagRaw2.length));
      i = gt2 + 1;
      if (isClose2) { if (t2 === entryTag) depth--; continue; }
      if (t2 === entryTag && !selfClose) { quar(locator, "nested-entry", "nested entry is not a separate entry"); depth++; continue; }
      if (depth !== 1) continue;
      if (t2 === "title" && entry.title === null && !selfClose) {
        const { text, next } = readLeafText(tagRaw2, i); i = next; entry.title = text;
      } else if (t2 === "link") {
        if (isAtom) {
          const rel = (attrs.rel || "alternate").toLowerCase();
          const href = decodeXmlEntities((attrs.href || "").trim());
          if (href) entry.alternates.push({ rel, href });
          if (selfClose) continue;
          // non-empty <link> in atom: skip inner
          if (!selfClose) { const { next } = readLeafText(tagRaw2, i); i = next; }
        } else if (!selfClose) {
          const { text, next } = readLeafText(tagRaw2, i); i = next;
          if (entry.link === null) entry.link = text;
        }
      } else if ((t2 === "guid" || t2 === "id") && !selfClose) {
        const { text, next } = readLeafText(tagRaw2, i); i = next;
        entry.guid = text;
        if (t2 === "guid") entry.guidPerma = (attrs.ispermalink || "true").toLowerCase() !== "false";
      } else if ((t2.toLowerCase() === "pubdate" || t2 === "updated" || t2 === "published") && !selfClose) {
        const { text, next } = readLeafText(tagRaw2, i); i = next;
        if (entry.date === null) entry.date = text;
      } else if (t2 === "enclosure" || t2 === "enclosure ") {
        notes.enclosures++;
      } else if (t2 === "content" && attrs.src) {
        notes.externalContent++; // never fetched
      }
      if (selfClose) continue;
    }

    // resolve link
    let link = null;
    if (isAtom) {
      const alts = entry.alternates.filter((a) => a.rel === "alternate").map((a) => a.href);
      const uniq = [...new Set(alts)];
      if (uniq.length > 1) {
        unresolved.push({ field: "entry_link", candidates: uniq.map((v) => ({ value: v, provenance: [{ source: "feed", locator }] })), reason: "conflicting-candidates-no-guess" });
        continue;
      }
      link = uniq[0] || null;
    } else {
      link = entry.link && entry.link.trim() ? entry.link.trim() : null;
    }
    const cleanLink = (l) => {
      if (!l) return { ok: false, reason: "missing-link" };
      if (/^https?:\/\//i.test(l)) {
        if (/^https?:\/\/[^/]*@/i.test(l)) return { ok: false, reason: "credential-link", redacted: l.replace(/^(https?:\/\/)[^/]*@/, "$1<redacted>@") };
        return { ok: true, value: l };
      }
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(l)) return { ok: false, reason: "bad-scheme-link" };
      return { ok: false, reason: "relative-link" };
    };
    const cl = cleanLink(link);
    if (!cl.ok) { quar(locator, cl.reason, cl.redacted || link || ""); }
    else {
      if (!seenLinks.has(cl.value)) {
        seenLinks.set(cl.value, locator);
        claims.push({ field: "entry_link", value: cl.value, provenance: [{ source: "feed", locator }], parser: FEED_PARSER_VERSION });
      }
    }
    // date validation (field isolation)
    if (entry.date) {
      const d = entry.date.trim();
      const okDate = isAtom ? /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d) : !Number.isNaN(Date.parse(d));
      if (!okDate) quar(locator, "bad-date", d.slice(0, 60));
    }
    // guid tracking
    if (entry.guid) {
      notes.guidsSeen++;
      const prev = seenGuids.get(entry.guid);
      const sig = `${entry.title || ""}||${cl.ok ? cl.value : ""}`;
      if (prev && prev.sig !== sig) {
        unresolved.push({ field: "guid", candidates: [
          { value: `${entry.guid} :: ${prev.sig}`, provenance: [{ source: "feed", locator: prev.locator }] },
          { value: `${entry.guid} :: ${sig}`, provenance: [{ source: "feed", locator }] },
        ], reason: "conflicting-candidates-no-guess" });
      } else if (!prev) seenGuids.set(entry.guid, { sig, locator });
    }
  }

  return {
    case_id: sourceId, outcome: "bounded_success", claims, unresolved, quarantined,
    truncated, notes,
    provenance: { parser: FEED_PARSER_VERSION, fixture: sourceId },
    parser_version: FEED_PARSER_VERSION,
  };
}
