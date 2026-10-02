#!/usr/bin/env node
// documents-pdf fixture lab: cases 800-849 (missions ACQ-0951..ACQ-1000).
// Doctrine: NEVER turn parser guess into fact. Hostile PDFs -> typed lane-K
// failures; ambiguous structures -> bounded extraction with provenance or
// quarantine. Fixtures are minimal hand-built PDFs (latin1 Buffers).
import { createHash } from "node:crypto";
import { deflateSync as dz } from "node:zlib";

const C = [];
const add = (id, title, threat, bytes, expect) => C.push({ id, title, threat, bytes, expect });

const B = (s) => Buffer.from(s, "latin1");

// Stream object body with correct /Length.
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
    const sorted = [...offsets].sort((a, b) => a[0] - b[0]);
    for (const [, off] of sorted) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
    push(xref);
  }
  if (!opts.noTrailer) push(`trailer\n<< ${td} >>\n`);
  if (!opts.noXref) push(`startxref\n${opts.badXref ? 99999999 : xrefPos}\n`);
  if (!opts.noEof) push("%%EOF");
  if (opts.append) push(opts.append);
  return Buffer.concat(chunks);
}

// One-page document helper. info: {Title, Author} strings (pre-encoded).
// textOps null/undefined -> page has NO /Contents at all.
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

// ---- 800-809: baseline, hostile headers, encryption, caps ----
add("case-800", "baseline: title/author/text/page-count",
  "Typed fields claim with per-object provenance.",
  doc1(text1(`${lit("Hello World")} Tj`), { Title: lit("Quarterly Report"), Author: lit("Acme Corp") }),
  { outcome: "bounded_success",
    claims: { doc_title: "Quarterly Report", doc_author: "Acme Corp", doc_text: "Hello World", doc_page_count: 1 } });

add("case-801", "3 pages -> 3 text claims",
  "One claim per page with page provenance.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] [4 0 R] [5 0 R] /Count 3 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>"],
      [4, "<< /Type /Page /Parent 2 0 R /Contents 7 0 R >>"],
      [5, "<< /Type /Page /Parent 2 0 R /Contents 8 0 R >>"],
      [6, streamObj("", text1(`${lit("P1")} Tj`))],
      [7, streamObj("", text1(`${lit("P2")} Tj`))],
      [8, streamObj("", text1(`${lit("P3")} Tj`))],
    ];
    // fix the Kids array (built properly here)
    objs[1][1] = "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>";
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", exact_claims: { doc_text: 3, doc_page_count: 1 },
    claims: { doc_text: "P1" }, min_claims: { doc_text: 3 } });

add("case-802", "random bytes -> INVALID_PAYLOAD",
  "Not a PDF at all.",
  B("this is definitely not a pdf file, just text"),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-header" });

add("case-803", "HTML masquerading as PDF -> INVALID_PAYLOAD",
  "Content sniffing by header, not extension.",
  B("<!DOCTYPE html><html><body>Hello</body></html>"),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-header" });

add("case-804", "encrypted document -> UNSUPPORTED",
  "Decryption is out of scope; typed refusal, never a guess.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Secret")} Tj`))],
      [7, "<< /Filter /Standard /V 2 /R 3 >>"],
    ];
    return buildPdf(objs, { encrypt: true });
  })(),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "encrypted" });

add("case-805", "201 pages -> PERMANENT page-cap (D3)",
  "Bounded before extraction; page count recorded in the signal.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, `<</Type /Pages /Kids [${Array.from({ length: 201 }, (_, i) => `${10 + i} 0 R`).join(" ")}] /Count 201 >>`],
    ];
    for (let i = 0; i < 201; i++) objs.push([10 + i, `<< /Type /Page /Parent 2 0 R >>`]);
    return buildPdf(objs);
  })(),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "page-cap-exceeded" });

add("case-806", "20 MiB + 1 byte -> PERMANENT byte-cap (D4)",
  "Download cap fires before any parsing.",
  Buffer.concat([B("%PDF-1.4\n"), Buffer.alloc(20 * 1024 * 1024 + 1, 0x20)]),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "byte-cap-exceeded" });

add("case-807", "FlateDecode stream extracts",
  "Supported compression is transparent.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode", dz(B(text1(`${lit("Compressed Hello")} Tj`))))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Compressed Hello" } });

add("case-808", "decompression bomb -> PERMANENT (D5)",
  "6 MiB of zeros inflates past the per-stream cap; killed, not OOMed.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode", dz(Buffer.alloc(6 * 1024 * 1024, 0x61)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "decompression-bomb" });

add("case-809", "LZWDecode -> stream quarantined, doc survives",
  "Unsupported filters quarantine the stream, never the document.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /LZWDecode", B(text1(`${lit("Hi")} Tj`)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "unsupported-filter" }], exact_claims: { doc_page_count: 1 } });

// ---- 810-819: string decoding, TJ, structure fallbacks ----
add("case-810", "hex UTF-16BE with BOM decodes",
  "FEFF prefix selects UTF-16BE.",
  doc1(text1(`<FEFF00480065006C006C006F> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "Hello" } });

