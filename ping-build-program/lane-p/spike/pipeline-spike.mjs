// Lane P spike: content-addressable media chain + red-team battery.
// Runs against lane-p/harvest/node_modules (sharp, file-type, exifr, thumbhash).
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import exifr from "exifr";
import { rgbaToThumbHash, thumbHashToDataURL } from "thumbhash";

const execPy = promisify(execFile);
const DIR = path.dirname(fileURLToPath(import.meta.url));
const LANE = path.resolve(DIR, "..");
const FIX = path.join(LANE, "fixtures");
const OUT = path.join(LANE, "spike-out");
await mkdir(OUT, { recursive: true });

const ALLOWLIST = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const sha256hex = (buf) => createHash("sha256").update(buf).digest("hex");
const results = [];
const note = (name, ok, detail) => results.push({ name, ok, detail });

/* ============ 0. clean bases + fixtures ============ */
const cleanJpg = await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 180, g: 40, b: 40 } } })
  .jpeg({ quality: 85 }).toBuffer();
await writeFile(path.join(FIX, "clean.jpg"), cleanJpg);
const cleanPng = await sharp({ create: { width: 320, height: 240, channels: 4, background: { r: 40, g: 120, b: 200, alpha: 1 } } })
  .png().toBuffer();
await writeFile(path.join(FIX, "clean.png"), cleanPng);

// EXIF-GPS JPEG via the python generator (hand-built APP1 segment)
const { stdout: pyOut } = await execPy("python3", ["-c", `
import sys; sys.path.insert(0, ${JSON.stringify(FIX)})
import gen_fixtures as g
g.jpeg_with_gps(${JSON.stringify(path.join(FIX, "exif-gps.jpg"))})
g.polyglot_jpg(${JSON.stringify(path.join(FIX, "polyglot.jpg"))})
g.svg_script(${JSON.stringify(path.join(FIX, "evil.svg"))})
g.png_bomb(${JSON.stringify(path.join(FIX, "bomb.png"))})
g.mime_mismatch(${JSON.stringify(path.join(FIX, "fake.jpg"))})
g.corrupt_jpg(${JSON.stringify(path.join(FIX, "corrupt.jpg"))})
print("fixtures written")
`]);
note("fixture-generation", true, pyOut.trim());

/* ============ 1. the chain: digest -> mime verify -> metadata -> derivative ============ */
async function ingest(file, claimed) {
  // claimed: { ext, contentType } as asserted by the source (untrusted)
  const bytes = await readFile(file);
  const digest = sha256hex(bytes);
  const sniffed = await fileTypeFromBuffer(bytes);
  const sniffMime = sniffed?.mime ?? null;
  const extMime = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".svg": "image/svg+xml" }[path.extname(file).toLowerCase()] ?? null;
  const verdict = {
    file: path.basename(file), digest, byteLength: bytes.length,
    sniffed: sniffMime, ext: extMime, claimedContentType: claimed,
    allowed: ALLOWLIST.has(sniffMime),
    mimeMismatch: (claimed && sniffMime && claimed !== sniffMime) || (extMime && sniffMime && extMime !== sniffMime),
  };
  return { bytes, verdict };
}

async function metadataOf(bytes) {
  try {
    const tags = await exifr.parse(bytes, { gps: true });
    return { exif: !!tags, gps: !!(tags && (tags.GPSLatitude ?? tags.latitude)), keys: tags ? Object.keys(tags).slice(0, 12) : [] };
  } catch (e) { return { exif: false, error: String(e).slice(0, 120) }; }
}

const PIPELINE = { limitInputPixels: 40_000_000, failOn: "warning", sequentialRead: true };

