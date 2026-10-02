#!/usr/bin/env node
// documents-pdf fixture lab, batch 2: cases 850-899 (missions ACQ-1001..ACQ-1050).
// Deeper adversarial coverage: tree shapes, length games, operator edge cases,
// incremental quirks, encoding corners. Same doctrine: no guessing.
import { createHash } from "node:crypto";
import { deflateSync as dz } from "node:zlib";

const C = [];
const add = (id, title, threat, bytes, expect) => C.push({ id, title, threat, bytes, expect });

const B = (s) => Buffer.from(s, "latin1");
const streamObj = (dictStr, data) => {
  const d = Buffer.isBuffer(data) ? data : B(data);
  return Buffer.concat([B(`<< ${dictStr} /Length ${d.length} >>\nstream\n`), d, B("\nendstream")]);
};

function buildPdf(objList, opts = {}) {
  const chunks = [];
  let pos = 0;
  const push = (b) => { const bb = Buffer.isBuffer(b) ? b : B(b); chunks.push(bb); pos += bb.length; };
  push(opts.prefix || "");
  push(`%PDF-${opts.version || "1.4"}\n`);
  const offsets = [];
  for (const [num, body] of objList) {
    offsets.push([num, pos]);
    push(`${num} 0 obj\n`);
    push(body);
    push(`\nendobj\n`);
  }
  let td = `/Size ${objList.length + 1} /Root 1 0 R`;
  if (opts.infoRef) td += ` /Info ${opts.infoRef}`;
  if (opts.encrypt) td += ` /Encrypt 7 0 R`;
  td += opts.trailerExtra || "";
  const xrefPos = pos;
  if (!opts.noXref) {
    let xref = `xref\n0 ${objList.length + 1}\n0000000000 65535 f \n`;
    for (const [, off] of [...offsets].sort((a, b) => a[0] - b[0])) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
    push(xref);
  }
  if (!opts.noTrailer) push(`trailer\n<< ${td} >>\n`);
  if (!opts.noXref) push(`startxref\n${opts.badXref ? 99999999 : xrefPos}\n`);
  if (!opts.noEof) push("%%EOF");
  if (opts.append) push(opts.append);
  return Buffer.concat(chunks);
}

function doc1(textOps, info) {
  const pageDict = textOps !== null && textOps !== undefined
    ? "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>"
    : "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>";
  const objs = [
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, pageDict],
  ];
  if (textOps !== null && textOps !== undefined) objs.push([4, streamObj("", textOps)]);
  let infoRef = null;
  if (info) {
    const parts = [];
    if (info.Title !== undefined) parts.push(`/Title ${info.Title}`);
    if (info.Author !== undefined) parts.push(`/Author ${info.Author}`);
    objs.push([6, `<< ${parts.join(" ")} >>`]);
    infoRef = "6 0 R";
  }
  return buildPdf(objs, { infoRef });
}

const lit = (s) => `(${s})`;
const text1 = (inner) => `BT /F1 12 Tf 72 720 Td ${inner} ET`;

