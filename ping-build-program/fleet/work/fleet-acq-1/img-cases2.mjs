#!/usr/bin/env node
// image-metadata fixture lab, batch 2: case-img-50..99 (missions ACQ-1201..ACQ-1250).
// Second adversarial wave: IHDR value edges, chunk-order games, EXIF type
// edges, JPEG marker edges, text-budget edges. Same doctrine.
import { createHash } from "node:crypto";
import { deflateSync as dz } from "node:zlib";

const C = [];
const add = (id, title, threat, bytes, expect) => C.push({ id, title, threat, bytes, expect });

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
const ihdr = (w, h, bd = 8, ct = 2, inter = 0) => {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4);
  b[8] = bd; b[9] = ct; b[10] = 0; b[11] = 0; b[12] = inter;
  return b;
};
const textChunk = (kw, text) => Buffer.concat([Buffer.from(kw + "\0", "latin1"), Buffer.from(text, "latin1")]);
const itxt = (kw, textUtf8, { compressed = false } = {}) => {
  let payload = Buffer.from(textUtf8, "utf8");
  let flag = 0;
  if (compressed) { flag = 1; payload = dz(payload); }
  return Buffer.concat([Buffer.from(kw + "\0", "latin1"), Buffer.from([flag, 0, 0, 0]), payload]);
};
const ztxt = (kw, text) =>
  Buffer.concat([Buffer.from(kw + "\0", "latin1"), Buffer.from([0]), dz(Buffer.from(text, "latin1"))]);

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

// ---- PNG value edges ----
add("case-img-50", "batch-2 baseline",
  "Regression anchor.",
  pbuild(pchunk("IHDR", ihdr(16, 16)), pchunk("tEXt", textChunk("Title", "B2")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "B2", img_width: 16 } });

add("case-img-51", "iTXt with language and translated keyword",
  "Non-empty lang/translated fields parse; text still claimed.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("iTXt", Buffer.concat([Buffer.from("Title\0\x00\x00", "latin1"), Buffer.from("en\0", "latin1"), Buffer.from("Titre\0", "utf8"), Buffer.from("Bonjour", "utf8")])),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "Bonjour" } });

add("case-img-52", "tEXt 79-char keyword ok",
  "Boundary: 79 is the spec maximum.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("k".repeat(79), "v")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_text: "v" } });

add("case-img-53", "tEXt keyword with spaces",
  "Spaces are legal in keywords.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("My Keyword", "v")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_text: "v" } });

add("case-img-54", "IHDR interlace=1 valid",
  "Adam7 is legal; dims claimed.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 8, 2, 1)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8, img_height: 8 } });

add("case-img-55", "IHDR interlace=2 -> invalid-ihdr",
  "Only 0/1 exist.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 8, 2, 2)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "invalid-ihdr" }] });

add("case-img-56", "IHDR palette 4-bit valid",
  "Color type 3 allows bit depth 4.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 4, 3)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 } });

add("case-img-57", "IHDR truecolor 4-bit -> invalid-ihdr",
  "Color type 2 requires 8/16.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 4, 2)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "invalid-ihdr" }] });

add("case-img-58", "tEXt zero-length data -> bad-keyword",
  "Empty chunk has no keyword terminator.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", Buffer.alloc(0)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_text"],
    required_quarantined: [{ reason: "bad-keyword" }] });

add("case-img-59", "chunks after IEND ignored",
  "IEND ends the datastream; trailing chunks are not parsed.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("IEND", Buffer.alloc(0)),
    pchunk("tEXt", textChunk("Comment", "AfterEnd"))),
  { outcome: "bounded_success", claims: { img_width: 8 }, absent_claims: ["img_comment"],
    forbidden_values: ["AfterEnd"] });

add("case-img-60", "IDAT bad crc -> quarantined",
  "Pixel data integrity is checked even though pixels aren't claimed.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("IDAT", Buffer.from("pixels", "latin1"), true), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 },
    required_quarantined: [{ reason: "crc-mismatch" }] });

add("case-img-61", "PLTE and pHYs skipped",
  "Ancillary chunks outside the claim surface.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 8, 2)),
    pchunk("PLTE", Buffer.from([255, 0, 0, 0, 255, 0], "latin1")),
    pchunk("pHYs", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 1], "latin1")),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 } });

