#!/usr/bin/env node
// structured-metadata fixture lab harness — fleet-acq-1
// Layer over html-harness@1.1.0: extracts structured-metadata candidates from
// JSON-LD, microdata (itemscope/itemprop), and meta/OG tags, then applies the
// same no-guess doctrine: a claim needs one normalized value corroborated by
// >=2 distinct source types; conflicts stay unresolved; wrong-type /
// wrong-shape / pattern-rejected values are quarantined with typed reasons,
// never coerced into claims. Remote @contexts are NEVER fetched (no network).
//
// Documented boundaries (not bugs):
//  - microdata text capture matches the FIRST closing tag of the same name;
//    same-tag nesting inside an itemprop element truncates the value (flagged).
//  - itemprop outside any itemscope is ignored per the microdata spec.
//  - itemref is not followed (no cross-tree resolution).
//  - JSON-LD arrays/objects where a scalar is expected are quarantined, not
//    flattened (no ContactPoint traversal, no @graph traversal, no deep
//    @value unwrap).
//  - sameAs and @id are evidence only, never identity signals.
//  - description is evidence only, never an identity signal.
import {
  parseHtml, parseAttrs, decodeEntities, attrVal,
  PHONE_RE, EMAIL_RE, normPhone, normStr,
} from "./harness.mjs";

export const META_PARSER_VERSION = "meta-harness@1.0.0";

const META_LIMITS = {
  maxCandidates: 200,   // structured candidates across all vocabularies
  maxPropBytes: 4096,   // per-property value cap (truncate + flag)
};

const KNOWN_JSONLD_TYPES = new Set([
  "LocalBusiness", "Organization", "Corporation", "Person", "Product",
  "Service", "Place", "WebSite", "WebPage", "Restaurant", "Store",
  "Plumber", "Electrician", "ContactPoint", "PostalAddress",
]);

const VOID_TAGS = new Set(["meta", "link", "img", "br", "hr", "input", "source", "wbr", "base", "col", "embed", "track"]);

