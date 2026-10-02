#!/usr/bin/env node
// upl-harness.mjs — owner-uploads boundary lab.
//
// An upload gate validator. Doctrine:
// - NEVER turn parser guess into fact. The gate sniffs magic bytes at offset
//   0, compares them against the filename extension and the declared MIME,
//   and screens for active-content markers. It never declares what an
//   unknown file IS; mismatches are quarantined, unknown types are
//   UNSUPPORTED, malformed input gets typed lane-K INVALID_PAYLOAD.
// - Scope is deliberately the GATE, not the parser: magic-sniff only.
//   Structural validation belongs to the parser lanes (image-metadata,
//   documents-pdf). A truncated-but-magic-valid file is accepted with its
//   sniffed type; the parser lane owns deeper validation.
// - SVG/HTML are never accepted as uploads (active content possible).
// - Filenames with path separators, "..", or NUL are quarantined, not
//   silently sanitized (sanitizing would be guessing intent).
export const UPL_PARSER_VERSION = "upl-harness/1.0.0";

const U_LIMITS = {
  maxBytes: 20 * 1024 * 1024, // 20 MiB upload cap
};

// Active-content markers: presence anywhere in the bytes quarantines the
// upload. Case-insensitive latin1 scan, bounded by the size cap.
const ACTIVE_MARKERS = ["<script", "<?php", "<iframe", "onload=", "onerror="];

// Non-final extensions that make an upload suspicious regardless of the
// final extension (classic double-extension smuggling).
const RISKY_EXTS = new Set([
  "php", "php3", "phtml", "exe", "js", "mjs", "html", "htm",
  "sh", "bat", "cmd", "com", "msi", "dll", "scr", "jar",
]);

const ALLOWED = {
  png: ["png"],
  jpeg: ["jpg", "jpeg"],
  pdf: ["pdf"],
};
const ALL_ALLOWED_EXTS = new Set(Object.values(ALLOWED).flat());
const MIME = { png: "image/png", jpeg: "image/jpeg", pdf: "application/pdf" };

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function sniffKind(bytes) {
  if (bytes.length >= 8 && PNG_MAGIC.every((b, i) => bytes[i] === b)) return "png";
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
    return "pdf";
  // Active markup: optional whitespace/BOM then a markup open.
  const head = Buffer.from(bytes.subarray(0, 64)).toString("latin1").toLowerCase()
    .replace(/^(\s|\ufeff)*/, "");
  if (head.startsWith("<svg") || head.startsWith("<?xml") || head.startsWith("<html") ||
      head.startsWith("<!doctype"))
    return "active-markup";
  return "unknown";
}

