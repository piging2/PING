"""Surgical edit: MarginObjectLayer for GLYPH -> PEEK -> WORKSPACE (FYD grill lane)."""
from pathlib import Path

p = Path("/home/nolan/projects/ping/src/fyd/ui/object-layer/MarginObjectLayer.tsx")
s = p.read_text()

edits = [
    # 1. Imports: oval geometry constants -> peek constants.
    (
        "  CIRCLE_MOTION,\n"
        "  ClusterSlot,\n"
        "  MarginObject,\n"
        "  OBJECT_H,\n"
        "  OBJECT_W,\n"
        "  PREVIEW_H,\n"
        "  PREVIEW_W,\n"
        "  REST_D,\n"
        "  RICH_H,\n"
        "  RICH_W,\n"
        '} from "./ObjectCircle";',
        "  CIRCLE_MOTION,\n"
        "  ClusterSlot,\n"
        "  MarginObject,\n"
        "  PEEK_H,\n"
        "  PEEK_W,\n"
        "  REST_D,\n"
        '} from "./ObjectCircle";',
    ),
    # 2. Placement: one peek popover, flipped inward from the rail.
    (
        "        // Preview (248x156), object card (300x400 compact vertical oval),\n"
        "        // and Ask mode (300x460 vertical oval): same document-space\n"
        "        // placement math, each flipped inward from the rail for its size.\n"
        "        const previewStyle = placeCard(x, restD, p.rail, slotTop, p.y, PREVIEW_W, PREVIEW_H);\n"
        "        const cardStyle = placeCard(x, restD, p.rail, slotTop, p.y, OBJECT_W, OBJECT_H);\n"
        "        const askStyle = placeCard(x, restD, p.rail, slotTop, p.y, RICH_W, RICH_H);\n",
        "        // Peek popover (content-sized up to PEEK_W wide; PEEK_H is the\n"
        "        // placement budget): the same document-space placement math,\n"
        "        // flipped inward from the rail for its size. The workspace\n"
        "        // sheet is viewport-fixed in its own portal, not placed here.\n"
        "        const peekStyle = placeCard(x, restD, p.rail, slotTop, p.y, PEEK_W, PEEK_H);\n",
    ),
    # 3. MarginObject props.
    (
        "              previewStyle={previewStyle}\n"
        "              cardStyle={cardStyle}\n"
        "              askStyle={askStyle}\n",
        "              peekStyle={peekStyle}\n",
    ),
    # 4. ClusterSlot props.
    (
        '            cardStyleFor={() => cardStyle}\n'
        "            askStyleFor={() => askStyle}\n",
        '            peekStyleFor={() => peekStyle}\n',
    ),
    # 5. Anchor-highlight rule, once per layer (attribute-only highlight;
    #    outline never affects layout).
    (
        "      {placed.map((p) => {",
        '      <style>{`[data-fyd-anchor-active="true"]{outline:2px solid rgba(124,92,214,0.45);outline-offset:3px;border-radius:6px;}`}</style>\n'
        "      {placed.map((p) => {",
    ),
]

for old, new in edits:
    assert old in s, f"anchor not found: {old[:60]!r}"
    assert s.count(old) == 1, f"anchor not unique: {old[:60]!r}"
    s = s.replace(old, new, 1)

# No stale references to the dead geometry may remain.
for token in ["OBJECT_W", "OBJECT_H", "RICH_W", "RICH_H", "PREVIEW_W", "PREVIEW_H", "cardStyleFor", "askStyleFor"]:
    assert token not in s, f"stale token remains: {token}"

p.write_text(s)
print("MarginObjectLayer edit applied OK")
