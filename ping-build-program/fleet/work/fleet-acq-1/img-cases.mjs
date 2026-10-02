#!/usr/bin/env node
// image-metadata fixture lab, batch 1: case-img-0..49 (missions ACQ-1151..ACQ-1200).
// Adversarial PNG/JPEG metadata fixtures for img-harness.mjs. Doctrine:
// never turn parser guess into fact; hostile bytes get typed lane-K
// failures, bounded extraction with provenance, or quarantine.
import { createHash } from "node:crypto";
import { deflateSync as dz } from "node:zlib";

const C = [];
const add = (id, title, threat, bytes, expect) => C.push({ id, title, threat, bytes, expect });

// ---- shared builders ----
const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC_T[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pchunk = (type, data, badCrc = false) => {
  const td = Buffer.from(type, "latin1");
  const L = Buffer.alloc(4); L.writeUInt32BE(data.length);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(badCrc ? (crc32(Buffer.concat([td, data])) ^ 0xdeadbeef) >>> 0 : crc32(Buffer.concat([td, data])));
  return Buffer.concat([L, td, data, c]);
};
const pbuild = (...chunks) => Buffer.concat([PNG_MAGIC, ...chunks]);
const ihdr = (w, h, bd = 8, ct = 2) => {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4);
  b[8] = bd; b[9] = ct; b[10] = 0; b[11] = 0; b[12] = 0;
  return b;
};
const textChunk = (kw, text) => Buffer.concat([Buffer.from(kw + "\0", "latin1"), Buffer.from(text, "latin1")]);
const itxt = (kw, textUtf8, { compressed = false, badMethod = null } = {}) => {
  let payload = Buffer.from(textUtf8, "utf8");
  let flag = 0, method = 0;
  if (compressed) { flag = 1; payload = dz(payload); }
  if (badMethod !== null) { flag = 1; method = badMethod; }
  return Buffer.concat([Buffer.from(kw + "\0", "latin1"), Buffer.from([flag, method, 0, 0]), payload]);
};
const ztxt = (kw, text, { badMethod = false } = {}) =>
  Buffer.concat([Buffer.from(kw + "\0", "latin1"), Buffer.from([badMethod ? 9 : 0]), dz(Buffer.from(text, "latin1"))]);

const jseg = (marker, data) => {
  const L = Buffer.alloc(2); L.writeUInt16BE(data.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), L, data]);
};
const SOI = Buffer.from([0xff, 0xd8]), EOI = Buffer.from([0xff, 0xd9]);
const jbuild = (...segs) => Buffer.concat([SOI, ...segs, EOI]);
const sof = (w, h) => {
  const d = Buffer.alloc(8);
  d[0] = 8; d.writeUInt16BE(h, 1); d.writeUInt16BE(w, 3); d[5] = 1; d[6] = 0x11; d[7] = 0;
  return d;
};
const JFIF = Buffer.concat([Buffer.from("JFIF\0", "latin1"), Buffer.from([1, 2, 0, 0, 1, 0, 1, 0, 0])]);

