#!/bin/bash
# Lane M: update stale comments in MarginObjectLayer.tsx
set -e
cd /home/nolan/projects/ping
python3 << 'PYEOF'
import sys

def replace_once(path, old, new, label):
    src = open(path).read()
    n = src.count(old)
    if n != 1:
        print(f"FATAL: {label}: found {n} occurrences (expected 1)")
        sys.exit(1)
    open(path, "w").write(src.replace(old, new, 1))
    print(f"ok: {label}")

L = "src/fyd/ui/object-layer/MarginObjectLayer.tsx"

replace_once(
    L,
    """ * Responsive policy (functional, not polish):
 * - wide desktop (>=1400px): two object rails (left + right)
 * - normal desktop (1024-1399): one preferred rail + overflow clustering
 * - tablet (768-1023): compact edge rail (40px rest)
 * - mobile (<768): the very-right overlay (Nolan 2026-09-25, supersedes
 *   the 2026-09-23 direction): document-anchored 44px doorway pills at
 *   the extreme right edge, one per anchored object, page-anchored so
 *   scrolling moves them out of view. Tap opens the mobile object
 *   sheet. No debug flag in the production path.""",
    """ * Responsive policy (functional, not polish; Nolan 2026-09-25
 * edge-placement directive):
 * - desktop (>=1024px): fit-gated dual margins. A rail is used only
 *   when the measured free margin actually fits the glyph; when both
 *   fit, placements round-robin across left + right so the margins
 *   flank the content. Margins are never faked; the layer never
 *   overlaps center content.
 * - tablet (768-1023): compact edge rail (40px rest) when it fits.
 * - mobile (<768): NO overlay chrome. Objects render in-flow as
 *   cards/sections via the renderer composition: visible, tappable
 *   (44px+ targets), never hidden, never overlaid.
 * No debug flag in the production path.""",
    "header responsive policy",
)

replace_once(
    L,
    """  // Relationship navigation: collapse the current card, scroll the
  // target slot into view when it is offscreen, then open it through
  // the open-request bus (single slot, cluster member, or sheet card).
  // Mobile projection: the sheet owns the card, so select it directly
  // with no claim juggling and no scrolling.""",
    """  // Relationship navigation: collapse the current card, scroll the
  // target slot into view when it is offscreen, then open it through
  // the open-request bus (single slot or cluster member). Mobile: no
  // slots exist (in-flow cards own the doorway), so the open request
  // goes straight through with no claim juggling and no scrolling.""",
    "navigate comment",
)

print("COMMENTS UPDATED")
PYEOF
echo "exit: $?"