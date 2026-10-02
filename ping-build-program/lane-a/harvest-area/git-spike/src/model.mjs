/**
 * Record model: validation, sanitization, deterministic identity.
 *
 * Identity discipline (T-05/T-06): author/committer are UNVERIFIED CLAIMS.
 * They live only in fields named `claimed_author` / `claimed_committer`.
 * No identity-linking event is ever derived from them. Signature outcome is
 * the structured triple {present, valid, trusted}; trusted is false unless
 * a pinned trust anchor verified the key (spike has no anchor: always false,
 * stated explicitly, never a bare "verified" bit).
 *
 * Tree-name validation mirrors git fsck gates (T-01): empty names, ".",
 * "..", ".git" (case-insensitive), embedded "/", overlong components, and
 * overlong full paths are rejected BEFORE any path use. The spike never
 * materializes trees to disk at all; validation is defense in depth for
 * every name that enters an observation.
 *
 * Metadata sanitization (T-11): strip C0/C1 controls (except \n \t),
 * strip ANSI escapes, neutralize bidi overrides, length-cap with marker.
 */
import { createHash } from "node:crypto";
import { CAPS } from "./config.mjs";

const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;
const ANSI_ESC = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-_]/g;
const CONTROLS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F]/g;

/**
 * Bidi-override neutralization for repo-controlled names (T-11).
 * Returns the display-safe text plus whether neutralization fired.
 * The raw bytes remain addressable in git; the observation records the
 * neutralized form so no downstream renderer can be visually spoofed.
 */
export function neutralizeBidi(s) {
  if (BIDI.test(s)) {
    return { text: s.replace(BIDI, "�"), neutralized: true };
  }
  return { text: s, neutralized: false };
}

export function sanitizeMeta(s, maxBytes = CAPS.maxMessageBytes) {
  if (typeof s !== "string") return "";
  let out = s.replace(ANSI_ESC, "").replace(CONTROLS, "");
  if (BIDI.test(out)) {
    out = out.replace(BIDI, "\uFFFD");
  }
  const buf = Buffer.from(out, "utf8");
  if (buf.length > maxBytes) {
    out = buf.subarray(0, maxBytes).toString("utf8") + "\n[truncated: exceeded metadata cap]";
  }
  return out;
}

/** Returns null when valid, else a short reason string. */
export function validateTreeName(name) {
  if (name.length === 0) return "empty-name";
  const bytes = Buffer.byteLength(name, "utf8");
  if (bytes > CAPS.maxNameBytes) return "name-too-long";
  if (name === "." ) return "has-dot";
  if (name === "..") return "has-dotdot";
  if (name.toLowerCase() === ".git") return "has-dotgit";
  if (name.includes("/")) return "full-pathname";
  if (CONTROLS.test(name) || name.includes("\x1b")) return "control-chars";
  return null;
}

/** Validate every component of a full path. Returns null or reason. */
export function validateTreePath(path) {
  if (Buffer.byteLength(path, "utf8") > CAPS.maxPathBytes) return "path-too-long";
  const parts = path.split("/");
  if (parts.length > CAPS.maxTreeDepth) return "tree-too-deep";
  for (const p of parts) {
    const r = validateTreeName(p);
    if (r) return r;
  }
  return null;
}

/**
 * Parse a raw commit object (from `git cat-file commit <sha>`) without
 * relying on pretty formats. Handles multi-line gpgsig headers.
 */
export function parseCommitObject(sha, raw) {
  const text = raw.toString("utf8");
  const blankIdx = text.indexOf("\n\n");
  if (blankIdx === -1) throw new Error("malformed commit: no header/message split");
  const headerText = text.slice(0, blankIdx);
  const message = text.slice(blankIdx + 2);
  // Unfold continuation lines (gpgsig).
  const headers = [];
  for (const line of headerText.split("\n")) {
    if (line.startsWith(" ") && headers.length) {
      headers[headers.length - 1].value += "\n" + line.slice(1);
    } else {
      const sp = line.indexOf(" ");
      if (sp === -1) throw new Error(`malformed commit header: ${line.slice(0, 40)}`);
      headers.push({ key: line.slice(0, sp), value: line.slice(sp + 1) });
    }
  }
  const first = (k) => headers.filter((h) => h.key === k).map((h) => h.value);
  const parents = first("parent");
  const tree = first("tree")[0] ?? null;
  if (!tree) throw new Error("malformed commit: missing tree");

  const parseIdent = (v) => {
    // "Name <email> 1690000000 +0000"
    const m = v.match(/^(.*) <([^<>]*)> (\d+) ([+-]\d{4})$/);
    if (!m) {
      return {
        claimed_name: sanitizeMeta(v.slice(0, 200), CAPS.maxSmallFieldBytes),
        claimed_email: "",
        time: null,
        tz: null,
        _unparsed: true,
      };
    }
    return {
      claimed_name: sanitizeMeta(m[1], CAPS.maxSmallFieldBytes),
      claimed_email: sanitizeMeta(m[2], CAPS.maxSmallFieldBytes),
      time: Number(m[3]),
      tz: m[4],
    };
  };

  const authorRaw = first("author")[0] ?? "";
  const committerRaw = first("committer")[0] ?? "";
  const gpgsig = first("gpgsig")[0] ?? null;

  return {
    sha,
    tree,
    parents,
    is_merge: parents.length > 1,
    claimed_author: parseIdent(authorRaw),
    claimed_committer: parseIdent(committerRaw),
    message: sanitizeMeta(message),
    signature: {
      signature_present: gpgsig !== null,
      // The spike performs no verification: no pinned trust anchor exists yet.
      // Recorded explicitly so no consumer can mistake presence for trust.
      signature_valid: null,
      signer_key_id: null,
      signer_trusted: false,
      trust_anchor: "none-pinned",
    },
  };
}

/**
 * Deterministic canonicalization (aligned with PING dev-signer canonicalizeJson:
 * objects sorted by key, recursively). Packet identity = sha256 of canonical bytes.
 * No random IDs anywhere: git SHAs stay native identifiers.
 */
export function canonicalizeJson(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalizeJson(v)}`);
    return `{${entries.join(",")}}`;
  }
  const s = JSON.stringify(value);
  return s === undefined ? "null" : s;
}

export function evidenceHash(canonicalBytes) {
  return createHash("sha256").update(canonicalBytes).digest("hex");
}
