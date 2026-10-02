#!/usr/bin/env node
// owner-uploads fixture lab, batch 2: case-upl-50..99 (missions ACQ-1451..ACQ-1500).
// Second wave: polyglot edges, extension normalization limits, MIME strictness,
// size-cap boundaries, byte-shape variants, and newline filenames.
import { createHash } from "node:crypto";

const C = [];
const add = (id, title, threat, input, expect) => C.push({ id, title, threat, input, expect });

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.4\n", "latin1"), Buffer.alloc(100)]);
const RND = Buffer.from("randombytes-not-an-image", "latin1");
const GIF = Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.alloc(40)]);

add("case-upl-50", "gif bytes named jpg",
  "GIF magic is not sniffed: unknown kind, accepted ext -> mismatch.",
  { filename: "photo.jpg", bytes: GIF },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-51", "jpeg magic png ext png mime",
  "Magic is checked before MIME: mismatch holds even when MIME agrees with the name.",
  { filename: "a.png", bytes: JPG, declaredMime: "image/png" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-52", "uppercase PNG ext",
  "Extension normalization is case-insensitive.",
  { filename: "PHOTO.PNG", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-53", "uppercase risky middle",
  "Risky-extension matching is case-insensitive.",
  { filename: "photo.PHP.jpg", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-54", "tar gz png",
  "Benign multi-dot names are not punished.",
  { filename: "a.tar.gz.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-55", "php tar png",
  "Risky anywhere in the non-final parts holds the upload.",
  { filename: "a.php.tar.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-56", "spaces in filename",
  "Spaces are legal in upload names.",
  { filename: "my photo.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-57", "unicode filename",
  "Unicode names are legal.",
  { filename: "照片.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-58", "dotfile name",
  "Leading-dot names use the part after the dot.",
  { filename: ".png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-59", "uppercase script marker",
  "Marker scan is case-insensitive.",
  { filename: "a.png", bytes: Buffer.concat([PNG, Buffer.from("<SCRIPT>x</SCRIPT>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-60", "mixed-case onload",
  "Event-handler markers are case-insensitive.",
  { filename: "a.jpg", bytes: Buffer.concat([JPG, Buffer.from("x OnLoad=y", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-61", "nested script marker",
  "The marker substring is present regardless of nesting tricks.",
  { filename: "a.png", bytes: Buffer.concat([PNG, Buffer.from("<scr<scriptipt>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-62", "iframe in pdf",
  "Markers hold regardless of container.",
  { filename: "d.pdf", bytes: Buffer.concat([PDF, Buffer.from("<iframe src=x>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-63", "xml file",
  "XML declarations route to active-markup.",
  { filename: "data.xml", bytes: Buffer.from('<?xml version="1.0"?><data/>', "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content-type" }] });

add("case-upl-64", "doctype html",
  "Doctype declarations route to active-markup.",
  { filename: "p.html", bytes: Buffer.from("<!DOCTYPE html><html></html>", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content-type" }] });

add("case-upl-65", "svg with leading whitespace",
  "Leading whitespace is skipped before the markup sniff.",
  { filename: "i.svg", bytes: Buffer.from("  \n<svg></svg>", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content-type" }] });

add("case-upl-66", "svg with xml declaration",
  "XML-declared SVG routes to active-markup.",
  { filename: "i.svg", bytes: Buffer.from('<?xml version="1.0"?><svg></svg>', "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content-type" }] });

add("case-upl-67", "mime uppercase",
  "MIME comparison is strict: IMAGE/PNG does not satisfy image/png.",
  { filename: "a.png", bytes: PNG, declaredMime: "IMAGE/PNG" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-68", "mime empty string",
  "Empty MIME is a present-but-wrong declaration.",
  { filename: "a.png", bytes: PNG, declaredMime: "" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-69", "mime with charset",
  "Strict equality: parameters do not satisfy the agreement rule.",
  { filename: "a.png", bytes: PNG, declaredMime: "image/png; charset=binary" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-70", "upl_bytes exact",
  "The byte count is claimed exactly.",
  { filename: "a.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_bytes: 108 } });

add("case-upl-71", "quarantine claims no type",
  "Held uploads never get a type claim.",
  { filename: "a.png", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    absent_claims: ["upl_type", "upl_bytes"] });

add("case-upl-72", "exactly at the size cap",
  "Boundary: 20 MiB is accepted.",
  { filename: "big.png", bytes: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20 * 1024 * 1024 - 8)]) },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-73", "one byte over the cap",
  "Boundary: 20 MiB + 1 is rejected.",
  { filename: "big.png", bytes: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20 * 1024 * 1024 - 7)]) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "over-size-cap" });

add("case-upl-74", "raw uint8array bytes",
  "Plain Uint8Array (not Buffer) is accepted.",
  { filename: "a.png", bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]) },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-75", "arraybuffer bytes",
  "ArrayBuffer is not a Uint8Array.",
  { filename: "a.png", bytes: new ArrayBuffer(10) },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-bytes" });

add("case-upl-76", "extra fields ignored",
  "Unknown input fields are not claims and not failures.",
  { filename: "a.png", bytes: PNG, owner: "nobody", tags: ["x"] },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-77", "newline in filename",
  "Newlines ride into headers: held.",
  { filename: "a\nb.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-78", "cr in filename",
  "Carriage returns are held too.",
  { filename: "a\rb.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-79", "dotted name",
  "Benign dots are fine.",
  { filename: "my.photo.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-80", "php among dots",
  "Risky extension anywhere non-final holds.",
  { filename: "my.php.photo.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-81", "onerror in pdf",
  "Event-handler markers hold PDF uploads.",
  { filename: "d.pdf", bytes: Buffer.concat([PDF, Buffer.from("x onerror=z", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-82", "script after png end",
  "Trailing markers still count: the whole byte range is scanned.",
  { filename: "a.png", bytes: Buffer.concat([PNG, Buffer.from("IEND<script>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-83", "very long filename",
  "Filename length alone is not a signal.",
  { filename: "a".repeat(1000) + ".png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-84", "bare pdf magic",
  "Four magic bytes suffice for the gate sniff.",
  { filename: "d.pdf", bytes: Buffer.from("%PDF", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "pdf" } });

add("case-upl-85", "bare jpeg soi",
  "Two magic bytes suffice for the gate sniff.",
  { filename: "a.jpg", bytes: Buffer.from([0xff, 0xd8]) },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-86", "seven byte png magic",
  "Seven of eight magic bytes is not PNG: unknown kind, accepted ext -> mismatch.",
  { filename: "a.png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-87", "jfif extension",
  ".jfif is not in the accepted extension set.",
  { filename: "photo.jfif", bytes: JPG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-88", "explicit undefined mime",
  "Absent MIME is fine when magic and extension agree.",
  { filename: "a.png", bytes: PNG, declaredMime: undefined },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-89", "double dot name",
  "Conservative: any '..' holds the upload.",
  { filename: "a..b.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "unsafe-filename" }] });

add("case-upl-90", "trailing space in extension",
  "Extensions are not trimmed: '.png ' mismatches.",
  { filename: "photo.png ", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-91", "uppercase js middle",
  "Risky matching is case-insensitive.",
  { filename: "x.JS.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-92", "mjs middle",
  "Module scripts count as risky.",
  { filename: "x.mjs.png", bytes: PNG },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-filename", reason: "double-extension" }] });

add("case-upl-93", "pdf with png mime",
  "MIME must match the magic kind.",
  { filename: "d.pdf", bytes: PDF, declaredMime: "image/png" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "mime-mismatch" }] });

add("case-upl-94", "uppercase jpg with mime",
  "Normalization plus MIME agreement.",
  { filename: "P.JPG", bytes: JPG, declaredMime: "image/jpeg" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "jpeg" } });

add("case-upl-95", "kitchen sink quarantine",
  "Marker scan fires before extension and magic checks.",
  { filename: "evil.php.png", bytes: Buffer.concat([PNG, Buffer.from("<script>", "latin1")]) },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "active-content" }] });

add("case-upl-96", "kitchen sink accept",
  "Unicode, spaces, uppercase ext, MIME: all agree.",
  { filename: "mi foto 1.PNG", bytes: PNG, declaredMime: "image/png" },
  { outcome: "bounded_success", claims: { upl_verdict: "accept", upl_type: "png" } });

add("case-upl-97", "random bytes png mime",
  "Magic check precedes MIME: extension-mismatch, not mime-mismatch.",
  { filename: "photo.png", bytes: RND, declaredMime: "image/png" },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-98", "single byte png ext",
  "One unrecognized byte with an accepted extension.",
  { filename: "f.png", bytes: Buffer.from("x", "latin1") },
  { outcome: "bounded_success", claims: { upl_verdict: "quarantine" },
    required_quarantined: [{ property: "upload-bytes", reason: "extension-mismatch" }] });

add("case-upl-99", "missing bytes",
  "Bytes are required.",
  { filename: "a.png" },
  { outcome: "typed_failure", failure_class: "INVALID_PAYLOAD", failure_signal: "bad-bytes" });

// ---- manifest: missions ACQ-1451..ACQ-1500 ----
const manifest = C.map((c, idx) => {
  const digest = createHash("sha256").update(JSON.stringify({ filename: c.input?.filename, len: c.input?.bytes?.length ?? 0 })).digest("hex");
  return { case_id: c.id, mission: `ACQ-${String(1451 + idx).padStart(4, "0")}`,
           title: c.title, threat: c.threat, fixture_sha256: digest,
           fixture_bytes: c.input?.bytes?.length ?? 0, expect: c.expect };
});
const manifestUpl2 = manifest;

export { C, manifest, manifestUpl2 };
export function getCase(id) { return C.find((c) => c.id === id); }
