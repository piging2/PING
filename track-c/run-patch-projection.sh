#!/bin/bash
# Track C: decisionsDigest order-sensitivity fix (FYD product authority
# directive 2026-09-25). verifyPublicProjection hashed policySubset in
# caller input order, so the same OwnerOverrides set in a different
# order produced a different decisionsDigest / checkpoint /
# viewerPolicyDigest, breaking the semantic-render invariant:
# SAME (graph + spec + viewer + overrides) -> SAME model.
# OwnerOverrides are a SET: sort canonically before hashing with the
# same explicit tie-breaker (objectId, field, policy, version) the
# render model's canonicalizeOverrides uses.
set -u
python3 - <<'PYEOF'
import io
p = "/home/nolan/projects/ping/src/fyd/sitespec/public-projection.ts"
s = io.open(p, encoding="utf-8").read()

old = '''  const graphDigest = sha256Hex(canonicalize(graph));
  const policySubset = decisions.map((d) => ({
    objectId: d.objectId,
    field: d.field,
    policy: d.policy,
    version: d.version,
  }));
  const decisionsDigest = sha256Hex(canonicalize(policySubset));'''
new = '''  const graphDigest = sha256Hex(canonicalize(graph));
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
  const decisionsDigest = sha256Hex(canonicalize(policySubset));'''
assert old in s, "anchor missing"
io.open(p, "w", encoding="utf-8").write(s.replace(old, new))
print("public-projection.ts patched")
PYEOF
