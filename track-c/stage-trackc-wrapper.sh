#!/bin/bash
set -u
python3 - <<'PYEOF'
#!/usr/bin/env python3
"""Track C: stage ONLY this lane's hunks onto the index (HEAD context).

The working tree is shared with other lanes; this script never touches it.
For the three interleaved files it reconstructs HEAD content + Track C
replacements (exact anchors from this session's patch scripts, adapted to
HEAD), hashes the result, and stages via update-index --cacheinfo.
tracer.ts and site-metadata-verifier.test.ts are staged whole (their
working-tree diffs are entirely Track C's).

Left uncommitted (flagged in the report): determinism-probe.ts viewerKind
and render-model.test.ts additions, which build on the sitespec lane's
uncommitted projection refactor and must land together at integration.
"""
import subprocess
import sys

REPO = "/home/nolan/projects/ping"


def sh(*args):
    r = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        print("CMD FAILED:", " ".join(args))
        print(r.stderr[:800])
        sys.exit(1)
    return r.stdout


def head_content(path):
    return sh("git", "show", f"HEAD:{path}")


def stage_content(path, content):
    r = subprocess.run(
        ["git", "hash-object", "-w", "--stdin"],
        cwd=REPO, input=content, capture_output=True, text=True,
    )
    if r.returncode != 0:
        print("hash-object failed:", r.stderr[:500])
        sys.exit(1)
    sha = r.stdout.strip()
    mode = sh("git", "ls-files", "-s", path).split()[0]
    sh("git", "update-index", "--cacheinfo", f"{mode},{sha},{path}")
    print(f"staged {path} -> {sha[:8]}")


def replace_once(content, old, new, label):
    n = content.count(old)
    if n != 1:
        print(f"ANCHOR PROBLEM [{label}]: found {n} occurrences, need 1")
        sys.exit(1)
    return content.replace(old, new)


# ---- 1. site-metadata.ts: Binding Verifier wiring (HEAD context) ----
p = "src/app/sites/_shared/site-metadata.ts"
c = head_content(p)
c = replace_once(
    c,
    'import { getPingObjectGraph } from "@/fyd/data/ping-object-source";',
    'import { getVerifiedPublicProjection } from "@/fyd/data/ping-object-source";\n'
    "import {\n"
    "  ownerAssertionsFromGraph,\n"
    "  resolveBoundFieldVerified,\n"
    '} from "@/fyd/sitespec/binding-verifier";',
    "metadata imports",
)
c = replace_once(
    c,
    """  const { graph } = await getPingObjectGraph(siteId);
  const owner = ownerObject(graph);
  const name = owner?.title?.trim() || siteId;
  // The business's own description from its object graph. Never PING's.
  // Falls back to a plain generator-labeled line when the source object
  // carries no description; the fallback never claims facts about the
  // business and never mentions PING's infrastructure.
  const description =
    owner?.description?.trim() || `${name} | FYD Social generated site`;""",
    """  // Verified public projection (Q-C-01): metadata derives from the
  // public graph, never the raw source graph.
  const { graph } = await getVerifiedPublicProjection(siteId, "anonymous");
  const owner = ownerObject(graph);
  // Binding-verified owner text (FYD product authority directive,
  // 2026-09-25: the BindingVerifier owns ENFORCEMENT, truth stays
  // upstream). The <title>, meta description, and social tags are factual
  // render bindings: they may publish the business's own
  // title/description only when the binding verifies against the strong
  // BindingVerifier (direct: object field + evidence ref + fresh
  // website-derived provenance; owner-authored: a recorded owner
  // assertion matching the value). An unverified name/description is
  // never published as the business's words. The fallback is
  // explicitly generator-labeled presentation copy (GENERATED class),
  // never a factual claim about the business.
  const assertions = ownerAssertionsFromGraph(graph);
  const verifiedTitle = owner
    ? resolveBoundFieldVerified(
        graph,
        { objectId: owner.id, field: "title", classification: "direct" },
        assertions,
      )?.trim() || undefined
    : undefined;
  const verifiedDescription = owner
    ? resolveBoundFieldVerified(
        graph,
        { objectId: owner.id, field: "description", classification: "direct" },
        assertions,
      )?.trim() || undefined
    : undefined;
  const name = verifiedTitle ?? "FYD Social generated site";
  // The business's own description from its object graph. Never PING's.
  // Falls back to a plain generator-labeled line when the source object
  // carries no verifiable description; the fallback never claims facts
  // about the business and never mentions PING's infrastructure.
  const description =
    verifiedDescription ?? name + " | FYD Social generated site";""",
    "metadata body",
)
stage_content(p, c)

