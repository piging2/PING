#!/usr/bin/env node
// img-harness.mjs — image-metadata boundary lab (PNG + JPEG).
//
// Doctrine (same as the documents-pdf lab):
// - NEVER turn parser guess into fact. Magic bytes identify the format;
//   dimensions come only from IHDR/SOF with validated ranges; text comes
//   only from well-formed textual chunks/segments with provenance.
// - Hostile inputs produce typed lane-K failures, bounded extraction with
//   provenance, or quarantine. Corrupt chunks never contribute claims.
// - Caps (lane-D D3-D5 analog): 15 MiB file cap (F2 media), chunk/segment
//   count cap, per-entry text cap, per-entry inflate cap.
// - EXIF GPS sub-IFD is never descended into (privacy boundary, documented).
// - XMP / Photoshop IRB / APPn unknowns are skipped (documented): other
//   families own XML and vendor blobs.
import { inflateSync } from "node:zlib";

export const IMG_PARSER_VERSION = "img-harness/1.0.0";
export { runImgCase };

const I_LIMITS = {
  maxBytes: 15 * 1024 * 1024, // F2 media cap
  maxChunks: 10000,
  maxDim: 100000,
  maxTextBytes: 1024 * 1024,
  maxTotalText: 2 * 1024 * 1024,
  maxInflate: 1024 * 1024,
};

// Standard CRC-32 (ISO 3309) for PNG chunk integrity.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf, start, end) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// PNG tEXt/iTXt/zTXt keyword -> typed claim field. Unknown keywords fall
// back to a generic img_text claim with the keyword in provenance.
const TEXT_FIELD = {
  Title: "img_title",
  Author: "img_author",
  Description: "img_description",
  Comment: "img_comment",
  Software: "img_software",
  Copyright: "img_copyright",
  Source: "img_source",
};

// EXIF ASCII tag -> typed claim field (IFD0 only; sub-IFDs not descended).
const EXIF_ASCII = {
  0x010e: "img_description",
  0x010f: "img_make",
  0x0110: "img_model",
  0x0131: "img_software",
  0x013b: "img_author",
  0x8298: "img_copyright",
};
const EXIF_GPS_TAG = 0x8825;

