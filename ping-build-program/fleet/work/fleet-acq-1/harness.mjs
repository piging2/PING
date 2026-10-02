#!/usr/bin/env node
// html-hardening fixture lab harness — fleet-acq-1
// Implements lane-d HOSTILE-INPUT-CONTRACT parse bounds P1-P8 for HTML and the
// core acquisition invariant: NEVER turn parser guess into canonical fact.
//
// Design:
//  - Single-pass char scanner, no regex with quantifier nesting (P8).
//  - Hard caps: nodes (P1), text bytes (P2), links (P3), JSON-LD blocks+bytes (P4),
//    meta entries (P5), attribute bytes, parse wall-clock (P6).
//  - script/style/comment/template/noscript/iframe-srcdoc/svg/form-input/img-alt
//    content is EXCLUDED from claim extraction (P7 + no-guess doctrine); each
//    lands in a labeled, quarantined evidence bucket.
//  - Claim rule: a structured claim is emitted ONLY when all observed candidates
//    for a field agree on one normalized value (multi-source provenance kept).
//    Conflicting candidates -> unresolved conflict, NO claim. Zero candidates ->
//    absent field (legitimate empty, lane-K: not a failure).
//  - Every bound violation emits a lane-K typed FailureRecord; success emits
//    bounded extraction with per-claim provenance.

export const PARSER_VERSION = "html-harness@1.1.0";

export const LIMITS = {
  maxNodes: 200000,        // P1
  maxTextBytes: 2 * 1024 * 1024, // P2
  maxLinks: 10000,         // P3
  maxJsonLdBlocks: 50,     // P4
  maxJsonLdBytes: 512 * 1024,    // P4
  maxMeta: 500,            // P5
  maxAttrBytes: 64 * 1024,
  // P6: callers may TIGHTEN, never loosen (contract 3, lane-d). The runner
  // tightens it for the budget-abort fixture to exercise the abort path.
  parseBudgetMs: Number(process.env.HTML_HARNESS_BUDGET_MS || 10000),
};

