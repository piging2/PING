#!/usr/bin/env node
// documents-pdf fixture lab, batch 4: cases 950-999 (missions ACQ-1101..ACQ-1150).
// Fourth adversarial wave: inline images, dict games, xref-less PDFs,
// numbering edges, operand type errors. Same doctrine.
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

// ---- 950-959 ----
add("case-950", "batch-4 baseline",
  "Regression anchor.",
  doc1(text1(`${lit("B4")} Tj`), { Title: lit("T4") }),
  { outcome: "bounded_success", claims: { doc_text: "B4", doc_title: "T4" } });

add("case-951", "inline image skipped, surrounding text kept",
  "ID..EI binary data is opaque (documented).",
  doc1(B(`BT (A) Tj ET\nBI /W 1 /H 1 /CS /G /BPC 1 ID \x00\xff EI\nBT (B) Tj ET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

add("case-952", "fake text ops inside image data ignored",
  "Hostile bytes in ID..EI never become claims.",
  doc1(B(`BT (Real) Tj ET\nBI /W 2 ID (FAKE) Tj EI\nBT (End) Tj ET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "RealEnd" }, forbidden_values: ["FAKE"] });

add("case-953", "unterminated inline image -> rest skipped safely",
  "No EI: the image swallows the tail, no crash.",
  doc1(B(`BT (Before) Tj ET\nBI /W 1 ID \x00\x01\x02`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Before" } });

add("case-954", "/Contents as direct dict -> bad-contents",
  "Content streams must be indirect objects.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents << /Length 4 >> >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "bad-contents" }] });

add("case-955", "/Root pointing at Pages dict -> no-catalog",
  "/Root must be a Catalog (documented).",
  (() => {
    const chunks = [];
    chunks.push(B("%PDF-1.4\n"));
    chunks.push(B("2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n"));
    chunks.push(B("trailer\n<< /Size 3 /Root 2 0 R >>\nstartxref\n0\n%%EOF"));
    return Buffer.concat(chunks);
  })(),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "no-catalog" });

add("case-956", "triple-nested TJ array -> skipped",
  "Deep nesting is malformed: no text from it.",
  doc1(text1(`[[[(A)]]] TJ`)),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-957", "TJ with name element -> name skipped, strings kept",
  "Non-string TJ elements never become text.",
  doc1(text1(`[(A) /Name (B)] TJ`)),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

add("case-958", "Tj with numeric operand -> no text",
  "Numbers are not text-showing operands.",
  doc1(`BT 123 Tj ET`),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-959", "Tj with empty stack -> no crash, no text",
  "Stack underflow is safe (documented).",
  doc1(`BT Tj ET`),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

// ---- 960-969 ----
add("case-960", "no xref and no trailer -> scan fallback finds catalog",
  "Trailer/xref are hints, never load-bearing.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("NoXref")} Tj`))],
    ];
    return buildPdf(objs, { noXref: true, noTrailer: true });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "NoXref" } });

add("case-961", "leading-zero object numbers resolve",
  "007 0 obj is object 7.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [7 0 R] /Count 1 >>"],
      [7, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("LeadZero")} Tj`))],
    ];
    const pdf = buildPdf(objs).toString("latin1").replace("7 0 obj", "007 0 obj");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "LeadZero" } });

add("case-962", "indirect /Kids -> pages-without-kids",
  "/Kids must be a direct array (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids 5 0 R /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("X")} Tj`))],
      [5, "[3 0 R]"],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "pages-without-kids" }] });

add("case-963", "/Info as direct dict",
  "Inline Info dicts resolve.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("x")} Tj`))],
    ];
    const chunks = [];
    chunks.push(B("%PDF-1.4\n"));
    for (const [num, body] of objs) {
      chunks.push(B(`${num} 0 obj\n`)); chunks.push(B(body)); chunks.push(B(`\nendobj\n`));
    }
    chunks.push(B("trailer\n<< /Size 5 /Root 1 0 R /Info << /Title (DirectInfo) >> >>\nstartxref\n0\n%%EOF"));
    return Buffer.concat(chunks);
  })(),
  { outcome: "bounded_success", claims: { doc_title: "DirectInfo" } });