function stripTags(s) {
  // bounded tag stripper for itemprop text capture; no nested-quantifier regex.
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

export function scanMicrodata(html) {
  // Minimal microdata scanner. Returns { items:[{type,unknownType,props:[{name,value,locator,kind}]}], orphans, itemrefSeen, truncatedText }.
  const items = [];
  const stack = []; // open scopes: { tag, type, props: [], idx }
  let orphans = 0, itemrefSeen = false, truncatedText = false;
  const n = html.length;
  let i = 0, tagCount = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) break;
    i = lt;
    // skip comments
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end === -1 ? n : end + 3;
      continue;
    }
    const gt = html.indexOf(">", i + 1);
    if (gt === -1) break;
    const raw = html.slice(i + 1, gt);
    const isClose = raw[0] === "/";
    const inner = isClose ? raw.slice(1) : raw;
    const sp = inner.search(/[\s/>]/);
    const tag = (sp === -1 ? inner : inner.slice(0, sp)).toLowerCase();
    i = gt + 1;
    if (++tagCount > 200000) break; // same P1 spirit as the html lab
    if (isClose) {
      if (stack.length && stack[stack.length - 1].tag === tag) {
        const scope = stack.pop();
        items.push({ type: scope.type, unknownType: scope.type != null && !isKnownItemtype(scope.type), props: scope.props, locator: `microdata[${items.length}]` });
      }
      continue;
    }
    let attrs;
    try { attrs = parseAttrs(raw); } catch { continue; }
    const hasScope = Object.prototype.hasOwnProperty.call(attrs, "itemscope");
    const hasProp = Object.prototype.hasOwnProperty.call(attrs, "itemprop");
    if (Object.prototype.hasOwnProperty.call(attrs, "itemref")) itemrefSeen = true;
    if (hasProp) {
      const names = String(attrVal(attrs.itemprop) || "").split(/\s+/).filter(Boolean);
      if (hasScope && stack.length) {
        // Element is BOTH itemprop and itemscope: per microdata it creates a
        // nested item that is the property value. The parent gets a quarantined
        // reference; nested values never leak upward (no traversal).
        const parent = stack[stack.length - 1];
        for (const nm of names) parent.props.push({ name: nm.toLowerCase(), value: "[nested-item]", kind: "nested-ref", locator: "microdata.nested" });
      } else if (hasScope) {
        orphans++; // top-level itemscope+itemprop with no parent scope: ignored
      } else {
        let value = null, kind = "text";
        const content = attrVal(attrs.content);
        if (content !== "") { value = String(content); kind = "content-attr"; }
        else if ((tag === "a" || tag === "link") && attrVal(attrs.href) !== "") { value = String(attrVal(attrs.href)); kind = "href"; }
        else if (attrVal(attrs.src) !== "" && VOID_TAGS.has(tag)) { value = String(attrVal(attrs.src)); kind = "src"; }
        else if (!VOID_TAGS.has(tag)) {
          // text until first matching close tag (documented same-tag limitation)
          const closeAt = html.indexOf(`</${tag}`, gt + 1);
          let rawText = closeAt === -1 ? html.slice(gt + 1, gt + 1 + META_LIMITS.maxPropBytes) : html.slice(gt + 1, closeAt);
          if (rawText.length > META_LIMITS.maxPropBytes) { rawText = rawText.slice(0, META_LIMITS.maxPropBytes); truncatedText = true; }
          value = decodeEntities(stripTags(rawText));
          kind = "text";
        }
        if (value !== null) {
          if (value.length > META_LIMITS.maxPropBytes) { value = value.slice(0, META_LIMITS.maxPropBytes); truncatedText = true; }
          const target = stack.length ? stack[stack.length - 1] : null;
          if (target) {
            for (const nm of names) target.props.push({ name: nm.toLowerCase(), value, kind, locator: `${target.locator || "microdata"}.${nm}` });
          } else {
            orphans++; // per spec, itemprop outside itemscope is ignored
          }
        }
      }
    }
    if (hasScope) {
      const t = attrVal(attrs.itemtype) ? String(attrVal(attrs.itemtype)) : null;
      const scope = { tag, type: t, props: [], locator: `microdata[${items.length + stack.length}]` };
      stack.push(scope);
      if (VOID_TAGS.has(tag)) {
        const s2 = stack.pop();
        items.push({ type: s2.type, unknownType: s2.type != null && !isKnownItemtype(s2.type), props: s2.props, locator: s2.locator });
      }
    }
  }
  // unclosed scopes are still emitted (bounded, never lost silently)
  while (stack.length) {
    const scope = stack.pop();
    items.push({ type: scope.type, unknownType: scope.type != null && !isKnownItemtype(scope.type), props: scope.props, locator: scope.locator });
  }
  return { items, orphans, itemrefSeen, truncatedText };
}

function isKnownItemtype(t) {
  // schema.org URLs and bare known type names both accepted
  const m = /schema\.org\/([A-Za-z]+)/.exec(t);
  const bare = m ? m[1] : t;
  return KNOWN_JSONLD_TYPES.has(bare);
}

function isRemoteContext(ctx) {
  if (typeof ctx === "string") return /^https?:\/\//i.test(ctx);
  if (Array.isArray(ctx)) return ctx.some(isRemoteContext);
  return false;
}

function propValue(v) {
  // returns {ok, value} or {ok:false, reason}
  if (typeof v !== "string") return { ok: false, reason: "wrong-type" };
  const t = normStr(decodeEntities(v));
  if (!t) return { ok: false, reason: "empty-value" };
  if (t.length > META_LIMITS.maxPropBytes) return { ok: true, value: t.slice(0, META_LIMITS.maxPropBytes), truncated: true };
  return { ok: true, value: t };
}

