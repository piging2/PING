"""Phase 2 edits for src/fyd/ui/fyd-circle.tsx.

1. Props: nodeHref (optional deep link to the object's rich Node view),
   siteId (tenant for the ask request; defaults to projection.id).
2. Ask POST body gains objectId: projection.id and uses the siteId prop.
3. New exported FydCircleNodeLink: a circular "Open Node" link control
   (reuses .fydc-act), rendered in the expanded circle's action row.
"""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/ui/fyd-circle.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

# --- 1. props ---
old_props = """export interface FydCircleProps {
  projection: CircleProjection;
}
"""
new_props = """export interface FydCircleProps {
  projection: CircleProjection;
  /**
   * Optional deep link to the object's rich Node view. When present, the
   * expanded circle shows a circular "Open Node" control linking to it.
   * The literal-circle contract holds: the control is circular, never a
   * rectangular button or card.
   */
  nodeHref?: string;
  /**
   * Tenant the circle belongs to, used for the ask request. Defaults to
   * projection.id (the legacy behavior) when not provided.
   */
  siteId?: string;
}
"""
edits.append(("props", old_props, new_props))

# --- 2. component signature ---
old_sig = """export function FydCircle({ projection }: FydCircleProps): React.ReactElement {
"""
new_sig = """export function FydCircle({ projection, nodeHref, siteId }: FydCircleProps): React.ReactElement {
"""
edits.append(("signature", old_sig, new_sig))

# --- 3. ask body: object-scoped ask ---
old_body = """        body: JSON.stringify({ siteId: projection.id, question: query, mode: "visitor" }),
"""
new_body = """        body: JSON.stringify({
          siteId: siteId ?? projection.id,
          objectId: projection.id,
          question: query,
          mode: "visitor",
        }),
"""
edits.append(("ask-body", old_body, new_body))

# --- 4. expand icon + node link component, after IconSend ---
old_icon = """const IconSend = () => (
  <Icon>
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </Icon>
);
"""
new_icon = old_icon + """
const IconExpand = () => (
  <Icon>
    <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
  </Icon>
);

/**
 * The circular "Open Node" control: a circular link (fydc-act), never a
 * rectangular button. Rendered in the expanded circle's action row when
 * the nodeHref prop is present. Exported for tests.
 */
export function FydCircleNodeLink({
  href,
  name,
}: {
  href: string;
  name: string;
}): React.ReactElement {
  return (
    <a
      className="fydc-act fydc-node"
      href={href}
      aria-label={"Open node view of " + name}
      title="Open node"
    >
      <IconExpand />
    </a>
  );
}
"""
edits.append(("node-link", old_icon, new_icon))

# --- 5. expanded action row renders the node control when nodeHref set ---
old_row = """      {actions.length > 0 ? (
        <div className="fydc-actions">{actions.map(renderAction)}</div>
      ) : null}
"""
new_row = """      {actions.length > 0 || nodeHref ? (
        <div className="fydc-actions">
          {nodeHref ? <FydCircleNodeLink href={nodeHref} name={name} /> : null}
          {actions.map(renderAction)}
        </div>
      ) : null}
"""
edits.append(("action-row", old_row, new_row))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        print(f"FATAL: edit {name}: found {count} occurrences (expected 1)")
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f"ok: {name}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("written", PATH)
