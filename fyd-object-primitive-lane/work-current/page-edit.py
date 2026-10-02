import io

P = "/home/nolan/projects/ping/src/app/page.tsx"
src = io.open(P, encoding="utf-8").read()

old_sig = """function toLayerDescriptor(
  circle: PortalProjection | null,
  anchorKey: string,
  priority: number,
  peerId: string,
  peerName: string,
): MarginObjectDescriptor | null {
  if (!circle) return null;
  return {
    objectId: circle.circle.id,
    name: circle.circle.name,
    imageSrc: circle.preview?.src ?? null,
    imageSrcSet: circle.preview?.srcSet ?? null,
    websiteUrl: circle.websiteHref,
    anchorKey,
    priority,"""

new_sig = """function toLayerDescriptor(
  circle: PortalProjection | null,
  anchorKey: string,
  priority: number,
  peerId: string,
  peerName: string,
  siteId: string,
): MarginObjectDescriptor | null {
  if (!circle) return null;
  return {
    objectId: circle.circle.id,
    name: circle.circle.name,
    imageSrc: circle.preview?.src ?? null,
    imageSrcSet: circle.preview?.srcSet ?? null,
    websiteUrl: circle.websiteHref,
    anchorKey,
    priority,
    // Peek-card context, generic and nullable: evidence-backed fields
    // from the portal projection. Null = the line is omitted.
    category: circle.circle.category ?? null,
    location: circle.circle.locationLabel ?? null,
    whyHere: circle.circle.tagline ?? null,
    siteId,"""

old_call1 = """    toLayerDescriptor(
      happyPlace,
      "happy-place",
      0,
      "coppersmith-plumbing",
      coppersmith?.circle.name ?? "Coppersmith Plumbing - HVAC - Mechanical",
    ),"""
new_call1 = """    toLayerDescriptor(
      happyPlace,
      "happy-place",
      0,
      "coppersmith-plumbing",
      coppersmith?.circle.name ?? "Coppersmith Plumbing - HVAC - Mechanical",
      "happy-place",
    ),"""

old_call2 = """    toLayerDescriptor(
      coppersmith,
      "coppersmith-plumbing",
      1,
      "happy-place",
      happyPlace?.circle.name ?? "Happy Place Carpentry LLC",
    ),"""
new_call2 = """    toLayerDescriptor(
      coppersmith,
      "coppersmith-plumbing",
      1,
      "happy-place",
      happyPlace?.circle.name ?? "Happy Place Carpentry LLC",
      "coppersmith-plumbing",
    ),"""

for label, old, new in [("sig", old_sig, new_sig), ("call1", old_call1, new_call1), ("call2", old_call2, new_call2)]:
    n = src.count(old)
    assert n == 1, f"{label}: found {n} matches, expected 1"
    src = src.replace(old, new)
    print(f"{label}: replaced OK")

io.open(P, "w", encoding="utf-8").write(src)
print("page.tsx written")
