import io, sys

def patch(path, old, new, expect=1):
    s = io.open(path, encoding="utf-8").read()
    n = s.count(old)
    if n != expect:
        print("FAIL %s: found %d of pattern (expected %d)" % (path, n, expect))
        sys.exit(1)
    io.open(path, "w", encoding="utf-8").write(s.replace(old, new))
    print("OK %s" % path)

patch(
    "src/app/portal-rail/rail-client.tsx",
    "        onEngageRequest={(id) => setEngagedId(id)}\n"
    "        onRelease={(id) => setEngagedId((cur) => (cur === id ? null : cur))}\n"
    "      />",
    "        onEngageRequest={(id) => setEngagedId(id)}\n"
    "        onRelease={(id) => setEngagedId((cur) => (cur === id ? null : cur))}\n"
    "        // Geometry fixture only: no global assistant on this page, so the\n"
    "        // Ask FYD orbit control is inert here (orbit geometry is preserved).\n"
    "        onAskRequest={() => {}}\n"
    "      />",
)

patch(
    "src/app/page.tsx",
    'import { PortalHost } from "@/fyd/ui/portal-host";',
    'import { HomeCircles } from "@/fyd/ui/home-circles";',
)

patch(
    "src/app/page.tsx",
    "<PortalHost portals={portalProjections} />",
    "<HomeCircles portals={portalProjections} />",
)

print("ALL PATCHES APPLIED")
