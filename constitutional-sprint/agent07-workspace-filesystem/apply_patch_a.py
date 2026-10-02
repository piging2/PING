#!/usr/bin/env python3
"""Agent 07 patch: wire assertSafeSiteId into the two unvalidated read seams."""
import sys

BASE = "/home/nolan/projects/ping-constitutional"


def patch(path, old, new, count=1):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    found = text.count(old)
    assert found == count, f"{path}: expected {count} occurrence(s), found {found} of:\n{old[:80]}"
    text = text.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"patched {path}")


# 1. ping-object-source.ts: import the guard
p1 = f"{BASE}/src/fyd/data/ping-object-source.ts"
patch(
    p1,
    'import type { PresentationIntentBlock } from "@/fyd/customize/types";',
    'import type { PresentationIntentBlock } from "@/fyd/customize/types";\n'
    'import { assertSafeSiteId } from "./site-id-guard";',
)

# 2. ping-object-source.ts: guard the async reader
patch(
    p1,
    """): Promise<PingProjection> {
  const path = join(projectionDir(), siteId + ".json");
  let raw: string;
  try {
    raw = await readFile(path, "utf8");""",
    """): Promise<PingProjection> {
  assertSafeSiteId(siteId);
  const path = join(projectionDir(), siteId + ".json");
  let raw: string;
  try {
    raw = await readFile(path, "utf8");""",
)

# 3. ping-object-source.ts: guard the sync reader
patch(
    p1,
    """): PingProjection {
  const path = join(projectionDir(), siteId + ".json");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");""",
    """): PingProjection {
  assertSafeSiteId(siteId);
  const path = join(projectionDir(), siteId + ".json");
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");""",
)

# 4. bundle-media.ts: import the guard (after the header comment block, before first import)
p2 = f"{BASE}/src/fyd/media/bundle-media.ts"
with open(p2, encoding="utf-8") as f:
    t2 = f.read()
# find first import line
import re

m = re.search(r"^import .*;$", t2, re.M)
assert m, "no import found in bundle-media.ts"
first_import = m.group(0)
patch(p2, first_import, 'import { assertSafeSiteId } from "@/fyd/data/site-id-guard";\n' + first_import)

# 5. bundle-media.ts: guard getPipelineManifest (inside the try so refusal -> null -> 404)
patch(
    p2,
    """  try {
    const raw = readFileSync(
      join(process.cwd(), "src", "fyd", "media", "manifests", siteId + ".json"),""",
    """  try {
    assertSafeSiteId(siteId);
    const raw = readFileSync(
      join(process.cwd(), "src", "fyd", "media", "manifests", siteId + ".json"),""",
)

print("ALL PATCHES APPLIED")
