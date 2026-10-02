#!/usr/bin/env node
// public-apis fixture lab harness — fleet-acq-1
// Parses mock JSON API responses (record lists) under the acquisition
// no-guess doctrine: classify, bound, or quarantine.
//
// Container convention (documented, never guessed): the document is either a
// top-level array of records, or an object with a "results" array. Anything
// else -> typed UNSUPPORTED.
// Record field rules (no type coercion, no structure flattening):
//  - name/address: non-empty strings -> claims (tags stripped); non-strings
//    quarantine; empty strings quarantine; null/missing are absent.
//  - phone: strings matching the phone shape -> claim; anything else quarantines.
//  - website: absolute http(s) strings -> claim; relative/bad-scheme/
//    credential-bearing quarantine (redacted).
//  - rating: numbers in [0,5] -> claim as-is (no rounding); strings or
//    out-of-range quarantine (never coerced).
//  - Duplicate keys inside a record -> the record quarantines (the parser
//    refuses last-wins); duplicate ids with differing content -> unresolved.
// Bounds: 5MiB doc (over -> PERMANENT), nesting depth 100 (over ->
// INVALID_PAYLOAD), 10k records (over -> truncate+flag), 4KiB text fields.

export const API_PARSER_VERSION = "api-harness@1.0.0";

const A_LIMITS = { maxDocBytes: 5 * 1024 * 1024, maxDepth: 100, maxRecords: 10000, maxTextChars: 4096 };
const PHONE_RE = /^\+?[0-9().\-\s]{7,24}$/;

