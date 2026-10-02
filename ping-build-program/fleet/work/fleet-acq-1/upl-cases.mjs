#!/usr/bin/env node
// owner-uploads fixture lab, batch 1: case-upl-0..49 (missions ACQ-1401..ACQ-1450).
// The upload gate: magic-vs-extension-vs-MIME consistency plus active-content
// screening. Magic-sniff only; structural parsing belongs to the parser lanes.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n", "latin1"), Buffer.alloc(100)]);
const RND = Buffer.from("randombytes-not-an-image", "latin1");

// ---- baseline accepts ----
add("case-upl-0", "baseline png",
  "Magic, extension agree.",
  { filename: "photo.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-1", "baseline jpg",
  "Magic, extension agree.",
  { filename: "photo.jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-2", "jpeg extension",
  ".jpeg is an accepted JPEG extension.",
  { filename: "photo.jpeg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-3", "baseline pdf",
  "Magic, extension agree.",
  { filename: "doc.pdf", bytes: PDF },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "pdf" } });

add("case-upl-4", "uppercase extension",
  "Extensions are normalized to lowercase.",
  { filename: "PHOTO.JPG", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-5", "mixed-case extension",
  "Normalization applies to every case.",
  { filename: "Doc.PDF", bytes: PDF },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "pdf" } });

// ---- mismatches: quarantined, never reclassified ----
add("case-upl-6", "png ext with jpeg bytes",
  "Magic wins over the name; held, not relabeled.",
  { filename: "photo.png", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-7", "jpg ext with png bytes",
  "Magic wins over the name.",
  { filename: "photo.jpg", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-8", "pdf ext with png bytes",
  "Magic wins over the name.",
  { filename: "doc.pdf", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-9", "unknown ext unknown bytes",
  "Nothing recognizable: UNSUPPORTED, not a guess.",
  { filename: "file.xyz", bytes: RND },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-10", "png ext unknown bytes",
  "Extension claims an accepted type but magic is unrecognized.",
  { filename: "photo.png", bytes: RND },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-11", "no extension",
  "Extensionless uploads cannot be routed.",
  { filename: "photo", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "missing-extension" }] });

add("case-upl-12", "trailing dot",
  "Empty extension is missing.",
  { filename: "photo.", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "missing-extension" }] });

