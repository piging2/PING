#!/usr/bin/env node
// pdf-harness.mjs — minimal hardened PDF text/metadata extractor (fleet-acq-1 lab).
// Doctrine: NEVER turn parser guess into fact. Hostile PDFs get typed lane-K
// failures; ambiguous structures get bounded extraction with per-claim
// provenance or quarantine. This is a BOUNDARY lab, not a full PDF renderer:
// it proves caps, typed failures, and no-guess extraction on a minimal subset
// (catalog -> pages tree -> content streams, Info metadata).
// Documented non-goals: decryption, object streams, incremental-update merge,
// font/encoding tables (WinAnsi/latin1 + UTF-16BE BOM only), linearization.
import { inflateSync } from "node:zlib";

export const PDF_PARSER_VERSION = "pdf-harness@1.0.0";

const P_LIMITS = {
  maxBytes: 20 * 1024 * 1024,   // D4: 20 MiB per document
  maxPages: 200,                 // D3: page cap
  maxObjects: 50000,             // object scan cap
  maxTextChars: 2 * 1024 * 1024, // P2 analog: extracted text cap
  maxInflated: 5 * 1024 * 1024,  // per-stream decompression cap
  maxInfoChars: 4096,           // Info string cap
  maxTreeDepth: 32,             // pages-tree recursion cap
};

const fail = (cls, native_code, detail) => ({
  outcome: "typed_failure",
  claims: [],
  quarantined: [],
  unresolved: [],
  truncated: {},
  notes: {},
  failure: {
    record_type: "ping.connector.failure.v1",
    class: cls,
    terminal: true,
    retryable: false,
    provider_signal: { native_code, detail: String(detail).slice(0, 300) },
  },
});

const ok = () => ({
  outcome: "bounded_success",
  claims: [],
  quarantined: [],
  unresolved: [],
  truncated: {},
  notes: {},
  failure: null,
});

// ---------- tiny PDF value parser (dicts, arrays, strings, names, refs) ----------
function makeParser(s) {
  let i = 0;
  const ws = () => { while (i < s.length && " \t\r\n\f\x00".includes(s[i])) i++; };
  function parseValue() {
    ws();
    if (s.startsWith("<<", i)) return parseDict();
    if (s[i] === "[") return parseArray();
    if (s[i] === "(") return parseLiteral();
    if (s[i] === "<") return parseHex();
    if (s[i] === "/") { const m = /^\/([^\s<>()[\]{}/%]+)/.exec(s.slice(i)); i += m[0].length; return { t: "name", v: m[1] }; }
    const mNum = /^[+-]?\d+(\.\d+)?/.exec(s.slice(i));
    if (mNum) {
      const save = i; i += mNum[0].length;
      const ws2 = i; while (ws2 < s.length && " \t".includes(s[ws2])) { /* peek */ break; }
      // ref? num num R
      const m2 = /^\s*(\d+)\s+R\b/.exec(s.slice(i));
      if (m2 && !mNum[0].includes(".")) {
        const num2 = m2[1]; i += m2[0].length;
        return { t: "ref", num: parseInt(mNum[0], 10), gen: parseInt(num2, 10) };
      }
      return { t: "num", v: parseFloat(mNum[0]) };
    }
    if (s.startsWith("true", i)) { i += 4; return { t: "bool", v: true }; }
    if (s.startsWith("false", i)) { i += 5; return { t: "bool", v: false }; }
    if (s.startsWith("null", i)) { i += 4; return { t: "null" }; }
    return { t: "unknown" };
  }
  function parseDict() {
    i += 2; const d = {};
    for (;;) {
      ws();
      if (s.startsWith(">>", i)) { i += 2; return { t: "dict", v: d }; }
      if (i >= s.length) return { t: "dict", v: d };
      const m = /^\/([^\s<>()[\]{}/%]+)/.exec(s.slice(i));
      if (!m) { i++; continue; }
      i += m[0].length;
      d[m[1]] = parseValue();
    }
  }
  function parseArray() {
    i++; const a = [];
    for (;;) {
      ws();
      if (s[i] === "]") { i++; return { t: "array", v: a }; }
      if (i >= s.length) return { t: "array", v: a };
      a.push(parseValue());
    }
  }
  function parseLiteral() {
    // returns raw bytes as latin1 string, escapes preserved for later decode
    i++; let out = ""; let depth = 1;
    while (i < s.length && depth > 0) {
      const ch = s[i];
      if (ch === "\\") { out += s.slice(i, i + 2); i += 2; continue; }
      if (ch === "(") depth++;
      if (ch === ")") { depth--; if (depth === 0) { i++; break; } }
      out += ch; i++;
    }
    return { t: "str", enc: "literal", v: out };
  }
  function parseHex() {
    i++; let out = "";
    while (i < s.length && s[i] !== ">") { out += s[i]; i++; }
    if (s[i] === ">") i++;
    return { t: "str", enc: "hex", v: out };
  }
  return { parseValue, get pos() { return i; } };
}