function runUploadCase(input, sourceRef) {
  const R = { outcome: "bounded_success", claims: [], quarantined: [], truncated: {}, failure: null };
  const put = (field, value, locator) =>
    R.claims.push({ field, value, provenance: [{ source: "upload-bytes", locator }], parser: UPL_PARSER_VERSION });
  const quar = (property, where, reason, detail) =>
    R.quarantined.push({ property, where, reason, detail });
  const fail = (signal, detail) => ({
    outcome: "typed_failure", claims: [], quarantined: [], truncated: {},
    failure: {
      record_type: "ping.connector.failure.v1",
      class: signal === "unknown-type" ? "UNSUPPORTED" : "INVALID_PAYLOAD",
      retryable: false, terminal: true,
      provider_signal: { native_code: signal, detail: String(detail).slice(0, 500) },
      evidence_refs: [sourceRef],
    },
  });

  if (!input || typeof input !== "object" || Array.isArray(input))
    return fail("not-an-object", "input must be {filename, bytes, declaredMime?}");
  const { filename, bytes, declaredMime } = input;
  if (typeof filename !== "string") return fail("bad-filename", "filename must be a string");
  if (filename.length === 0) return fail("empty-filename", "filename is required");
  if (!(bytes instanceof Uint8Array)) return fail("bad-bytes", "bytes must be a Uint8Array/Buffer");
  if (bytes.length === 0) return fail("empty-bytes", "upload is empty");
  if (bytes.length > U_LIMITS.maxBytes)
    return fail("over-size-cap", `upload ${bytes.length} bytes exceeds ${U_LIMITS.maxBytes}`);
  if (declaredMime !== undefined && typeof declaredMime !== "string")
    return fail("bad-mime-type", "declaredMime must be a string");

  put("upl_format", "upload", "input shape {filename, bytes, declaredMime?}");

  // 1. Active-content markers anywhere in the bytes.
  const text = Buffer.from(bytes.subarray(0, bytes.length)).toString("latin1").toLowerCase();
  for (const m of ACTIVE_MARKERS) {
    if (text.includes(m)) {
      quar("upload-bytes", `marker ${m}`, "active-content",
        `active-content marker ${m} found in upload bytes; held for review, never executed`);
      put("upl_verdict", "quarantine", `active-content marker ${m} present`);
      return R;
    }
  }

  // 2. Unsafe filenames are held, never silently rewritten. Newlines ride
  // along because filenames end up in Content-Disposition headers.
  if (/[/\\]/.test(filename) || filename.includes("..") || filename.includes("\0") ||
      filename.includes("\n") || filename.includes("\r")) {
    quar("upload-filename", "filename", "unsafe-filename",
      "filename contains path separators, '..', or NUL; held for review");
    put("upl_verdict", "quarantine", "unsafe filename");
    return R;
  }

  // 3. Extension handling.
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  if (!ext) {
    quar("upload-filename", "extension", "missing-extension",
      "no filename extension; the gate cannot route extensionless uploads");
    put("upl_verdict", "quarantine", "missing extension");
    return R;
  }
  for (const p of parts.slice(0, -1)) {
    if (RISKY_EXTS.has(p.toLowerCase())) {
      quar("upload-filename", `extension ${p}`, "double-extension",
        `non-final extension '${p}' is in the risky set; held for review`);
      put("upl_verdict", "quarantine", `risky non-final extension ${p}`);
      return R;
    }
  }

  // 4. Magic sniff at offset 0 (strict; no resync guessing).
  const kind = sniffKind(bytes);
  if (kind === "active-markup") {
    quar("upload-bytes", "magic sniff", "active-content-type",
      "SVG/HTML uploads are never accepted: active content possible");
    put("upl_verdict", "quarantine", "active markup kind");
    return R;
  }
  if (kind === "unknown") {
    if (ALL_ALLOWED_EXTS.has(ext)) {
      quar("upload-bytes", "magic sniff", "extension-mismatch",
        `extension .${ext} claims an accepted type but magic bytes are unrecognized; not reclassified by guess`);
      put("upl_verdict", "quarantine", "extension claims accepted type, magic unknown");
      return R;
    }
    return fail("unknown-type", `unrecognized magic and .${ext} is not an accepted extension`);
  }

  // 5. Extension must agree with the sniffed kind.
  if (!ALLOWED[kind].includes(ext)) {
    quar("upload-bytes", "magic sniff vs extension", "extension-mismatch",
      `magic says ${kind} but extension is .${ext}; held, not reclassified`);
    put("upl_verdict", "quarantine", `magic ${kind} vs extension .${ext}`);
    return R;
  }

  // 6. Declared MIME, when present, must agree too.
  if (declaredMime !== undefined && declaredMime !== MIME[kind]) {
    quar("upload-bytes", "declared MIME", "mime-mismatch",
      `magic says ${kind} (${MIME[kind]}) but declared MIME is ${declaredMime}; held`);
    put("upl_verdict", "quarantine", `magic ${kind} vs MIME ${declaredMime}`);
    return R;
  }

  put("upl_verdict", "accept", `magic ${kind}, extension .${ext}${declaredMime ? ", MIME " + declaredMime : ""} all agree`);
  put("upl_type", kind, "magic sniff at offset 0");
  put("upl_bytes", bytes.length, "upload byte length");
  return R;
}

export { runUploadCase };
