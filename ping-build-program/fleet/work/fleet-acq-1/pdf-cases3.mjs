#!/usr/bin/env node
// documents-pdf fixture lab, batch 3: cases 900-949 (missions ACQ-1051..ACQ-1100).
// Third adversarial wave: filter games, header games, keyword-in-data,
// EOL variants, operator corners, boundary lengths. Same doctrine.
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

// ---- 900-909 ----
add("case-900", "batch-3 baseline: all four claims",
  "Regression anchor for the batch.",
  doc1(text1(`${lit("Base")} Tj`), { Title: lit("T"), Author: lit("A") }),
  { outcome: "bounded_success",
    claims: { doc_text: "Base", doc_title: "T", doc_author: "A", doc_page_count: 1 } });

add("case-901", "/Filter as array -> unsupported-filter",
  "Only a bare /FlateDecode name is decoded (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter [/FlateDecode]", B(text1(`${lit("Hi")} Tj`)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "unsupported-filter" }] });

add("case-902", "/DecodeParms ignored, FlateDecode still decoded",
  "Decode parameters do not block extraction (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode /DecodeParms << /Predictor 1 >>", dz(B(text1(`${lit("Parms")} Tj`))))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Parms" } });

add("case-903", "blank lines between dict and stream keyword",
  "Whitespace before the keyword is tolerated.",
  (() => {
    const data = B(text1(`${lit("Blanks")} Tj`));
    const body = Buffer.concat([B(`<< /Length ${data.length} >>\n\n\nstream\n`), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Blanks" } });

add("case-904", "stream with CRLF -> works",
  "CRLF after the keyword is the spec form.",
  (() => {
    const data = B(text1(`${lit("CRLF")} Tj`));
    const body = Buffer.concat([B(`<< /Length ${data.length} >>\r\nstream\r\n`), data, B("\r\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "CRLF" } });

add("case-905", "stream with CR only -> works",
  "CR alone terminates the keyword line.",
  (() => {
    const data = B(text1(`${lit("CR")} Tj`));
    const body = Buffer.concat([B(`<< /Length ${data.length} >>\rstream\r`), data, B("\rendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "CR" } });

add("case-906", "obj without newline after obj keyword",
  "The scanner does not need the newline.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("Tight")} Tj`))],
    ];
    const pdf = buildPdf(objs).toString("latin1").replace(/(\d+ \d+ obj)\n/g, "$1");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Tight" } });

add("case-907", "non-ref kid entry -> bad-kid, siblings survive",
  "One bad kid does not poison the tree.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R 42] /Count 2 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("Sibling")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "Sibling", doc_page_count: 1 },
    required_quarantined: [{ reason: "bad-kid" }, { reason: "count-mismatch" }] });

add("case-908", "indirect /Count -> no mismatch check (documented)",
  "Only direct counts are compared.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 5 0 R >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("IndirCount")} Tj`))],
      [5, "99"],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "IndirCount", doc_page_count: 1 } });

add("case-909", "string /Count -> no mismatch check",
  "Non-numeric counts are not compared.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count (many) >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("StrCount")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "StrCount" } });

// ---- 910-919 ----
add("case-910", "Author as dict -> absent",
  "Structured metadata values never become strings.",
  doc1(text1(`${lit("x")} Tj`), { Author: "<< /N 1 >>" }),
  { outcome: "bounded_success", absent_claims: ["doc_author"] });

add("case-911", "literal with real newline preserved",
  "Newlines inside literals are data.",
  doc1(B("BT (Line1\nLine2) Tj ET").toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Line1\nLine2" } });

add("case-912", "UTF-16BE ASCII title",
  "BOM titles decode through UTF-16BE.",
  doc1(text1(`${lit("x")} Tj`), { Title: "<FEFF00480069>" }),
  { outcome: "bounded_success", claims: { doc_title: "Hi" } });

add("case-913", "hex title without BOM is latin1",
  "No BOM: bytes are WinAnsi-ish (documented).",
  doc1(text1(`${lit("x")} Tj`), { Title: "<4869>" }),
  { outcome: "bounded_success", claims: { doc_title: "Hi" } });

add("case-914", "positioning ops do not affect extraction",
  "Td/Tm move the pen, not the text.",
  doc1(`BT 100 200 Td ${lit("A")} Tj 0 -20 Td ${lit("B")} Tj ET`),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

add("case-915", "T* with empty stack -> bare newline",
  "Line moves with no pending string still break the line.",
  doc1(`BT ${lit("A")} Tj T* ET`),
  { outcome: "bounded_success", claims: { doc_text: "A\n" } });

add("case-916", "TJ of numbers only -> no text claim",
  "Kerning numbers are not text.",
  doc1(`BT [100 200] TJ ET`),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-917", "consecutive TJ ops concatenate",
  "Text showing ops join in order.",
  doc1(`BT [(A)] TJ [(B)] TJ ET`),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

add("case-918", "single-quote op shows with newline",
  "' is a text-showing op (documented).",
  doc1(`BT 10 20 ${lit("C")} ' ET`),
  { outcome: "bounded_success", claims: { doc_text: "\nC" } });

add("case-919", "double-quote op with escapes in string",
  "Escapes resolve before the op shows.",
  doc1(B(`BT 0 (a) 0 (x\\ny) " ET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "\nx\ny" } });

// ---- 920-929 ----
add("case-920", "\"endobj\" inside stream data -> object end via endstream",
  "Stream-aware object bounds (documented).",
  doc1(text1(`${lit("a endobj b")} Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "a endobj b" } });

add("case-921", "\"stream\" inside stream data does not confuse the keyword",
  "Keyword search is dict-bounded (documented).",
  doc1(text1(`${lit("A stream B")} Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A stream B" } });

add("case-922", "two good contents streams concatenate",
  "Multi-stream pages join in order.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents [4 0 R 5 0 R] >>"],
      [4, streamObj("", text1(`${lit("AB1")} Tj`))],
      [5, streamObj("", text1(`${lit("AB2")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "AB1AB2" } });

add("case-923", "missing /MediaBox -> still extracts",
  "MediaBox is not load-bearing for text.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("NoBox")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "NoBox" } });

add("case-924", "/Rotate ignored",
  "Rotation does not change the text.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Rotate 90 /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("Rot")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "Rot" } });

add("case-925", "/CreationDate not claimed",
  "Only title/author metadata become claims (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("x")} Tj`))],
      [6, "<< /CreationDate (D:20260101) /ModDate (D:20260202) >>"],
    ];
    return buildPdf(objs, { infoRef: "6 0 R" });
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_title", "doc_author"] });

add("case-926", "trailer /ID ignored",
  "Trailer IDs are not claims.",
  doc1(text1(`${lit("IdOk")} Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "IdOk" } });

add("case-927", "unused /ObjStm ignored",
  "Object streams are out of scope (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("ObjStmOk")} Tj`))],
      [8, "<< /Type /ObjStm /N 2 /First 10 >>\nstream\n1 0 2 20\nendstream"],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "ObjStmOk" } });

add("case-928", "%PDF-2.0 accepted",
  "PDF 2.x headers are in scope.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("V2")} Tj`))],
  ], { version: "2.0" }),
  { outcome: "bounded_success", claims: { doc_text: "V2" } });

add("case-929", "%PDF-3.0 -> INVALID_PAYLOAD",
  "Only 1.x/2.x headers are accepted.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
  ], { version: "3.0" }),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-header" });

// ---- 930-939 ----
add("case-930", "junk before %PDF within 1024 bytes -> accepted",
  "The header is searched, not assumed at offset 0.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("JunkOk")} Tj`))],
  ], { prefix: "% junk line\n% more junk\n" }),
  { outcome: "bounded_success", claims: { doc_text: "JunkOk" } });

add("case-931", "%PDF beyond 1024 bytes -> INVALID_PAYLOAD",
  "The header search is bounded (D3).",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
  ], { prefix: " ".repeat(2000) }),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-header" });

add("case-932", "empty file -> INVALID_PAYLOAD",
  "Empty input is not a document.",
  B(""),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-header" });

add("case-933", "/Length overshoot -> length-mismatch quarantine",
  "Declared length beyond endstream is untrusted.",
  (() => {
    const data = B(text1(`${lit("Over")} Tj`));
    const body = Buffer.concat([B(`<< /Length ${data.length + 500} >>\nstream\n`), data, B("\nendstream")]);
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

add("case-934", "/Length exactly to endstream -> works (boundary)",
  "Declared == available is the valid boundary.",
  (() => {
    const data = B(text1(`${lit("Exact")} Tj`));
    const body = Buffer.concat([B(`<< /Length ${data.length} >>\nstream\n`), data, B("\nendstream")]);
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, body],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Exact" } });

add("case-935", "/Count 0 with 1 kid -> count-mismatch",
  "Zero is a claim like any other number.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 0 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("OneKid")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "OneKid", doc_page_count: 1 },
    required_quarantined: [{ reason: "count-mismatch" }] });

add("case-936", "direct-dict Pages node walked",
  "Inline intermediate nodes resolve.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages << /Type /Pages /Kids [3 0 R] /Count 1 >> >>"],
    [3, "<< /Type /Page /Parent 9 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("InlinePages")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "InlinePages", doc_page_count: 1 } });

add("case-937", "duplicate page ref -> circular quarantine, counted once",
  "Reused refs do not double-count pages.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R 3 0 R] /Count 2 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("Dup")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "Dup", doc_page_count: 1 },
    exact_claims: { doc_text: 1 },
    required_quarantined: [{ reason: "circular-pages" }, { reason: "count-mismatch" }] });

add("case-938", "\\n escape -> newline",
  "Standard escapes decode.",
  doc1(text1(`(A\\nB) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A\nB" } });

add("case-939", "\\t escape -> tab",
  "Tab escape decodes.",
  doc1(text1(`(A\\tB) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A\tB" } });

// ---- 940-949 ----
add("case-940", "double backslash -> one backslash",
  "Escaped backslash collapses.",
  doc1(text1(`(A\\\\B) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A\\B" } });

add("case-941", "octal \\101 -> A",
  "Octal escapes decode.",
  doc1(text1(`(\\101) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "A" } });

add("case-942", "mixed-case hex",
  "Hex digits are case-insensitive.",
  doc1(text1(`<4a4B> Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "JK" } });

add("case-943", "empty hex -> no text claim",
  "Empty strings show nothing.",
  doc1(text1(`<> Tj`)),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-944", "empty TJ array -> no text claim",
  "Empty arrays show nothing.",
  doc1(`BT [] TJ ET`),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-945", "whitespace-only stream -> no text claim",
  "Blank pages stay silent.",
  doc1(`   \n  `),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-946", "4096-char title kept (boundary)",
  "At-cap metadata is kept without the flag.",
  doc1(text1(`${lit("x")} Tj`), { Title: lit("t".repeat(4096)) }),
  { outcome: "bounded_success", claims: { doc_title: "t".repeat(4096) } });

add("case-947", "FlateDecode of non-zlib data -> inflate-failed",
  "Corrupt compressed streams quarantine.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode", B("this is not zlib data at all"))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "inflate-failed" }] });

add("case-948", "/ASCII85Decode -> unsupported-filter",
  "ASCII85 is out of scope (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /ASCII85Decode", B(text1(`${lit("Hi")} Tj`)))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "unsupported-filter" }] });

add("case-949", "pdf kitchen sink 3 -> exact claim set",
  "Three pages, plain+flate, dangling ref, lying count.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 7 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>"],
      [4, "<< /Type /Page /Parent 2 0 R /Contents 7 0 R >>"],
      [5, "<< /Type /Page /Parent 2 0 R /Contents 99 0 R >>"],
      [6, streamObj("", text1(`${lit("S3A")} Tj`))],
      [7, streamObj("/Filter /FlateDecode", dz(B(text1(`[(S) 20 (3B)] TJ`))))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success",
    exact_claims: { doc_text: 2, doc_page_count: 1 },
    required_quarantined: [{ reason: "bad-ref" }, { reason: "count-mismatch" }],
    claims: { doc_text: "S3A" }, forbidden_values: ["S 3B"] });

// ---- manifest: missions ACQ-1051..ACQ-1100 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.bytes).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1051 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.bytes.length, expect: c.expect };
});
const manifest3 = manifest;

export { C, manifest, manifest3 };
export function getCase(id) { return C.find((c) => c.id === id); }