add("case-964", "100KB single literal extracts",
  "Large literals are bounded by the text cap, not refused.",
  doc1(text1(`${lit("q".repeat(102400))} Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "q".repeat(102400) } });

add("case-965", "page with /Annots -> annots ignored",
  "Annotations do not affect text claims.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Annots [9 0 R] /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("AnnotOk")} Tj`))],
    [9, "<< /Type /Annot /Subtype /Text /Contents (note) >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "AnnotOk" }, forbidden_values: ["note"] });

add("case-966", "catalog with /Lang and /MarkInfo -> ignored",
  "Catalog extras are not claims.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R /Lang (en) /MarkInfo << /Marked true >> >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("LangOk")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "LangOk" } });

add("case-967", "hex title <41> -> A",
  "Single-byte hex titles decode.",
  doc1(text1(`${lit("x")} Tj`), { Title: "<41>" }),
  { outcome: "bounded_success", claims: { doc_title: "A" } });

add("case-968", "empty Info dict -> no metadata claims",
  "Empty dicts claim nothing.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("x")} Tj`))],
      [6, "<< >>"],
    ];
    return buildPdf(objs, { infoRef: "6 0 R" });
  })(),
  { outcome: "bounded_success", absent_claims: ["doc_title", "doc_author"] });

add("case-969", "Info ref dangles -> no metadata, text survives",
  "Dangling Info is contained.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("InfoDangle")} Tj`))],
    ];
    return buildPdf(objs, { infoRef: "99 0 R" });
  })(),
  { outcome: "bounded_success", claims: { doc_text: "InfoDangle" },
    absent_claims: ["doc_title", "doc_author"] });

// ---- 970-979 ----
add("case-970", "object after %%EOF ignored",
  "Content past EOF is not parsed.",
  (() => {
    const good = doc1(text1(`${lit("BeforeEOF")} Tj`));
    return Buffer.concat([good, B("\n9 0 obj\n<< /Evil true >>\nendobj\n")]);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "BeforeEOF" } });

add("case-971", "comment lines between objects",
  "% comments outside objects are skipped.",
  (() => {
    const pdf = doc1(text1(`${lit("CommentOk")} Tj`)).toString("latin1")
      .replace("2 0 obj", "% a comment\n2 0 obj");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "CommentOk" } });

add("case-972", "/Type /Pages with no /Kids and no /Type label fallback",
  "Already covered; variant: Pages node with /Count only.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Count 0 >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "pages-without-kids" }] });

add("case-973", "stream dict key order irrelevant",
  "/Filter before /Length parses the same.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("/Filter /FlateDecode", dz(B(text1(`${lit("OrderOk")} Tj`))))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "OrderOk" } });

add("case-974", "content stream with only operators, no text",
  "Operators alone show nothing.",
  doc1(`BT /F1 12 Tf 72 720 Td ET`),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-975", "T* outside BT ignored",
  "Line ops outside text objects do nothing.",
  doc1(`T* BT ${lit("InT")} Tj ET`),
  { outcome: "bounded_success", claims: { doc_text: "InT" } });

add("case-976", "multiple spaces and tabs tokenize",
  "Whitespace runs are insignificant.",
  doc1(B(`BT\t/F1  12\tTf\r\n72   720\tTd  (Sp)  Tj  ET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Sp" } });

add("case-977", "literal with escaped backslash then escaped paren",
  "\\\\\\\\\\\\( is backslash + open-paren, not nesting.",
  doc1(text1(`(a\\\\\\(b) Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "a\\(b" } });

add("case-978", "hex with only whitespace -> empty -> no claim",
  "Blank hex shows nothing.",
  doc1(text1(`<  \n > Tj`)),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-979", "TJ with stray spaces [( A ) ] -> A",
  "Whitespace inside arrays is insignificant.",
  doc1(text1(`[ (A) ] TJ`)),
  { outcome: "bounded_success", claims: { doc_text: "A" } });

// ---- 980-989 ----
add("case-980", "two pages, second empty -> one text claim",
  "Empty pages stay silent; count still 2.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>"],
      [4, "<< /Type /Page /Parent 2 0 R /Contents 7 0 R >>"],
      [6, streamObj("", text1(`${lit("P1")} Tj`))],
      [7, streamObj("", "")],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 2 },
    exact_claims: { doc_text: 1 } });

