# DUPLICATION SWEEP — PING repo (/home/nolan/projects/ping)

Living document. Pass 1 completed 2026-09-23 ~20:00 MDT. Method: read-only greps via pigwsl-exec.sh over semantic families (identity/hash/event/registry/provenance/config/secret). No writes to the repo.

Severity: HIGH (live divergence risk / lane-blocking) / MEDIUM (real duplicate, contained) / LOW (duplicate one-liner, watch).

---

## CLUSTER 1: Ask-context assembly — HIGH
Three modules assemble "context for a reasoner", two live in the same directory:

| File | Lines | Classification | Evidence |
|---|---|---|---|
| src/lib/ping/ask-composer.ts | — | AUTHORITY | Live: buildAskContext, composeAnswer, proposalDigest, canonicalize. Used by src/fyd/ask/site-patch.ts:14, ping-object-reader.ts:47. |
| src/fyd/ask/context-builder.ts | 41 | ADAPTER | Thin wrapper over ask-composer.buildAskContext + agent grant filtering. Only importer: src/fyd/lineage/tracer.ts. Self-describes "ONE builder". |
| src/fyd/ask/context-compiler.ts | 559 | LEGACY/DORMANT (not dead code yet — decision needed) | Zero importers. 559-line full packet compiler (question + viewer + target -> visibility-bounded packet, CONTEXT_PACKET_VERSION ask-context-packet@1, imports canonicalize from ask-composer). Test exists: src/fyd/ask/__tests__/context-compiler.test.ts. |

Convergence recommendation: this is EXACTLY Lane G's chartered mission (question + viewer + target object -> compiled visibility-bounded packet). Lane G must adopt context-compiler.ts as the base, wire it into the ask path, and reconcile context-builder.ts (merge as the agent-grant filter inside the compiler, or delete). Do NOT build a third context module. FYD factory's concierge (src/fyd/ask/concierge.ts) should become a consumer of the compiled packet, per lane-g STATE intent.
Severity: HIGH — lane-blocking if lane G designs before reading this module.

---

## CLUSTER 2: Canonical JSON serializers — MEDIUM/HIGH
Two live canonical-JSON laws in the same repo, divergent on edge cases:

| Serializer | File:line | Law | undefined handling |
|---|---|---|---|
| canonicalize | src/lib/ping/ask-composer.ts:55 | "sha256-canonical-json-v1" | undefined -> "null" (no filtering) |
| canonicalizeJson | src/lib/ping/dev-signer.ts:46 | dev/BFF envelope serializer | undefined values DROPPED |

Each is internally consistent (produce/verify use the same one):
- ask-composer law: consumed by src/fyd/ask/site-patch.ts:271, src/fyd/ask/envelope.ts:28 (serializer pin, 2026-09-21 decision: "One serializer for digests and signatures, so a signed proposal's payload_hash always equals its proposal digest").
- dev-signer law: consumed by src/fyd/social/envelope.ts:14, src/fyd/social/transition-id.ts:13, src/fyd/object/owner-events.ts:31, src/lib/ping/ping-object-reader.ts:53.

A THIRD digest law also exists: src/fyd/proceduralize/patch.ts:67 proposalDigest (own canonicalize with VOLATILE_KEYS strip of proposalDigest/createdAt/generatedAt/nonce), used by src/fyd/customize/apply-layer.ts:56. ask-composer's proposalDigest (src/lib/ping/ask-composer.ts:82) does NOT strip volatile keys. Two live proposalDigest functions with different digest laws over similar SitePatchBody shapes.

Convergence recommendation: keep ask-composer's serializer as the AUTHORITY (it has the pinned serializer decision and the envelope pin). Migrate patch.ts proposalDigest onto ask-composer's proposalDigest (or record an explicit fork boundary if the shapes are genuinely different domains — the evidence says same shape family). One canonicalize implementation, pinned undefined policy, documented in one place.
Severity: MEDIUM — contained today, but a sign-verify mismatch waiting to happen the first time a consumer mixes laws.

## CLUSTER 3: builder canonicalizeValue twins — MEDIUM
- src/fyd/builder/canonical.ts:31 canonicalizeValue — sorted keys + strips volatile keys ending in "At". Exported canonicalizeSpec/semanticDigestOf, consumed by src/fyd/builder/planner.ts:71, re-exported src/fyd/builder/index.ts:109.
- src/fyd/builder/source-refresh.ts:81 canonicalizeValue — same name, same directory, sorted keys but NO volatile stripping; drives canonicalOwnerLayer digest.

Same-name sibling functions with divergent stripping rules in adjacent modules. If any digest equality is ever asserted across them, it will fail spuriously.
Convergence recommendation: source-refresh should import builder/canonical's function with an explicit strip/no-strip parameter, or the strip policy should be named (e.g. stripVolatile: boolean) in one shared module.
Severity: MEDIUM — latent digest-mismatch hazard in owner-layer survival proofs.