// EXIF builder (little-endian default). entries: {tag, str} or {tag, type, count, value}.
function exifBlock(entries, le = true) {
  const n = entries.length;
  const ifdLen = 2 + n * 12 + 4;
  const ifd = Buffer.alloc(ifdLen);
  const w16 = (o, v) => le ? ifd.writeUInt16LE(v, o) : ifd.writeUInt16BE(v, o);
  const w32 = (o, v) => le ? ifd.writeUInt32LE(v, o) : ifd.writeUInt32BE(v, o);
  w16(0, n);
  let strPos = 8 + ifdLen;
  const strs = [];
  entries.forEach((e, i) => {
    const eo = 2 + i * 12;
    if (e.str !== undefined) {
      const sb = Buffer.from(e.str + "\0", "latin1");
      w16(eo, e.tag); w16(eo + 2, 2); w32(eo + 4, sb.length);
      if (sb.length <= 4) sb.copy(ifd, eo + 8);
      else { w32(eo + 8, strPos); strs.push({ pos: strPos, buf: sb }); strPos += sb.length; }
    } else {
      w16(eo, e.tag); w16(eo + 2, e.type); w32(eo + 4, e.count); w32(eo + 8, e.value);
    }
  });
  w32(2 + n * 12, 0);
  const hdr = Buffer.alloc(8);
  hdr.write(le ? "II" : "MM", 0, 2, "latin1");
  if (le) { hdr.writeUInt16LE(42, 2); hdr.writeUInt32LE(8, 4); }
  else { hdr.writeUInt16BE(42, 2); hdr.writeUInt32BE(8, 4); }
  const tiff = Buffer.alloc(strPos);
  hdr.copy(tiff, 0); ifd.copy(tiff, 8);
  for (const s of strs) s.buf.copy(tiff, s.pos);
  return Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
}
const exifSeg = (entries, le = true) => jseg(0xe1, exifBlock(entries, le));

// ---- PNG: baseline + text ----
add("case-img-0", "png baseline",
  "Regression anchor.",
  pbuild(pchunk("IHDR", ihdr(32, 16)), pchunk("tEXt", textChunk("Title", "Hello")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_format: "png", img_width: 32, img_height: 16, img_title: "Hello" } });

add("case-img-1", "png tEXt typed fields",
  "Author/Description/Comment/Software map to typed claims.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("tEXt", textChunk("Author", "Ann")),
    pchunk("tEXt", textChunk("Description", "A test image")),
    pchunk("tEXt", textChunk("Comment", "hi")),
    pchunk("tEXt", textChunk("Software", "imglab")),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success",
    claims: { img_author: "Ann", img_description: "A test image", img_comment: "hi", img_software: "imglab" } });

add("case-img-2", "png unknown keyword -> img_text",
  "Unmapped keywords stay generic with keyword in provenance.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("MyKeyword", "v1")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_text: "v1" }, absent_claims: ["img_title"] });

add("case-img-3", "png iTXt uncompressed utf-8",
  "iTXt text is UTF-8 by spec.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("iTXt", itxt("Title", "Café ☕")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "Café ☕" } });

add("case-img-4", "png iTXt compressed",
  "Deflate iTXt inflates within cap.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("iTXt", itxt("Description", "compressed desc", { compressed: true })), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_description: "compressed desc" } });

add("case-img-5", "png zTXt",
  "zTXt inflates within cap.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("zTXt", ztxt("Comment", "zipped note")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_comment: "zipped note" } });

// ---- PNG: corruption ----
add("case-img-6", "png tEXt bad crc -> quarantined, no claim",
  "Corrupt chunk bytes are untrusted.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("Title", "Lie"), true), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8, img_height: 8 },
    absent_claims: ["img_title"], required_quarantined: [{ reason: "crc-mismatch" }],
    forbidden_values: ["Lie"] });

add("case-img-7", "png IHDR bad crc -> no dimensions",
  "Corrupt IHDR contributes no dimension claims.",
  pbuild(pchunk("IHDR", ihdr(8, 8), true), pchunk("tEXt", textChunk("Title", "T")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "T" },
    absent_claims: ["img_width", "img_height"], required_quarantined: [{ reason: "crc-mismatch" }] });

add("case-img-8", "png truncated mid-chunk",
  "Declared length past EOF: bounded, dims kept.",
  (() => {
    const good = pbuild(pchunk("IHDR", ihdr(8, 8)));
    const td = Buffer.from("tEXt", "latin1");
    const L = Buffer.alloc(4); L.writeUInt32BE(100);
    return Buffer.concat([good, L, td, Buffer.from("short", "latin1")]);
  })(),
  { outcome: "bounded_success", claims: { img_width: 8, img_height: 8 },
    required_quarantined: [{ reason: "truncated" }] });

add("case-img-9", "png magic only",
  "No chunks: format known, everything else quarantined.",
  PNG_MAGIC,
  { outcome: "bounded_success", claims: { img_format: "png" },
    absent_claims: ["img_width", "img_height"],
    required_quarantined: [{ reason: "missing-ihdr" }, { reason: "missing-iend" }] });

add("case-img-10", "png zero width -> invalid-dimensions",
  "Zero is not a dimension.",
  pbuild(pchunk("IHDR", ihdr(0, 8)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width", "img_height"],
    required_quarantined: [{ reason: "invalid-dimensions" }] });

add("case-img-11", "png huge dimensions -> invalid-dimensions",
  "200000px exceeds the dimension cap; never claimed.",
  pbuild(pchunk("IHDR", ihdr(200000, 10)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "invalid-dimensions" }], forbidden_values: ["200000"] });

add("case-img-12", "png bad bit depth -> invalid-ihdr",
  "Bit depth 7 exists nowhere in the spec.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 7, 2)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "invalid-ihdr" }] });

add("case-img-13", "png duplicate IHDR -> first wins",
  "Second IHDR is quarantined, never merged.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("IHDR", ihdr(99, 99)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8, img_height: 8 },
    required_quarantined: [{ reason: "duplicate-ihdr" }], forbidden_values: ["99"] });

add("case-img-14", "png tEXt before IHDR -> misordered but read",
  "Ordering violation quarantined; bytes still readable.",
  pbuild(pchunk("tEXt", textChunk("Title", "Early")), pchunk("IHDR", ihdr(8, 8)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "Early", img_width: 8 },
    required_quarantined: [{ reason: "misordered-chunk" }] });

add("case-img-15", "png tEXt empty keyword -> bad-keyword",
  "No keyword, no claim.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", Buffer.concat([Buffer.from([0]), Buffer.from("v", "latin1")])), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_title", "img_text"],
    required_quarantined: [{ reason: "bad-keyword" }] });

add("case-img-16", "png tEXt 80-char keyword -> bad-keyword",
  "Spec caps keywords at 79 chars.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("k".repeat(80), "v")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_text"],
    required_quarantined: [{ reason: "bad-keyword" }] });

