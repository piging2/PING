#!/usr/bin/env python3
"""LocationsSection: make location pills link to their object nodes."""
import sys

P = "/home/nolan/projects/ping/"
full = P + "src/fyd/components/renderer.tsx"
s = open(full).read()

old = """      <ul className="flex flex-wrap gap-2">
        {objects.map((o) => {
          const title = boundTitle(ctx, o);
          return title ? (
            <li
              key={o.id}
              className="rounded-full border border-border-soft px-4 py-2 text-sm"
              style={{ color: theme.ink }}
            >
              {title}
            </li>
          ) : null;
        })}
      </ul>"""
new = """      <ul className="flex flex-wrap gap-2">
        {objects.map((o) => {
          const title = boundTitle(ctx, o);
          const detailHref = `/o/${encodeURIComponent(o.id)}`;
          return title ? (
            <li key={o.id}>
              <a
                href={detailHref}
                className="inline-block rounded-full border border-border-soft px-4 py-2 text-sm transition-colors hover:bg-stone-100"
                style={{ color: theme.ink }}
              >
                {title}
              </a>
            </li>
          ) : null;
        })}
      </ul>"""
if s.count(old) != 1:
    print(f"FAIL: found {s.count(old)}")
    sys.exit(1)
open(full, "w").write(s.replace(old, new, 1))
print("OK locations-link")