add("case-img-62", "tEXt empty text -> no claim",
  "Empty values claim nothing (documented).",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("Title", "")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 }, absent_claims: ["img_title"] });

add("case-img-63", "iTXt compFlag=2 -> bad-chunk",
  "Flags are 0/1 only.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("iTXt", Buffer.concat([Buffer.from("Title\0", "latin1"), Buffer.from([2, 0, 0, 0]), Buffer.from("x", "utf8")])) ,
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_title"],
    required_quarantined: [{ reason: "bad-chunk" }] });

add("case-img-64", "zTXt corrupt deflate -> inflate-error",
  "Garbage zlib stream: quarantined, not fatal.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("zTXt", Buffer.concat([Buffer.from("Comment\0\x00", "latin1"), Buffer.from("not zlib at all", "latin1")])) ,
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 }, absent_claims: ["img_comment"],
    required_quarantined: [{ reason: "inflate-error" }] });

add("case-img-65", "iTXt compressed bomb -> PERMANENT",
  "Bomb via the iTXt path terminates too.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("iTXt", Buffer.concat([Buffer.from("Title\0\x01\x00\x00\x00", "latin1"), dz(Buffer.alloc(2000000, 66))])) ,
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "typed_failure", failure_class: "PERMANENT", failure_signal: "decompression-bomb" });

add("case-img-66", "10001 chunks -> too-many-chunks",
  "Chunk-count cap holds; dims already claimed.",
  (() => {
    const chunks = [pchunk("IHDR", ihdr(8, 8))];
    for (let i = 0; i < 10001; i++) chunks.push(pchunk("aaAA", Buffer.alloc(0)));
    return pbuild(...chunks);
  })(),
  { outcome: "bounded_success", claims: { img_width: 8 },
    required_quarantined: [{ reason: "too-many-chunks" }] });

add("case-img-67", "IHDR color type 7 -> invalid-ihdr",
  "No such color type.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 8, 7)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "invalid-ihdr" }] });

add("case-img-68", "dimensions exactly at cap -> valid",
  "Boundary: 100000 is allowed.",
  pbuild(pchunk("IHDR", ihdr(100000, 1)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 100000 } });

add("case-img-69", "dimensions cap+1 -> invalid-dimensions",
  "Boundary: 100001 is not.",
  pbuild(pchunk("IHDR", ihdr(100001, 1)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_width"],
    required_quarantined: [{ reason: "invalid-dimensions" }] });

add("case-img-70", "tEXt latin1 high bytes verbatim",
  "latin1 is passed through, never re-encoded.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", textChunk("Title", "Café")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_title: "Café" } });

// ---- JPEG marker edges ----
add("case-img-71", "jpeg baseline b2",
  "Regression anchor.",
  jbuild(jseg(0xc0, sof(21, 22))),
  { outcome: "bounded_success", claims: { img_format: "jpeg", img_width: 21, img_height: 22 } });

add("case-img-72", "jpeg SOF1 -> dims",
  "Extended sequential SOF counts.",
  jbuild(jseg(0xc1, sof(23, 24))),
  { outcome: "bounded_success", claims: { img_width: 23, img_height: 24 } });

add("case-img-73", "jpeg fill bytes before marker",
  "FF FF FF E0: fill bytes skipped per T.81.",
  Buffer.concat([SOI, Buffer.from([0xff, 0xff, 0xff, 0xe0, 0x00, 0x10]),
    Buffer.concat([Buffer.from("JFIF\0", "latin1"), Buffer.alloc(9)]),
    jseg(0xc0, sof(25, 26)), EOI]),
  { outcome: "bounded_success", claims: { img_width: 25, img_height: 26 } });