const parsePdfValue = (text) => makeParser(text).parseValue();

// Decode a PDF text string value to a JS string. No font tables: UTF-16BE
// with BOM, else raw bytes as latin1 (WinAnsi superset for our fixtures).
function decodeTextString(v) {
  if (!v || v.t !== "str") return null;
  if (v.enc === "hex") {
    const hex = v.v.replace(/\s+/g, "");
    const bytes = [];
    for (let k = 0; k + 1 < hex.length; k += 2) bytes.push(parseInt(hex.slice(k, k + 2), 16));
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      let out = "";
      for (let k = 2; k + 1 < bytes.length; k += 2) out += String.fromCharCode((bytes[k] << 8) | bytes[k + 1]);
      return out;
    }
    return String.fromCharCode(...bytes);
  }
  // literal: process escapes, result is byte values -> latin1 chars
  const raw = v.v;
  const bytes = [];
  for (let k = 0; k < raw.length; k++) {
    const ch = raw[k];
    if (ch === "\\" && k + 1 < raw.length) {
      const n = raw[k + 1];
      if (n === "n") { bytes.push(10); k++; }
      else if (n === "r") { bytes.push(13); k++; }
      else if (n === "t") { bytes.push(9); k++; }
      else if (n === "b") { bytes.push(8); k++; }
      else if (n === "f") { bytes.push(12); k++; }
      else if (n === "\\" || n === "(" || n === ")") { bytes.push(n.charCodeAt(0)); k++; }
      else if (/[0-7]/.test(n)) {
        const oct = raw.slice(k + 1, k + 4).match(/^[0-7]{1,3}/)[0];
        bytes.push(parseInt(oct, 8) & 0xFF); k += oct.length;
      } else { bytes.push(n.charCodeAt(0)); k++; } // unknown escape: literal char (documented)
    } else bytes.push(ch.charCodeAt(0) & 0xFF);
  }
  return String.fromCharCode(...bytes);
}