add("case-811", "hex without BOM -> latin1 bytes",
  "No BOM, no font table: raw bytes as latin1 (documented).",
  doc1(text1(`<48656C6C6F> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "Hello" } });

add("case-812", "literal escapes decoded",
  "Backslash, paren, and octal escapes resolve to bytes.",
  doc1(text1(`(A\\(B\\)C\\\\D\\101) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A(B)C\\DA" } });

add("case-813", "TJ kerning numbers ignored, no space guessed",
  "Kerning is positioning, not text: join with empty string.",
  doc1(text1(`[(Hello) -120 (World)] TJ`)),
  { outcome: "bounded_success", claims: { doc_text: "HelloWorld" }, forbidden_values: ["Hello World"] });

add("case-814", "nested parens in literal",
  "Balanced-paren scanning keeps inner parens.",
  doc1(text1(`(a(b)c) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "a(b)c" } });

add("case-815", "no trailer/xref -> scan fallback with note",
  "Objects are authoritative; xref is a hint.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("NoTrailer")} Tj`))],
    ];
    return buildPdf(objs, { noTrailer: true, noXref: true });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "NoTrailer" }, required_notes: ["no-trailer"] });

add("case-816", "lying startxref -> fallback scan",
  "A corrupt xref offset never blocks extraction.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("BadXref")} Tj`))],
    ];
    return buildPdf(objs, { badXref: true });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "BadXref" } });

add("case-817", "lying /Length -> stream quarantined",
  "Declared length past endstream: the stream is untrusted.",
  (() => {
    const data = B(text1(`${lit("Lying")} Tj`));
    const body = Buffer.concat([B(`<< /Length 99999 >>\nstream\n`), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "length-mismatch" }] });

add("case-818", "page without /Contents -> quarantined, counted",
  "Structure claims survive; missing content is a quarantine, not a guess.",
  doc1(null),
  { outcome: "bounded_success", exact_claims: { doc_page_count: 1 }, absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "page-without-contents" }] });

add("case-819", "/Contents array of 2 streams concatenated",
  "Multiple content streams join in order.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents [4 0 R 5 0 R] >>"],
      [4, streamObj("", text1(`${lit("AB")} Tj`))],
      [5, streamObj("", text1(`${lit("CD")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "ABCD" } });

// ---- 820-829: metadata, counts, tree shapes ----
add("case-820", "Info Title as UTF-16BE hex",
  "Metadata strings decode like text strings.",
  doc1(text1(`${lit("x")} Tj`), { Title: "<FEFF005400690074006C0065>" }),
  { outcome: "bounded_success", claims: { doc_title: "Title" } });

add("case-821", "no Info dict -> absent metadata claims",
  "Missing metadata is a legitimate empty, not a failure.",
  doc1(text1(`${lit("x")} Tj`)),
  { outcome: "bounded_success", absent_claims: ["doc_title", "doc_author"] });

add("case-822", "zero pages -> page_count 0, no text",
  "Empty documents are legitimate empties.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [] /Count 0 >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_page_count: 0 }, absent_claims: ["doc_text"] });

add("case-823", "truncated file (no %%EOF) -> note + partial extraction",
  "Bounded extraction of what survived.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Truncated")} Tj`))],
    ];
    return buildPdf(objs, { noEof: true });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Truncated" }, required_notes: ["truncated-eof"] });

