"""G4 patch 2b: fix directions case in buildCapabilities.

The old code built the Google Maps URL directly from the locality
(encodeURIComponent neutralizes injection); resolveSafeLink has no
"directions" capability. Restore the direct construction.
"""
import sys

P = "/home/nolan/projects/ping/src/fyd/object/view.ts"
src = open(P).read()

old = """      case "directions": {
        const resolved = resolveSafeLink(contact.locality, "directions");
        if (resolved.kind === "safe" && contact.locality) {
          caps.push({
            kind: "directions",
            href: resolved.href,
            label: "Directions",
          });
        }
        break;
      }"""
new = """      case "directions": {
        // The locality is encoded into a Google Maps query; it never
        // becomes a navigated URL, so no safe-link gate applies. This
        // matches the pre-G4 construction exactly.
        if (contact.locality) {
          caps.push({
            kind: "directions",
            href:
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(contact.locality),
            label: "Directions",
          });
        }
        break;
      }"""
assert src.count(old) == 1, "directions pattern not found"
src = src.replace(old, new)
open(P, "w").write(src)
print("directions fixed")