// ---- double extensions ----
add("case-upl-13", "php in the middle",
  "Classic smuggling shape.",
  { filename: "photo.php.jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-14", "exe in the middle",
  "Risky non-final extension is held even with valid JPEG magic.",
  { filename: "runme.exe.jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-15", "js in the middle",
  "Risky non-final extension.",
  { filename: "avatar.js.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

// ---- active content ----
add("case-upl-16", "script appended to png",
  "Markers anywhere in the bytes hold the upload.",
  { filename: "photo.png", bytes: Buffer.concat([PNG, Buffer.from("<script>alert(1)</script>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-17", "svg with script",
  "The marker scan fires before kind routing.",
  { filename: "icon.svg", bytes: Buffer.from("<svg><script>alert(1)</script></svg>", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-18", "plain svg",
  "Scriptless SVG is still never accepted as an upload.",
  { filename: "icon.svg", bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content-type" }] });

add("case-upl-19", "html file",
  "HTML is never an accepted upload kind.",
  { filename: "page.html", bytes: Buffer.from("<html><body>hi</body></html>", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content-type" }] });

add("case-upl-20", "php shell",
  "The <?php marker holds it before extension routing.",
  { filename: "shell.php", bytes: Buffer.from("<?php system($_GET['c']);", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-21", "php middle clean png",
  "No markers; the double-extension rule holds it.",
  { filename: "img.php.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

// ---- MIME ----
add("case-upl-22", "mime mismatch",
  "Declared MIME must agree with magic.",
  { filename: "photo.png", bytes: PNG, declaredMime: "image/jpeg" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-23", "mime match",
  "All three signals agree: accept.",
  { filename: "photo.png", bytes: PNG, declaredMime: "image/png" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-24", "mime octet-stream on pdf",
  "Generic MIME does not satisfy the agreement rule.",
  { filename: "doc.pdf", bytes: PDF, declaredMime: "application/octet-stream" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

// ---- malformed input: typed failures ----
add("case-upl-25", "empty bytes",
  "Empty uploads are malformed.",
  { filename: "photo.png", bytes: Buffer.alloc(0) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-bytes" });

add("case-upl-26", "missing filename",
  "Filename is required.",
  { bytes: PNG },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-filename" });

add("case-upl-27", "empty filename",
  "Empty names are malformed.",
  { filename: "", bytes: PNG },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "empty-filename" });

add("case-upl-28", "numeric filename",
  "Filenames must be strings.",
  { filename: 123, bytes: PNG },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-filename" });

add("case-upl-29", "bytes as string",
  "Bytes must be byte arrays.",
  { filename: "photo.png", bytes: "notbytes" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-bytes" });

add("case-upl-30", "null input",
  "Null is not an upload.",
  null,
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "not-an-object" });

add("case-upl-31", "over the size cap",
  "21 MiB exceeds the 20 MiB upload cap.",
  { filename: "big.png", bytes: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(21 * 1024 * 1024)]) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-size-cap" });

// ---- gate scope edges ----
add("case-upl-32", "truncated png accepted",
  "Magic-sniff only: 8 valid magic bytes are a PNG to the gate; structural validation is the parser lane's job.",
  { filename: "t.png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png", upl_bytes: 8 } });

add("case-upl-33", "onload in jpeg bytes",
  "Event-handler markers hold the upload even inside image bytes.",
  { filename: "photo.jpg", bytes: Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from('COM onload=alert(1)', "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-34", "script inside pdf",
  "Markers hold regardless of container.",
  { filename: "doc.pdf", bytes: Buffer.concat([Buffer.from("%PDF-1.4 ", "latin1"), Buffer.from("<script>x</script>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

// ---- unsafe filenames ----
add("case-upl-35", "path traversal",
  "Separators and '..' are held, never sanitized.",
  { filename: "../../x.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-36", "backslash separator",
  "Windows separators count too.",
  { filename: "dir\\photo.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-37", "dotdot in name",
  "Conservative: any '..' holds the upload.",
  { filename: "a..png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-38", "nul in filename",
  "NUL bytes are held.",
  { filename: "a\0.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

// ---- unsupported types ----
add("case-upl-39", "gif upload",
  "GIF is not an accepted upload type.",
  { filename: "anim.gif", bytes: Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.alloc(40)]) },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-40", "webp upload",
  "WebP is not an accepted upload type.",
  { filename: "photo.webp", bytes: Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBP", "latin1"), Buffer.alloc(40)]) },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-41", "bmp upload",
  "BMP is not an accepted upload type.",
  { filename: "photo.bmp", bytes: Buffer.concat([Buffer.from("BM", "latin1"), Buffer.alloc(40)]) },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-42", "zip upload",
  "Archives are not accepted uploads.",
  { filename: "a.zip", bytes: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(40)]) },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-43", "exe upload",
  "Executables are not accepted uploads.",
  { filename: "setup.exe", bytes: Buffer.concat([Buffer.from("MZ", "latin1"), Buffer.alloc(40)]) },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

add("case-upl-44", "txt upload",
  "Plain text is not an accepted upload type.",
  { filename: "notes.txt", bytes: Buffer.from("hello world", "latin1") },
  { outcome: "typed_failure", failure_class: "UNSUPPORTED", failure_signal: "unknown-type" });

// ---- strict offset-0 sniffing ----
add("case-upl-45", "pdf with leading space",
  "Strict sniff: magic must be at offset 0.",
  { filename: "doc.pdf", bytes: Buffer.concat([Buffer.from(" ", "latin1"), PDF]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-46", "jpeg with leading garbage",
  "Strict sniff: no resync guessing.",
  { filename: "photo.jpg", bytes: Buffer.concat([Buffer.from("junk", "latin1"), JPG]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

// ---- kitchen sinks ----
add("case-upl-47", "png magic jpg ext jpeg mime",
  "Magic disagrees with both name and MIME: held on the magic/extension check first.",
  { filename: "a.jpg", bytes: PNG, declaredMime: "image/jpeg" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-48", "bad mime type shape",
  "Non-string MIME is malformed input.",
  { filename: "doc.pdf", bytes: PDF, declaredMime: 123 },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-mime-type" });

add("case-upl-49", "final clean accept",
  "Mixed-case name, all signals agree.",
  { filename: "Final Photo.JPEG", bytes: JPG, declaredMime: "image/jpeg" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

// ---- manifest: missions ACQ-1401..ACQ-1450 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify({ filename: c.input?.filename, len: c.input?.bytes?.length ?? 0 })).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1401 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.input?.bytes?.length ?? 0, expect: c.expect };
});
const manifestUpl = manifest;

export { C, manifest, manifestUpl };
export function getCase(id) { return C.find((c) => c.id === id); }