add("case-824", "/Count lies (5 vs 1 kid) -> claim traversed + quarantine",
  "The tree we walked is fact; the declared count is a quarrel.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 5 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("OneKid")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 1 },
    required_quarantined: [{ reason: "count-mismatch" }] });

add("case-825", "nested pages tree (Pages in Pages)",
  "Recursive traversal finds both leaves.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [5 0 R] /Count 2 >>"],
      [5, "<< /Type /Pages /Parent 2 0 R /Kids [3 0 R 4 0 R] /Count 2 >>"],
      [3, "<< /Type /Page /Parent 5 0 R /Contents 6 0 R >>"],
      [4, "<< /Type /Page /Parent 5 0 R /Contents 7 0 R >>"],
      [6, streamObj("", text1(`${lit("N1")} Tj`))],
      [7, streamObj("", text1(`${lit("N2")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", exact_claims: { doc_text: 2 }, claims: { doc_page_count: 2 } });

add("case-826", "dangling kid ref -> quarantined, sibling survives",
  "One bad reference does not poison the tree.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R 99 0 R] /Count 2 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Survivor")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Survivor", doc_page_count: 1 },
    required_quarantined: [{ reason: "bad-ref" }] });

add("case-827", "circular pages tree -> quarantined, bounded",
  "Cycle-safe traversal; no hang, no guess.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [2 0 R] /Count 1 >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "circular-pages" }] });

add("case-828", "object stream node -> quarantined as unparsed",
  "Compressed objects are out of scope (documented); the rest survives.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Visible")} Tj`))],
      [9, streamObj("/Type /ObjStm /N 1 /First 4", B("3 0 12 (hidden)"))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Visible" }, forbidden_values: ["hidden"] });

add("case-829", "linearized PDF parses normally",
  "Linearization hints are ignored (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Linear")} Tj`))],
    ];
    const pdf = buildPdf(objs);
    return Buffer.concat([B("%PDF-1.4\n%âãÏÓ linearized hint\n"), pdf.slice(9)]);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Linear" } });

// ---- 830-839: versions, operators, filters ----
add("case-830", "%PDF-2.0 header accepted",
  "Current major version parses.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("V2")} Tj`))],
    ];
    return buildPdf(objs, { version: "2.0" });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "V2" } });

