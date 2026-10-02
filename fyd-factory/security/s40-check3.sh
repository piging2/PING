#!/bin/bash
set -u
cd /home/nolan/projects/ping
git apply --check - <<'PATCH2EOF'
--- a/src/fyd/media/select.ts
+++ b/src/fyd/media/select.ts
@@ -17,6 +17,7 @@
 import type { ObjectGraph } from "../sitespec/types";
 import { attachMediaToGraph, mediaForObject } from "./attach";
 import { getPipelineManifest } from "./bundle-media";
+import { resolveSafeLink } from "../sitespec/safe-link";
 import {
   isAcquirable,
   type FydMediaObject,
@@ -71,15 +72,32 @@
   return pickWidest(variants);
 }
 
+/**
+ * Render-seam gate for display URLs. The pipeline mints same-origin paths
+ * (/fyd-media/<hash>/file); anything else must clear the shared
+ * resolveSafeLink allowlist (http/https, parser-based). Returns null for
+ * anything unsafe: the caller then renders its no-media fallback.
+ */
+function safeDisplayUrl(raw: unknown): string | null {
+  if (typeof raw !== "string" || raw === "") return null;
+  // Same-origin path: no scheme, no host, no whitespace/control chars.
+  if (/^\/[^\s\\]*$/.test(raw) && !/^\/\//.test(raw)) return raw;
+  const r = resolveSafeLink(raw, "navigate");
+  return r.kind === "safe" ? r.href : null;
+}
+
 function toDisplayMedia(m: FydMediaObject, heroBias: boolean): DisplayMedia | null {
   const v = heroBias ? pickHeroVariant(m.variants ?? []) : pickWidest(m.variants ?? []);
   if (!v) return null;
+  const src = safeDisplayUrl(v.url);
+  if (!src) return null;
   const blur = m.variants.find((v) => v.name.startsWith("blur")) ?? null;
+  const blurUrl = blur ? safeDisplayUrl(blur.url) : null;
   return {
     id: m.id,
     role: m.roles?.[0] ?? "gallery",
-    src: v.url,
-    blurUrl: blur ? blur.url : null,
+    src,
+    blurUrl,
     width: v.width,
     height: v.height,
     alt: (m.altText ?? "").trim() || m.title || "Business photo",

PATCH2EOF
echo "patch2 exit: $?"