// multi-page helper: pages[i] -> text or null (no contents)
function docN(texts) {
  const n = texts.length;
  const kids = texts.map((_, i) => `${10 + i} 0 R`).join(" ");
  const objs = [
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`],
  ];
  texts.forEach((t, i) => {
    const pn = 10 + i, cn = 100 + i;
    objs.push([pn, t === null
      ? `<< /Type /Page /Parent 2 0 R >>`
      : `<< /Type /Page /Parent 2 0 R /Contents ${cn} 0 R >>`]);
    if (t !== null) objs.push([cn, streamObj("", t)]);
  });
  return buildPdf(objs);
}

// ---- 850-859 ----
add("case-850", "two pages, author only",
  "Metadata claims are independent of title presence.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [10 0 R 11 0 R] /Count 2 >>"],
      [10, "<< /Type /Page /Parent 2 0 R /Contents 100 0 R >>"],
      [11, "<< /Type /Page /Parent 2 0 R /Contents 101 0 R >>"],
      [100, streamObj("", text1(`${lit("A1")} Tj`))],
      [101, streamObj("", text1(`${lit("A2")} Tj`))],
      [6, "<< /Author (Jane Doe) >>"],
    ];
    return buildPdf(objs, { infoRef: "6 0 R" });
  })(),
  { outcome: "bounded_success", claims: { doc_author: "Jane Doe", doc_page_count: 2 },
    exact_claims: { doc_text: 2 }, absent_claims: ["doc_title"] });

add("case-851", "title with escaped parens in metadata",
  "Metadata literals decode escapes like text.",
  doc1(text1(`${lit("x")} Tj`), { Title: "(Q\\(2\\) Report)" }),
  { outcome: "bounded_success", claims: { doc_title: "Q(2) Report" } });

add("case-852", "4097-char author -> truncation flagged",
  "One over the metadata cap fires the flag.",
  doc1(text1(`${lit("x")} Tj`), { Author: lit("y".repeat(4097)) }),
  { outcome: "bounded_success", claims: { doc_author: "y".repeat(4096) }, required_truncated: ["info"] });

add("case-853", "2 MiB text cap across 21 pages -> truncation flagged",
  "Extraction is bounded with a flag, never silently cut (P2 analog).",
  docN(Array.from({ length: 21 }, () => text1(`${lit("z".repeat(102400))} Tj`))),
  { outcome: "bounded_success", exact_claims: { doc_text: 21 }, required_truncated: ["text"] });

add("case-854", "33-deep pages tree -> depth-cap quarantine",
  "Recursion is bounded; the cycle guard holds.",
  (() => {
    const objs = [[1, "<< /Type /Catalog /Pages 2 0 R >>"]];
    for (let d = 0; d < 33; d++) {
      const n = 2 + d;
      const kid = d === 32 ? "50 0 R" : `${n + 1} 0 R`;
      objs.push([n, `<< /Type /Pages /Kids [${kid}] /Count 1 >>`]);
    }
    objs.push([50, "<< /Type /Page /Parent 34 0 R /Contents 60 0 R >>"]);
    objs.push([60, streamObj("", text1(`${lit("Deep")} Tj`))]);
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "depth-cap" }], absent_claims: ["doc_text"] });

add("case-855", "direct-dict page kid (no ref) resolves",
  "Inline page dicts are walked, not skipped.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [<< /Type /Page /Contents 4 0 R >>] /Count 1 >>"],
      [4, streamObj("", text1(`${lit("Inline")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Inline", doc_page_count: 1 } });

add("case-856", "indirect /Length -> unresolvable-length quarantine",
  "Only direct lengths are trusted (documented).",
  (() => {
    const data = B(text1(`${lit("Indir")} Tj`));
    const body = Buffer.concat([B("<< /Length 9 0 R >>\nstream\n"), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
      [9, "42"],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "unresolvable-length" }] });

add("case-857", "text outside BT/ET ignored",
  "Only text-object content becomes claims.",
  doc1(`(Outside) Tj BT ${lit("Inside")} Tj ET`),
  { outcome: "bounded_success", claims: { doc_text: "Inside" }, forbidden_values: ["Outside"] });

add("case-858", "TJ with nested array -> inner strings skipped safely",
  "Malformed TJ arrays degrade to the flat strings.",
  doc1(text1(`[(A) [(B)] (C)] TJ`)),
  { outcome: "bounded_success", claims: { doc_text: "AC" }, forbidden_values: ["B"] });

add("case-859", "odd-digit hex drops the dangling nibble",
  "Incomplete final byte is dropped, not guessed.",
  doc1(text1(`<ABC> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "«" } });

// ---- 860-869 ----
add("case-860", "hex with whitespace/newlines -> stripped",
  "Hex whitespace is insignificant.",
  doc1(B(`BT <48 65 6c\n6c 6f> Tj ET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Hello" } });

add("case-861", "CR escape preserved",
  "\\r decodes to a carriage return byte.",
  doc1(text1(`(A\\rB) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A\rB" } });

add("case-862", "unknown escape -> literal char (documented)",
  "\\q is not an escape: the char stands.",
  doc1(text1(`(A\\qB) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "AqB" } });

add("case-863", "NUL byte in literal -> verbatim claim",
  "Extracted text is verbatim; no text-level control policy (documented).",
  doc1(text1(`(A\\0B) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A\0B" } });

add("case-864", "UTF-16BE odd byte count drops trailing byte",
  "Incomplete final unit is dropped.",
  doc1(text1(`<FEFF0041> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A" } });

add("case-865", "first trailer encrypted, last not -> last wins",
  "Newest trailer is authoritative (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("NotEncrypted")} Tj`))],
      [7, "<< /V 2 >>"],
    ];
    return buildPdf(objs, { encrypt: true, append: B("\ntrailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n0\n%%EOF") });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "NotEncrypted" } });

add("case-866", "direct-dict /Root resolves",
  "Inline catalog dicts are honored.",
  (() => {
    const objs = [
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("DirectRoot")} Tj`))],
    ];
    return (() => {
      // direct /Root dict in the trailer
      const chunks = [];
      let pos = 0;
      const push = (b) => { const bb = Buffer.isBuffer(b) ? b : B(b); chunks.push(bb); pos += bb.length; };
      push("%PDF-1.4\n");
      for (const [num, body] of objs) {
        push(`${num} 0 obj\n`); push(body); push(`\nendobj\n`);
      }
      push("trailer\n<< /Size 5 /Root << /Type /Catalog /Pages 2 0 R >> >>\nstartxref\n0\n%%EOF");
      return Buffer.concat(chunks);
    })();
  })(),
  { outcome: "bounded_success", claims: { doc_text: "DirectRoot" } });

add("case-867", "contents array: one dangling ref + one good",
  "Partial failure stays partial.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents [4 0 R 99 0 R] >>"],
      [4, streamObj("", text1(`${lit("Partial")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Partial" },
    required_quarantined: [{ reason: "bad-ref" }] });

add("case-868", "Info Title as name object -> absent",
  "Non-string metadata never becomes a claim.",
  doc1(text1(`${lit("x")} Tj`), { Title: "/NotAString" }),
  { outcome: "bounded_success", absent_claims: ["doc_title"] });

add("case-869", "Info Title as number -> absent",
  "Numbers never become titles.",
  doc1(text1(`${lit("x")} Tj`), { Title: "42" }),
  { outcome: "bounded_success", absent_claims: ["doc_title"] });

// ---- 870-879 ----
add("case-870", "/Kids not an array -> pages-without-kids",
  "Malformed tree nodes quarantine cleanly.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids 3 0 R /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "pages-without-kids" }] });

add("case-871", "stream keyword without EOL -> non-stream quarantine",
  "Malformed stream headers are not trusted.",
  (() => {
    const data = B(text1(`${lit("NoEOL")} Tj`));
    const body = Buffer.concat([B(`<< /Length ${data.length} >>\nstream `), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "non-stream-contents" }] });

add("case-872", "nonzero generation numbers work",
  "Generations are part of identity.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Gen5")} Tj`))],
    ];
    const pdf = buildPdf(objs).toString("latin1").replace("4 0 obj", "4 5 obj").replace("4 0 R >>", "4 5 R >>");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Gen5" } });

add("case-873", "duplicate object numbers -> last wins (documented)",
  "The scan keeps the latest definition.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 9 0 R >>"],
      [9, "<< /Type /Pages /Kids [] /Count 0 >>"],
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("LastWins")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "LastWins" } });

add("case-874", "zero-length stream -> empty page, no text claim",
  "Empty streams are legitimate empties.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", "")],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-875", "high-byte hex -> latin1 char",
  "No font table: 0xE9 is e-acute (documented).",
  doc1(text1(`<E9> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "é" } });

add("case-876", "/Identity filter -> unsupported-filter quarantine",
  "Only FlateDecode is decoded (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /Identity", B(text1(`${lit("Hi")} Tj`)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "unsupported-filter" }] });

add("case-877", "empty contents array -> bad-contents quarantine",
  "An empty array names no streams.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>"],
      [4, "<< /Type /Page /Parent 2 0 R /Contents [] >>"],
      [5, streamObj("", text1(`${lit("First")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "First", doc_page_count: 2 },
    required_quarantined: [{ reason: "bad-contents" }] });

add("case-878", "trailer without /Root -> INVALID_PAYLOAD",
  "No catalog, no document.",
  buildPdf([[2, "<< /Type /Pages /Kids [] /Count 0 >>"]], { trailerExtra: "", noTrailer: false, infoRef: null }),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "no-catalog" });

add("case-879", "catalog without /Pages -> INVALID_PAYLOAD",
  "Catalog must name a pages tree.",
  (() => {
    const objs = [[1, "<< /Type /Catalog >>"]];
    return buildPdf(objs);
  })(),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "no-catalog" });

// ---- 880-889 ----
add("case-880", "double-quote op shows with newline",
  "\" is a text-showing op (documented).",
  doc1(`BT 0 (sp) 0 ${lit("A")} " ET`),
  { outcome: "bounded_success", claims: { doc_text: "\nA" } });

add("case-881", "nested BT blocks concatenate",
  "Text objects join in order.",
  doc1(`BT ${lit("A")} Tj BT ${lit("B")} Tj ET ET`),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

add("case-882", "stray ET resets; pre-BT text ignored",
  "Text outside any text object is not claimed.",
  doc1(`${lit("X")} Tj ET BT ${lit("Y")} Tj ET`),
  { outcome: "bounded_success", claims: { doc_text: "Y" }, forbidden_values: ["X"] });

add("case-883", "absurd /Count (1e9) vs 1 kid -> count-mismatch",
  "Big numbers do not become facts.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1000000000 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("OneReal")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 1, doc_text: "OneReal" },
    required_quarantined: [{ reason: "count-mismatch" }] });

add("case-884", "201 pages via nested nodes -> PERMANENT page-cap",
  "The cap counts traversed pages, not tree shape.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, `<< /Type /Pages /Kids [10 0 R 20 0 R] /Count 201 >>`],
    ];
    const kids10 = [], kids20 = [];
    for (let i = 0; i < 150; i++) { kids10.push(`${100 + i} 0 R`); objs.push([100 + i, "<< /Type /Page /Parent 10 0 R >>"]); }
    for (let i = 0; i < 51; i++) { kids20.push(`${300 + i} 0 R`); objs.push([300 + i, "<< /Type /Page /Parent 20 0 R >>"]); }
    objs.push([10, `<< /Type /Pages /Parent 2 0 R /Kids [${kids10.join(" ")}] /Count 150 >>`]);
    objs.push([20, `<< /Type /Pages /Parent 2 0 R /Kids [${kids20.join(" ")}] /Count 51 >>`]);
    return buildPdf(objs);
  })(),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "page-cap-exceeded" });

add("case-885", "FlateDecode of empty data -> inflate-failed",
  "Empty compressed streams are corrupt, not empty.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode", Buffer.alloc(0))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "inflate-failed" }] });

