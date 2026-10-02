# The Identity Law

Business object identity in FYD. Short version: the runner label is
provenance, not identity.

## 1. The law, in one paragraph

A business object id is derived ONLY from canonical source semantics:
the canonical source key plus the schema role. The runner that observed
the source (website, facebook, manual) is recorded in the provenance
carrier (provenance.ref / evidenceRef), never in the id. The same
business observed by any runner mints the same id, so evidence,
corrections, relationships, history, and regeneration all attach to one
object instead of forking into one object per runner.

## 2. Why the old way was wrong

The previous intake minted `"website-business-" + sha256Hex(sourceUrl)`.
The literal `website-` prefix is a RUNNER label baked into the identity
string. A facebook runner observing the same business would mint a
different id, and the same business became two objects. Every correction
keyed to the website id missed the facebook id; every regeneration
forked history. That defect is fixed by this domain.

## 3. The versioned domain

The domain constant is `ping.object-identity@1`. Every new mint records
this exact value in its provenance carrier. ID formats change only via a
new versioned domain with a migration plan; historical rows are never
reminted. If the minting rules ever change, the new rules ship under
`ping.object-identity@2` and old mints stay pinned to `@1`.

## 4. Era separation

Ids minted before this domain (the old `website-business-*` ids) are
read only. They appear in this lane only as fixtures proving the eras
stay separate. This domain never mints them, never remints them, and
executes no dedup against them. `idDomain()` classifies any id as
`ping.object-identity@1`, `legacy:website-business`, or `unknown`.

## 5. What "same source semantics" means

Two observations describe the same business identity when they share:

- the same canonical source key (the source URL after the
  canonicalization rules below), and
- the same schema role ("business" for the root object,
  "service:<slug>" for a service it offers, "location:<slug>" for a
  branch).

Everything else (which runner saw it, which process minted it, what
order observations arrived in, whether the machine restarted, how many
times the batch replayed) is not identity. The id formula is:

    "biz-" + sha256Hex(canonicalSourceKey + "|" + schemaRole).slice(0, 16)

Deterministic: no clock, no randomness, no ambient state in minting.

## 6. Canonicalization rules

`canonicalSourceKey` converges URL spellings that name the same source:

1. Scheme lowercased; only http/https accepted (a mailto: or tel: link
   is not a business).
2. Host lowercased (DNS is case-insensitive).
3. Default ports stripped (:80 on http, :443 on https); non-default
   ports kept, because host:8443 is a different deployment.
4. Trailing slash variants collapsed: "/about/" and "/about" are the
   same page; bare host and host + "/" are the same origin.
5. Fragment stripped (#menu): fragments are client-side anchors and
   never change which business a source describes.
6. Tracking params stripped (utm_*, fbclid, gclid, and the documented
   marketing ids): they name the visit, not the business. Remaining
   query params are kept and sorted by (name, value), so "?b=2&a=1"
   equals "?a=1&b=2" while a genuinely distinguishing query
   ("?location=denver") still yields a distinct key.
7. Percent-encoding normalized by re-encoding decoded names and values.

## 7. The provenance carrier convention

The runner label enters the system through exactly one door:
`provenanceCarrier(runnerLabel, evidenceRef, runId)`. It lands in
provenance.ref / evidenceRef alongside the domain version. The id
functions (`businessIdForSource`, `mintObservation`) never receive a
runner label, so the label cannot leak into the id by construction.

## 8. Owner corrections survive everything

Corrections are keyed by the stable object id. Because the id is
runner-independent, process-independent, order-independent,
restart-independent, replay-independent, and regeneration-stable, a
correction applied once resolves correctly after every one of those
conditions. The proof test applies one title correction and asserts it
still resolves after each of the six conditions.

## 9. What this domain does NOT do

- It does not cover auth/user identity (see src/fyd/identity/, which
  derives principal ids from OIDC provider + issuer + subject; a
  different concern).
- It does not remint or dedup legacy `website-business-*` ids.
- It does not decide whether two DIFFERENT sources describe the same
  real-world business (entity resolution); it guarantees that the SAME
  source semantics always mint the SAME id.