add("case-981", "FlateDecode + /Length lie (overshoot) -> length-mismatch",
  "Length is checked before inflate (documented).",
  (() => {
    const z = dz(B(text1(`${lit("NoInflate")} Tj`)));
    const body = Buffer.concat([B(`<< /Filter /FlateDecode /Length ${z.length + 100} >>\nstream\n`), z, B("\nendstream")]);
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

add("case-982", "author with UTF-16BE BOM",
  "Author decodes like title.",
  doc1(text1(`${lit("x")} Tj`), { Author: "<FEFF0042006F0062>" }),
  { outcome: "bounded_success", claims: { doc_author: "Bob" } });

add("case-983", "title with trailing spaces kept",
  "Metadata is verbatim (documented).",
  doc1(text1(`${lit("x")} Tj`), { Title: lit("Spaced   ") }),
  { outcome: "bounded_success", claims: { doc_title: "Spaced   " } });

add("case-984", "page tree cycle A->B->A quarantined",
  "Two-node cycles are caught by the visited set.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [5 0 R] /Count 1 >>"],
      [5, "<< /Type /Pages /Parent 2 0 R /Kids [2 0 R] /Count 1 >>"],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "circular-pages" }] });

add("case-985", "self-referential /Pages kid",
  "Direct self-cycles are caught.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [2 0 R] /Count 1 >>"],
  ]),
  { outcome: "bounded_success", claims: { doc_page_count: 0 },
    required_quarantined: [{ reason: "circular-pages" }, { reason: "count-mismatch" }] });

add("case-986", "/Count negative -> count-mismatch",
  "Negative counts never match traversal.",
  buildPdf([
    [1, "<< /Type /Catalog /Pages 2 0 R >>"],
    [2, "<< /Type /Pages /Kids [3 0 R] /Count -1 >>"],
    [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
    [4, streamObj("", text1(`${lit("NegCount")} Tj`))],
  ]),
  { outcome: "bounded_success", claims: { doc_text: "NegCount", doc_page_count: 1 },
    required_quarantined: [{ reason: "count-mismatch" }] });

add("case-987", "huge generation number works",
  "Generations are opaque identity.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("BigGen")} Tj`))],
    ];
    const pdf = buildPdf(objs).toString("latin1")
      .replace("4 0 obj", "4 65535 obj").replace("4 0 R >>", "4 65535 R >>");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "BigGen" } });

