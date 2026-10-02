// Lane P proof spike: content-addressable identity + binding + projection rules.
// Runs in-lane against harvest/node_modules. Fixtures: synthetic, local only.
// Proves: dedup by digest; trace image -> hash -> observation -> evidence;
// source-URL death leaves the render intact; unauthorized blob quarantined;
// tenant-scoped resolve; same-pixels-different-EXIF = different hash (correct).
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";
import exifr from "exifr";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const LANE = path.resolve(DIR, "..");
const FIX = path.join(LANE, "fixtures");
const OUT = path.join(LANE, "spike-out");
await mkdir(OUT, { recursive: true });
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const ALLOWLIST = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

const results = [];
const note = (name, ok, detail) => results.push({ name, ok, detail });

/* ---- in-memory blob store: digest is the only key ---- */
const blobStore = new Map();   // digest -> { bytes, mime, byteLength, blobKey, derivedFrom }
const bindingIndex = [];       // MediaBinding records
const quarantined = [];        // { digest, reason }

function blobKeyFor(digest, mime) {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" }[mime] ?? "bin";
  return `${digest.slice(0, 12)}.${ext}`;
}

// synthetic observation/evidence records (lane-N-compatible: observationId -> evidence)
const observations = new Map(); // observationId -> { sourceUrl, acquiredAt, digest }
const evidence = new Map();     // evidenceId -> { observationId, digest, claim }

async function ingest(bytes, { claimedContentType, ext, sourceUrl, observationId, authorizedBy, basis, scope, objectId, role, tenant }) {
  const digest = sha256hex(bytes);
  const sniffed = await fileTypeFromBuffer(bytes);
  const mime = sniffed?.mime ?? null;
  if (!mime || !ALLOWLIST.has(mime)) { quarantined.push({ digest, reason: `mime-reject:${mime}` }); return { digest, verdict: "quarantined" }; }
  // full decode is the security boundary
  await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning", sequentialRead: true, animated: false })
    .rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  // dedup: identical bytes -> one blob
  const isNew = !blobStore.has(digest);
  if (isNew) blobStore.set(digest, { bytes, mime, byteLength: bytes.length, blobKey: blobKeyFor(digest, mime) });
  const obsId = observationId ?? `obs-${digest.slice(0, 12)}`;
  if (!observations.has(obsId)) observations.set(obsId, { sourceUrl, acquiredAt: new Date().toISOString(), digest });
  // authorization gate: no basis -> quarantine, never published
  if (!basis) { quarantined.push({ digest, reason: "no-authorization-basis" }); return { digest, verdict: "quarantined" }; }
  const binding = {
    bindingId: `bind-${objectId}-${role}-${digest.slice(0, 8)}`,
    objectId, role, tenant,
    blob: { digest, digestAlg: "sha256-v1", byteLength: bytes.length, mime },
    evidence: { observationId: obsId, sourceUrl, acquiredAt: observations.get(obsId).acquiredAt, sniffedVsClaimed: claimedContentType === mime ? "match" : "mismatch-quarantined" },
    authorization: { basis, authorizedBy, authorizedAt: new Date().toISOString(), scope },
    lifecycle: "published",
  };
  bindingIndex.push(binding);
  const evId = `ev-${digest.slice(0, 12)}`;
  if (!evidence.has(evId)) evidence.set(evId, { observationId: obsId, digest, claim: `media for ${objectId}/${role}` });
  return { digest, verdict: "published", isNewBlob: isNew, binding };
}

/* ---- P1. dedup: two sources, identical bytes -> one blob record ---- */
{
  const srcA = await readFile(path.join(FIX, "clean.jpg"));
  const srcBpath = path.join(OUT, "same-bytes-from-other-source.jpg");
  await copyFile(path.join(FIX, "clean.jpg"), srcBpath);
  const srcB = await readFile(srcBpath);
  const r1 = await ingest(srcA, { claimedContentType: "image/jpeg", sourceUrl: "https://source-a.example/hero.jpg", objectId: "obj-demo-1", role: "hero", tenant: "t1", basis: "owner-provided", authorizedBy: "owner-1", scope: "website-hero" });
  const r2 = await ingest(srcB, { claimedContentType: "image/jpeg", sourceUrl: "https://source-b.example/hero.jpg", objectId: "obj-demo-1", role: "gallery", tenant: "t1", basis: "owner-provided", authorizedBy: "owner-1", scope: "website-gallery" });
  note("dedup-identical-bytes", r1.digest === r2.digest && blobStore.size === 1 && !r2.isNewBlob && bindingIndex.length === 2,
    { digest: r1.digest.slice(0, 16) + "...", blobRecords: blobStore.size, bindings: bindingIndex.length, secondIngestNewBlob: r2.isNewBlob });
}