function makeFailure(klass, nativeCode, detail, startedAt, sourceId) {
  const failedAt = new Date().toISOString();
  return {
    record_type: "ping.connector.failure.v1",
    class: klass,
    connector: "api-harness",
    connector_version: API_PARSER_VERSION,
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

function stripTags(s) {
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

// Skip one JSON value starting at i (past leading ws). Returns end index
// (exclusive) or -1 on malformed.
function skipValue(t, i) {
  while (i < t.length && /\s/.test(t[i])) i++;
  if (i >= t.length) return -1;
  const c = t[i];
  if (c === '"') {
    i++;
    while (i < t.length) {
      if (t[i] === "\\") { i += 2; continue; }
      if (t[i] === '"') return i + 1;
      i++;
    }
    return -1;
  }
  if (c === "{" || c === "[") {
    const open = c, close = c === "{" ? "}" : "]";
    i++;
    let depth = 1;
    while (i < t.length && depth > 0) {
      const ch = t[i];
      if (ch === '"') { const e = skipValue(t, i); if (e === -1) return -1; i = e; continue; }
      if (ch === "{" || ch === "[") depth++;
      else if (ch === "}" || ch === "]") depth--;
      i++;
    }
    return depth === 0 ? i : -1;
  }
  const m = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(t.slice(i));
  return m ? i + m[0].length : -1;
}

// Max nesting depth of a JSON text (strings skipped). -1 on malformed.
function maxDepth(t) {
  let depth = 0, best = 0, i = 0;
  while (i < t.length) {
    const c = t[i];
    if (c === '"') { const e = skipValue(t, i); if (e === -1) return -1; i = e; continue; }
    if (c === "{" || c === "[") { depth++; if (depth > best) best = depth; }
    else if (c === "}" || c === "]") depth--;
    i++;
  }
  return best;
}

// Duplicate keys inside one object span (offsets relative to doc). Returns
// array of duplicate key names.
function duplicateKeys(t, objStart, objEnd) {
  const seen = new Set(), dups = [];
  let i = objStart + 1, depth = 1;
  while (i < objEnd && depth > 0) {
    while (i < objEnd && /\s/.test(t[i])) i++;
    if (i >= objEnd) break;
    if (t[i] === '"') {
      const ks = i, ke = skipValue(t, i);
      if (ke === -1) break;
      let j = ke;
      while (j < objEnd && /\s/.test(t[j])) j++;
      const isKey = t[j] === ":";
      if (isKey && depth === 1) {
        const key = t.slice(ks, ke);
        if (seen.has(key)) dups.push(key);
        else seen.add(key);
      }
      i = isKey ? skipValue(t, j + 1) : ke;
      if (i === -1) break;
      while (i < objEnd && /\s/.test(t[i])) i++;
      if (t[i] === ",") i++;
      continue;
    }
    if (t[i] === "{" || t[i] === "[") depth++;
    else if (t[i] === "}" || t[i] === "]") depth--;
    i++;
  }
  return dups;
}

export function runApiCase(text, sourceId) {
  const startedAt = new Date().toISOString();
  const fail = (klass, code, detail) => ({
    case_id: sourceId, outcome: "typed_failure",
    failure: makeFailure(klass, code, detail, startedAt, sourceId),
    claims: [], unresolved: [], quarantined: [],
    provenance: { parser: API_PARSER_VERSION, fixture: sourceId },
    parser_version: API_PARSER_VERSION,
  });

  let doc = text.replace(/^﻿/, "");
  if (doc.charCodeAt(0) === 0x1f && doc.charCodeAt(1) === 0x8b)
    return fail("UNSUPPORTED", "gzip-magic-not-decompressed", "binary input is not decompressed in the lab");
  if (Buffer.byteLength(doc, "utf8") > A_LIMITS.maxDocBytes)
    return fail("PERMANENT", "doc-bytes-over-cap", `>${A_LIMITS.maxDocBytes} bytes`);
  const depth = maxDepth(doc);
  if (depth > A_LIMITS.maxDepth)
    return fail("INVALID_PAYLOAD", "depth-over-cap", `nesting depth ${depth} > ${A_LIMITS.maxDepth}`);

  let parsed;
  try { parsed = JSON.parse(doc); }
  catch (e) { return fail("INVALID_PAYLOAD", "unparseable", String(e.message || e).slice(0, 120)); }

  // Locate the record array span in the raw text.
  const trimmed = doc.trimStart();
  let arrStart = -1, arrEnd = -1, container = null;
  if (trimmed[0] === "[") {
    arrStart = doc.indexOf("[");
    arrEnd = skipValue(doc, arrStart);
    container = "array";
  } else if (trimmed[0] === "{") {
    const objStart = doc.indexOf("{");
    const objEnd = skipValue(doc, objStart);
    // find "results" key at depth 1
    let i = objStart + 1;
    while (i < objEnd) {
      while (i < objEnd && /\s/.test(doc[i])) i++;
      if (doc[i] !== '"') { const e = skipValue(doc, i); if (e === -1) break; i = e; while (i < objEnd && /[\s,]/.test(doc[i])) i++; continue; }
      const ke = skipValue(doc, i);
      const key = doc.slice(i, ke);
      let j = ke;
      while (j < objEnd && /\s/.test(doc[j])) j++;
      if (doc[j] === ":") {
        let v = j + 1;
        while (v < objEnd && /\s/.test(doc[v])) v++;
        if (key === '"results"' && doc[v] === "[") { arrStart = v; arrEnd = skipValue(doc, v); container = "results"; break; }
        const ve = skipValue(doc, v);
        i = ve === -1 ? objEnd : ve;
        while (i < objEnd && /[\s,]/.test(doc[i])) i++;
      } else break;
    }
  }
  if (arrStart === -1 || arrEnd === -1)
    return fail("UNSUPPORTED", "no-record-array", "document is not an array and has no results array");

  // Split into element spans.
  const spans = [];
  {
    let i = arrStart + 1;
    while (i < arrEnd) {
      while (i < arrEnd && /[\s,]/.test(doc[i])) i++;
      if (i >= arrEnd || doc[i] === "]") break;
      const e = skipValue(doc, i);
      if (e === -1 || e > arrEnd) break;
      spans.push([i, e]);
      i = e;
    }
  }

  const claims = [];
  const unresolved = [];
  const quarantined = [];
  const notes = { container, recordCount: spans.length, idsSeen: 0 };
  const truncated = { records: false, fields: false };
  const quar = (rec, reason, detail) => quarantined.push({ entry: rec, reason, detail: String(detail ?? "").slice(0, 160) });
  const seenIds = new Map();

  const cleanText = (v) => {
    const t = stripTags(String(v)).replace(/\s+/g, " ").trim();
    if (t.length > A_LIMITS.maxTextChars) { truncated.fields = true; return t.slice(0, A_LIMITS.maxTextChars); }
    return t;
  };
  const hasCtl = (t) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(t);
  const cleanWebsite = (w) => {
    const s = String(w).trim();
    if (/^https?:\/\//i.test(s)) {
      if (!/^https?:\/\/[^/\s?#]/i.test(s)) return { ok: false, reason: "degenerate-website" };
      if (/^https?:\/\/[^/]*@/i.test(s)) return { ok: false, reason: "credential-website", redacted: s.replace(/^(https?:\/\/)[^/]*@/, "$1<redacted>@") };
      return { ok: true, value: s };
    }
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return { ok: false, reason: "bad-scheme-website" };
    return { ok: false, reason: "relative-website" };
  };

  let recNo = 0;
  for (const [s0, s1] of spans) {
    recNo++;
    const locator = `record[${recNo}]`;
    if (recNo > A_LIMITS.maxRecords) { truncated.records = true; continue; }
    notes.recordCount = recNo;
    let rec;
    try { rec = JSON.parse(doc.slice(s0, s1)); }
    catch { quar(locator, "unparseable-record", ""); continue; }
    if (rec === null || typeof rec !== "object" || Array.isArray(rec)) { quar(locator, "non-record", typeof rec); continue; }
    const dups = doc[s0] === "{" ? duplicateKeys(doc, s0, s1) : [];
    if (dups.length > 0) { quar(locator, "duplicate-key", dups.join(",")); continue; }

    const sig = ["name", "phone", "address", "website", "rating"].map((k) => `${k}=${JSON.stringify(rec[k] ?? null)}`).join("|");
    if (typeof rec.id === "string" && rec.id) {
      notes.idsSeen++;
      const prev = seenIds.get(rec.id);
      if (prev && prev.sig !== sig) {
        unresolved.push({ field: "record", candidates: [
          { value: `${rec.id} :: ${prev.sig.slice(0, 120)}`, provenance: [{ source: "api-response", locator: prev.locator }] },
          { value: `${rec.id} :: ${sig.slice(0, 120)}`, provenance: [{ source: "api-response", locator }] },
        ], reason: "conflicting-candidates-no-guess" });
        continue;
      }
      if (prev) continue; // identical duplicate
      seenIds.set(rec.id, { sig, locator });
    }

    const put = (field, value) => claims.push({ field, value, provenance: [{ source: "api-response", locator }], parser: API_PARSER_VERSION });

    // name
    if (rec.name !== undefined && rec.name !== null) {
      if (typeof rec.name !== "string") quar(locator, "type-mismatch-name", typeof rec.name);
      else if (!rec.name.trim()) quar(locator, "empty-name", "");
      else {
        const t = cleanText(rec.name);
        if (!t) quar(locator, "empty-name", "stripped-to-empty");
        else if (hasCtl(t)) quar(locator, "control-chars-name", "control characters in text");
        else put("place_name", t);
      }
    }
    // phone
    if (rec.phone !== undefined && rec.phone !== null) {
      if (typeof rec.phone !== "string") quar(locator, "type-mismatch-phone", typeof rec.phone);
      else {
        const digits = rec.phone.replace(/\D/g, "");
        if (PHONE_RE.test(rec.phone.trim()) && digits.length >= 7) put("place_phone", rec.phone.trim());
        else quar(locator, "bad-phone", rec.phone.slice(0, 40));
      }
    }
    // address
    if (rec.address !== undefined && rec.address !== null) {
      if (typeof rec.address !== "string") quar(locator, "type-mismatch-address", Array.isArray(rec.address) ? "array" : typeof rec.address);
      else if (!rec.address.trim()) quar(locator, "empty-address", "");
      else {
        const t = cleanText(rec.address);
        if (!t) quar(locator, "empty-address", "stripped-to-empty");
        else if (hasCtl(t)) quar(locator, "control-chars-address", "control characters in text");
        else put("place_address", t);
      }
    }
    // website
    if (rec.website !== undefined && rec.website !== null) {
      if (typeof rec.website !== "string") quar(locator, "type-mismatch-website", typeof rec.website);
      else {
        const cw = cleanWebsite(rec.website);
        if (cw.ok) put("place_website", cw.value);
        else quar(locator, cw.reason, cw.redacted || rec.website.slice(0, 60));
      }
    }
    // rating — never coerced, never rounded
    if (rec.rating !== undefined && rec.rating !== null) {
      if (typeof rec.rating !== "number" || !Number.isFinite(rec.rating)) quar(locator, "type-mismatch-rating", typeof rec.rating);
      else if (rec.rating < 0 || rec.rating > 5) quar(locator, "out-of-range-rating", String(rec.rating));
      else claims.push({ field: "place_rating", value: rec.rating, provenance: [{ source: "api-response", locator }], parser: API_PARSER_VERSION });
    }
  }

  return {
    case_id: sourceId, outcome: "bounded_success", claims, unresolved, quarantined,
    truncated, notes,
    provenance: { parser: API_PARSER_VERSION, fixture: sourceId },
    parser_version: API_PARSER_VERSION,
  };
}