add("case-988", "content ref with generation mismatch on stream only",
  "Page resolves; stream dangles (partial).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 9 R >>"],
      [4, streamObj("", text1(`${lit("GenDangle")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"],
    required_quarantined: [{ reason: "bad-ref" }] });

add("case-989", "TJ number between strings ignored",
  "Kerning between strings does not split them.",
  doc1(text1(`[(A) 120 (B)] TJ`)),
  { outcome: "bounded_success", claims: { doc_text: "AB" } });

// ---- 990-999 ----
add("case-990", "BT without ET to end of stream",
  "Unterminated text object still shows its text.",
  doc1(`BT ${lit("NoET")} Tj`),
  { outcome: "bounded_success", claims: { doc_text: "NoET" } });

add("case-991", "literal split across stream chunks is one literal",
  "Tokenizing sees the whole stream.",
  doc1(text1(`${lit("Whole")} Tj`)),
  { outcome: "bounded_success", claims: { doc_text: "Whole" } });

add("case-992", "operator case sensitivity: tj != Tj",
  "Lowercase tj is not a text op (documented).",
  doc1(`BT ${lit("No")} tj ET`),
  { outcome: "bounded_success", claims: { doc_page_count: 1 }, absent_claims: ["doc_text"] });

add("case-993", "dict with duplicate keys -> last wins (documented)",
  "Duplicate dict keys keep the latest.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Contents 7 0 R >>"],
      [4, streamObj("", text1(`${lit("First")} Tj`))],
      [7, streamObj("", text1(`${lit("Second")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Second" }, forbidden_values: ["First"] });

add("case-994", "odd font name tokenizes safely",
  "Unusual names never break the tokenizer.",
  doc1(`BT /F#231 12 Tf ${lit("HashName")} Tj ET`),
  { outcome: "bounded_success", claims: { doc_text: "HashName" } });

add("case-995", "comment inside content stream",
  "% comments never become text or ops.",
  doc1(B(`BT % set font\n/F1 12 Tf % size\n${lit("Cmt")} Tj % show\nET`).toString("latin1")),
  { outcome: "bounded_success", claims: { doc_text: "Cmt" } });

add("case-996", "form XObject not descended into",
  "Only page content streams are read (documented).",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /XObject << /Fm1 8 0 R >> >> >>"],
      [4, streamObj("", `BT ${lit("Page")} Tj /Fm1 Do`)],
      [8, streamObj("/Type /XObject /Subtype /Form", text1(`${lit("FormHidden")} Tj`))],
    ];
    return buildPdf(objs);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "Page" }, forbidden_values: ["FormHidden"] });

add("case-997", "two trailers, second adds Info",
  "Last trailer wins for Info too.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("TwoTr")} Tj`))],
      [6, "<< /Title (Late) >>"],
    ];
    return buildPdf(objs, { append: B("\ntrailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n0\n%%EOF") });
  })(),
  { outcome: "bounded_success", claims: { doc_title: "Late", doc_text: "TwoTr" } });

add("case-998", "startxref garbage -> ignored (scan fallback)",
  "startxref is never load-bearing.",
  (() => {
    const pdf = buildPdf([
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>"],
      [4, streamObj("", text1(`${lit("XrefOk")} Tj`))],
    ]).toString("latin1").replace(/startxref\n\d+/, "startxref\nnotanumber");
    return B(pdf);
  })(),
  { outcome: "bounded_success", claims: { doc_text: "XrefOk" } });

add("case-999", "pdf kitchen sink 4 -> exact claim set",
  "Inline image with fake text, flate page, lying count, late trailer Info.",
  (() => {
    const objs = [
      [1, "<< /Type /Catalog /Pages 2 0 R >>"],
      [2, "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 5 >>"],
      [3, "<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>"],
      [4, "<< /Type /Page /Parent 2 0 R /Contents 7 0 R >>"],
      [6, streamObj("", B(`BT (K4A) Tj ET\nBI /W 1 ID (HIDDEN) Tj EI\nBT (K4B) Tj ET`).toString("latin1"))],
      [7, streamObj("/Filter /FlateDecode", dz(B(text1(`[(K4C)] TJ`))))],
      [9, "<< /Title (Sink4) >>"],
    ];
    const pdf = buildPdf(objs);
    return Buffer.concat([pdf, B("\ntrailer\n<< /Size 10 /Root 1 0 R /Info 9 0 R >>\nstartxref\n0\n%%EOF")]);
  })(),
  { outcome: "bounded_success",
    exact_claims: { doc_text: 2, doc_page_count: 1 },
    required_quarantined: [{ reason: "count-mismatch" }],
    claims: { doc_title: "Sink4", doc_text: "K4AK4B" },
    forbidden_values: ["HIDDEN"] });

// ---- manifest: missions ACQ-1101..ACQ-1150 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.bytes).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1101 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.bytes.length, expect: c.expect };
});
const manifest4 = manifest;

export { C, manifest, manifest4 };
export function getCase(id) { return C.find((c) => c.id === id); }
