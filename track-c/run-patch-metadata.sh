#!/bin/bash
# Track C: wire BindingVerifier into site-metadata.ts (factual <title>/meta/OG seam).
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/app/sites/_shared/site-metadata.ts"
s = io.open(p, encoding="utf-8").read()

old_import = '''import type { Metadata } from "next";
import { getVerifiedPublicProjection } from "@/fyd/data/ping-object-source";
import type { ObjectGraph } from "@/fyd/sitespec/types";'''
new_import = '''import type { Metadata } from "next";
import { getVerifiedPublicProjection } from "@/fyd/data/ping-object-source";
import {
  ownerAssertionsFromGraph,
  resolveBoundFieldVerified,
} from "@/fyd/sitespec/binding-verifier";
import type { PingObject } from "@/lib/ping/types";
import type { ObjectGraph } from "@/fyd/sitespec/types";'''
assert old_import in s, "import anchor missing"
s = s.replace(old_import, new_import)

old_body = '''  const { graph } = await getVerifiedPublicProjection(siteId, "anonymous");
  const owner = ownerObject(graph);
  const name = owner?.title?.trim() || siteId;
  // The business's own description from its object graph. Never PING's.
  // Falls back to a plain generator-labeled line when the source object
  // carries no description; the fallback never claims facts about the
  // business and never mentions PING's infrastructure.
  const description =
    owner?.description?.trim() || `${name} | FYD Social generated site`;'''
new_body = '''  const { graph } = await getVerifiedPublicProjection(siteId, "anonymous");
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
    verifiedDescription ?? name + " | FYD Social generated site";'''
assert old_body in s, "body anchor missing"
s = s.replace(old_body, new_body)

io.open(p, "w", encoding="utf-8").write(s)
print("site-metadata.ts patched")
PYEOF
