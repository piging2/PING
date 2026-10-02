"""G4 patch 3: object-affordance.tsx + renderer.tsx call sites.

The affordance no longer hardcodes its actions. It derives the visible
links from capabilityOptionsForSchema (the capability authority):
"ask" -> Ask FYD, "open" -> View details. The renderer passes the
object's schema id and controller id so the component can resolve.
"""
import sys

P = "/home/nolan/projects/ping/src/fyd/components/object-affordance.tsx"
src = open(P).read()

def sub(old, new):
    global src
    assert src.count(old) == 1, "pattern issue in affordance: %r (count=%d)" % (old[:70], src.count(old))
    src = src.replace(old, new)

sub(
    """ * Never on every noun: content objects (posts, articles) and the
 * business itself get no affordance. Follow is intentionally absent:
 * follow/share are unwired on this surface (no UI renders them), so the
 * preview offers only actions that actually work.""",
    """ * Never on every noun: content objects (posts, articles) and the
 * business itself get no affordance.
 *
 * G4: the preview renders the capability authority's answer, it does not
 * decide. "ask" resolves to the Ask FYD deep-link; "open" resolves to the
 * View details link. If the authority ever revokes one, the affordance
 * follows.""")

sub(
    'import { schemaRole } from "../sitespec/schemas";',
    'import { capabilityOptionsForSchema, schemaRole } from "../sitespec/schemas";')

sub(
    """  /** Evidence line from the object's own provenance. */
  evidenceLine: string;
  theme: FYDThemeTokens;
}) {
  if (!title) return null;
  const detailHref = `/o/${encodeURIComponent(objectId)}`;""",
    """  /** Evidence line from the object's own provenance. */
  evidenceLine: string;
  /** Schema id, resolved through the capability authority. */
  schemaId: string;
  /** Controller id, for viewer-dependent capability options. */
  controllerId: string;
  theme: FYDThemeTokens;
}) {
  if (!title) return null;
  // G4: actions come from the capability authority, not from this
  // component. The affordance is a preview surface, so no contact context
  // flags apply; the authority answers from schema + viewer alone.
  const allowed = capabilityOptionsForSchema(schemaId, {
    viewerId: null,
    controllerId,
    hasWebsite: false,
  });
  const canAsk = allowed.includes("ask");
  const canOpen = allowed.includes("open");
  const detailHref = `/o/${encodeURIComponent(objectId)}`;""")

sub(
    """        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={detailHref + "#ask"}
            className="inline-flex min-h-[44px] items-center rounded px-4 py-2 text-sm font-semibold"
            style={{
              background: theme.accent,
              color: theme.accentForeground,
              borderRadius: theme.radius === "full" ? 9999 : 8,
            }}
          >
            Ask FYD
          </a>
          <a
            href={detailHref}
            className="inline-flex min-h-[44px] items-center rounded border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: theme.accent,
              color: theme.ink,
              borderRadius: theme.radius === "full" ? 9999 : 8,
            }}
          >
            View details
          </a>
        </div>""",
    """        <div className="mt-3 flex flex-wrap gap-2">
          {canAsk ? (
            <a
              href={detailHref + "#ask"}
              className="inline-flex min-h-[44px] items-center rounded px-4 py-2 text-sm font-semibold"
              style={{
                background: theme.accent,
                color: theme.accentForeground,
                borderRadius: theme.radius === "full" ? 9999 : 8,
              }}
            >
              Ask FYD
            </a>
          ) : null}
          {canOpen ? (
            <a
              href={detailHref}
              className="inline-flex min-h-[44px] items-center rounded border px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: theme.accent,
                color: theme.ink,
                borderRadius: theme.radius === "full" ? 9999 : 8,
              }}
            >
              View details
            </a>
          ) : null}
        </div>""")

open(P, "w").write(src)
print("object-affordance.tsx patched OK")

# Renderer call sites: pass schemaId + controllerId.
R = "/home/nolan/projects/ping/src/fyd/components/renderer.tsx"
rsrc = open(R).read()
old_call = """          <ObjectAffordance
            objectId={o.id}
            title={title ?? null}
            kindLabel={friendlySchemaLabel(o.schema)}
            evidenceLine={affordanceEvidenceLine(o)}
            theme={theme}
          />"""
new_call = """          <ObjectAffordance
            objectId={o.id}
            title={title ?? null}
            kindLabel={friendlySchemaLabel(o.schema)}
            schemaId={o.schema}
            controllerId={o.controllerId}
            evidenceLine={affordanceEvidenceLine(o)}
            theme={theme}
          />"""
n = rsrc.count(old_call)
assert n == 3, "expected 3 affordance call sites, found %d" % n
rsrc = rsrc.replace(old_call, new_call)
open(R, "w").write(rsrc)
print("renderer.tsx call sites patched OK (3)")