# ---- 2. public-projection.ts: decisionsDigest order-insensitivity ----
p = "src/fyd/sitespec/public-projection.ts"
c = head_content(p)
c = replace_once(
    c,
    """  const graphDigest = sha256Hex(canonicalize(graph));
  const policySubset = decisions.map((d) => ({
    objectId: d.objectId,
    field: d.field,
    policy: d.policy,
    version: d.version,
  }));
  const decisionsDigest = sha256Hex(canonicalize(policySubset));""",
    """  const graphDigest = sha256Hex(canonicalize(graph));
  // OwnerOverrides are a SET: the decisions digest must not depend on
  // caller input order. Sort canonically before hashing (explicit
  // tie-breaker, same discipline as render-model.canonicalizeOverrides)
  // so [A, B] and [B, A] produce the same decisionsDigest, checkpoint,
  // and viewerPolicyDigest. This is an identity function of the decision
  // set, not of the application order.
  const policySubset = decisions
    .map((d) => ({
      objectId: d.objectId,
      field: d.field,
      policy: d.policy,
      version: d.version,
    }))
    .sort((a, b) =>
      a.objectId !== b.objectId
        ? a.objectId < b.objectId
          ? -1
          : 1
        : a.field !== b.field
          ? a.field < b.field
            ? -1
            : 1
          : a.policy !== b.policy
            ? a.policy < b.policy
              ? -1
              : 1
            : a.version - b.version,
    );
  const decisionsDigest = sha256Hex(canonicalize(policySubset));""",
    "projection digest sort",
)
stage_content(p, c)

# ---- 3. render-model.ts: mirror the real render path (HEAD context) ----
p = "src/fyd/sitespec/render-model.ts"
c = head_content(p)
c = replace_once(
    c,
    'import { resolveQuery } from "../components/renderer";',
    "import {\n"
    "  applyHiddenObjects,\n"
    "  applyObjectOrder,\n"
    "  resolveQuery,\n"
    "  siteDeactivatedObjectIds,\n"
    '} from "../components/renderer";',
    "rendermodel imports",
)
c = replace_once(
    c,
    "/** One rendered section: its identity, its component, and the objects it binds, in render order. */",
    "/**\n"
    " * One rendered section: its identity, its component, and the objects it\n"
    " * binds, in the order the real render path emits them (resolveQuery,\n"
    " * then the owner-approved objectOrder, then owner-hidden object\n"
    " * exclusion). Sections with presentation.hidden never render and are\n"
    " * absent from the model.\n"
    " */",
    "rendermodel section doc",
)
c = replace_once(
    c,
    """  const pages: SemanticPageModel[] = spec.pages.map((page) => ({
    slug: page.slug,
    sections: page.sections.map((section) => ({
      id: section.id,
      component: section.component,
      objectIds: resolveQuery(section.query, graph, spec.ownerObjectId).map((o) => o.id),
      heading: section.presentation.heading,
      copy: section.presentation.copy,
    })),
  }));""",
    """  // The real render seam (renderSection in components/renderer.tsx):
  // an owner-hidden object is excluded from every surface site-wide.
  const hiddenObjectIds = siteDeactivatedObjectIds(spec);
  const pages: SemanticPageModel[] = spec.pages.map((page) => ({
    slug: page.slug,
    sections: page.sections
      // presentation.hidden sections never render: the model mirrors the
      // real path and omits them.
      .filter((section) => !section.presentation.hidden)
      .map((section) => {
        // Mirror the real render path exactly: query resolution, then the
        // owner-approved objectOrder, then owner-hidden object exclusion.
        const objects = applyHiddenObjects(
          applyObjectOrder(
            resolveQuery(section.query, graph, spec.ownerObjectId),
            section.presentation.objectOrder,
          ),
          hiddenObjectIds,
        );
        return {
          id: section.id,
          component: section.component,
          objectIds: objects.map((o) => o.id),
          heading: section.presentation.heading,
          copy: section.presentation.copy,
        };
      }),
  }));""",
    "rendermodel build body",
)
c = replace_once(
    c,
    """ * Build the semantic render model. Pure function of its inputs:
 * pages and sections are visited in spec order, and objectIds preserve
 * resolveQuery's deterministic ordering (updatedAt desc with id tiebreak;
 * "related" sorted by id). No Date.now(), no Math.random(), no counters,
 * no request-order-dependent ids.""",
    """ * Build the semantic render model. Pure function of its inputs:
 * pages and sections are visited in spec order, and objectIds follow
 * the real render path's ordering: resolveQuery's deterministic ordering
 * (updatedAt desc with id tiebreak; "related" sorted by id), then the
 * owner-approved objectOrder, then owner-hidden object exclusion.
 * No Date.now(), no Math.random(), no counters, no request-order-
 * dependent ids.""",
    "rendermodel fn doc",
)
stage_content(p, c)

print("ALL STAGED OK")
PYEOF