add("case-886", "percent comment in stream ignored",
  "Comments never become text.",
  doc1(B("BT % a comment\n (Hi) Tj ET").toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Hi" } });

add("case-887", "deep escape nesting in metadata",
  "Escapes resolve at every depth.",
  doc1(text1(`${lit("x")} Tj`), { Title: "(A \\(deep \\(nest\\)\\) end)" }),
  { outcome: "bounded_success", claims: { doc_title: "A (deep (nest)) end" } });

add("case-888", "lowercase hex decodes",
  "Hex is case-insensitive.",
  doc1(text1(`<666f6f> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "foo" } });

add("case-889", "typeless node with /Kids is walked",
  "Structure is read from keys, not /Type labels.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("Typeless")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "Typeless", doc_page_count: 1 } });

// ---- 890-899 ----
add("case-890", "short /Length clips trailing junk",
  "Declared length bounds the stream (standard).",
  (() => {
    const good = B(`BT ${lit("Hi")} Tj ET`);
    const data = Buffer.concat([good, B("EXTRAJUNK")]);
    const body = Buffer.concat([B(`<< /Length ${good.length} >>\nstream\n`), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Hi" }, forbidden_values: ["EXTRAJUNK"] });

add("case-891", "zeroed xref offsets -> scan fallback",
  "Xref is never load-bearing.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("ZeroXref")} Tj`))],
    ];
    const pdf = buildPdf(objs).toString("latin1").replace(/^\d{10} 00000 n /gm, "0000000000 00000 n ");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "ZeroXref" } });

