import sys

path = "/home/nolan/projects/ping/src/fyd/builder/planner.ts"
src = open(path, encoding="utf-8").read()

edits = []

# 1. Import the render-model emission; the verdict-only gate is superseded by
# the model builder (which fails closed internally).
edits.append((
"""import {
  assertSpecBindingsVerified,
  ownerAssertionsFromGraph,
  type PresentationBinding,
} from "../sitespec/binding-verifier";""",
"""import {
  buildVerifiedRenderModel,
  ownerAssertionsFromGraph,
  type PresentationBinding,
  type VerifiedRenderModel,
} from "../sitespec/binding-verifier";""",
))

# 2. PlannedSite carries the verifier's output at the projection seam.
edits.append((
"""  /** Canonical JSON of the spec (sorted keys, no volatile stamps). */
  canonicalSpecJson: string;
}""",
"""  /** Canonical JSON of the spec (sorted keys, no volatile stamps). */
  canonicalSpecJson: string;
  /**
   * The BindingVerifier's output at the projection seam: every factual
   * atom the emitted spec carries, classified per the content contract
   * (OWNER_ASSERTED / DIRECT_EVIDENCE / DETERMINISTIC_DERIVATION /
   * GENERATED_PRESENTATION) with its value and its evidence or owner
   * assertion ref. Optional for backward compatibility with in-flight
   * fixtures; always set by planSite. The renderer consumes only this
   * model and performs no claim checking of its own.
   */
  verifiedRenderModel?: VerifiedRenderModel;
}""",
))

# 3. The emission seam emits the verified render model (fail closed inside).
edits.append((
"""  // BindingVerifier at the projection seam (EVIDENCE/OBJECT PROJECTION ->
  // BINDING VERIFICATION -> SITE SPEC -> RENDERER). Every factual binding
  // the emitted spec carries must resolve to an object field backed by an
  // evidence ref, a recorded owner assertion, or an explicit
  // generated-presentation mark. UNBOUND bindings fail closed here: the
  // planner throws before any spec is produced, so the renderer path cannot
  // bypass verification. The renderer reads factual values through the same
  // verifier core (boundField -> resolveBoundField in renderer.tsx).
  assertSpecBindingsVerified(
    slotBindingsForVerification(generatedPresentation),
    graph,
    ownerAssertionsFromGraph(graph),
  );""",
"""  // BindingVerifier at the projection seam (EVIDENCE GRAPH ->
  // BINDING VERIFIER -> VERIFIED RENDER MODEL -> SITE SPEC / RENDERER).
  // The verifier emits the verified render model: every factual atom the
  // emitted spec carries, classified per the content contract
  // (OWNER_ASSERTED / DIRECT_EVIDENCE / DETERMINISTIC_DERIVATION /
  // GENERATED_PRESENTATION) with its value and its evidence or owner
  // assertion ref. Unsupported factual atoms fail closed here: the planner
  // throws before any spec is produced, so no render path can be handed an
  // unverified model. The renderer consumes only this model and performs
  // no claim checking of its own.
  const verifiedRenderModel = buildVerifiedRenderModel(
    slotBindingsForVerification(generatedPresentation),
    graph,
    ownerAssertionsFromGraph(graph),
    { rendererVersion: COMPONENT_REGISTRY_VERSION, viewerId: null },
  );""",
))

# 4. Attach the model to the emitted plan.
edits.append((
"""    semanticDigest,
    canonicalSpecJson,
  };
}""",
"""    semanticDigest,
    canonicalSpecJson,
    verifiedRenderModel,
  };
}""",
))

for old, new in edits:
    count = src.count(old)
    if count != 1:
        print("MISMATCH (count=%d), aborting:\n%s" % (count, old[:200]))
        sys.exit(1)
    src = src.replace(old, new)

open(path, "w", encoding="utf-8").write(src)
print("planner.ts delta patch applied (%d edits)" % len(edits))