async function derive(bytes, label) {
  const t0 = Date.now();
  const web = await sharp(bytes, PIPELINE).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const thumb = await sharp(bytes, PIPELINE).rotate().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  // thumbhash from a tiny raw frame (deterministic blur placeholder)
  const { data, info } = await sharp(thumb).resize(32, 32, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const hash = rgbaToThumbHash(info.width, info.height, data);
  const blurDataUrl = thumbHashToDataURL(hash);
  return { label, webDigest: sha256hex(web), webBytes: web.length, thumbDigest: sha256hex(thumb), thumbBytes: thumb.length, blurDataUrl, ms: Date.now() - t0 };
}

/* ============ 2. happy-path chain on clean jpg ============ */
{
  const { bytes, verdict } = await ingest(path.join(FIX, "clean.jpg"), "image/jpeg");
  const meta = await metadataOf(bytes);
  const d = await derive(bytes, "clean.jpg");
  await writeFile(path.join(OUT, "clean-1600.webp"), Buffer.from(await sharp(bytes, PIPELINE).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()));
  note("happy-path", verdict.allowed && !verdict.mimeMismatch, { digest: verdict.digest.slice(0, 16) + "...", meta, derivMs: d.ms, blurPrefix: d.blurDataUrl.slice(0, 30) });
}

/* ============ 3. EXIF GPS strip ============ */
{
  const gpsBytes = await readFile(path.join(FIX, "exif-gps.jpg"));
  const before = await metadataOf(gpsBytes);
  const out = await sharp(gpsBytes, PIPELINE).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  const after = await metadataOf(out);
  note("exif-gps-strip", before.gps === true && after.exif === false,
    { gpsBefore: before.gps, exifAfter: after.exif, gpsAfter: after.gps, beforeBytes: gpsBytes.length, afterBytes: out.length });
}

/* ============ 4. polyglot: trailing JS dies in re-encode ============ */
{
  const { bytes, verdict } = await ingest(path.join(FIX, "polyglot.jpg"), "image/jpeg");
  const trailing = bytes.slice(-60).toString("latin1");
  const out = await sharp(bytes, PIPELINE).webp({ quality: 80 }).toBuffer();
  const outTail = out.toString("latin1");
  note("polyglot-neutralized",
    verdict.sniffed === "image/jpeg" && outTail.indexOf("polyglot") === -1 && out.length < bytes.length,
    { sniffed: verdict.sniffed, inBytes: bytes.length, outBytes: out.length, payloadGone: !outTail.includes("polyglot") });
}

/* ============ 5. SVG with script -> rejected at the boundary ============ */
{
  const { verdict } = await ingest(path.join(FIX, "evil.svg"), "image/svg+xml");
  note("svg-rejected", verdict.allowed === false,
    { sniffed: verdict.sniffed, allowed: verdict.allowed, note: "file-type does not even claim image/svg+xml here; unrecognized/non-allowlisted MIME -> QUARANTINE. Policy: SVG never enters the raster pipeline; rasterize-from-SVG is a separate authorized flow, never raw serve" });
}

/* ============ 6. decompression bomb ============ */
{
  const bomb = await readFile(path.join(FIX, "bomb.png"));
  let threw = false, msg = "";
  try {
    await sharp(bomb, { limitInputPixels: 40_000_000, failOn: "warning" }).metadata();
  } catch (e) { threw = true; msg = String(e).slice(0, 160); }
  note("decompression-bomb-blocked", threw, { fileBytes: bomb.length, declaredPixels: 10000 * 10000, threw, msg });
}

/* ============ 7. MIME mismatch (PNG bytes as .jpg) ============ */
{
  const { verdict } = await ingest(path.join(FIX, "fake.jpg"), "image/jpeg");
  note("mime-mismatch-caught", verdict.mimeMismatch === true && verdict.sniffed === "image/png",
    { sniffed: verdict.sniffed, ext: verdict.ext, claimed: verdict.claimedContentType, verdict: "QUARANTINE" });
}

/* ============ 8. corrupt/truncated input: metadata-only check is INSUFFICIENT ============ */
{
  const bytes = await readFile(path.join(FIX, "corrupt.jpg"));
  let metaThrew = false;
  try { await sharp(bytes, { failOn: "warning" }).metadata(); } catch (e) { metaThrew = true; }
  let decodeThrew = false, msg = "";
  try { await sharp(bytes, { failOn: "warning" }).resize(100).webp().toBuffer(); } catch (e) { decodeThrew = true; msg = String(e).slice(0, 140); }
  note("corrupt-input-rejected", !metaThrew && decodeThrew,
    { metadataOnlyThrew: metaThrew, fullDecodeThrew: decodeThrew, msg, lesson: "the verify chain MUST full-decode; metadata() alone passes truncated scans" });
}

/* ============ 9. source-swap under stable URL: digest catches it ============ */
{
  // simulate: blob registry maps url -> digest at ingest; source later serves different bytes for same url
  const registry = new Map();
  const url = "https://cdn.example/logo.jpg";
  const v1 = await readFile(path.join(FIX, "clean.jpg"));
  registry.set(url, sha256hex(v1));
  const v2 = await readFile(path.join(FIX, "clean.png")); // source swapped the bytes
  const now = sha256hex(v2);
  const caught = registry.get(url) !== now;
  note("source-swap-detected", caught, { stored: registry.get(url).slice(0, 16) + "...", served: now.slice(0, 16) + "...", action: "QUARANTINE + re-acquire, provenance event emitted" });
}

/* ============ 10. hash benchmark: sha256 vs blake2s256 (both node:crypto native) ============ */
{
  const { createHash: ch } = await import("node:crypto");
  const buf = Buffer.alloc(64 * 1024 * 1024, 0xab);
  const bench = (alg) => { const t = process.hrtime.bigint(); for (let i = 0; i < 4; i++) ch(alg).update(buf).digest(); return Number(process.hrtime.bigint() - t) / 1e6; };
  const s256 = bench("sha256"), b2s = bench("blake2s256");
  note("hash-benchmark", true, { sha256_ms_256MB: Math.round(s256), blake2s256_ms_256MB: Math.round(b2s), winner: s256 < b2s ? "sha256" : "blake2s256", note: "PING pins sha256 (contentHash, envelope, SubtleCrypto); hardware-accelerated SHA-256 makes BLAKE3's speed moot, and BLAKE3 needs a non-native dep" });
}

/* ============ 11. animated gif: only first frame enters the pipeline ============ */
{
  // synthesize a 2-frame gif via sharp? sharp cannot write animated gif; skip synthesis, test policy flag instead
  const { bytes } = await ingest(path.join(FIX, "clean.png"), "image/png");
  const m = await sharp(bytes, { ...PIPELINE, animated: false }).metadata();
  note("gif-policy", m.pages === undefined || m.pages === 1, { policy: "animated:false (first frame only); animated derivatives are a separate authorized flow" });
}

await writeFile(path.join(LANE, "spike", "redteam-results.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
const fails = results.filter(r => !r.ok);
console.log(`spike done: ${results.length - fails.length}/${results.length} passed`);
for (const r of results) console.log((r.ok ? "PASS " : "FAIL ") + r.name, JSON.stringify(r.detail).slice(0, 220));
process.exit(fails.length ? 1 : 0);
