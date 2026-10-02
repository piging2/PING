# VEIN-4 Audit Gap Closure (2026-09-28)

Binding law: `~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md`.
Background paper: `~/workspace/harvest/research/2026-09-27/vein4-evidence-provenance.md`.
AUDIT ONLY. No repo writes, no branches, no commits.

## Audit provenance

- Ground-truth checkout: `/home/nolan/projects/ping`, branch `fyd/sprint-integration-2026-09-24`, HEAD `4a8c5f2e` (full `4a8c5f2e92eef2a3cb6a11582c37f01c38dfacd9`). Verified live via SSH 2026-09-28 ~03:25 MDT.
- Working tree is heavily dirty (dozens of modified files plus untracked additions). Findings are keyed to HEAD unless explicitly marked WORKING TREE.
- Yesterday's claims were keyed to stale HEAD `c93a7ced`; the merkle claims were additionally keyed to a different repo path (`/home/nolan/ping`, branch `feature/orca-reaper-hold`). Both discrepancies are closed below.

---

## Question (a): does PING's merkle tree domain-separate leaf vs node hashing?

### Code evidence

**Ground-truth checkout (`/home/nolan/projects/ping` @ `4a8c5f2e`):**
- `find` for `merkle_tree.ts` anywhere in the repo: no such file.
- `git grep -e merkle -l` at HEAD: zero hits (exit 1).
- `grep -r -e merkle -l` over the `src/` working tree (tracked and untracked): zero hits (exit 1).
- The `src/` tree has no replay-kernel directory (top level: `app components config content fyd lib middleware.ts motion services types`).

