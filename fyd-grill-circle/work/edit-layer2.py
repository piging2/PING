"""Extend the MarginObjectLayer <style> with view-transition root rules
and skeleton keyframes (FYD mobile directive, items 3+4)."""
from pathlib import Path

p = Path("/home/nolan/projects/ping/src/fyd/ui/object-layer/MarginObjectLayer.tsx")
s = p.read_text()

old = '<style>{`[data-fyd-anchor-active="true"]{outline:2px solid rgba(124,92,214,0.45);outline-offset:3px;border-radius:6px;}`}</style>'
new = (
    "<style>{`"
    '[data-fyd-anchor-active="true"]{outline:2px solid rgba(124,92,214,0.45);outline-offset:3px;border-radius:6px;}'
    "/* Object continuity (./view-transitions): only NAMED shared elements "
    "animate. The default whole-page crossfade is disabled so transitions "
    "serve EXPAND/ENTER/EXIT semantics only, never decoration. */"
    "::view-transition-old(root),::view-transition-new(root){animation:none;}"
    "::view-transition-group(*){animation-duration:180ms;animation-timing-function:ease-out;}"
    "/* Peek skeleton pulse. Disabled under prefers-reduced-motion. */"
    "@keyframes fyd-skeleton{0%{opacity:.45}50%{opacity:1}100%{opacity:.45}}"
    "@media (prefers-reduced-motion:reduce){[data-fyd-skeleton]{animation:none!important;opacity:.7}}"
    "`}</style>"
)
assert s.count(old) == 1, "style anchor not found exactly once"
s = s.replace(old, new, 1)
p.write_text(s)
print("layer stylesheet extended OK")