## CLUSTER 4: FYD identity derivation — LOW (DERIVED, pinned)
- src/fyd/identity/uuid.ts — 100-line uuidv5 implementation + FYD_IDENTITY_NAMESPACE, self-described as reusing the PING runtime kernel's derivation rule ("see /home/nolan/ping/runtime/kernel/identity/canonical-id-generator.ts"), "it does not depend on PING's runtime".
- Canonical IdentityAuthority lives in the separate runtime repo (not in this repo; references at src/lib/ping/ping-object-reader.ts:591, src/fyd/social/transition-id.ts:7).

Classification: DERIVED. Same deterministic rule, independent code. Constitutional rule-of-one check: no competing identity authority in THIS repo — passes. The drift risk is that the runtime rule changes and FYD's copy doesn't. Convergence recommendation: add a pinned contract test asserting FYD's uuidv5 output matches known vectors from the runtime authority; keep as DERIVED, never promote to a second authority.
Severity: LOW-MEDIUM.

## CLUSTER 5: Event systems — separate domains, NOT duplicates
Three event/provenance systems, each in a distinct domain:

| System | Domain | Classification |
|---|---|---|
| src/lib/editor/event-system.ts + durable-event-store.ts + sequence-authority.ts (670+208+lines) | Editor: commands -> events -> projections for the page editor | Domain-scoped authority. Internally consistent: sequenceAuthority imported by both event-system and durable-event-store. |
| src/lib/events.ts ("HPP Event Logger") | Marketing/customer-interaction event logging; EventRepository/ReplayRepository abstraction; in-memory MVP | Domain-scoped; legacy MVP (warns it is not durable). |
| Canonical EventAuthority (separate runtime repo) | PING constitutional events | NOT IN THIS REPO — confirmed absent; matches phase0 hypothesis. |

Convergence recommendation: no action. The HPP logger is the only cleanup candidate (migrate to the canonical event path when available, or retire explicitly).

## CLUSTER 6: Slot registries — LOW (watch)
- src/lib/slot-registry.ts — runtime visual-slot registration for the Workbench (consumer: src/components/visual-slot.tsx).
- src/lib/editor/slot-registry.ts — editor editable-region registration with constraints (consumers: src/lib/editor/event-system.ts, command-pattern.ts, canonical-editor-service.ts).

Same semantic family, different capability shapes and consumers. Classification: SEPARATE (for now). Watch: if the editor system and Workbench ever merge slot concepts, converge then, not before.

## CLUSTER 7: sha256Hex one-liners — LOW
- AUTHORITY: src/fyd/proceduralize/sha256.ts (shared module; consumers: src/fyd/customize/intent.ts:23, src/fyd/customize/owner-proposal.ts:80).
- Local copies: src/fyd/data/fyd-tenant-graph.ts:127, src/fyd/ask/context-compiler.ts:254, src/fyd/customize/server.ts:39.

Convergence recommendation: import the shared module; trivial mechanical fix. Severity: LOW.

## CLUSTER 8: Infrastructure/service registry — MEDIUM (lane watch)
- src/lib/infrastructure/controller.ts + auth-manager.ts + audit.ts — service registry for Google/GitHub/Vercel/Stripe/etc. Zero importers: DORMANT/LEGACY.
- src/lib/kit-adapter.ts — Kit webhook signature verification (live, consumer of provider secrets).

Convergence recommendation: when Lane BCQ/M designs the source registry, harvest controller.ts's service-config concepts into it; do not leave a second dormant registry standing beside the new one. Lane L broker should absorb auth-manager's custody concepts and the scattered env-var secret reads (kit-adapter, blob-storage, identity/session, etc.).

## CLUSTER 9: Provenance models — separate domains, NOT duplicates
- src/lib/events.ts EventProvenance — provider event idempotency (kit/google/manual/form).
- src/fyd/media/provenance.ts — media asset provenance (digests, rights basis, derived assets).
- src/fyd/lineage/tracer.ts — full pipeline lineage trace SOURCE->OBSERVATION->EVIDENCE->OBJECT->SITESPEC->RENDER->ANSWER.

Classification: SEPARATE. Watch: Lane N (data lineage) must absorb tracer.ts, not duplicate it.

## CLUSTER 10: Mission stores / worker registries / connector registries / cursor stores / config authorities
None found in the repo. Any lane that needs one builds the first instance — the convergence gate is: ONE of each, and lane M's source registry must be the place provider-shaped metadata lands.

## Constitutional rule-of-one check (this repo)
- Identity: single content-derived rule (uuidv5) + stdlib randomUUID for non-canonical IDs only (ingest runs, request IDs, snapshots, activitypub fragments, diagnostics). No competing generator. PASS (with the DERIVED note in cluster 4).
- Hashing: all sha256 via node:crypto; no reimplemented algorithms. PASS (with the serializer-law note in cluster 2).
- Event authority: absent from this repo by design (separate runtime). Domain-scoped editor/marketing event systems are not competing authorities. PASS (phase0 to confirm the runtime side).
- Secret broker: does not exist yet; nothing to compete with. Lane L mission valid.

## No new duplicates from tonight's lane work
Tonight's lane dirs contain specs, contracts, and probe scripts only — no new abstraction implementations. The one exception is the reverse: the repo already contains Lane G's target (cluster 1). Lane G's STATE.md already notes the compiler-versus-concierge split; it must additionally note context-compiler.ts's existence before designing anything.
