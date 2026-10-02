#!/usr/bin/env python3
"""Lane A: refactor portal-circle.tsx to consume the CapabilityRuntime.

Exact-match replacements; aborts unless every old block appears exactly once.
"""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/ui/portal-circle.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

# 1. Import the runtime; drop nothing else.
edits.append((
"""import { focalToObjectPosition } from "@/fyd/preview/focal";
import { isSafeWebHref } from "@/fyd/preview/types";
import type { PortalProjection } from "@/fyd/preview/types";
""",
"""import { focalToObjectPosition } from "@/fyd/preview/focal";
import { isSafeWebHref } from "@/fyd/preview/types";
import type { PortalProjection } from "@/fyd/preview/types";
import {
  executeFollow,
  executeLike,
  hasCapability,
  openWebsite,
  submitAsk as submitAskCapability,
} from "@/fyd/capabilities/runtime";
"""))

# 2. Remove the inline hasCapability (the runtime owns it now).
edits.append((
"""function hasCapability(portal: PortalProjection, kind: string): boolean {
  return portal.circle.capabilities.some((c) => c.kind === kind);
}

""",
""""""))

# 3. toggleFollow -> executeFollow (fail-closed inside the runtime).
edits.append((
"""  const toggleFollow = async () => {
    if (following === null) return;
    try {
      const res = await fetch("/api/fyd/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId: id, action: following ? "unfollow" : "follow" }),
      });
      const d = await res.json();
      if (d && d.ok === true) setFollowing(!!d.following);
    } catch {
      // Fail closed: keep the previous state.
    }
  };
""",
"""  const toggleFollow = async () => {
    if (following === null) return;
    setFollowing(await executeFollow(id, following));
  };
"""))

# 4. toggleLike -> executeLike.
edits.append((
"""  const toggleLike = async () => {
    if (liked === null) return;
    try {
      const res = await fetch("/api/fyd/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectId: id, action: liked ? "unlike" : "like" }),
      });
      const d = await res.json();
      if (d && d.ok === true) setLiked(!!d.liked);
    } catch {
      // Fail closed.
    }
  };
""",
"""  const toggleLike = async () => {
    if (liked === null) return;
    setLiked(await executeLike(id, liked));
  };
"""))

# 5. submitAsk -> runtime submitAsk (aliased to avoid the local name).
edits.append((
"""  const submitAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setAskStatus("asking");
    try {
      const res = await fetch("/api/fyd/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: id, question: q, mode: "visitor" }),
      });
      const d = await res.json();
      if (!d || d.ok !== true || d.refusal) {
        setAskStatus("empty");
        setAnswer("");
      } else {
        setAskStatus("answered");
        setAnswer(typeof d.answer === "string" ? d.answer : "");
      }
    } catch {
      setAskStatus("empty");
      setAnswer("");
    }
  };
""",
"""  const submitAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setAskStatus("asking");
    const result = await submitAskCapability(id, q);
    if (!result.ok || result.refusal) {
      setAskStatus("empty");
      setAnswer("");
    } else {
      setAskStatus("answered");
      setAnswer(result.answer ?? "");
    }
  };
"""))

# 6. Website button -> runtime openWebsite (re-validates https-only).
edits.append((
"""          onClick={() => window.open(p.webHref as string, "_blank", "noopener,noreferrer")}
""",
"""          onClick={() => openWebsite(p.webHref as string)}
"""))

# 7. Directive mapping comment: engaged diameter IS the immersive-margin state.
edits.append((
"""  const beginEngage = React.useCallback(() => {
""",
"""  // Directive mapping: the engaged diameter IS the immersive-margin state:
  // the largest circle fitting the safe peripheral rect, computed by
  // engagedGeometryFor from the button's live position. There is no
  // separate immersive mode; engaged geometry and the immersive margin
  // are the same state.
  const beginEngage = React.useCallback(() => {
"""))

for i, (old, new) in enumerate(edits):
    count = src.count(old)
    if count != 1:
        print(f"EDIT {i}: expected 1 occurrence, found {count}. ABORTING.")
        sys.exit(1)
    src = src.replace(old, new, 1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print(f"OK: applied {len(edits)} edits to {PATH}")