add("case-img-74", "jpeg two SOFs -> two claims",
  "Both SOFs are facts; each claimed with provenance.",
  jbuild(jseg(0xc0, sof(10, 10)), jseg(0xc0, sof(20, 20))),
  { outcome: "bounded_success", exact_claims: { img_width: 2 } });

add("case-img-75", "jpeg RST markers skipped",
  "FFD0-FFD7 are standalone.",
  Buffer.concat([SOI, jseg(0xc0, sof(27, 28)), Buffer.from([0xff, 0xd0, 0xff, 0xd7]), EOI]),
  { outcome: "bounded_success", claims: { img_width: 27 } });

add("case-img-76", "jpeg APP2 skipped",
  "ICC profiles are not metadata claims here.",
  jbuild(jseg(0xe2, Buffer.from("ICC_PROFILE\0data", "latin1")), jseg(0xc0, sof(29, 30))),
  { outcome: "bounded_success", claims: { img_width: 29 }, absent_claims: ["img_text"] });

add("case-img-77", "jpeg empty COM -> no claim",
  "Empty comment claims nothing.",
  jbuild(jseg(0xfe, Buffer.alloc(0)), jseg(0xc0, sof(31, 32))),
  { outcome: "bounded_success", claims: { img_width: 31 }, absent_claims: ["img_comment"] });

add("case-img-78", "jpeg clean EOF without EOI -> missing-eoi",
  "Segments end cleanly; EOI absent is flagged.",
  Buffer.concat([SOI, jseg(0xc0, sof(33, 34))]),
  { outcome: "bounded_success", claims: { img_width: 33 },
    required_quarantined: [{ reason: "missing-eoi" }] });

add("case-img-79", "jpeg leading garbage -> not-an-image",
  "SOI must be first; no resync guessing.",
  Buffer.concat([Buffer.from("xx", "latin1"), SOI, jseg(0xc0, sof(10, 10)), EOI]),
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-image" });

add("case-img-80", "jpeg SOF too short -> bad-segment",
  "SOF without room for dimensions.",
  jbuild(jseg(0xc0, Buffer.from([8, 0], "latin1"))),
  { outcome: "bounded_success", claims: { img_format: "jpeg" }, absent_claims: ["img_width"],
    required_quarantined: [{ reason: "bad-segment" }] });

// ---- EXIF type edges ----
add("case-img-81", "exif zero entries -> nothing",
  "Empty IFD: no claims, no quarantines.",
  jbuild(exifSeg([]), jseg(0xc0, sof(35, 36))),
  { outcome: "bounded_success", claims: { img_width: 35 }, absent_claims: ["img_make"] });

add("case-img-82", "exif SHORT-typed Make skipped",
  "Only ASCII text tags are claimed (documented).",
  jbuild(jseg(0xe1, (() => {
    const tiff = Buffer.alloc(8 + 2 + 12 + 4);
    tiff.write("II", 0, 2, "latin1"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(1, 8);
    tiff.writeUInt16LE(0x010f, 10); tiff.writeUInt16LE(3, 12); tiff.writeUInt32LE(1, 14); tiff.writeUInt32LE(7, 18);
    tiff.writeUInt32LE(0, 22);
    return Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  })()), jseg(0xc0, sof(37, 38))),
  { outcome: "bounded_success", claims: { img_width: 37 }, absent_claims: ["img_make"] });

add("case-img-83", "exif count 0 -> bad-offset",
  "Zero-count ASCII is malformed.",
  jbuild(jseg(0xe1, (() => {
    const tiff = Buffer.alloc(8 + 2 + 12 + 4);
    tiff.write("II", 0, 2, "latin1"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(1, 8);
    tiff.writeUInt16LE(0x010f, 10); tiff.writeUInt16LE(2, 12); tiff.writeUInt32LE(0, 14); tiff.writeUInt32LE(0, 18);
    tiff.writeUInt32LE(0, 22);
    return Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  })()), jseg(0xc0, sof(39, 40))),
  { outcome: "bounded_success", claims: { img_width: 39 }, absent_claims: ["img_make"],
    required_quarantined: [{ reason: "bad-offset" }] });

add("case-img-84", "exif huge count -> bad-offset",
  "70000 entries cannot fit; caught before reading.",
  jbuild(jseg(0xe1, (() => {
    const tiff = Buffer.alloc(8 + 2 + 12 + 4);
    tiff.write("II", 0, 2, "latin1"); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
    tiff.writeUInt16LE(1, 8);
    tiff.writeUInt16LE(0x010f, 10); tiff.writeUInt16LE(2, 12); tiff.writeUInt32LE(70000, 14); tiff.writeUInt32LE(8, 18);
    tiff.writeUInt32LE(0, 22);
    return Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  })()), jseg(0xc0, sof(41, 42))),
  { outcome: "bounded_success", claims: { img_width: 41 }, absent_claims: ["img_make"],
    required_quarantined: [{ reason: "bad-offset" }] });

add("case-img-85", "exif RATIONAL Make skipped",
  "Non-ASCII types never become text.",
  jbuild(exifSeg([{ tag: 0x010f, type: 5, count: 1, value: 8 }]), jseg(0xc0, sof(43, 44))),
  { outcome: "bounded_success", claims: { img_width: 43 }, absent_claims: ["img_make"] });

add("case-img-86", "exif sub-ifd pointer not followed",
  "ExifIFD tag 0x8769 is not descended; sub-IFD bytes ignored.",
  (() => {
    const sub = Buffer.from("DateTimeOriginal would live here: 2026:01:02 03:04:05", "latin1");
    const exif = exifBlock([{ tag: 0x010f, str: "CamCo" }, { tag: 0x8769, type: 4, count: 1, value: 5000 }]);
    return jbuild(jseg(0xe1, Buffer.concat([exif, sub])), jseg(0xc0, sof(45, 46)));
  })(),
  { outcome: "bounded_success", claims: { img_make: "CamCo", img_width: 45 },
    forbidden_values: ["2026:01:02"] });

add("case-img-87", "exif truncated tiff -> bad-offset",
  "'Exif' with 4 bytes of TIFF: nothing to parse.",
  jbuild(jseg(0xe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), Buffer.from([1, 2, 3, 4])])), jseg(0xc0, sof(47, 48))),
  { outcome: "bounded_success", claims: { img_width: 47 },
    required_quarantined: [{ reason: "bad-offset" }] });

