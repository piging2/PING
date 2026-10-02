"""Add nodeControlFor pure helper to fyd-circle.tsx and use it in renderExpanded."""
import sys

PATH = "/home/nolan/projects/ping/src/fyd/ui/fyd-circle.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

old_helper = """export function FydCircleNodeLink({
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
new_helper = old_helper + """
/**
 * Pure helper: the node control element, or null when no nodeHref is set.
 * renderExpanded maps over this; testing the helper tests the render rule
 * (the expanded action row is client-state-only, so SSR cannot reach it).
 */
export function nodeControlFor(
  nodeHref: string | undefined,
  name: string,
): React.ReactElement | null {
  if (!nodeHref) return null;
  return <FydCircleNodeLink href={nodeHref} name={name} />;
}
"""
edits.append(("helper", old_helper, new_helper))

old_row = """          {nodeHref ? <FydCircleNodeLink href={nodeHref} name={name} /> : null}
"""
new_row = """          {nodeControlFor(nodeHref, name)}
"""
edits.append(("use-helper", old_row, new_row))

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
