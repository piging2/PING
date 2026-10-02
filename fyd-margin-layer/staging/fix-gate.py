"""Pipeline identity-gate update: authorize coppersmith-plumbing as object #2.

Identity config only (which objects exist on the homepage). Zero customer-
specific logic: both objects flow through the identical
buildPortalProjection -> descriptor -> MarginObjectLayer path.
Approved by Nolan 2026-09-22: "Margins Are the Object Layer" object proof.
"""
import io

P = "/home/nolan/projects/ping/src/fyd/preview/pipeline.ts"
s = io.open(P, encoding="utf-8").read()

old = (
    " * is a one-line change here.\n"
    " */\n"
    'export const HOMEPAGE_CIRCLE_SITE_IDS: string[] = ["happy-place"];'
)
new = (
    ' * Circle #2 (Coppersmith) approved by Nolan 2026-09-22: "Margins Are the\n'
    ' * Object Layer" object proof.\n'
    " */\n"
    'export const HOMEPAGE_CIRCLE_SITE_IDS: string[] = ["happy-place", "coppersmith-plumbing"];'
)
assert old in s, "gate text not found"
io.open(P, "w", encoding="utf-8").write(s.replace(old, new))
print("gate updated")
