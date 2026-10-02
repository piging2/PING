# Post-freeze port: site-client boundTitle (STAGED, NOT APPLIED)

Status: prepared 2026-09-27 ~13:45 MDT. DO NOT APPLY until the 19:00 MDT
adjudication verdict or Nolan's explicit override. The fyd-product-lane
tree is FROZEN.

## What

Ports fyd-build commit 5a9c86f ("SITE-CLIENT RESIDUAL: route featured
{o.title} through the presentation-binding verifier") into the frozen
product-lane tree:
`src/app/sites/_shared/site-client.tsx` renders `{o.title}` directly at
line 281; the fix routes it through `boundTitle(graph, o)` (fail-closed
OMIT on unverified titles), mirroring the fyd-build fix exactly.

## Pre-flight (done, read-only)

- `resolveBoundField` exists in the product-lane tree:
  `src/fyd/sitespec/graph.ts` (already used by its renderer.tsx:22,632).
- `PingObject` type exists: `src/lib/ping/types.ts`.
- `graph: ObjectGraph` is in scope at the render site (EditorPanel props).
- The product-lane file does NOT currently import `resolveBoundField`
  or `PingObject`, and has no `boundTitle` helper.
- THREE identical mirrors exist, all at git HEAD `d571362`, all with
  `{o.title}` at line 281 of `src/app/sites/_shared/site-client.tsx`
  (sha256 `5ce6f862...` identical):
  `~/workspace/fyd-product-lane`,
  `~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394`,
  `~/workspace/constitutional-sprint/repo-mirror`.
  The patch below applies byte-identically to any of them; apply to
  whichever is the adjudicated tree, post-verdict.

## Patch (unified diff, apply with `git apply` post-freeze)

```diff
--- a/src/app/sites/_shared/site-client.tsx
+++ b/src/app/sites/_shared/site-client.tsx
@@ -16,6 +16,7 @@
 import { SitePageView, resolveQuery } from "@/fyd/components/renderer";
 import { getComponentDef } from "@/fyd/components/registry";
 import { applySitePatch, proposeSitePatch, type SiteIntent, type SitePatchBody } from "@/fyd/proceduralize/patch";
+import { resolveBoundField } from "@/fyd/sitespec/graph";
 import type {
   FYDFinding,
   FYDSiteSpec,
@@ -24,6 +25,7 @@
   ViewerContext,
 } from "@/fyd/sitespec/types";
+import type { PingObject } from "@/lib/ping/types";
 // Type-only: the hero media is serialized DisplayMedia resolved on the
 // server; the client never touches the media store.
 import type { DisplayMedia } from "@/fyd/media/select";
@@ -199,6 +201,19 @@
   );
 }

+/**
+ * Verified title read (FYD-012 binding discipline, same contract as
+ * renderer.tsx's boundTitle): the title renders only when its direct
+ * binding resolves to accepted evidence. Undefined means OMIT, never guess.
+ * Takes the graph directly because EditorPanel receives it as a prop
+ * (renderer.tsx's version reads ctx.graph from its RenderContext).
+ */
+function boundTitle(graph: ObjectGraph, o: PingObject): string | undefined {
+  return resolveBoundField(graph, {
+    objectId: o.id,
+    field: "title",
+    classification: "direct",
+  });
+}
+
 function EditorPanel({
   spec,
   graph,
@@ -278,7 +293,7 @@
                         className={
                           "rounded-full border px-3 py-1 text-xs " +
                           (active ? "bg-primary text-primary-foreground" : "border-border-soft")
                         }
                       >
-                        {o.title}
+                        {boundTitle(graph, o)}
                       </button>
                     );
                   })}
```

## Post-apply verification (post-freeze)

1. `tsc` clean on the product-lane tree.
2. Targeted test: verified titles render, unverified titles omit
   (mirror of the fyd-build 2/2 test).
3. Served-byte check on the adjudicated surface per the freeze rules.