// ---------- content-stream text extraction ----------
function extractStreamText(data /* latin1 string */) {
  // Tokenize: literal strings, hex strings, arrays, names, numbers, operators.
  const toks = [];
  let i = 0;
  const n = data.length;
  while (i < n) {
    const ch = data[i];
    if (" \t\r\n\f\x00".includes(ch)) { i++; continue; }
    if (ch === "%") { while (i < n && data[i] !== "\n") i++; continue; }
    if (ch === "(") {
      let j = i + 1, depth = 1, raw = "";
      while (j < n && depth > 0) {
        const c = data[j];
        if (c === "\\") { raw += data.slice(j, j + 2); j += 2; continue; }
        if (c === "(") depth++;
        if (c === ")") { depth--; if (depth === 0) { j++; break; } }
        raw += c; j++;
      }
      toks.push({ t: "str", enc: "literal", v: raw }); i = j; continue;
    }
    if (ch === "<" && data[i + 1] === "<") { toks.push({ t: "dictstart" }); i += 2; continue; }
    if (ch === "<") {
      let j = i + 1, raw = "";
      while (j < n && data[j] !== ">") { raw += data[j]; j++; }
      if (data[j] === ">") j++;
      toks.push({ t: "str", enc: "hex", v: raw }); i = j; continue;
    }
    if (ch === "[") { toks.push({ t: "arrstart" }); i++; continue; }
    if (ch === "]") { toks.push({ t: "arrend" }); i++; continue; }
    if (ch === "/") { const m = /^\/([^\s<>()[\]{}/%]+)/.exec(data.slice(i)); toks.push({ t: "name", v: m[1] }); i += m[0].length; continue; }
    const mNum = /^[+-]?\d+(\.\d+)?/.exec(data.slice(i));
    if (mNum) { toks.push({ t: "num", v: parseFloat(mNum[0]) }); i += mNum[0].length; continue; }
    const mOp = /^[A-Za-z'"]+\*?/.exec(data.slice(i));
    if (mOp) {
      const op = mOp[0];
      i += op.length;
      if (op === "ID") {
        // Inline image data begin: the bytes up to EI are opaque binary and
        // must not be tokenized (a hostile image could carry fake text ops).
        // Skip one whitespace byte per spec, then scan for whitespace-
        // delimited EI. No EI: skip to end (truncated image, documented).
        toks.push({ t: "op", v: "ID" });
        const WS = " \t\r\n\f\x00";
        if (i < n && WS.includes(data[i])) i++;
        let e = i, found = -1;
        while (e < n) {
          const ei = data.indexOf("EI", e);
          if (ei === -1) break;
          const before = data[ei - 1], after = data[ei + 2];
          if (WS.includes(before) && (ei + 2 >= n || WS.includes(after))) { found = ei; break; }
          e = ei + 1;
        }
        i = found === -1 ? n : found;
      } else {
        toks.push({ t: "op", v: op });
      }
      continue;
    }
    i++;
  }
  // Walk tokens; text-showing ops only inside BT..ET (documented).
  const segs = [];
  let inText = false;
  const stack = [];
  const showStr = (v, newline) => {
    const dec = decodeTextString(v);
    if (dec === null) return;
    segs.push((newline ? "\n" : "") + dec);
  };
  for (let ti = 0; ti < toks.length; ti++) {
    const tk = toks[ti];
    if (tk.t === "op" && tk.v === "BT") { inText = true; stack.length = 0; continue; }
    if (tk.t === "op" && tk.v === "ET") { inText = false; stack.length = 0; continue; }
    if (!inText) continue;
    if (tk.t === "op" && tk.v === "T*") { segs.push("\n"); stack.length = 0; continue; }
    if (tk.t === "op" && (tk.v === "Tj" || tk.v === "'" || tk.v === '"')) {
      const s = stack.pop();
      if (s && s.t === "str") showStr(s, tk.v === "'" || tk.v === '"');
      stack.length = 0; continue;
    }
    if (tk.t === "op" && tk.v === "TJ") {
      const a = stack.pop();
      if (a && a.t === "array") {
        // No guessing: kerning numbers are ignored, strings join with "".
        let joined = "";
        for (const el of a.v) { const d = decodeTextString(el); if (d !== null) joined += d; }
        segs.push(joined);
      }
      stack.length = 0; continue;
    }
    if (tk.t === "arrstart") {
      // Consume through the matching arrend; only flat (depth-1) elements
      // are operands. Nested arrays are malformed: skipped (documented).
      const arr = [];
      let depth = 0, k = ti;
      for (; k < toks.length; k++) {
        const t2 = toks[k];
        if (t2.t === "arrstart") { depth++; continue; }
        if (t2.t === "arrend") { depth--; if (depth === 0) break; continue; }
        if (depth === 1) arr.push(t2);
      }
      ti = k; // land on arrend; loop's ti++ moves past it
      stack.push({ t: "array", v: arr });
      continue;
    }
    if (tk.t === "arrend") continue; // stray close: ignore (documented)
    stack.push(tk);
    if (stack.length > 64) stack.length = 0; // hostile operand pileup: drop (documented)
  }
  return segs.join("");
}

// ---------- main entry ----------
export function runPdfCase(input, label) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const R = ok();
  const quar = (where, reason, detail) =>
    R.quarantined.push({ property: "pdf-document", where, reason, detail: String(detail).slice(0, 200) });
  const note = (k, v) => { R.notes[k] = v; };

  // D4: byte cap first.
  if (bytes.length > P_LIMITS.maxBytes)
    return fail("PERMANENT", "byte-cap-exceeded", `document ${bytes.length} bytes exceeds ${P_LIMITS.maxBytes}`);
  const s = bytes.toString("latin1");

  // Header: %PDF-1.x or %PDF-2.x within the first 1024 bytes (D: hostile bytes).
  const head = s.slice(0, 1024);
  const hm = /%PDF-(\d+)\.(\d+)/.exec(head);
  if (!hm || (hm[1] !== "1" && hm[1] !== "2"))
    return fail("INVALID_PAYLOAD", "bad-header", "missing %PDF-1.x/2.x header in first 1024 bytes");

  // Object scan (bounded). Prefer xref only as a hint; objects are authoritative.
  const objRe = /(\d+)\s+(\d+)\s+obj\b/g;
  const objects = new Map();
  let m; let count = 0;
  while ((m = objRe.exec(s)) !== null) {
    if (++count > P_LIMITS.maxObjects)
      return fail("PERMANENT", "object-cap-exceeded", `more than ${P_LIMITS.maxObjects} objects`);
    const num = parseInt(m[1], 10), gen = parseInt(m[2], 10);
    const bodyStart = m.index + m[0].length;
    const end = findObjEnd(s, bodyStart);
    if (end === -1) { quar(`obj ${num} ${gen}`, "truncated-object", "no endobj"); continue; }
    objects.set(`${num} ${gen}`, { num, gen, body: s.slice(bodyStart, end - 6), offset: m.index });
  }
  if (objects.size === 0)
    return fail("INVALID_PAYLOAD", "no-objects", "no indirect objects found");

  const getObj = (ref) => {
    if (!ref || ref.t !== "ref") return null;
    return objects.get(`${ref.num} ${ref.gen}`) || null;
  };
  const dictOf = (o) => {
    if (!o) return null;
    if (o.inlineDict) return o.inlineDict;
    const v = parsePdfValue(o.body);
    return v && v.t === "dict" ? v.v : null;
  };

  // Trailers: last one wins (incremental updates, documented).
  const trailers = [];
  const trRe = /trailer\s*<</g;
  let tm;
  while ((tm = trRe.exec(s)) !== null) {
    const v = parsePdfValue(s.slice(tm.index + 7));
    if (v && v.t === "dict") trailers.push(v.v);
  }
  if (!s.includes("%%EOF")) note("truncated-eof", true);
  const trailer = trailers.length ? trailers[trailers.length - 1] : null;
  if (!trailer) note("no-trailer", "no trailer dict; proceeding by object scan (documented fallback)");

  const encRef = trailer && trailer.Encrypt;
  if (encRef && encRef.t !== "null")
    return fail("UNSUPPORTED", "encrypted", "document carries /Encrypt; decryption is out of scope (documented)");

  const rootRef = trailer && trailer.Root;
  let rootObj = rootRef && rootRef.t === "dict" ? null : getObj(rootRef);
  let rootDict = rootRef && rootRef.t === "dict" ? rootRef.v : dictOf(rootObj);
  if ((!rootDict || !rootDict.Pages) && !trailer) {
    // Documented fallback: no trailer -> scan for a catalog object.
    for (const o of objects.values()) {
      const d = dictOf(o);
      if (d && d.Type && d.Type.v === "Catalog" && d.Pages) { rootObj = o; rootDict = d; note("catalog-by-scan", true); break; }
    }
  }
  if (!rootDict || !rootDict.Pages)
    return fail("INVALID_PAYLOAD", "no-catalog", "trailer /Root does not resolve to a catalog with /Pages");

  // Walk the pages tree (bounded, cycle-safe). Accepts a ref or a direct dict.
  const pages = [];
  const visited = new Set();
  const walk = (node, depth) => {
    if (depth > P_LIMITS.maxTreeDepth) { quar("pages-tree", "depth-cap", `depth>${P_LIMITS.maxTreeDepth}`); return; }
    let o = null, d = null, key = null;
    if (node && node.t === "dict") { d = node.v; key = `direct@${depth}`; }
    else {
      o = getObj(node);
      if (!o) { quar(`ref ${node && node.num} ${node && node.gen}`, "bad-ref", "dangling reference in pages tree"); return; }
      key = `${o.num} ${o.gen}`;
      d = dictOf(o);
    }
    if (visited.has(key)) { quar(`pages-node ${key}`, "circular-pages", "pages tree cycle"); return; }
    visited.add(key);
    if (!d) { quar(`pages-node ${key}`, "bad-pages-node", "not a dict"); return; }
    const type = d.Type && d.Type.v;
    if (type === "Page") {
      if (o) pages.push(o);
      else if (node && node.t === "dict")
        pages.push({ num: "inline", gen: 0, offset: -1, body: "", inlineDict: node.v });
      return;
    }
    const kids = d.Kids;
    if (kids && kids.t === "array") {
      for (const k of kids.v) {
        if (k.t === "ref" || k.t === "dict") walk(k, depth + 1);
        else quar(`pages-node ${key}`, "bad-kid", "non-ref kid entry");
      }
    } else if (type === "Pages" || !type) {
      quar(`pages-node ${key}`, "pages-without-kids", "no /Kids array");
    }
  };
  const pagesRef = rootDict.Pages;
  const pagesRootObj = getObj(pagesRef);
  const pagesRootDict = pagesRef && pagesRef.t === "dict" ? pagesRef.v : dictOf(pagesRootObj);
  const pagesRootLoc = pagesRootObj ? `obj ${pagesRootObj.num} ${pagesRootObj.gen}` : "direct /Pages dict";
  if (!pagesRootObj && !(pagesRef && pagesRef.t === "dict"))
    return fail("INVALID_PAYLOAD", "no-pages", "/Pages does not resolve");
  walk(pagesRef, 0);

  if (pages.length > P_LIMITS.maxPages)
    return fail("PERMANENT", "page-cap-exceeded", `${pages.length} pages exceeds ${P_LIMITS.maxPages} (D3)`);

  const declaredCount = pagesRootDict && pagesRootDict.Count && pagesRootDict.Count.t === "num"
    ? pagesRootDict.Count.v : null;
  if (declaredCount !== null && declaredCount !== pages.length)
    quar("pages-tree", "count-mismatch", `/Count=${declaredCount} but traversed ${pages.length}; claiming traversed (documented)`);

  const put = (field, value, locator) =>
    R.claims.push({ field, value, provenance: [{ source: "pdf-document", locator }], parser: PDF_PARSER_VERSION });

  // Page count claims what we traversed (documented).
  put("doc_page_count", pages.length, `pages-tree ${pagesRootLoc}`);

  // Info metadata. /Info may be an indirect ref or a direct dict; both resolve.
  const infoVal = trailer && trailer.Info;
  const infoObj = getObj(infoVal);
  const infoDict = dictOf(infoObj) || (infoVal && infoVal.t === "dict" ? infoVal.v : null);
  const infoStr = (key) => {
    if (!infoDict || !infoDict[key]) return null;
    let v = infoDict[key];
    if (v.t === "ref") { quar(`info/${key}`, "indirect-info-value", "indirect Info string not resolved (documented)"); return null; }
    return decodeTextString(v);
  };
  for (const [key, field] of [["Title", "doc_title"], ["Author", "doc_author"]]) {
    const t = infoStr(key);
    if (t === null || t === undefined) continue;
    if (!t) continue; // empty -> no claim (documented)
    let v = t;
    if (v.length > P_LIMITS.maxInfoChars) { v = v.slice(0, P_LIMITS.maxInfoChars); R.truncated.info = true; }
    put(field, v, infoObj ? `info obj ${infoObj.num} ${infoObj.gen} /${key}` : `info trailer-direct /${key}`);
  }

  // Page text.
  let textBudget = P_LIMITS.maxTextChars;
  for (let pi = 0; pi < pages.length; pi++) {
    const po = pages[pi];
    const pd = dictOf(po);
    const contents = pd && pd.Contents;
    if (!contents) { quar(`page[${pi + 1}] obj ${po.num} ${po.gen}`, "page-without-contents", "no /Contents"); continue; }
    const refs = contents.t === "array" ? contents.v.filter((x) => x.t === "ref")
      : contents.t === "ref" ? [contents] : [];
    if (refs.length === 0) { quar(`page[${pi + 1}] obj ${po.num} ${po.gen}`, "bad-contents", "/Contents not a ref/array-of-refs"); continue; }
    let pageText = "";
    for (const r of refs) {
      const so = getObj(r);
      if (!so) { quar(`page[${pi + 1}]`, "bad-ref", `contents ref ${r.num} ${r.gen} dangles`); continue; }
      const sd = dictOf(so);
      const dataStart = findStreamData(s, so);
      if (!sd || dataStart === -1) { quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "non-stream-contents", "contents target is not a stream object"); continue; }
      const lenV = sd.Length;
      const declared = lenV && lenV.t === "num" ? lenV.v : null;
      if (declared === null) { quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "unresolvable-length", "no direct /Length"); continue; }
      if (declared < 0) { quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "negative-length", `/Length=${declared}`); continue; }
      const endStream = s.indexOf("endstream", dataStart);
      if (endStream === -1) { quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "unterminated-stream", "no endstream"); continue; }
      if (dataStart + declared > endStream) {
        quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "length-mismatch", `/Length=${declared} exceeds bytes to endstream (${endStream - dataStart}); stream untrusted (documented)`);
        continue;
      }
      let raw = s.slice(dataStart, dataStart + declared);
      const filt = sd.Filter;
      const fname = filt && filt.t === "name" ? filt.v : filt && filt.t === "array" ? "array" : null;
      if (fname && fname !== "FlateDecode") {
        quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "unsupported-filter", `/${fname} not decoded (documented)`);
        continue;
      }
      if (fname === "FlateDecode") {
        try {
          const inflated = inflateSync(Buffer.from(raw, "latin1"));
          if (inflated.length > P_LIMITS.maxInflated)
            return fail("PERMANENT", "decompression-bomb", `stream inflates to ${inflated.length} > ${P_LIMITS.maxInflated} (D5)`);
          raw = inflated.toString("latin1");
        } catch (e) {
          quar(`page[${pi + 1}] obj ${so.num} ${so.gen}`, "inflate-failed", String(e.message).slice(0, 120));
          continue;
        }
      }
      pageText += extractStreamText(raw);
    }
    if (!pageText) continue; // empty page: no text claim (documented)
    if (pageText.length > textBudget) {
      pageText = pageText.slice(0, textBudget);
      R.truncated.text = true;
      textBudget = 0;
    } else textBudget -= pageText.length;
    put("doc_text", pageText, `page[${pi + 1}] obj ${po.num} ${po.gen}`);
  }

  return R;
}

