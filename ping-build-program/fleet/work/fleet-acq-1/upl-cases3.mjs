#!/usr/bin/env node
// owner-uploads fixture lab, batch 3: case-upl-100..149 (missions ACQ-1501..ACQ-1550).
// Final wave: the full risky-extension roster, marker case variants, check
// ordering guarantees, strict-sniff edges, and the last malformed shapes.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n", "latin1"), Buffer.alloc(100)]);
const RND = Buffer.from("randombytes-not-an-image", "latin1");
const dbl = (mid, kind) => ({ filename: `x.${mid}.png`, bytes: kind });

// ---- the risky roster ----
for (const [i, ext] of ["phtml", "scr", "jar", "msi", "dll", "bat", "cmd", "com", "sh", "htm"].entries()) {
  add(`case-upl-${100 + i}`, `${ext} in the middle`,
    `Non-final .${ext} holds the upload.`,
    dbl(ext, PNG),
    { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
      required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });
}

add("case-upl-110", "uppercase php marker",
  "Marker scan is case-insensitive.",
  { filename: "a.png", bytes: Buffer.concat([PNG, Buffer.from("<?PHP echo 1;", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-111", "uppercase iframe marker",
  "Marker scan is case-insensitive.",
  { filename: "a.png", bytes: Buffer.concat([PNG, Buffer.from("<IFRAME src=x>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-112", "uppercase onerror marker",
  "Marker scan is case-insensitive.",
  { filename: "a.jpg", bytes: Buffer.concat([JPG, Buffer.from("x ONERROR=y", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-113", "bom before pdf magic",
  "Strict offset-0 sniff: a BOM defeats the magic match.",
  { filename: "d.pdf", bytes: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), PDF]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-114", "uppercase pdf ext",
  "Extension normalization is case-insensitive.",
  { filename: "D.PDF", bytes: PDF },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "pdf" } });

add("case-upl-115", "dotfile jpg",
  "Leading-dot names route on the part after the dot.",
  { filename: ".jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-116", "single-char ext",
  "Unlisted extensions mismatch against known magic.",
  { filename: "a.b", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-117", "image slash jpg mime",
  "The common wrong MIME does not satisfy strict equality.",
  { filename: "a.jpg", bytes: JPG, declaredMime: "image/jpg" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-118", "pdf mime on png",
  "MIME must match the magic kind, not the wish.",
  { filename: "a.png", bytes: PNG, declaredMime: "application/pdf" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-119", "format claim on quarantine",
  "The format claim is emitted before any hold.",
  { filename: "a.png", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine", upl_format: "upload" } });

add("case-upl-120", "hundred dot name",
  "Benign dots are never risky.",
  { filename: "a.".repeat(50) + "png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-121", "marker deep in 1MB",
  "The whole byte range is scanned, not just the head.",
  { filename: "a.png", bytes: Buffer.concat([PNG, Buffer.alloc(1024 * 1024), Buffer.from("<script>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-122", "pdf magic png ext pdf mime",
  "Magic-vs-extension is checked before MIME.",
  { filename: "photo.png", bytes: PDF, declaredMime: "application/pdf" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-123", "pdf with png mime",
  "MIME must match the magic kind.",
  { filename: "d.pdf", bytes: PDF, declaredMime: "image/png" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-124", "fullwidth extension",
  "Fullwidth glyphs are not normalized: mismatch.",
  { filename: "photo.ｐｎｇ", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-125", "mixed-case png ext",
  "Normalization handles mixed case.",
  { filename: "a.PnG", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-126", "doubled png ext",
  "'png' is not risky: accepted.",
  { filename: "photo.png.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-127", "jpg then png",
  "Non-final 'jpg' is not risky: accepted as PNG.",
  { filename: "photo.jpg.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-128", "nul mid filename",
  "Embedded NUL is held.",
  { filename: "ab\0cd.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-129", "null mime",
  "Null MIME fails the type check.",
  { filename: "a.png", bytes: PNG, declaredMime: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-mime-type" });

add("case-upl-130", "null bytes",
  "Null bytes fail the type check.",
  { filename: "a.png", bytes: null },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-bytes" });

add("case-upl-131", "array input",
  "Arrays are not uploads.",
  [],
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-upl-132", "string input",
  "Strings are not uploads.",
  "upload",
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-upl-133", "zero filename",
  "Numbers are not filenames.",
  { filename: 0, bytes: PNG },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-filename" });

add("case-upl-134", "xml with script",
  "Marker scan fires before kind routing.",
  { filename: "d.xml", bytes: Buffer.from('<?xml?><svg><script>x</script></svg>', "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-135", "html with script",
  "Marker scan fires before kind routing.",
  { filename: "p.html", bytes: Buffer.from("<html><script>x</script></html>", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-136", "uppercase png ext jpeg magic",
  "Normalization does not save a magic mismatch.",
  { filename: "photo.PNG", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-137", "six dot name",
  "Benign dots are fine.",
  { filename: "a.b.c.d.e.f.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-138", "php as basename",
  "A risky first part still holds: php.png.",
  { filename: "php.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-139", "exe as basename",
  "A risky first part still holds: exe.jpg.",
  { filename: "exe.jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-140", "php ext random bytes",
  "Unlisted extension with unknown magic: UNSUPPORTED.",
  { filename: "file.php", bytes: RND },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-141", "php ext php bytes",
  "The marker fires before the unsupported path.",
  { filename: "file.php", bytes: Buffer.from("<?php echo 1;", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-142", "upl_bytes on jpeg",
  "Exact byte count on a JPEG accept.",
  { filename: "a.jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_bytes: 104 } });

add("case-upl-143", "unsafe beats mismatch",
  "Check order: filename safety (2) precedes magic/extension (5).",
  { filename: "../../a.png", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-144", "markers beat unsafe names",
  "Check order: active-content scan (1) precedes filename safety (2).",
  { filename: "../../a.png", bytes: Buffer.concat([PNG, Buffer.from("<script>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-145", "jpeg ext with mime",
  "All three agree.",
  { filename: "photo.jpeg", bytes: JPG, declaredMime: "image/jpeg" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-146", "pdf with mime",
  "All three agree.",
  { filename: "d.pdf", bytes: PDF, declaredMime: "application/pdf" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "pdf" } });

add("case-upl-147", "jfif bytes",
  "Real-world JPEG with JFIF header.",
  { filename: "a.jpg", bytes: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("JFIF\0", "latin1"), Buffer.alloc(60)]) },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-148", "script buried in pdf",
  "Markers fire inside binary regions too.",
  { filename: "d.pdf", bytes: Buffer.concat([PDF, Buffer.alloc(500), Buffer.from("<script>", "latin1"), Buffer.alloc(500)]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-149", "final unicode pdf",
  "Unicode name, PDF magic, MIME: all agree.",
  { filename: "contrat final.PDF", bytes: PDF, declaredMime: "application/pdf" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "pdf" } });

// ---- manifest: missions ACQ-1501..ACQ-1550 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify({ filename: c.input?.filename, len: c.input?.bytes?.length ?? 0 })).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1501 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.input?.bytes?.length ?? 0, expect: c.expect };
});
const manifestUpl3 = manifest;

export { C, manifest, manifestUpl3 };
export function getCase(id) { return C.find((c) => c.id === id); }