const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s) {
  // numeric entities first (decimal + hex), then pinned named set; unknown
  // named entities are left verbatim (never guessed).
  return s
    .replace(/&#(\d+);/g, (m, d) => { const c = parseInt(d, 10); return c <= 0x10ffff ? String.fromCodePoint(c) : m; })
    .replace(/&#x([0-9a-fA-F]+);/g, (m, h) => { const c = parseInt(h, 16); return c <= 0x10ffff ? String.fromCodePoint(c) : m; })
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (m, n) => NAMED_ENTITIES[n] ?? m);
}

export function parseAttrs(s) {
  // char-scan attribute parser; no backtracking regexes.
  const attrs = {};
  let i = 0;
  const n = s.length;
  while (i < n) {
    while (i < n && /\s/.test(s[i])) i++;
    if (i >= n || s[i] === "/" || s[i] === ">") break;
    let start = i;
    while (i < n && !/[\s=/>]/.test(s[i])) i++;
    const name = s.slice(start, i).toLowerCase();
    while (i < n && /\s/.test(s[i])) i++;
    let value = "";
    if (s[i] === "=") {
      i++;
      while (i < n && /\s/.test(s[i])) i++;
      const q = s[i];
      if (q === '"' || q === "'") {
        i++;
        start = i;
        while (i < n && s[i] !== q) i++;
        value = s.slice(start, i);
        if (s[i] === q) i++;
      } else {
        start = i;
        while (i < n && !/[\s>]/.test(s[i])) i++;
        value = s.slice(start, i);
      }
    }
    if (name) {
      // Spec: attribute values are entity-decoded AFTER tokenizing (script/style
      // excluded — they never reach here as attrs). Decoding here prevents
      // garbage claims like tel:+1&#45;970... normalizing to wrong digits.
      let decoded = value;
      try { decoded = decodeEntities(value); } catch { decoded = value; }
      attrs[name] = decoded.length > LIMITS.maxAttrBytes ? { truncated: true, value: decoded.slice(0, LIMITS.maxAttrBytes) } : decoded;
    }
  }
  return attrs;
}

export function attrVal(v) { return typeof v === "object" && v !== null ? v.value : (v ?? ""); }
function attrWasTruncated(v) { return typeof v === "object" && v !== null && v.truncated === true; }

const VOID = new Set(["meta","link","img","br","hr","input","base","area","col","embed","source","track","wbr"]);

function makeFailure(klass, nativeCode, detail, startedAt, extra = {}) {
  const failedAt = new Date().toISOString();
  return {
    record_type: "ping.connector.failure.v1",
    class: klass,
    connector: "html-hardening-harness",
    connector_version: PARSER_VERSION,
    source_id: extra.source_id || "fixture:unknown",
    operation: "parse",
    attempt: 1,
    max_attempts: 1,
    started_at: startedAt,
    failed_at: failedAt,
    duration_ms: Date.now() - Date.parse(startedAt),
    provider_signal: { native_code: nativeCode },
    evidence_refs: [],
    detail_redacted: detail,
    terminal: true,
    dead_lettered: false,
    ...extra,
  };
}

export function parseHtml(html, sourceId) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const bytes = Buffer.byteLength(html, "utf8");

  const out = {
    source_id: sourceId,
    parser: PARSER_VERSION,
    titles: [], h1s: [], metas: [], links: [], jsonld: [],
    malformedJsonLd: [],
    textVisible: "", textHidden: "", textNoscript: "", evidenceStrings: [],
    baseHref: null, canonicalLink: null, ogUrl: null, metaRefresh: null,
    flags: { truncatedText: false, truncatedLinks: false, truncatedMeta: false,
             truncatedJsonLd: false, truncatedAttr: false, scriptStripped: false,
             styleStripped: false, inertRegions: 0, visibilityUnverified: false,
             charsetConflict: false },
    charsetDecls: [],
    failure: null,
  };

  let i = 0, n = html.length, nodes = 0;
  let textBuf = [], textBytes = 0;
  let hiddenDepth = 0, svgDepth = 0, inertDepth = 0; // inert: template/iframe-srcdoc
  let inTitle = false, titleBuf = "", inH1 = false, h1Buf = "";
  let jsonLdTotalBytes = 0;
  let tokenCount = 0;

  const checkBudget = () => { if ((++tokenCount & 4095) === 0 && Date.now() - t0 > LIMITS.parseBudgetMs) return false; return true; };
  const abort = (klass, nativeCode, detail) => {
    out.failure = makeFailure(klass, nativeCode, detail, startedAt, { source_id: sourceId });
    return out;
  };
  const bumpNode = () => { if (++nodes > LIMITS.maxNodes) return false; return true; };

  const pushText = (t) => {
    if (!t) return;
    const b = Buffer.byteLength(t, "utf8");
    if (textBytes + b > LIMITS.maxTextBytes) {
      const room = LIMITS.maxTextBytes - textBytes;
      // take a prefix that fits (char-safe-ish: slice by string with byte check loop)
      let take = 0, acc = 0;
      while (take < t.length && acc + Buffer.byteLength(t[take], "utf8") <= room) { acc += Buffer.byteLength(t[take], "utf8"); take++; }
      textBuf.push(t.slice(0, take));
      textBytes = LIMITS.maxTextBytes;
      out.flags.truncatedText = true;
    } else { textBuf.push(t); textBytes += b; }
  };

  while (i < n) {
    if (!checkBudget()) return abort("TIMEOUT", "parse-deadline-exceeded",
      `Parse wall-clock budget ${LIMITS.parseBudgetMs}ms exceeded (P6). Partial state discarded; no claims emitted.`);
    const lt = html.indexOf("<", i);
    if (lt === -1) { // trailing text
      const t = html.slice(i);
      if (inertDepth === 0 && svgDepth === 0) { if (hiddenDepth > 0) out.textHidden += t; else pushText(t); }
      break;
    }
    // text before tag
    if (lt > i) {
      const t = html.slice(i, lt);
      if (inTitle) titleBuf += t;
      else if (inH1) h1Buf += t;
      else if (inertDepth === 0 && svgDepth === 0) { if (hiddenDepth > 0) out.textHidden += t; else pushText(t); }
    }
    i = lt;
    // comment
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? n : end + 3;
      if (!bumpNode()) return abort("PERMANENT", "dom-node-cap", `DOM node cap ${LIMITS.maxNodes} exceeded (P1).`);
      continue;
    }
    // CDATA
    if (html.startsWith("<![CDATA[", i)) {
      const end = html.indexOf("]]>", i + 9);
      const cdata = end === -1 ? html.slice(i + 9) : html.slice(i + 9, end);
      out.evidenceStrings.push({ kind: "cdata", excerpt: cdata.slice(0, 200) });
      i = end === -1 ? n : end + 3;
      continue;
    }
    // doctype / declarations
    if (html.startsWith("<!", i)) { const end = html.indexOf(">", i + 2); i = end === -1 ? n : end + 1; continue; }
    // find tag end
    const gt = html.indexOf(">", i + 1);
    if (gt === -1) break; // malformed tail: stop, do not invent structure
    const raw = html.slice(i + 1, gt);
    const isClose = raw.startsWith("/");
    const tagName = (isClose ? raw.slice(1) : raw).trim().split(/[\s/>]/, 1)[0].toLowerCase();
    if (!bumpNode()) return abort("PERMANENT", "dom-node-cap", `DOM node cap ${LIMITS.maxNodes} exceeded (P1).`);
    i = gt + 1;

    if (isClose) {
      if (tagName === "title") { out.titles.push(decodeEntities(titleBuf)); titleBuf = ""; inTitle = false; }
      else if (tagName === "h1") { out.h1s.push(decodeEntities(h1Buf)); h1Buf = ""; inH1 = false; }
      else if (tagName === "svg") svgDepth = Math.max(0, svgDepth - 1);
      else if (tagName === "template" || tagName === "iframe") inertDepth = Math.max(0, inertDepth - 1);
      else if (/^(div|span|section|article|main|p|li|td)$/.test(tagName) && hiddenDepth > 0) hiddenDepth--;
      continue;
    }

    const attrs = parseAttrs(raw.slice(tagName.length));
    for (const k of Object.keys(attrs)) if (attrWasTruncated(attrs[k])) out.flags.truncatedAttr = true;
    const styleAttr = String(attrVal(attrs.style) || "");
    const selfHidden = /display\s*:\s*none|visibility\s*:\s*hidden/i.test(styleAttr);
    if (!VOID.has(tagName) && /^(div|span|section|article|main|p|li|td)$/.test(tagName) && (selfHidden || hiddenDepth > 0)) {
      if (selfHidden && hiddenDepth === 0) { /* entering hidden region */ }
      hiddenDepth++;
    }

    switch (tagName) {
      case "script": {
        out.flags.scriptStripped = true;
        const type = String(attrVal(attrs.type) || "").toLowerCase();
        const closeRe = new RegExp("</script\\s*>", "i");
        const rest = html.slice(i);
        const m = closeRe.exec(rest);
        const inner = m ? rest.slice(0, m.index) : rest;
        i = m ? i + m.index + m[0].length : n;
        if (type === "application/ld+json") {
          if (out.jsonld.length >= LIMITS.maxJsonLdBlocks) { out.flags.truncatedJsonLd = true; break; }
          const bb = Buffer.byteLength(inner, "utf8");
          if (jsonLdTotalBytes + bb > LIMITS.maxJsonLdBytes) { out.flags.truncatedJsonLd = true; break; }
          jsonLdTotalBytes += bb;
          try { out.jsonld.push(JSON.parse(inner)); }
          catch (e) { out.malformedJsonLd.push({ block_index: out.jsonld.length + out.malformedJsonLd.length, error: String(e.message).slice(0, 160) }); }
        }
        // other script content: dropped entirely (P7). Never scanned, never claimed.
        break;
      }
      case "style":
        out.flags.styleStripped = true;
        { const m = /<\/style\s*>/i.exec(html.slice(i)); i = m ? i + m.index + m[0].length : n; }
        break;
      case "template":
      case "iframe":
        inertDepth++; out.flags.inertRegions++;
        if (tagName === "iframe") {
          const srcdoc = attrVal(attrs.srcdoc);
          if (srcdoc) out.evidenceStrings.push({ kind: "iframe-srcdoc", excerpt: String(srcdoc).slice(0, 200) });
        }
        break;
      case "noscript":
        { const m = /<\/noscript\s*>/i.exec(html.slice(i));
          const inner = m ? html.slice(i, i + m.index) : html.slice(i);
          out.textNoscript += decodeEntities(inner.replace(/<[^>]*>/g, " "));
          i = m ? i + m.index + m[0].length : n; }
        break;
      case "svg": svgDepth++; break;
      case "title": inTitle = true; titleBuf = ""; break;
      case "h1": inH1 = true; h1Buf = ""; break;
      case "meta": {
        if (out.metas.length >= LIMITS.maxMeta) { out.flags.truncatedMeta = true; break; }
        const cs = String(attrVal(attrs.charset) || "");
        if (cs) {
          out.charsetDecls.push(cs.toLowerCase());
          if (new Set(out.charsetDecls).size > 1) out.flags.charsetConflict = true;
        }
        const key = String(attrVal(attrs.name) || attrVal(attrs.property) || attrVal(attrs["http-equiv"]) || "").toLowerCase();
        const content = String(attrVal(attrs.content) || attrVal(attrs.value) || "");
        out.metas.push({ key, content: content.slice(0, 2000) });
        if (/^refresh$/i.test(String(attrVal(attrs["http-equiv"]) || ""))) out.metaRefresh = content.slice(0, 500);
        break;
      }
      case "a": {
        if (out.links.length >= LIMITS.maxLinks) {
          // Over cap: advance past </a> with a cheap indexOf scan (no regex,
          // no text capture). Keeps the 100k-link farm linear-time.
          out.flags.truncatedLinks = true;
          let c = html.indexOf("</a", i);
          if (c === -1) c = html.indexOf("</A", i);
          if (c !== -1) { const g = html.indexOf(">", c); i = g === -1 ? n : g + 1; }
          break;
        }
        const href = String(attrVal(attrs.href) || "");
        // link text: capture until </a> via indexOf (linear, no backtracking
        // regex); bounded so an unclosed anchor cannot swallow the document.
        let c = html.indexOf("</a", i);
        if (c === -1) c = html.indexOf("</A", i);
        let text = "";
        if (c !== -1 && c - i < 200000) {
          const g = html.indexOf(">", c);
          const inner = html.slice(i, c);
          text = decodeEntities(inner.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 500);
          i = g === -1 ? n : g + 1;
        }
        out.links.push({ href: href.slice(0, 2000), text });
        break;
      }
      case "link": {
        const rel = String(attrVal(attrs.rel) || "").toLowerCase();
        if (rel === "canonical") out.canonicalLink = String(attrVal(attrs.href) || "").slice(0, 2000);
        break;
      }
      case "base": {
        const href = String(attrVal(attrs.href) || "");
        if (href && !out.baseHref) out.baseHref = href.slice(0, 2000);
        break;
      }
      case "img": {
        const alt = String(attrVal(attrs.alt) || "");
        if (alt) out.evidenceStrings.push({ kind: "img-alt", excerpt: alt.slice(0, 300) });
        break;
      }
      case "input": case "textarea": case "select":
        out.evidenceStrings.push({ kind: "form-field-present", excerpt: `${tagName} name=${String(attrVal(attrs.name) || "").slice(0, 80)}` });
        break; // values never extracted: not user-visible content, never claims
      default: break;
    }
  }

  out.textVisible = decodeEntities(textBuf.join(""));
  out.textHidden = decodeEntities(out.textHidden);
  out.textNoscript = out.textNoscript.replace(/\s+/g, " ").trim().slice(0, 5000);
  if (svgDepth > 0 || /class=/.test(html.slice(0, 50000))) out.flags.visibilityUnverified = true;
  return out;
}

