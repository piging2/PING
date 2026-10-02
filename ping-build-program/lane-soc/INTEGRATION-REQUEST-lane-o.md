# INTEGRATION REQUEST: lane SOC → lane O (dependency index)

**From:** lane SOC (public-social fabric), 2026-09-23
**Request:** register public-surface projections as disposable derived artifacts in the dependency index.

**What the fabric produces:** per-business, per-surface `DraftProjection` artifacts
(surfaces: `page-post`, `profile-blurb`, `story-card`), each carrying:
- `usedFields`: sorted canonical field paths bound by the projection
  (e.g. `name`, `summary`, `services.name`, `contact.phone`, `contact.locality`)
- `projectionDigest`: sha256 over canonical bytes of (surface, projectorVersion, lines, mediaBound)
- `projectorVersion`: e.g. `soc-projector@0.1.0`

**Requested semantics:** when an object field changes, the index should answer
"which public surfaces must re-project" by matching the changed field against
each stored projection's `usedFields` (same reverse-walk contract as
DependencyManifest.reverseWalk(objectFieldOrClaimRef), but the projection nodes
are keyed by (publicId, surface) and the index stores the digest, not the content).

**Proven locally (spike):** phone change re-projects only `profile-blurb`
(page-post/story-card digests unchanged); name change re-projects all three.
See [spike/projector-spike.mjs](spike/projector-spike.mjs) PROOF 3.

**Boundary:** projections are disposable derived artifacts like feeds (PUBLIC-SOCIAL-DATA-FABRIC §6):
drop-and-rebuild must never touch canonical state. Lane SOC owns the projector;
lane O owns the index entry shape.