add("case-img-17", "png iTXt bad compression method -> unsupported",
  "Method 9 is not deflate; no guessing.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("iTXt", itxt("Title", "x", { badMethod: 9 })), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_title"],
    required_quarantined: [{ reason: "unsupported-compression" }] });

add("case-img-18", "png zTXt decompression bomb -> PERMANENT",
  "2MB of 'A' from a small blob: terminal, no claims leak.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("zTXt", Buffer.concat([Buffer.from("Comment\0\x00", "latin1"), dz(Buffer.alloc(2000000, 65))])), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "decompression-bomb" });

add("case-img-19", "png iTXt invalid utf-8 -> bad-utf8",
  "Replacement characters would be a guess; skip instead.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("iTXt", Buffer.concat([Buffer.from("Title\0\x00\x00\x00\x00", "latin1"), Buffer.from([0xff, 0xfe, 0x41])])),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_title"],
    required_quarantined: [{ reason: "bad-utf8" }] });

add("case-img-20", "png unknown ancillary chunk skipped",
  "Private chunks are extensible by design; ignore.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("abCD", Buffer.from("whatever", "latin1")),
    pchunk("tEXt", textChunk("Title", "Ok")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "Ok", img_width: 8 } });

add("case-img-21", "png duplicate Title -> two claims",
  "Repeated keywords each get their own claim.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("tEXt", textChunk("Title", "One")), pchunk("tEXt", textChunk("Title", "Two")),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", exact_claims: { img_title: 2 } });

add("case-img-22", "png 2MB tEXt -> truncated and flagged",
  "Over-long text truncates with an explicit flag, never silently.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("Title", "q".repeat(2 * 1024 * 1024))), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "q".repeat(1024 * 1024) },
    required_truncated: ["text"], required_quarantined: [{ reason: "text-too-long" }] });

