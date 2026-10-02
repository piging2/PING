#!/bin/bash
set -uo pipefail
WT=/home/nolan/fyd-preview-wt
F="$WT/src/fyd/customize/propose.ts"

# Backup original for diff record
cp "$F" "$F.orig"

python3 << 'PYEOF'
import re

path = "/home/nolan/fyd-preview-wt/src/fyd/customize/propose.ts"
with open(path) as f:
    src = f.read()

old_imports = '''import { canonicalize } from "@/lib/ping/ask-composer";
import { createHash } from "node:crypto";
import {
  proposeSitePatch,
  type SiteIntent,
  type SitePatchBody,
} from "../proceduralize/patch";
import type { FYDSiteSpec } from "../sitespec/types";'''

new_imports = '''import {
  proposeSitePatch,
  type SiteIntent,
  type SitePatchBody,
} from "../proceduralize/patch";
import type { FYDSiteSpec } from "../sitespec/types";
import { sha256Hex } from "../proceduralize/sha256";

/**
 * Client-safe canonical JSON (sorted keys, sha256-canonical-json-v1).
 * Verbatim copy of `canonicalize` from src/lib/ping/ask-composer.ts, duplicated
 * here so this module stays importable from client components: ask-composer
 * pulls node:crypto and owner-overlay (which pulls node:fs via owner-store).
 * MAIN-REPO FINDING: move canonicalize to a shared client-safe module and
 * import it from there in both places instead of duplicating.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(rec[k])}`).join(",")}}`;
  }
  return "null";
}'''

assert old_imports in src, "old imports block not found"
src = src.replace(old_imports, new_imports, 1)

old_digest = '''export function specDigestOf(spec: FYDSiteSpec): string {
  return createHash("sha256").update(canonicalize(spec), "utf8").digest("hex");
}'''

new_digest = '''export function specDigestOf(spec: FYDSiteSpec): string {
  return sha256Hex(canonicalize(spec));
}'''

assert old_digest in src, "old specDigestOf not found"
src = src.replace(old_digest, new_digest, 1)

with open(path, "w") as f:
    f.write(src)

print("propose.ts patched successfully")
PYEOF

echo "=== verify no node: or ask-composer imports remain ==="
grep -n "node:\|ask-composer" "$F" || echo "CLEAN: no server-only imports"
echo "=== diff summary ==="
diff "$F.orig" "$F" | head -60