add("case-892", "truncated unused object -> quarantine + text survives",
  "Damage is contained to the damaged object.",
  (() => {
    const good = doc1(text1(`${lit("Survives")} Tj`));
    const cut = good.toString("latin1").replace("%%EOF", "9 0 obj\n<< /Half ");
    return B(cut);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Survives" },
    required_quarantined: [{ reason: "truncated-object" }] });

add("case-893", "UTF-16BE surrogate pair in title",
  "Astral characters decode through surrogate pairs.",
  doc1(text1(`${lit("x")} Tj`), { Title: "<FEFFD83DDE00>" }),
  { outcome: "bounded_success", claims: { doc_title: "😀" } });

add("case-894", "wrong-generation contents ref dangles",
  "Identity includes generation.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 1 R >>"],
      [4, streamObj("", text1(`${lit("Gen0")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "bad-ref" }] });

add("case-895", "negative /Length -> quarantined",
  "Hostile lengths are refused, not sliced.",
  (() => {
    const data = B(text1(`${lit("Neg")} Tj`));
    const body = Buffer.concat([B("<< /Length -5 >>\nstream\n"), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "negative-length" }] });

add("case-896", "200 pages exactly -> at-cap success",
  "The page cap is exclusive (documented).",
  docN(Array.from({ length: 200 }, () => null)),
  { outcome: "bounded_success", claims: { doc_page_count: 200 }, absent_claims: ["doc_text"] });

add("case-897", "BOM-only hex title -> absent title",
  "An empty decoded title is absent.",
  doc1(text1(`${lit("x")} Tj`), { Title: "<FEFF>" }),
  { outcome: "bounded_success", absent_claims: ["doc_title"] });

add("case-898", "operator-like text inside string is literal",
  "The tokenizer never splits strings.",
  doc1(text1(`(Tj ET) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "Tj ET" } });

add("case-899", "pdf kitchen sink 2 -> exact claim set",
  "Nested pages, flate+plain, circular kid, lying count.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [5 0 R 2 0 R] /Count 99 >>"],
      [5, "<< /Type /Pages /Parent 2 0 R /Kids [3 0 R 4 0 R] /Count 2 >>"],
      [3, "<< /Type /Page /Parent 5 0 R /Contents 6 0 R >>"],
      [4, "<< /Type /Page /Parent 5 0 R /Contents 7 0 R >>"],
      [6, streamObj("/Filter /FlateDecode", dz(B(text1(`${lit("K1")} Tj`))))],
      [7, streamObj("", text1(`[(K) 50 (2)] TJ`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success",
    exact_claims: { doc_text: 2, doc_page_count: 1 },
    required_quarantined: [{ reason: "circular-pages" }, { reason: "count-mismatch" }],
    claims: { doc_text: "K1" }, forbidden_values: ["K 2"] });

// ---- manifest: missions ACQ-1001..ACQ-1050 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.bytes).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1001 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.bytes.length, expect: c.expect };
});
const manifest2 = manifest;

export { C, manifest, manifest2 };
export function getCase(id) { return C.find((c) => c.id === id); }