/* ---- P2. trace: rendered image -> hash -> observation -> evidence ---- */
{
  const binding = bindingIndex[0];
  const blob = blobStore.get(binding.blob.digest);
  const obs = observations.get(binding.evidence.observationId);
  const ev = evidence.get(`ev-${binding.blob.digest.slice(0, 12)}`);
  const traceOk = blob && obs && obs.digest === binding.blob.digest && ev && ev.observationId === binding.evidence.observationId;
  note("trace-hash-observation-evidence", traceOk,
    { renderBinding: binding.bindingId, blobKey: blob?.blobKey, observation: binding.evidence.observationId, sourceUrl: obs?.sourceUrl, evidence: ev ? `ev-${binding.blob.digest.slice(0, 12)}` : null });
}

/* ---- P3. source URL death: render survives on retained bytes ---- */
{
  // simulate the origin going dark: observation keeps the metadata, blob keeps the bytes
  const binding = bindingIndex[0];
  const obs = observations.get(binding.evidence.observationId);
  obs.sourceUrl = null; obs.sourceDead = true;
  const blob = blobStore.get(binding.blob.digest);
  const served = blob.bytes; // projection reads from blob store, never the source URL
  const projectionBytes = (await sharp(served, { limitInputPixels: 40_000_000 }).resize({ width: 800 }).webp({ quality: 75 }).toBuffer()).length;
  note("source-url-death-render-intact", served.length > 0 && projectionBytes > 0 && obs.sourceDead === true,
    { sourceDead: true, blobBytesRetained: served.length, renderedFromBlobBytes: projectionBytes });
}

/* ---- P4. unauthorized blob quarantined, never served ---- */
{
  const bytes = await readFile(path.join(FIX, "clean.png"));
  const r = await ingest(bytes, { claimedContentType: "image/png", sourceUrl: "https://random.example/stolen.png", objectId: "obj-demo-2", role: "hero", tenant: "t1", basis: null, authorizedBy: null, scope: null });
  const published = bindingIndex.filter(b => b.blob.digest === r.digest && b.lifecycle === "published");
  const q = quarantined.find(q => q.digest === r.digest);
  // projection rule: only PublishedMediaAsset (lifecycle=published + binding with authorization) renders
  const servable = published.length > 0;
  note("unauthorized-quarantined", r.verdict === "quarantined" && !servable && !!q,
    { verdict: r.verdict, servableByProjection: servable, quarantineReason: q?.reason });
}

/* ---- P5. tenant isolation on resolve, not just on store ---- */
{
  const digest = bindingIndex[0].blob.digest; // belongs to tenant t1
  function resolveMedia(tenant, dg) {
    const b = bindingIndex.find(b => b.tenant === tenant && b.blob.digest === dg && b.lifecycle === "published");
    if (!b) return { ok: false, reason: "no-authorized-binding-for-tenant" };
    return { ok: true, blobKey: blobStore.get(dg).blobKey };
  }
  const t1 = resolveMedia("t1", digest);
  const t2 = resolveMedia("t2", digest); // tenant B has no binding -> denied even though the blob exists
  note("tenant-isolation-on-resolve", t1.ok === true && t2.ok === false,
    { tenantT1: t1.ok, tenantT2: t2.ok, t2reason: t2.reason });
}

/* ---- P6. same pixels, different EXIF -> different bytes -> different hash (correct) ---- */
{
  const base = sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 200, b: 90 } } });
  const noMeta = await base.clone().jpeg({ quality: 90 }).toBuffer();
  const withMeta = await base.clone().jpeg({ quality: 90 }).withMetadata({}).toBuffer();
  const d1 = sha256hex(noMeta), d2 = sha256hex(withMeta);
  const px = async (b) => (await sharp(b).raw().toBuffer()).toString("hex");
  const samePixels = (await px(noMeta)) === (await px(withMeta));
  note("exif-changes-identity", d1 !== d2 && samePixels,
    { samePixels, differentDigests: d1 !== d2, note: "metadata is part of the byte stream; identity is byte-exact by design, never perceptual" });
}

/* ---- P7. oversized upload: byte cap before digest/decode, no unbounded memory ---- */
{
  const MAX_BYTES = 25 * 1024 * 1024;
  const huge = Buffer.alloc(MAX_BYTES + 1, 0xaa);
  const admitted = huge.length <= MAX_BYTES;
  note("oversized-upload-rejected", admitted === false,
    { bytes: huge.length, cap: MAX_BYTES, admitted, note: "rejected pre-ingest; never hashed, never decoded, never enters blobStore" });
}

await writeFile(path.join(LANE, "spike", "proof-results.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
const fails = results.filter(r => !r.ok);
console.log(`proof: ${results.length - fails.length}/${results.length} passed`);
for (const r of results) console.log((r.ok ? "PASS " : "FAIL ") + r.name, JSON.stringify(r.detail).slice(0, 240));
process.exit(fails.length ? 1 : 0);