function runImgCase(bytes, sourceRef) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  const R = { outcome: "bounded_success", claims: [], quarantined: [], truncated: {}, failure: null };
  const put = (field, value, locator) =>
    R.claims.push({ field, value, provenance: [{ source: "image-bytes", locator }], parser: IMG_PARSER_VERSION });
  const quar = (where, reason, detail) =>
    R.quarantined.push({ property: "image-bytes", where, reason, detail: String(detail).slice(0, 300) });
  const fail = (cls, signal, detail) => ({
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {},
    failure: {
      record_type: "ping.connector.failure.v1",
      class: cls, retryable: false, terminal: true,
      provider_signal: { native_code: signal, detail: String(detail).slice(0, 500) },
      evidence_refs: [sourceRef],
    },
  });
  const bomb = (where) => fail("PERMANENT", "decompression-bomb",
    `${where}: inflated output exceeded ${I_LIMITS.maxInflate} bytes (documented)`);

  if (buf.length === 0) return fail("INVALID_PAYLOAD", "empty-input", "zero-byte input is not an image");
  if (buf.length > I_LIMITS.maxBytes)
    return fail("INVALID_PAYLOAD", "over-byte-cap",
      `${buf.length} bytes exceeds the ${I_LIMITS.maxBytes}-byte media cap (lane-D F2)`);

  // Inflate with a hard output cap. Returns {ok, text} or {bomb:true}.
  const inflateText = (data, what) => {
    try {
      const out = inflateSync(data, { maxOutputLength: I_LIMITS.maxInflate });
      return { ok: true, bytes: out };
    } catch (e) {
      if (e && e.code === "ERR_BUFFER_TOO_LARGE") return { bomb: true };
      quar(what, "inflate-error", e && e.message ? e.message : String(e));
      return { ok: false };
    }
  };
  // Bounded text claim: over-long text is truncated and flagged, never cut silently.
  let totalText = 0;
  const claimText = (field, keyword, text, provenance) => {
    let v = text;
    if (Buffer.byteLength(v, "utf8") > I_LIMITS.maxTextBytes) {
      v = Buffer.from(v, "utf8").subarray(0, I_LIMITS.maxTextBytes).toString("utf8");
      R.truncated.text = true;
      quar(provenance, "text-too-long", `text exceeded ${I_LIMITS.maxTextBytes} bytes; truncated and flagged`);
    }
    totalText += Buffer.byteLength(v, "utf8");
    if (totalText > I_LIMITS.maxTotalText) {
      R.truncated.text = true;
      quar(provenance, "text-budget-exceeded", "total text budget exceeded; entry dropped");
      return;
    }
    if (!v) return; // empty -> no claim (documented)
    put(field, v, provenance);
  };
  const claimKeywordText = (keyword, text, provenance) => {
    const field = TEXT_FIELD[keyword] || "img_text";
    claimText(field, keyword, text, field === "img_text" ? `${provenance} keyword=${JSON.stringify(keyword)}` : provenance);
  };

  const isPng = buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC);
  const isJpeg = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
  if (!isPng && !isJpeg) {
    const head = buf.subarray(0, 6).toString("latin1").replace(/[^ -~]/g, ".");
    const known =
      head.startsWith("GIF8") ? "gif" :
      head.startsWith("BM") ? "bmp" :
      buf.length >= 12 && buf.subarray(0, 4).equals(Buffer.from("RIFF")) && buf.subarray(8, 12).toString("latin1") === "WEBP" ? "webp" :
      null;
    if (known) return fail("UNSUPPORTED", "unsupported-format", `${known} is not in the PNG/JPEG claim surface (documented)`);
    return fail("INVALID_PAYLOAD", "not-an-image", `magic bytes ${JSON.stringify(head)} identify no supported image format`);
  }

  if (isPng) return parsePng();
  return parseJpeg();

  // ---------------- PNG ----------------
  function parsePng() {
    put("img_format", "png", "magic bytes 89 50 4E 47 0D 0A 1A 0A");
    let pos = 8, idx = 0, seenIhdr = false, seenIend = false, w = 0, h = 0;
    while (pos < buf.length) {
      if (idx++ > I_LIMITS.maxChunks) { quar("png", "too-many-chunks", `chunk cap ${I_LIMITS.maxChunks} exceeded`); break; }
      if (pos + 8 > buf.length) { quar("png", "truncated", "EOF inside chunk header"); break; }
      const len = buf.readUInt32BE(pos);
      const type = buf.toString("latin1", pos + 4, pos + 8);
      if (!/^[A-Za-z]{4}$/.test(type)) { quar("png", "bad-chunk-type", `chunk ${idx} type ${JSON.stringify(type)}`); break; }
      if (len > I_LIMITS.maxBytes) { quar(`png/${type}`, "oversize-chunk", `declared length ${len} exceeds file cap`); break; }
      if (pos + 12 + len > buf.length) { quar(`png/${type}`, "truncated", `declared length ${len} runs past EOF`); break; }
      const data = buf.subarray(pos + 8, pos + 8 + len);
      const wantCrc = buf.readUInt32BE(pos + 8 + len);
      const gotCrc = crc32(buf, pos + 4, pos + 8 + len);
      const prov = `png ${type} chunk#${idx}`;
      if (wantCrc !== gotCrc) {
        quar(prov, "crc-mismatch", "chunk data failed CRC-32; its bytes are untrusted and contribute no claims");
      } else if (type === "IHDR") {
        if (seenIhdr) { quar(prov, "duplicate-ihdr", "second IHDR ignored; first wins"); }
        else if (len !== 13) { quar(prov, "bad-ihdr-length", `IHDR length ${len} != 13`); }
        else {
          w = data.readUInt32BE(0); h = data.readUInt32BE(4);
          const bd = data[8], ct = data[9], comp = data[10], filt = data[11], inter = data[12];
          const ctBd = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
          const okDims = w >= 1 && h >= 1 && w <= I_LIMITS.maxDim && h <= I_LIMITS.maxDim;
          const okFmt = ctBd[ct] && ctBd[ct].includes(bd) && comp === 0 && filt === 0 && (inter === 0 || inter === 1);
          if (!okDims) quar(prov, "invalid-dimensions", `width=${w} height=${h} outside 1..${I_LIMITS.maxDim}`);
          else if (!okFmt) quar(prov, "invalid-ihdr", `bitdepth=${bd} colortype=${ct} comp=${comp} filter=${filt} interlace=${inter}`);
          else { put("img_width", w, prov); put("img_height", h, prov); }
          seenIhdr = true;
        }
      } else if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
        if (!seenIhdr) quar(prov, "misordered-chunk", `${type} before IHDR (documented; text still read)`);
        const r = readTextChunk(type, data, prov);
        if (r && r.bomb) return bomb(`${prov} ${r.keyword || ""}`.trim());
        if (r && r.text !== null) claimKeywordText(r.keyword, r.text, prov);
      } else if (type === "IEND") { seenIend = true; pos += 12 + len; break; }
      // IDAT and all other chunks: skipped (pixel data and ancillary chunks
      // are outside the metadata claim surface, documented).
      pos += 12 + len;
    }
    if (!seenIhdr) quar("png", "missing-ihdr", "no valid IHDR; no dimension claims");
    if (!seenIend) quar("png", pos < buf.length ? "truncated" : "missing-iend", "no IEND reached");
    return R;
  }

  // Reads one PNG textual chunk. Returns {keyword, text} | {keyword, text:null}
  // (skip) | {bomb:true} | null (skip silently).
  function readTextChunk(type, data, prov) {
    const z = data.indexOf(0);
    if (z <= 0 || z > 79) { quar(prov, "bad-keyword", "empty or overlong keyword; chunk skipped"); return null; }
    const keyword = data.toString("latin1", 0, z);
    if (type === "tEXt") return { keyword, text: data.toString("latin1", z + 1) };
    if (type === "zTXt") {
      if (data.length < z + 2) { quar(prov, "bad-chunk", "zTXt too short for compression method"); return null; }
      if (data[z + 1] !== 0) { quar(prov, "unsupported-compression", `zTXt method ${data[z + 1]} != 0`); return null; }
      const r = inflateText(data.subarray(z + 2), prov);
      if (r.bomb) return { bomb: true, keyword };
      if (!r.ok) return null;
      return { keyword, text: r.bytes.toString("latin1") };
    }
    // iTXt: keyword\0 compFlag compMethod lang\0 translated\0 text(utf-8)
    if (data.length < z + 3) { quar(prov, "bad-chunk", "iTXt too short for flags"); return null; }
    const compFlag = data[z + 1], compMethod = data[z + 2];
    let p = z + 3;
    const lz = data.indexOf(0, p);
    if (lz === -1) { quar(prov, "bad-chunk", "iTXt missing language tag terminator"); return null; }
    p = lz + 1;
    const tz = data.indexOf(0, p);
    if (tz === -1) { quar(prov, "bad-chunk", "iTXt missing translated-keyword terminator"); return null; }
    const rawText = data.subarray(tz + 1);
    let bytes = rawText;
    if (compFlag === 1) {
      if (compMethod !== 0) { quar(prov, "unsupported-compression", `iTXt method ${compMethod} != 0`); return null; }
      const r = inflateText(rawText, prov);
      if (r.bomb) return { bomb: true, keyword };
      if (!r.ok) return null;
      bytes = r.bytes;
    } else if (compFlag !== 0) { quar(prov, "bad-chunk", `iTXt compression flag ${compFlag}`); return null; }
    try {
      return { keyword, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch {
      quar(prov, "bad-utf8", "iTXt text is not valid UTF-8; no claim (never guess)");
      return { keyword, text: null };
    }
  }

  // ---------------- JPEG ----------------
  function parseJpeg() {
    put("img_format", "jpeg", "magic bytes FF D8 (SOI)");
    let pos = 2, seg = 0, done = false;
    const standalone = new Set([0xd8, 0xd9, 0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);
    while (pos + 2 <= buf.length && !done) {
      if (seg++ > I_LIMITS.maxChunks) { quar("jpeg", "too-many-segments", `segment cap ${I_LIMITS.maxChunks} exceeded`); break; }
      if (buf[pos] !== 0xff) { quar("jpeg", "bad-segment", `expected marker at ${pos}`); break; }
      // Fill bytes: any number of 0xFF may precede a marker (T.81 B.1.1.2).
      while (buf[pos] === 0xff && pos + 2 <= buf.length && buf[pos + 1] === 0xff) pos++;
      const marker = buf[pos + 1];
      if (marker === 0xd9) { done = true; pos += 2; break; } // EOI
      if (standalone.has(marker)) { pos += 2; continue; }
      if (pos + 4 > buf.length) { quar("jpeg", "truncated", "EOF inside segment header"); break; }
      const segLen = buf.readUInt16BE(pos + 2);
      if (segLen < 2) { quar("jpeg", "bad-segment", `marker FF${marker.toString(16)} length ${segLen} < 2`); break; }
      if (pos + 2 + segLen > buf.length) { quar("jpeg", "truncated", `segment FF${marker.toString(16)} runs past EOF`); break; }
      const data = buf.subarray(pos + 4, pos + 2 + segLen);
      const prov = `jpeg FF${marker.toString(16).toUpperCase()} seg#${seg}`;
      const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSof) {
        if (data.length < 5) quar(prov, "bad-segment", "SOF too short for dimensions");
        else {
          const hh = data.readUInt16BE(1), ww = data.readUInt16BE(3);
          if (hh < 1 || ww < 1 || hh > I_LIMITS.maxDim || ww > I_LIMITS.maxDim)
            quar(prov, "invalid-dimensions", `width=${ww} height=${hh} outside 1..${I_LIMITS.maxDim}`);
          else { put("img_width", ww, prov); put("img_height", hh, prov); }
        }
      } else if (marker === 0xe1) {
        const r = readExifApp1(data, prov);
        if (r && r.bomb) return bomb(`${prov} exif`);
      } else if (marker === 0xfe) {
        claimKeywordText("Comment", data.toString("latin1"), prov);
      }
      // APP0 (JFIF), APP13, XMP-in-APP1, DQT/DHT/DRI, COM-others: skipped
      // (documented; outside the metadata claim surface).
      pos += 2 + segLen;
      if (marker === 0xda) { done = true; } // SOS: entropy data follows; stop.
    }
    if (!done && pos >= buf.length) quar("jpeg", "missing-eoi", "no EOI reached");
    return R;
  }

  // APP1 EXIF. Returns null, or {bomb:true} (never for EXIF; kept for symmetry).
  function readExifApp1(data, prov) {
    if (data.length < 6 || data.toString("latin1", 0, 6) !== "Exif\0\0") return null; // not EXIF (XMP etc.): skip
    const tiff = 6;
    if (data.length < tiff + 8) { quar(prov, "bad-offset", "TIFF header truncated"); return null; }
    const bo = data.toString("latin1", tiff, tiff + 2);
    const le = bo === "II", be = bo === "MM";
    if (!le && !be) { quar(prov, "bad-offset", `bad TIFF byte order ${JSON.stringify(bo)}`); return null; }
    const u16 = (o) => le ? data.readUInt16LE(o) : data.readUInt16BE(o);
    const u32 = (o) => le ? data.readUInt32LE(o) : data.readUInt32BE(o);
    if (u16(tiff + 2) !== 42) { quar(prov, "bad-offset", "bad TIFF magic 42"); return null; }
    const ifd0 = tiff + u32(tiff + 4);
    if (ifd0 + 2 > data.length) { quar(prov, "bad-offset", "IFD0 offset outside APP1"); return null; }
    const count = u16(ifd0);
    if (ifd0 + 2 + count * 12 > data.length) { quar(prov, "bad-offset", `IFD0 count ${count} runs past buffer`); return null; }
    const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    for (let e = 0; e < count; e++) {
      const eo = ifd0 + 2 + e * 12;
      const tag = u16(eo), type = u16(eo + 2), cnt = u32(eo + 4);
      if (tag === EXIF_GPS_TAG) continue; // GPS sub-IFD never descended (privacy boundary, documented)
      const field = EXIF_ASCII[tag];
      if (!field || type !== 2) continue; // only ASCII text tags claimed
      const ts = typeSize[type] || 0;
      if (!ts || cnt < 1 || cnt > 65536) { quar(`${prov} exif`, "bad-offset", `tag 0x${tag.toString(16)} count ${cnt}`); break; }
      const total = cnt * ts;
      let str;
      if (total <= 4) {
        str = data.toString("latin1", eo + 8, eo + 8 + total);
      } else {
        const vo = tiff + u32(eo + 8);
        if (vo + total > data.length) { quar(`${prov} exif`, "bad-offset", `tag 0x${tag.toString(16)} value offset outside APP1`); break; }
        str = data.toString("latin1", vo, vo + total);
      }
      str = str.replace(/\0+$/, "");
      claimText(field, `EXIF 0x${tag.toString(16)}`, str, `${prov} exif IFD0`);
    }
    return null;
  }
}