**PING lineage implementation** (`/home/nolan/ping`, branch `lane-b/tenant-dispatch-threading`, HEAD `1822d5faecbf7db6985cca1e3303533abef81809`), file `runtime/kernel/replay/merkle_tree.ts` (291 LOC, the file yesterday's S1 cited):
- L24-L25: `export const HASH_DOMAIN_LEAF = 0x00;` / `export const HASH_DOMAIN_PARENT = 0x01;`
- L259-L266: `private hashBytes(bytes: Uint8Array, isLeaf: boolean = true): string {` ... `const prefix = isLeaf ? new Uint8Array([HASH_DOMAIN_LEAF]) : new Uint8Array([HASH_DOMAIN_PARENT]);` ... `const combined = concatBytes(prefix, bytes);` then `CertificateAuthority.sha256` over the prefixed bytes. Docstring L255-L258: "Leaf hashes use HASH_DOMAIN_LEAF prefix, parent hashes use HASH_DOMAIN_PARENT prefix".
- L269-L271: `private hashParent(left: Uint8Array, right: Uint8Array): string {` builds `concatBytes(left, right)` then calls `this.hashBytes(combined, false)` (0x01 prefix).
- L277-L282: `private static hashParent(left, right)` prepends `new Uint8Array([HASH_DOMAIN_PARENT])` directly; used by `verifyProof` (L136-L158) to recompute parent hashes during proof verification.

So the lineage implementation computes leaf = sha256(0x00 || leaf_bytes) and node = sha256(0x01 || left || right). That is exactly the CT RFC-6962 domain-separation pattern, and it is USED in the hashing path, not just declared (constructor L94 `leaf.leaf_hash = this.hashBytes(leaf.leaf_bytes)`, tree build L193 `this.hashParent(...)`, proof verify L143/L148 `MerkleTree.hashParent(...)`).

### Verdict

DOMAIN-SEPARATES for PING's merkle implementation as written in the lineage repo. In the audited ground-truth checkout there is no merkle tree at all, so the question has no live target there. The honest split: the mechanism exists and is correctly domain-separated in PING's own code lineage; the current checkout contains zero merkle code.

### Registry decision: Certificate Transparency candidate

REJECT (PING WINS). The candidate's harvestable mechanism (0x00/0x01 domain-separated leaf/node hashing) is already implemented in PING's own merkle code, and the audited checkout has no merkle tree to patch. There is no missing hardening to write. If a merkle tree is ever reintroduced into the checkout, the law is already on record: 0x00 leaf prefix, 0x01 parent prefix.

---

## Question (b): do derivation-link modules perform digest-equality checks on materials/products?

### Code evidence

**Derivation-link shape (references material by digest):**
- `src/lib/ping/types.ts` (HEAD): `SitePatchPayload.siteSpecDigest: string` with doc "Digest of the exact SiteSpec the patch was drafted against." A site_patch proposal is a derivation link: product = proposal, material = the SiteSpec it was drafted against, referenced BY DIGEST.
- `src/fyd/ask/site-patch.ts:257` (clean, same at HEAD): at draft time `siteSpecDigest: spec.digest`, where `spec` is the `SiteSpecSummary`.
- `src/fyd/ask/site-spec.ts:5-L11` (clean, same at HEAD): "The summary binds the exact spec digest the agent reasoned over, so a proposal's siteSpecDigest can be re-verified against the current spec." L24: `digest: string`.

**Digest-equality check on the material at use time (in-toto MATCH-rule semantics):**
- `src/app/api/ping/proposal/route.ts` (clean, same at HEAD), human-approval BFF endpoint:
  - L58: `if (!verifySignedSitePatchDraft(proposal))` rejects a draft whose digest does not verify.
  - L61-L63 comment: "Re-read the CURRENT SiteSpec and compare digests: a draft reasoned over an older spec cannot apply after the spec changed."
  - L69: `if (current.digest !== proposal.sitePatch.siteSpecDigest)` throws `BadRequestError("The site changed since this proposal was drafted. Ask again for a fresh proposal.")`.
  - This is the claimed-input digest compared against the actual input artifact's digest at use time. A silent input substitution fails closed.

**Digest-equality check on the product at use time:**
- `src/lib/ping/ask-composer.ts:80` (HEAD version confirmed via `git show HEAD:...`): `verifyProposalDigest(proposal)` reconstructs the proposal body and returns `proposal.digest === proposalDigest(body)` (recompute-and-compare).
- `src/fyd/ask/site-patch.ts:312-L318`: `verifySignedSitePatchDraft` = `verifyProposalDigest` (L313) + envelope signature + hash binding L315: `if (proposal.envelope.payload_hash !== proposal.digest) return false;`.
- Called from the approval route at L58, so both product digest and material digest are re-verified before any governed submit.

**Projection read seam (second derivation link with verification):**
- `src/fyd/data/ping-object-source.ts` (clean, same at HEAD):
  - L217 `parseAndVerify`: L237-L238 `if (recomputed !== meta.graphDigest)` fails with "graphDigest mismatch: the projection was tampered with or written by ...".
  - L172-L188: `presentationIntentDigest` recomputed and compared, fail-closed ("presentationIntentDigest mismatch: the intent block was tampered with ...").
  - The read seam verifies the source projection's digest BEFORE composing owner corrections onto it (owner-overlay.ts header L6-L9 documents the same ordering).

**Algorithm identity alongside digests (yesterday's gap (b)):**
- `src/lib/ping/types.ts` (HEAD): `AskProposalBase` carries `digest: string;` plus `digestAlgorithm: "sha256-canonical-json-v1";`. The algorithm label is recorded alongside every proposal digest. CLOSED: yes, recorded.
- WORKING TREE ONLY (untracked, not at HEAD): `src/lib/ping/digest.ts` exports `DIGEST_ALGORITHM = "sha256-canonical-json-v1"` and a constant-time `verify(value, expectedHex)` digest-equality primitive; at HEAD the canonicalizer lived in `ask-composer.ts` using `node:crypto`. The shared module is a 2026-09-27 consolidation that is not yet committed.

**Recorded-only references (no digest check found):**
- `ObjectProvenance.ref` (types.ts, HEAD): "Canonical: creating event id. Website-derived: source content path." By id/path, not digest. `PingRelationship.evidenceRef: string`: canonical event id, not a digest. No digest-equality check on these references was found in the modules read; `provenanceSourceUrls` in ask-composer.ts parses them for URLs only. Scope note: this is "no check found in the modules read", not an exhaustive proof across all consumers.

### Verdict

YES, VERIFIED for the governed derivation flows: the site_patch derivation link records the material by digest at draft time and the approval endpoint re-reads the current material and rejects on digest mismatch (in-toto MATCH-rule semantics, route.ts:69); the product digest is recomputed and compared at approval (ask-composer.ts:80 via site-patch.ts:312, route.ts:58); the projection read seam fail-closes on graphDigest/presentationIntentDigest mismatch before composing corrections (ping-object-source.ts:237-238, 178-188). Provenance/evidence refs (`ObjectProvenance.ref`, `PingRelationship.evidenceRef`) are id/path-based and merely recorded (no digest check found). Algorithm identity IS recorded with digests (`digestAlgorithm: "sha256-canonical-json-v1"`, types.ts HEAD).

### Registry decision: in-toto candidate

REJECT (PING WINS) for the MATCH-rule mechanism. The digest-equality chaining the candidate would harvest is already implemented and enforced in PING's proposal approval path and projection read seam. The candidate record's gated "comment-level law text" patch is unnecessary: the law is enforced in code (route.ts:58-69), not merely documented. No writer, no defect.

---

## Audit gaps closed by this pass

- (a) Merkle domain separation: CLOSED. Lineage implementation domain-separates (0x00/0x01, proven from code). Current checkout has no merkle tree (proven from grep/find). Stale claim corrected: yesterday's S1 described the file as current PING code; it exists only in the `/home/nolan/ping` repo lineage, not in the ground-truth checkout.
- (b) Algorithm recorded with digests: CLOSED. Yes (`digestAlgorithm: "sha256-canonical-json-v1"` in `AskProposalBase`, HEAD).
- (c) Derivation-link digest-equality checks: CLOSED. They exist and are enforced at use time (route.ts:58-69, site-patch.ts:312-318, ask-composer.ts:80, ping-object-source.ts:172-188, 237-238). The only recorded-only references are the id/path-based provenance refs, which were never the candidate's target.
- (d) Live HEAD re-verification: CLOSED. HEAD is `4a8c5f2e` on `fyd/sprint-integration-2026-09-24` (was `c93a7ced`); working tree is heavily dirty, so all findings above are explicitly keyed HEAD vs working tree.

## Caveats

- The old `/home/nolan/ping` repo is on a different branch (`lane-b/tenant-dispatch-threading`, HEAD `1822d5fa...`) than yesterday's S1 cited (`feature/orca-reaper-hold`); the merkle file survives there unchanged in the relevant lines.
- I did not exhaustively audit every consumer of `ObjectProvenance`/`evidenceRef`; the recorded-only claim is bounded to the modules read.
- `src/lib/ping/digest.ts` and its test are uncommitted working-tree additions; nothing in this audit depends on them being at HEAD.