function findObjEnd(s, from) {
  // Stream objects: use /Length-bounded data; here just locate endobj safely.
  const endObj = s.indexOf("endobj", from);
  if (endObj === -1) return -1;
  // The stream keyword, if any, follows the dict: bound the search past ">>"
  // so a "stream" inside a dict string cannot mislead us (documented).
  const dictEnd = s.indexOf(">>", from);
  const kwFrom = dictEnd === -1 || dictEnd > endObj ? from : dictEnd + 2;
  const streamKw = s.indexOf("stream", kwFrom);
  if (streamKw !== -1 && streamKw < endObj) {
    const endStream = s.indexOf("endstream", streamKw);
    if (endStream === -1) return -1;
    const eo2 = s.indexOf("endobj", endStream);
    return eo2 === -1 ? -1 : eo2 + 6;
  }
  return endObj + 6;
}

function findStreamData(s, so) {
  // The stream keyword is the first "stream" after the object's dict.
  // It must be followed by CRLF/LF; anything else means the object is
  // not a stream (documented).
  const dictEnd = so.body.indexOf(">>");
  const from = so.offset + (dictEnd === -1 ? 0 : dictEnd + 2);
  const kw = s.indexOf("stream", from);
  if (kw === -1 || kw > so.offset + so.body.length + 6) return -1;
  let d = kw + 6;
  if (s[d] === "\r" && s[d + 1] === "\n") d += 2;
  else if (s[d] === "\r" || s[d] === "\n") d += 1;
  else return -1;
  return d;
}