add("case-img-23", "png IHDR length 12 -> bad-ihdr-length",
  "Short IHDR is malformed, not parseable.",
  (() => {
    const short = Buffer.alloc(12); short.writeUInt32BE(8, 0); short.writeUInt32BE(8, 4);
    short[8] = 8; short[9] = 2;
    return pbuild(pchunk("IHDR", short), pchunk("IEND", Buffer.alloc(0)));
  })(),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "bad-ihdr-length" }] });

add("case-img-24", "png non-alpha chunk type -> bad-chunk-type",
  "Chunk types are 4 ASCII letters; anything else ends parsing.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("AB\x01D", Buffer.from("x", "latin1")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 },
    required_quarantined: [{ reason: "bad-chunk-type" }] });

// ---- not images / unsupported ----
add("case-img-25", "garbage bytes -> INVALID_PAYLOAD",
  "Not magic, not an image.",
  Buffer.from("hello world this is not an image", "latin1"),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-image" });

add("case-img-26", "empty input -> INVALID_PAYLOAD",
  "Zero bytes.",
  Buffer.alloc(0),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-input" });

add("case-img-27", "gif -> UNSUPPORTED",
  "GIF is outside the claim surface.",
  Buffer.from("GIF89a\x01\x00\x01\x00\x00\x00\x00;", "latin1"),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-format" });

add("case-img-28", "bmp -> UNSUPPORTED",
  "BMP is outside the claim surface.",
  Buffer.from("BM\x36\x00\x00\x00\x00\x00\x00\x00", "latin1"),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-format" });

add("case-img-29", "webp -> UNSUPPORTED",
  "RIFF/WEBP is outside the claim surface.",
  Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBP", "latin1")]),
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unsupported-format" });

add("case-img-30", "png no IEND -> missing-iend",
  "Clean EOF without IEND: dims kept, flagged.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("Title", "NoEnd"))),
  { outcome: "bounded_success", claims: { img_title: "NoEnd", img_width: 8 },
    required_quarantined: [{ reason: "missing-iend" }] });

// ---- JPEG ----
add("case-img-31", "jpeg baseline",
  "SOI/APP0/SOF0/SOS/EOI: format and dims.",
  jbuild(jseg(0xe0, JFIF), jseg(0xc0, sof(64, 48)), jseg(0xda, Buffer.from([0, 1, 1, 0, 0, 63, 0], "latin1"))),
  { outcome: "bounded_success", claims: { img_format: "jpeg", img_width: 64, img_height: 48 } });

add("case-img-32", "jpeg exif little-endian",
  "IFD0 ASCII tags map to typed claims.",
  jbuild(
    exifSeg([{ tag: 0x010f, str: "CamCo" }, { tag: 0x0110, str: "X100" }, { tag: 0x0131, str: "Soft1" },
             { tag: 0x010e, str: "A pic" }, { tag: 0x013b, str: "Ann" }, { tag: 0x8298, str: "(c) 2026" }]),
    jseg(0xc0, sof(10, 20))),
  { outcome: "bounded_success",
    claims: { img_make: "CamCo", img_model: "X100", img_software: "Soft1",
              img_description: "A pic", img_author: "Ann", img_copyright: "(c) 2026",
              img_width: 10, img_height: 20 } });

add("case-img-33", "jpeg exif big-endian",
  "MM byte order parses identically.",
  jbuild(exifSeg([{ tag: 0x010f, str: "BigCam" }, { tag: 0x0110, str: "B1" }], false), jseg(0xc0, sof(10, 20))),
  { outcome: "bounded_success", claims: { img_make: "BigCam", img_model: "B1" } });

add("case-img-34", "jpeg exif gps skipped",
  "GPS sub-IFD is never descended (privacy boundary).",
  (() => {
    const gpsBlob = Buffer.from("GPS IFD would live here: 37.7749N 122.4194W", "latin1");
    const exif = exifBlock([{ tag: 0x010f, str: "CamCo" }, { tag: 0x8825, type: 4, count: 1, value: 9999 }]);
    return jbuild(jseg(0xe1, Buffer.concat([exif, gpsBlob])), jseg(0xc0, sof(10, 20)));
  })(),
  { outcome: "bounded_success", claims: { img_make: "CamCo" },
    forbidden_values: ["37.7749", "122.4194"] });

add("case-img-35", "jpeg exif bad ifd offset -> bad-offset",
  "IFD pointer outside APP1: EXIF dropped, SOF dims kept.",
  (() => {
    const exif = exifBlock([{ tag: 0x010f, str: "CamCo" }]);
    exif.writeUInt32LE(0xffffff, 10); // TIFF IFD offset -> far away
    return jbuild(jseg(0xe1, exif), jseg(0xc0, sof(10, 20)));
  })(),
  { outcome: "bounded_success", claims: { img_width: 10, img_height: 20 },
    absent_claims: ["img_make"], required_quarantined: [{ reason: "bad-offset" }] });

add("case-img-36", "jpeg xmp app1 skipped",
  "XMP is XML: another family's problem.",
  jbuild(jseg(0xe1, Buffer.concat([Buffer.from("http://ns.adobe.com/xap/1.0/\0", "latin1"), Buffer.from("<x:xmpmeta/>", "latin1")])), jseg(0xc0, sof(10, 20))),
  { outcome: "bounded_success", claims: { img_width: 10, img_height: 20 },
    absent_claims: ["img_title", "img_description"] });

add("case-img-37", "jpeg COM -> img_comment",
  "COM segments are latin1 text.",
  jbuild(jseg(0xfe, Buffer.from("Nice shot", "latin1")), jseg(0xc0, sof(10, 20))),
  { outcome: "bounded_success", claims: { img_comment: "Nice shot" } });

add("case-img-38", "jpeg truncated mid-segment",
  "Segment runs past EOF: bounded.",
  (() => {
    const L = Buffer.alloc(2); L.writeUInt16BE(500);
    return Buffer.concat([SOI, Buffer.from([0xff, 0xe0]), L, Buffer.from("short", "latin1")]);
  })(),
  { outcome: "bounded_success", claims: { img_format: "jpeg" },
    required_quarantined: [{ reason: "truncated" }] });

add("case-img-39", "jpeg soi+eoi only",
  "Format known, no dimensions anywhere.",
  Buffer.concat([SOI, EOI]),
  { outcome: "bounded_success", claims: { img_format: "jpeg" }, absent_claims: ["img_width"] });

add("case-img-40", "jpeg sof zero height -> invalid-dimensions",
  "Zero is not a dimension, in JPEG either.",
  jbuild(jseg(0xc0, sof(10, 0))),
  { outcome: "bounded_success", absent_claims: ["img_width", "img_height"],
    required_quarantined: [{ reason: "invalid-dimensions" }] });

add("case-img-41", "jpeg segment length 1 -> bad-segment",
  "Lengths under 2 cannot exist; stop.",
  Buffer.concat([SOI, Buffer.from([0xff, 0xe0, 0x00, 0x01]), EOI]),
  { outcome: "bounded_success", claims: { img_format: "jpeg" },
    required_quarantined: [{ reason: "bad-segment" }] });

add("case-img-42", "jpeg app1 non-exif skipped",
  "Unknown APP1 payloads are not EXIF.",
  jbuild(jseg(0xe1, Buffer.from("http://example.com/custom\0data", "latin1")), jseg(0xc0, sof(10, 20))),
  { outcome: "bounded_success", claims: { img_width: 10 } });

add("case-img-43", "jpeg exif inline ascii value",
  "Values of 4 bytes or fewer live in the entry itself.",
  jbuild(exifSeg([{ tag: 0x010f, str: "AB" }]), jseg(0xc0, sof(10, 20))),
  { outcome: "bounded_success", claims: { img_make: "AB" } });

add("case-img-44", "jpeg exif value offset past end -> bad-offset",
  "Offset lies are caught before any read.",
  (() => {
    const exif = exifBlock([{ tag: 0x010f, str: "LongMakeName123" }]);
    // entry 0 value-offset field: exif[6 tiff + 8 hdr + 2 count + 8] = byte 24
    exif.writeUInt32LE(0xffffff, 24);
    return jbuild(jseg(0xe1, exif), jseg(0xc0, sof(10, 20)));
  })(),
  { outcome: "bounded_success", claims: { img_width: 10 },
    absent_claims: ["img_make"], required_quarantined: [{ reason: "bad-offset" }] });

add("case-img-45", "jpeg progressive sof2 -> dims",
  "SOF2 carries dimensions like SOF0.",
  jbuild(jseg(0xc2, sof(10, 20))),
  { outcome: "bounded_success", claims: { img_width: 10, img_height: 20 } });

add("case-img-46", "jpeg sos then garbage -> stop at sos",
  "Entropy data is opaque; parsing ends at SOS.",
  Buffer.concat([SOI, jseg(0xc0, sof(10, 20)), jseg(0xda, Buffer.from([0, 1, 1, 0, 0, 63, 0], "latin1")), Buffer.from("GARBAGEGARBAGE", "latin1")]),
  { outcome: "bounded_success", claims: { img_width: 10, img_height: 20 } });

// ---- kitchen sinks ----
add("case-img-47", "png kitchen sink -> exact claim set",
  "Good text + compressed iTXt + corrupt chunk + missing IEND.",
  pbuild(
    pchunk("IHDR", ihdr(5, 5)),
    pchunk("tEXt", textChunk("Title", "K1")),
    pchunk("tEXt", textChunk("Author", "Au1")),
    pchunk("iTXt", itxt("Description", "Desc1", { compressed: true })),
    pchunk("tEXt", textChunk("Comment", "Hidden"), true),
    pchunk("zTXt", ztxt("Software", "Sw1"))),
  { outcome: "bounded_success",
    claims: { img_format: "png", img_width: 5, img_height: 5, img_title: "K1",
              img_author: "Au1", img_description: "Desc1", img_software: "Sw1" },
    absent_claims: ["img_comment"],
    required_quarantined: [{ reason: "crc-mismatch" }, { reason: "missing-iend" }],
    forbidden_values: ["Hidden"] });

add("case-img-48", "jpeg kitchen sink -> exact claim set",
  "EXIF + COM + XMP skipped + SOF dims.",
  jbuild(
    jseg(0xe0, JFIF),
    exifSeg([{ tag: 0x010f, str: "KM" }, { tag: 0x0110, str: "KModel" }]),
    jseg(0xe1, Buffer.concat([Buffer.from("http://ns.adobe.com/xap/1.0/\0", "latin1"), Buffer.from("<x/>", "latin1")])),
    jseg(0xfe, Buffer.from("KC", "latin1")),
    jseg(0xc0, sof(7, 9))),
  { outcome: "bounded_success",
    claims: { img_format: "jpeg", img_width: 7, img_height: 9,
              img_make: "KM", img_model: "KModel", img_comment: "KC" } });

add("case-img-49", "jpeg app0+app13+dqt skipped -> dims only",
  "Vendor and quantization segments are not metadata claims.",
  jbuild(
    jseg(0xe0, JFIF),
    jseg(0xed, Buffer.concat([Buffer.from("Photoshop 3.0", "latin1"), Buffer.from([0]), Buffer.from("8BIM", "latin1")])),
    jseg(0xdb, Buffer.alloc(67, 1)),
    jseg(0xc0, sof(11, 13))),
  { outcome: "bounded_success",
    claims: { img_format: "jpeg", img_width: 11, img_height: 13 },
    absent_claims: ["img_make", "img_comment", "img_title"] });

// ---- manifest: missions ACQ-1151..ACQ-1200 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.bytes).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1151 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.bytes.length, expect: c.expect };
});
const manifestImg = manifest;

export { C, manifest, manifestImg };
export function getCase(id) { return C.find((c) => c.id === id); }