// ---- claim assembly: the no-guess rule ----
export const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
export const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function normPhone(p) {
  // Canonical NANP normalization: digit-identical strings unify regardless of
  // formatting ("(970) 555-0100", "+1-970-555-0100", "tel:+19705550100").
  // Deterministic and documented; never a guess. Non-NANP digit strings are
  // kept verbatim with a "+" marker (out of scope for the NANP pattern set).
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") return "+1" + d.slice(1);
  if (d.length === 10) return "+1" + d;
  return d ? "+" + d : "";
}
export function normStr(s) { return s.replace(/\s+/g, " ").trim(); }

export function assembleClaims(parsed) {
  const claims = [];
  const unresolved = [];
  const claim = (field, value, provenance) => claims.push({ field, value, provenance, parser: PARSER_VERSION });

  // business name candidates: title(s), og:title, h1(s), json-ld name(s)
  const nameCands = [];
  parsed.titles.forEach((t, k) => { const v = normStr(t); if (v) nameCands.push({ value: v, provenance: { source: "title", locator: `title[${k}]` } }); });
  parsed.metas.filter(m => m.key === "og:title").forEach((m, k) => { const v = normStr(m.content); if (v) nameCands.push({ value: v, provenance: { source: "meta", locator: `og:title[${k}]` } }); });
  parsed.h1s.forEach((t, k) => { const v = normStr(t); if (v) nameCands.push({ value: v, provenance: { source: "h1", locator: `h1[${k}]` } }); });
  parsed.jsonld.forEach((b, k) => { const v = b && b.name ? normStr(String(b.name)) : ""; if (v) nameCands.push({ value: v, provenance: { source: "json-ld", locator: `jsonld[${k}].name` } }); });
  resolveField("business_name", nameCands, claims, unresolved, normStr, { minSourceTypes: 2 });
  // business_name corroboration rule (no-guess doctrine): a single
  // uncorroborated signal (e.g. a challenge page's <title>, a lone <title>)
  // never becomes the business's canonical name. Two distinct source types
  // must agree. Phone/email/url patterns are distinctive enough that one
  // consistent source suffices; conflicts still block.

  // phone candidates: tel: links + link text + visible-text pattern matches +
  // JSON-LD telephone (a declared structured property, not a guess)
  const phoneCands = [];
  parsed.links.forEach((l, k) => {
    if (/^tel:/i.test(l.href)) {
      // Guard: the tel: target must itself contain a phone pattern, otherwise
      // no candidate (prevents garbage claims from non-numeric tel: values).
      const m = l.href.replace(/^tel:/i, "").match(PHONE_RE);
      if (m) phoneCands.push({ value: normPhone(m[0]), provenance: { source: "link", locator: `a[href^=tel][${k}]`, excerpt: l.text.slice(0, 80) } });
    }
    for (const m of l.text.matchAll(PHONE_RE)) {
      const v = normPhone(m[0]);
      if (v) phoneCands.push({ value: v, provenance: { source: "link-text", locator: `a[${k}].text`, excerpt: m[0].slice(0, 80) } });
    }
  });
  parsed.jsonld.forEach((b, k) => {
    const t = b && b.telephone != null ? String(b.telephone) : "";
    const m = t.match(PHONE_RE);
    if (m) phoneCands.push({ value: normPhone(m[0]), provenance: { source: "json-ld", locator: `jsonld[${k}].telephone` } });
  });
  const seen = new Set();
  for (const m of parsed.textVisible.matchAll(PHONE_RE)) {
    const v = normPhone(m[0]);
    if (v && !seen.has(v)) { seen.add(v); phoneCands.push({ value: v, provenance: { source: "visible-text", locator: "body-text", excerpt: m[0] } }); }
  }
  resolveField("phone", phoneCands, claims, unresolved, normPhone);

  // email candidates: mailto: links + visible-text pattern matches
  const emailCands = [];
  parsed.links.forEach((l, k) => {
    if (/^mailto:/i.test(l.href)) {
      // Guard: the mailto: target must contain an email pattern.
      const m = l.href.replace(/^mailto:/i, "").split("?")[0].match(EMAIL_RE);
      if (m) emailCands.push({ value: m[0].toLowerCase(), provenance: { source: "link", locator: `a[href^=mailto][${k}]` } });
    }
    for (const m of l.text.matchAll(EMAIL_RE)) {
      const v = m[0].toLowerCase();
      emailCands.push({ value: v, provenance: { source: "link-text", locator: `a[${k}].text`, excerpt: m[0].slice(0, 80) } });
    }
  });
  const seenE = new Set();
  for (const m of parsed.textVisible.matchAll(EMAIL_RE)) {
    const v = m[0].toLowerCase();
    if (!seenE.has(v)) { seenE.add(v); emailCands.push({ value: v, provenance: { source: "visible-text", locator: "body-text", excerpt: m[0] } }); }
  }
  resolveField("email", emailCands, claims, unresolved, (s) => s.toLowerCase());

  // url candidates: base href, canonical link, og:url — never merged/guessed
  const urlCands = [];
  if (parsed.baseHref) urlCands.push({ value: parsed.baseHref, provenance: { source: "base", locator: "base[href]" } });
  if (parsed.canonicalLink) urlCands.push({ value: parsed.canonicalLink, provenance: { source: "link", locator: 'link[rel=canonical]' } });
  parsed.metas.filter(m => m.key === "og:url").forEach((m) => { if (m.content) urlCands.push({ value: m.content, provenance: { source: "meta", locator: "og:url" } }); });
  resolveField("page_url", urlCands, claims, unresolved, normStr);

  return { claims, unresolved };
}

