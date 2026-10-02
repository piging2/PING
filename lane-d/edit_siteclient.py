"""MEDIA INTO HERO lane, edit 2 of 3: src/app/sites/_shared/site-client.tsx
Thread the server-resolved heroMedia prop into the RenderContext.
"""
PATH = "src/app/sites/_shared/site-client.tsx"
src = open(PATH, encoding="utf-8").read()

old_type_import = '''import type {
  FYDFinding,
  FYDSiteSpec,
  FYDThemeTokens,
  ObjectGraph,
  ViewerContext,
} from "@/fyd/sitespec/types";
'''
new_type_import = '''import type {
  FYDFinding,
  FYDSiteSpec,
  FYDThemeTokens,
  ObjectGraph,
  ViewerContext,
} from "@/fyd/sitespec/types";
// Type-only: the hero media is serialized DisplayMedia resolved on the
// server; the client never touches the media store.
import type { DisplayMedia } from "@/fyd/media/select";
'''
assert src.count(old_type_import) == 1, "anchor 1 not unique"
src = src.replace(old_type_import, new_type_import)

old_props = '''export function SiteClient({
  spec: initialSpec,
  graph,
  findings,
  renderable,
  siteId,
}: {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  findings: FYDFinding[];
  renderable: boolean;
  siteId?: string;
}) {'''
new_props = '''export function SiteClient({
  spec: initialSpec,
  graph,
  findings,
  renderable,
  siteId,
  heroMedia = null,
}: {
  spec: FYDSiteSpec;
  graph: ObjectGraph;
  findings: FYDFinding[];
  renderable: boolean;
  siteId?: string;
  heroMedia?: DisplayMedia | null;
}) {'''
assert src.count(old_props) == 1, "anchor 2 not unique"
src = src.replace(old_props, new_props)

old_ctx = '''  const ctx = useMemo(
    () => ({ spec, graph, viewer: VIEWER, siteId }),
    [spec, graph, siteId],
  );'''
new_ctx = '''  const ctx = useMemo(
    () => ({ spec, graph, viewer: VIEWER, siteId, heroMedia }),
    [spec, graph, siteId, heroMedia],
  );'''
assert src.count(old_ctx) == 1, "anchor 3 not unique"
src = src.replace(old_ctx, new_ctx)

open(PATH, "w", encoding="utf-8").write(src)
print("site-client.tsx patched OK")