add("case-831", "%PDF-0.9 -> INVALID_PAYLOAD",
  "Pre-1.0 is not a supported document.",
  B("%PDF-0.9\n1 0 obj\n<< >>\nendobj\n"),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-header" });

add("case-832", "binary garbage between objects -> scan survives",
  "The scanner does not need clean whitespace.",
  (() => {
    const clean = doc1(text1(`${lit("Garbage")} Tj`));
    const s = clean.toString("latin1");
    const injected = s.replace("endobj\n2 0 obj", "endobj\n%\x00\xff binary \x01 junk\n2 0 obj");
    return B(injected);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Garbage" } });

add("case-833", "multi-line literal string preserves newline",
  "Raw newlines inside strings are literal.",
  doc1(B(`BT (${"Line1\nLine2"}) Tj ET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Line1\nLine2" } });

add("case-834", "empty literal -> no text claim",
  "Empty is empty.",
  doc1(text1(`() Tj`)),
  { outcome: "bounded_success", absent_claims: ["doc_text"] });

add("case-835", "two Tj ops join without separator",
  "Sequential shows concatenate (documented).",
  doc1(text1(`(A) Tj (B) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

add("case-836", "T* inserts newline",
  "Line-positioning op is a line break (documented).",
  doc1(text1(`(L1) Tj T* (L2) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "L1\nL2" } });

add("case-837", "filter array -> unsupported-filter quarantine",
  "Only single FlateDecode is decoded (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter [/ASCII85Decode /FlateDecode]", B(text1(`${lit("Hi")} Tj`)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "unsupported-filter" }] });

add("case-838", "FlateDecode of plain text -> inflate-failed quarantine",
  "Corrupt compression is a quarantine, not a crash.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode", B(text1(`${lit("NotCompressed")} Tj`)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "inflate-failed" }] });

add("case-839", "Info as indirect object resolves",
  "Indirect metadata is followed one hop.",
  doc1(text1(`${lit("x")} Tj`), { Title: lit("Indirect Title"), Author: lit("Indirect Author") }),
  { outcome: "bounded_success", claims: { doc_title: "Indirect Title", doc_author: "Indirect Author" } });

// ---- 840-849: caps, incremental, kitchen sink ----
add("case-840", "5000-char title -> truncation flagged at 4096",
  "Metadata is capped, never silently cut.",
  doc1(text1(`${lit("x")} Tj`), { Title: lit("x".repeat(5000)) }),
  { outcome: "bounded_success", claims: { doc_title: "x".repeat(4096) }, required_truncated: ["info"] });

add("case-841", "/Contents pointing at a dict -> quarantined",
  "Contents must be a stream.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, "<< /NotAStream true >>"],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "non-stream-contents" }] });

add("case-842", "60000 objects -> PERMANENT object-cap",
  "Object scan is bounded before the tree walk.",
  (() => {
    const objs = [];
    for (let i = 1; i <= 60000; i++) objs.push([i, "<< /T 1 >>"]);
    return buildPdf(objs);
  })(),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "object-cap-exceeded" });

add("case-843", "incremental update: last trailer wins",
  "The newest trailer is authoritative (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Incr")} Tj`))],
      [5, "<< /Title (First) >>"],
      [6, "<< /Title (Second) >>"],
    ];
    const pdf = buildPdf(objs, { infoRef: "5 0 R", append: B("\ntrailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n0\n%%EOF") });
    return pdf;
  })(),
  { outcome: "bounded_success", claims: { doc_title: "Second", doc_text: "Incr" },
    forbidden_values: ["First"] });

add("case-844", "garbage startxref value -> ignored, scan wins",
  "startxref is never trusted.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("NoXrefTrust")} Tj`))],
    ];
    const pdf = buildPdf(objs, { noXref: true });
    return Buffer.concat([pdf, B("startxref\nnotanumber\n%%EOF")]);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "NoXrefTrust" } });

add("case-845", "non-text operators ignored",
  "Painting ops never become text.",
  doc1(`BT ${lit("Hi")} Tj 0 0 10 10 re f Q ET`),
  { outcome: "bounded_success", claims: { doc_text: "Hi" } });

add("case-846", "quote operators show with newline",
  "' and \" are text-showing ops (documented).",
  doc1(`BT (A) ' (B) " ET`),
  { outcome: "bounded_success", claims: { doc_text: "\nA\nB" } });

add("case-847", "empty Info title -> no title claim",
  "Empty metadata is absent, not empty-string.",
  doc1(text1(`${lit("x")} Tj`), { Title: "()" }),
  { outcome: "bounded_success", absent_claims: ["doc_title"] });

add("case-848", "pdf kitchen sink -> exact claim set",
  "Flate page, plain page, hex title, one bad-filter stream.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 5 0 R >>"],
      [4, "<< /Type /Page /Parent 2 0 R /Contents [6 0 R 7 0 R] >>"],
      [5, streamObj("/Filter /FlateDecode", dz(B(text1(`${lit("Sink1")} Tj`))))],
      [6, streamObj("", text1(`${lit("Sink2")} Tj`))],
      [7, streamObj("/Filter /LZWDecode", B(text1(`${lit("Nope")} Tj`)))],
      [8, "<< /Title <FEFF00530069006E006B> >>"],
    ];
    return buildPdf(objs, { infoRef: "8 0 R" });
  })(),
  { outcome: "bounded_success",
    exact_claims: { doc_text: 2, doc_title: 1, doc_page_count: 1 },
    required_quarantined: [{ reason: "unsupported-filter" }],
    forbidden_values: ["Nope"] });

add("case-849", "200-byte garbage prefix -> header found in window",
  "Leading junk within 1024 bytes is tolerated (documented).",
  (() => {
    const inner = doc1(text1(`${lit("Prefixed")} Tj`));
    return Buffer.concat([B("x".repeat(200)), inner.slice(0)]);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Prefixed" } });

// ---- manifest: missions ACQ-0951..ACQ-1000 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.bytes).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(951 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.bytes.length, expect: c.expect };
});

export { C, manifest };
export function getCase(id) { return C.find((c) => c.id === id); }