function resolveField(field, cands, claims, unresolved, norm, opts = {}) {
  const byVal = new Map();
  for (const c of cands) {
    const k = norm(c.value);
    if (!byVal.has(k)) byVal.set(k, []);
    byVal.get(k).push(c.provenance);
  }
  if (byVal.size === 0) return; // legitimate empty: no claim, no failure
  if (byVal.size === 1) {
    const [value, prov] = [...byVal.entries()][0];
    if (opts.minSourceTypes && new Set(prov.map((p) => p.source)).size < opts.minSourceTypes) {
      unresolved.push({ field, candidates: [{ value, provenance: prov }],
        reason: "uncorroborated-single-source-no-guess" });
      return;
    }
    claims.push({ field, value, provenance: prov, parser: PARSER_VERSION });
  } else {
    unresolved.push({ field, candidates: [...byVal.entries()].map(([value, prov]) => ({ value, provenance: prov })),
      reason: "conflicting-candidates-no-guess" });
  }
}

export function runCase(html, sourceId) {
  const parsed = parseHtml(html, sourceId);
  if (parsed.failure) {
    return { case_id: sourceId, outcome: "typed_failure", failure: parsed.failure,
             claims: [], unresolved: [], flags: parsed.flags, provenance: { parser: PARSER_VERSION } };
  }
  const { claims, unresolved } = assembleClaims(parsed);
  return { case_id: sourceId, outcome: "bounded_success", claims, unresolved,
           truncated: { text: parsed.flags.truncatedText, links: parsed.flags.truncatedLinks,
                        meta: parsed.flags.truncatedMeta, jsonld: parsed.flags.truncatedJsonLd,
                        attr: parsed.flags.truncatedAttr },
           notes: { scriptStripped: parsed.flags.scriptStripped, styleStripped: parsed.flags.styleStripped,
                    inertRegions: parsed.flags.inertRegions, metaRefresh: parsed.metaRefresh,
                    malformedJsonLd: parsed.malformedJsonLd, visibilityUnverified: parsed.flags.visibilityUnverified,
                    charsetConflict: parsed.flags.charsetConflict,
                    hiddenTextBytes: Buffer.byteLength(parsed.textHidden, "utf8"),
                    noscriptBytes: Buffer.byteLength(parsed.textNoscript, "utf8"),
                    evidenceStrings: parsed.evidenceStrings.length,
                    titles: parsed.titles.length, h1s: parsed.h1s.length,
                    metas: parsed.metas.length, links: parsed.links.length, jsonldBlocks: parsed.jsonld.length },
           provenance: { parser: PARSER_VERSION, fixture: sourceId } };
}