export function runMetaCase(html, sourceId) {
  const started = Date.now();
  const parsed = parseHtml(html, sourceId);
  if (parsed.outcome === "typed_failure") return parsed; // propagate bound violations

  const micro = scanMicrodata(html);
  const candidates = { business_name: [], phone: [], email: [], page_url: [] };
  const quarantined = [];
  const notes = {
    remoteContextNotFetched: [],
    unknownTypes: [],
    sameAs: [],
    descriptionSeen: 0,
    microdataOrphans: micro.orphans,
    itemrefSeen: micro.itemrefSeen,
    malformedJsonLd: parsed.malformedJsonLd || [],
  };
  let truncatedProps = micro.truncatedText;
  const truncated = {
    text: !!parsed.flags.truncatedText,
    links: !!parsed.flags.truncatedLinks,
    meta: !!parsed.flags.truncatedMeta,
    jsonld: !!parsed.flags.truncatedJsonLd,
    attr: !!parsed.flags.truncatedAttr,
    props: false, // set true below if any property value is truncated
  };

  const push = (field, value, source, locator) => {
    if (candidates[field].length >= META_LIMITS.maxCandidates) { truncated.props = true; return; }
    candidates[field].push({ value, provenance: { source, locator } });
  };
  const quar = (where, property, reason, detail) => quarantined.push({ where, property, reason, detail: String(detail ?? "").slice(0, 200) });

  // ---- JSON-LD vocabulary ----
  parsed.jsonld.forEach((b, bi) => {
    if (!b || typeof b !== "object") return;
    const where = `jsonld[${bi}]`;
    if (isRemoteContext(b["@context"])) notes.remoteContextNotFetched.push(where); // never fetched
    const t = b["@type"];
    const types = Array.isArray(t) ? t : (t != null ? [t] : []);
    for (const ty of types) {
      if (typeof ty === "string" && !KNOWN_JSONLD_TYPES.has(ty)) notes.unknownTypes.push(`${where}: ${ty}`);
    }
    if ("name" in b) {
      const pv = propValue(b.name);
      if (!pv.ok) quar(where, "name", pv.reason, typeof b.name);
      else { if (pv.truncated) truncatedProps = true; push("business_name", pv.value, "json-ld", where); }
    }
    if ("telephone" in b) {
      const v = b.telephone;
      if (typeof v !== "string") quar(where, "telephone", "wrong-shape", Array.isArray(v) ? "array" : typeof v);
      else {
        const m = v.match(PHONE_RE);
        if (!m) quar(where, "telephone", "pattern-reject", v.slice(0, 60));
        else push("phone", normPhone(m[0]), "json-ld", where);
      }
    }
    if ("email" in b) {
      const v = b.email;
      if (typeof v !== "string") quar(where, "email", "wrong-shape", typeof v);
      else {
        const m = v.match(EMAIL_RE);
        if (!m) quar(where, "email", "pattern-reject", v.slice(0, 60));
        else push("email", m[0].toLowerCase(), "json-ld", where);
      }
    }
    if ("url" in b) {
      const pv = propValue(b.url);
      if (!pv.ok) quar(where, "url", pv.reason, typeof b.url);
      else { if (pv.truncated) truncatedProps = true; push("page_url", pv.value, "json-ld", where); }
    }
    if ("sameAs" in b) {
      const arr = Array.isArray(b.sameAs) ? b.sameAs : [b.sameAs];
      for (const u of arr) if (typeof u === "string" && u) notes.sameAs.push(u.slice(0, 300));
    }
    if ("description" in b) notes.descriptionSeen++;
  });

  // ---- microdata vocabulary ----
  micro.items.forEach((item, ii) => {
    if (item.unknownType) notes.unknownTypes.push(`${item.locator}: ${item.type}`);
    for (const p of item.props) {
      const where = `${item.locator}.${p.name}`;
      if (p.kind === "nested-ref") { quar(where, p.name, "nested-item-not-traversed", p.value); continue; }
      if (p.name === "name") {
        const pv = propValue(p.value);
        if (!pv.ok) quar(where, "name", pv.reason, p.kind);
        else { if (pv.truncated) truncatedProps = true; push("business_name", pv.value, "microdata", where); }
      } else if (p.name === "telephone") {
        const m = String(p.value).match(PHONE_RE);
        if (!m) quar(where, "telephone", "pattern-reject", String(p.value).slice(0, 60));
        else push("phone", normPhone(m[0]), "microdata", where);
      } else if (p.name === "email") {
        const m = String(p.value).match(EMAIL_RE);
        if (!m) quar(where, "email", "pattern-reject", String(p.value).slice(0, 60));
        else push("email", m[0].toLowerCase(), "microdata", where);
      } else if (p.name === "url") {
        const pv = propValue(p.value);
        if (!pv.ok) quar(where, "url", pv.reason, p.kind);
        else { if (pv.truncated) truncatedProps = true; push("page_url", pv.value, "microdata", where); }
      }
    }
  });

  // ---- meta / open-graph vocabulary ----
  for (const m of parsed.metas) {
    const key = m.key;
    const content = normStr(decodeEntities(m.content || ""));
    if (!content) continue;
    if (key === "og:title" || key === "twitter:title") push("business_name", content, "open-graph", `meta[${key}]`);
    else if (key === "og:url") push("page_url", content, "open-graph", "meta[og:url]");
    else if (key === "og:description" || key === "description" || key === "twitter:description") notes.descriptionSeen++;
  }

  // ---- html vocabulary (titles, headings, links, visible text) ----
  parsed.titles.forEach((t, k) => { const v = normStr(t); if (v) push("business_name", v, "title", `title[${k}]`); });
  parsed.h1s.forEach((h, k) => { const v = normStr(h); if (v) push("business_name", v, "h1", `h1[${k}]`); });
  parsed.links.forEach((l, k) => {
    if (/^tel:/i.test(l.href)) {
      const m = l.href.replace(/^tel:/i, "").match(PHONE_RE);
      if (m) push("phone", normPhone(m[0]), "link", `a[href^=tel][${k}]`);
    } else if (/^mailto:/i.test(l.href)) {
      const m = l.href.replace(/^mailto:/i, "").split("?")[0].match(EMAIL_RE);
      if (m) push("email", m[0].toLowerCase(), "link", `a[href^=mailto][${k}]`);
    }
  });
  // canonical links: parseHtml stores them as links with rel? It stores {href,text} only.
  // Recover canonical from raw metas? parseHtml does not expose link rels. Use a
  // bounded direct scan for <link rel="canonical"> here instead of guessing.
  const canonRe = /<link\b[^>]*\brel=["']?canonical["']?[^>]*>/gi;
  let cm;
  let canonCount = 0;
  while ((cm = canonRe.exec(html)) !== null && canonCount < 5) {
    canonCount++;
    let attrs;
    try { attrs = parseAttrs(cm[0].slice(5, -1)); } catch { continue; }
    const href = normStr(String(attrVal(attrs.href) || ""));
    if (href) push("page_url", href, "link", "link[rel=canonical]");
  }
  for (const m of parsed.textVisible.match(PHONE_RE) || []) push("phone", normPhone(m), "visible-text", "body-text");
  for (const m of parsed.textVisible.match(EMAIL_RE) || []) push("email", m.toLowerCase(), "visible-text", "body-text");

  truncated.props = truncatedProps;

  // ---- resolution: one value + >=2 source types -> claim; else unresolved ----
  const claims = [];
  const unresolved = [];
  for (const field of Object.keys(candidates)) {
    const cands = candidates[field];
    if (!cands.length) continue;
    const byValue = new Map();
    for (const c of cands) {
      if (!byValue.has(c.value)) byValue.set(c.value, []);
      byValue.get(c.value).push(c.provenance);
    }
    if (byValue.size === 1) {
      const [[value, provs]] = [...byValue.entries()];
      const types = new Set(provs.map((p) => p.source));
      if (types.size >= 2) {
        claims.push({ field, value, provenance: provs.map((p) => ({ ...p })), parser: META_PARSER_VERSION });
      } else {
        unresolved.push({ field, candidates: [{ value, provenance: provs }], reason: "uncorroborated-single-source-no-guess" });
      }
    } else {
      unresolved.push({
        field,
        candidates: [...byValue.entries()].map(([value, provs]) => ({ value, provenance: provs })),
        reason: "conflicting-candidates-no-guess",
      });
    }
  }

  return {
    outcome: "bounded_success",
    claims,
    unresolved,
    quarantined,
    truncated,
    notes,
    elapsed_ms: Date.now() - started,
    provenance: { parser: META_PARSER_VERSION, under: "html-harness@1.1.0", fixture: sourceId },
    parser_version: META_PARSER_VERSION,
  };
}