// ---- text budget edges ----
add("case-img-88", "three 1MB texts -> third dropped",
  "Total text budget 2MB: the third entry is dropped and flagged.",
  pbuild(pchunk("IHDR", ihdr(8, 8)),
    pchunk("tEXt", textChunk("K1", "a".repeat(1024 * 1024))),
    pchunk("tEXt", textChunk("K2", "b".repeat(1024 * 1024))),
    pchunk("tEXt", textChunk("K3", "c".repeat(1024 * 1024))),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", exact_claims: { img_text: 2 },
    required_truncated: ["text"], required_quarantined: [{ reason: "text-budget-exceeded" }],
    forbidden_values: ["c".repeat(64)] });

// ---- kitchen sinks ----
add("case-img-89", "png kitchen sink 2 -> exact claim set",
  "iTXt author + zTXt + unknown chunk + IDAT crc fail.",
  pbuild(
    pchunk("IHDR", ihdr(9, 9)),
    pchunk("iTXt", itxt("Author", "Auteur")),
    pchunk("zTXt", ztxt("Title", "Zippy")),
    pchunk("zzZZ", Buffer.from("private", "latin1")),
    pchunk("IDAT", Buffer.from("px", "latin1"), true),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success",
    claims: { img_format: "png", img_width: 9, img_height: 9, img_author: "Auteur", img_title: "Zippy" },
    required_quarantined: [{ reason: "crc-mismatch" }] });

add("case-img-90", "jpeg kitchen sink 2 -> exact claim set",
  "EXIF BE + COM + SOF1 + APP13 + fill bytes.",
  Buffer.concat([SOI,
    Buffer.from([0xff, 0xff, 0xe1]), (() => { const L = Buffer.alloc(2); const d = exifBlock([{ tag: 0x010f, str: "BC" }, { tag: 0x0131, str: "BS" }], false); L.writeUInt16BE(d.length + 2); return Buffer.concat([L, d]); })(),
    jseg(0xed, Buffer.from("8BIMdata", "latin1")),
    jseg(0xfe, Buffer.from("JC", "latin1")),
    jseg(0xc1, sof(51, 52)), EOI]),
  { outcome: "bounded_success",
    claims: { img_format: "jpeg", img_width: 51, img_height: 52,
              img_make: "BC", img_software: "BS", img_comment: "JC" } });

add("case-img-91", "png empty IDAT ok",
  "Zero-length IDAT is legal.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("IDAT", Buffer.alloc(0)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 } });

add("case-img-92", "jpeg DHT+DQT skipped",
  "Huffman and quantization tables are not claims.",
  jbuild(jseg(0xc4, Buffer.alloc(20, 2)), jseg(0xdb, Buffer.alloc(67, 3)), jseg(0xc0, sof(53, 54))),
  { outcome: "bounded_success", claims: { img_width: 53 } });

add("case-img-93", "png tEXt keyword 'Comment' empty after null",
  "Keyword with nothing after the terminator: no claim.",
  pbuild(pchunk("IHDR", ihdr(8, 8)), pchunk("tEXt", Buffer.from("Comment\0", "latin1")), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", absent_claims: ["img_comment"] });

add("case-img-94", "jpeg multiple COMs -> two claims",
  "Each COM is its own claim.",
  jbuild(jseg(0xfe, Buffer.from("one", "latin1")), jseg(0xfe, Buffer.from("two", "latin1")), jseg(0xc0, sof(55, 56))),
  { outcome: "bounded_success", exact_claims: { img_comment: 2 } });

add("case-img-95", "png gray 16-bit valid",
  "Color type 0 allows 16-bit.",
  pbuild(pchunk("IHDR", ihdr(8, 8, 16, 0)), pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", claims: { img_width: 8 } });

add("case-img-96", "png gray 16-bit + text",
  "Kitchenette: dims plus all text paths at once.",
  pbuild(pchunk("IHDR", ihdr(12, 34, 16, 0)),
    pchunk("tEXt", textChunk("Title", "T9")),
    pchunk("iTXt", itxt("Author", "A9")),
    pchunk("zTXt", ztxt("Software", "S9")),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success",
    claims: { img_width: 12, img_height: 34, img_title: "T9", img_author: "A9", img_software: "S9" } });

add("case-img-97", "jpeg exif copyright symbol latin1",
  "0xA9 passes through as latin1.",
  jbuild(exifSeg([{ tag: 0x8298, str: "© 2026" }]), jseg(0xc0, sof(57, 58))),
  { outcome: "bounded_success", claims: { img_copyright: "© 2026" } });

add("case-img-98", "jpeg sof3 lossless -> dims",
  "SOF3 is a dimensions carrier too.",
  jbuild(jseg(0xc3, sof(59, 60))),
  { outcome: "bounded_success", claims: { img_width: 59, img_height: 60 } });

add("case-img-99", "final mixed sink -> counts",
  "PNG: IHDR + 2 tEXt + iTXt + zTXt + IEND; one generic keyword.",
  pbuild(
    pchunk("IHDR", ihdr(7, 7)),
    pchunk("tEXt", textChunk("Title", "F1")),
    pchunk("tEXt", textChunk("Kx", "F2")),
    pchunk("iTXt", itxt("Description", "F3")),
    pchunk("zTXt", ztxt("Comment", "F4")),
    pchunk("IEND", Buffer.alloc(0))),
  { outcome: "bounded_success", exact_claims: { img_text: 1 },
    claims: { img_title: "F1", img_description: "F3" },
    required_quarantined: [] });

// ---- manifest: missions ACQ-1201..ACQ-1250 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(c.bytes).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1201 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.bytes.length, expect: c.expect };
});
const manifestImg2 = manifest;

export { C, manifest, manifestImg2 };
export function getCase(id) { return C.find((c) => c.id === id); }
