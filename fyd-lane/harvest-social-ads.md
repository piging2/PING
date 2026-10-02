# Harvest lane: decentralized social + discovery + commerce + advertising substrate

Date: 2026-09-22. Status: READ-ONLY. Nothing was written to the product repo, no commits, no new authorities, no product code changed. This lane must not destabilize the product build; nothing here merges without coordinator approval and independent tests.

Method: (1) PING code inventory first, read-only against `/home/nolan/projects/ping` via the Pig bridge; (2) two parallel external-research workers against live sources (ActivityPub/ATProto/Farcaster; Nostr/MCP/open ad-commerce patterns), every claim verified against a page read this session. Prior harvest corpus consulted: `src/fyd/adapters/ATPROTO-HARVEST.md` (2026-09-21, commit `08cc39d6`) and `~/workspace/fyd-lane/harvest-report.md` (2026-09-21).

## QUESTION

How can the same PING object/relationship/capability substrate eventually support discovery, recommendations, sponsorship and advertising WITHOUT turning FYD into a centralized surveillance ad network?

Binding constraints: prefer contextual + relationship-based relevance (object context + viewer-allowed context + explicit relationships + capabilities + current intent) over surveillance; no covert behavioral dossiers; never infer sensitive traits for targeting; do NOT create an AdAuthority; protocol representations are projections/adapters, the canonical object stays PING; a sponsored object must be honestly labeled SPONSORED.

## EVIDENCE — what PING already has (read-only inventory, exact paths)

The substrate is further along than the question assumed. Mapping the future model onto existing primitives:

| Future model piece | PING primitive (exists today) | Path / evidence |
|---|---|---|
| Business creates Offer/Object | Offer objects already emitted with evidence | `src/lib/ping/types.ts` KNOWN_OBJECT_SCHEMAS includes `ping.social.offer@1`; `src/fyd/proceduralize/proceduralizer.ts:893-931` emits `ping.social.offer@1` objects from service extraction with DIRECT_FACT/ DERIVED_FACT fact classes |
| Signed offers | Ed25519 signed envelopes over canonical bytes | `src/lib/ping/dev-signer.ts` (canonicalizeJson sorted-key serializer, generateDevKeypair, signAsIdentity, keys escrowed 0600 outside the tree); `src/fyd/social/envelope.ts` `bff-envelope@1` (Ed25519 over sorted-key canonical bytes of {type, payload, metadata}, proof {algorithm, signature, publicKey PEM SPKI}) |
| Campaign references Offer | RELATIONSHIP_CREATED journal events | `src/fyd/social/actions.ts` (follow/unfollow as RELATIONSHIP_CREATED {subject, predicate, object, status}); revocation = status `inactive` on the same predicate, no `unfollows` predicate (forbidden by vocabulary) |
| Deterministic action identity (dedup) | fydActionId content-hash IDs | `src/fyd/social/transition-id.ts` (SHA-256 over canonical bytes + generator version, mirrors PING UnifiedEventRuntime emit pattern from harvest C1) |
| Outcome/attribution receipts | Attestation gates + evidence refs | `src/fyd/social/attestation-gate.ts` (ATTESTATION_REJECTED with missing evidence named; success never reported without journal proof); `src/lib/ping/types.ts` `DiscoveryFeedItem.evidenceRef` |
| Placement slots / publisher inventory | Rail placement rule + engagement reconciliation | `src/fyd/placement/rail-rule.ts` (pure deterministic: which margin hosts a rail, margins never faked); `src/fyd/placement/engagement-reconcile.ts` (engagement released on placement-mode change) |
| Recommendation / relevance ranking | Two deterministic rankers, already non-surveillance | `src/fyd/rank/object-ranker.ts` (score = proximity .35 + followed .25 + capability .1 + recency .15 + stability .15, lexicographic tiebreak, no behavioral dossier); `src/lib/ping/feed-rank.ts` (score = kindWeight + recency + actorProximity 0..10, pure, nowIso pinned) |
| Frequency caps / anti-Times-Square | Attention controller with hysteresis | `src/fyd/attention/controller.ts` (at most 1 PRIMARY + 1 SECONDARY, minResidencyMs 1200, cooldownMs 800, interaction lock) |
| Budget constraints | Budget + quota primitives | `src/fyd/net/budgets.ts` (CrawlLedger pages/bytes fail-closed, OriginSemaphore, DedupCache); `src/fyd/net/rate-limit.ts` (TokenBucket, GenerationQuota, documented fail-open-on-restart accepted for tiny quotas) |
| Capability-based delivery | Capability runtime, fail-closed | `src/fyd/capabilities/runtime.ts` (CapabilityKind follow|like|ask|website; executors return last server-confirmed state on failure) |
| Grant authority (who may do what) | FydGrant, agents explicitly denied ads | `src/lib/ping/grants.ts` + `src/lib/ping/types.ts:282` (`FydGrant` includes `ad.buy`; `grantsForViewer`: "Agents NEVER receive publish/message/purchase/advertise/provider/mutate"); grant shape already harvested from ATProto permission patterns (resource-scoped strings, attenuation by default) |
| Ownership/authorization evidence | Claim state machine | `src/fyd/claim/types.ts` + `machine.ts` (OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED, every transition appends audit events, demo contexts can never be claimed) |
| Protocol adapters (projection only) | ActivityPub skeleton + ATProto harvest | `src/fyd/adapters/activitypub/` (commit `f61200c7`, local mapping verified, remote round-trip honestly recorded as rejected); `src/fyd/adapters/ATPROTO-HARVEST.md` (commit `08cc39d6`, ADOPT/ADAPT/REJECT per primitive, no adapter code per Nolan 2026-09-21) |
| Discovery feed | DiscoveryFeedItem with actorProximity | `src/lib/ping/types.ts:238-250` (kinds: object_activity, relationship_change, new_public_object, website_content) |

What is MISSING (genuine gaps, not rebuilds): campaign objects, audience-intent objects, sponsor relationships, a sponsored-label vocabulary, signed outcome/attribution receipts, budget escrow for sponsor spend. All of these are expressible as new object schemas + relationships on the existing substrate; none requires a new authority.

## FILES INSPECTED

`src/fyd/social/{envelope,actions,transition-id,attestation-gate,key-custody,readers,config}.ts`, `src/fyd/net/{budgets,rate-limit}.ts`, `src/fyd/placement/{rail-rule,engagement-reconcile}.ts`, `src/fyd/rank/object-ranker.ts`, `src/fyd/attention/controller.ts`, `src/fyd/capabilities/runtime.ts`, `src/fyd/claim/{types,machine,identity}.ts`, `src/fyd/identity/principal.ts`, `src/fyd/adapters/{ATPROTO-HARVEST.md,activitypub/*}`, `src/lib/ping/{types,dev-signer,feed-rank,grants,action-planner}.ts`, `src/fyd/proceduralize/proceduralizer.ts` (offer emission), `src/fyd/ask/{capabilities,context-builder}.ts` (ad denial text). All reads were `cat`/`grep`/`git log` via the bridge; no writes.

## CODE/HISTORY HARVESTED

- `src/fyd/adapters/ATPROTO-HARVEST.md` (2026-09-21): lexicon schema discipline ADOPT; strong refs (uri+cid) ADOPT; record shapes ADAPT; rkeys/TIDs ADAPT; DID-vs-handle separation ADOPT; OAuth granular permissions ADOPT (already landed in grants.ts); feed generators REJECT for now; `@atproto/api` usage ADAPT (types-in, fetch-out). Feed-labeler material in this lane's worker research extends it (see below).
- `~/workspace/fyd-lane/harvest-report.md` C1-C5: deterministic event identity + idempotent append (absorbed into social/transition-id.ts); event->mission map (absorbed into social/actions.ts); ADD-only evidence verification (ancestor of FYD binding verifier); WitnessWorker failure-honesty (absorbed into social/attestation-gate.ts); registry-exclusive capability resolution (pattern for future capability work).
- Git history: `f61200c7` (ActivityPub skeleton), `08cc39d6` (ATProto harvest doc), `5c84fe24` (jest config fix). The ActivityPub remote probe was honestly recorded as a typed rejection, not a success.

## EXTERNAL MATERIAL REVIEWED

Worker 1 (ActivityPub / ATProto / Farcaster, all verified live this session):

- **ActivityPub** (W3C REC 2018-01-23; interop governed by FEPs on Codeberg; Mastodon AGPL-3.0): hard problem solved = mutually untrusted servers authenticating delivery (per-actor keypairs + HTTP Signatures, verified against the actor document's public key). Audience = Followers collection, the protocol embodiment of relationship-based relevance. Harvest: signed S2S delivery + WebFinger (`acct:` discovery) + followers-only audience + FEP-5feb consent flags + FEP-844e capability discovery. Reject: JSON-LD, C2S API, instance-tied actor identity as canonical.
- **ATProto** (bluesky-social/atproto HEAD; repo format v3; MIT+Apache-2.0 dual license): hard problem solved = marketplace of algorithms and moderators with cryptographic proof chains (signed repos, deterministic MST, CAR export). Feed generators return post URIs + optional metadata authenticated by a user-signed JWT: recommendation without a behavioral dossier. Labelers publish advisory labels (blurs x severity x default hide/warn/ignore, namespaced per labeler, client decides rendering): this is the honest-sponsorship primitive (a labeler emits `sponsored`, severity=inform; disclosure travels as signed metadata). Third-party tooling already does post-sort ad injection at the feed-builder layer, proving paid placement belongs in the projection stage, never the repo. Reject: the PDS/Relay/AppView hosting topology and plc.directory dependency.
- **Farcaster** (spec at farcasterxyz/protocol; Snapchain now the canonical node, not Hubble; hub packages MIT): hard problem solved = delegated revocable app signing anchored onchain (per-app Ed25519 signers, hubs reject unregistered signers). Channels = explicit topic communities: audience by channel membership, a non-behavioral targeting primitive. FIP Discussion #19 (Proof of Work Tokenization, proposal not shipped) is the only concrete attribution-receipt design found anywhere: `AppUsageReceipt { miniapp_id, user_fid, action_type, timestamp, user_signature }`, user-signed so apps cannot fabricate usage, with the rule "the protocol can only reward actions it can verify." Storage-rent anti-spam instead of surveillance trust scores. Reject: onchain FID/fname identity, Snapchain hosting, Warpcast/Neynar dependencies.

Worker 2 (Nostr / MCP / open ad-commerce patterns, all verified live this session):

- **Nostr core** (nips repo, public domain): identity = secp256k1 keypair, events = signed canonical JSON (SHA-256 id, BIP-340 Schnorr sig), addressable events via d-tag (kind+pubkey+d = stable cross-system reference), NIP-05 DNS identity binding, NIP-42 relay auth. Dumb interchangeable relays.
- **NIP-57 zaps**: 9734 zap request (to LNURL server, not relays) + 9735 zap receipt (published by the recipient's LNURL server): third-party-signed value-for-value outcome receipts. Caveat: 9735 is a server claim, not settlement proof; validate against the advertised nostrPubkey.
- **Nostr commerce** (NIP-99 kind 30402, public domain): complete signed-offer schema (`d`/`title`/`price [amount,currency,ISO-8601 frequency]`/`image`/`stock`/`visibility`/`status`), deterministic d-tags for idempotent re-publish, merchant signature = authorized-seller proof. Live deployments: Plebeian Market, Shopstr, Conduit, roebel-app business deals.
- **MCP** (spec revision 2026-07-28 current; license migrating MIT->Apache-2.0): standard agent capability discovery (`tools/list`, `server/discover`), JSON Schema tool inputs, OAuth 2.1 protected-resource-metadata (RFC 9728) + RFC 8707 audience-bound tokens. Churn: five breaking revisions in 20 months. Treat as projection only; pin version.
- **IAB supply chain** (ads.txt 1.0.3, sellers.json 1.0, OpenRTB 2.6/3.0, schain 1.0, ads.cert; CC-BY-3.0): anti-fraud transparency, not privacy. Harvest the data models only: sellers.json seller object (seller_id/type/name/domain/confidentiality) as a sponsorship authorization ledger; schain node-chain for placement provenance; publisher-signed authorized-seller declarations. Reject the RTB auction machinery entirely.
- **Privacy Sandbox**: REJECT. Retired Oct 2025, removed from Chrome by July 2026, 8-15% top-advertiser adoption. Dead APIs; do not build on them.
- **AdEx**: REJECT. Pivoted to centralized DSP (Ambire AdEx); protocol repos AGPL-3.0, dormant since ~2020. Note the OUTPACE escrow pattern (campaign-as-payment-channel, dual-signed state roots) as an idea only.
- **Brave Rewards/BAT** (BAT Roadmap 4.0, July 2026): on-device ad matching against locally held interest data, ~70% revenue share to user, signed attention receipts leave the device. Adapt the pattern (on-device matching + receipts); reject BAT as dependency.
- **Web Monetization v2.0 / Interledger**: payment-pointer discovery (`rel="monetization"`) as the "this object accepts value" pattern; streaming micropayment sessions. ILF moved tools to community maintenance; adapt the pattern, reject hard dependency.
- **schema.org Offer** (CC BY-SA 3.0): ADOPT as the standard projection vocabulary for offers (price, priceCurrency, availability, seller, itemOffered, areaServed, shipping/return details). Zero lock-in, already agent-consumed.
- **Prebid** (Apache-2.0): REJECT. One lesson only: run any matching in first-party, viewer-controlled context, never a third-party iframe.
- **W3C Privacy-Preserving Attribution** (IPA superseded by PPA Level 1; unshipped): adapt the constraint (aggregate, non-linkable reports); reject as a build target. FYD's simpler answer: outcome events are first-party facts on the merchant's own objects; no cross-site joining, ever.
- Gap found: no Nostr sponsored-content NIP exists. The honest-labeling layer is unbuilt. That is FYD's opening.

## ASSUMPTIONS FALSIFIED

1. "None of these protocols has anything to teach us about ads." Falsified: ATProto's ecosystem demonstrates exactly where paid placement belongs (post-sort injection at the feed builder + labeler-carried disclosure). The hard problem they solved is the layer boundary, not the auction.
2. "ATProto moderation is centralized at Bluesky." Falsified by the labels guide: third-party labelers, user-subscribed, advisory only, client decides rendering. A working decentralized disclosure channel.
3. "Farcaster still runs on Hubble hubs." Falsified: Snapchain (Rust) is now the canonical node. Depending on hub-monorepo today means depending on the legacy architecture.
4. "ActivityPub identity is portable, so it could be FYD's identity layer." Falsified: AP identity is a domain-bound HTTPS URI with server-held key; portability needs FEP-7628 and remote cooperation.
5. "Privacy Sandbox is the privacy-preserving ad future to build on." Falsified: retired Oct 2025, removed from Chrome by July 2026.
6. "AdEx is a live decentralized ad exchange." Falsified: pivoted to a centralized DSP; AGPL-3.0 dormant repos.
7. "Web Monetization is actively developed by ILF." Falsified: community-led maintenance only; standard still stewarded.
8. "Nostr already has an ad/sponsorship standard." Falsified: only commerce (NIP-99) and zaps (NIP-57) exist. No sponsored-content NIP. Gap = FYD opening.
9. "We need an AdAuthority." Falsified twice: `FydGrant` already names `ad.buy` as a grant agents are never given, and the worker research shows labeler disclosure + projection validators + signed receipts cover sponsorship with no central authority.
10. "FYD has no ad-adjacent primitives." Falsified by this inventory: budgets, rate limits, attention controller, offer schema, signed envelopes, attestation gates, claim machine, two deterministic rankers, grant denials.

## RECOMMENDATION

Do not build a decentralized ad network now. Harvest only, per directive. When the product loop is green, the sponsored-distribution model maps onto existing PING primitives with two missing record types and one projection contract:

- Business -> creates -> Offer: EXISTS (`ping.social.offer@1` + proceduralizer emission).
- Campaign -> references -> Offer: MISSING. Model as a new object schema + `references` relationship; the campaign is itself a signable object, not an authority.
- Campaign -> declares -> AudienceIntent: MISSING. Audience = explicit channel/circle/context membership (Farcaster channels, ATProto feed-skeleton request context), never inferred traits. Enforced by a validator, not by policy text.
- Publisher/Node -> exposes -> PlacementCapability: EXISTS in embryo (rail-rule + attention controller + ranker = slot inventory with hysteresis and cooldown). Placement slots are declared capabilities of the node.
- Planner -> matches (Campaign x Context x Placement): EXISTS in embryo (object-ranker + feed-rank + attention controller). Any sponsor boost must be a declared, labeled input to the ranker, never a hidden multiplier.
- Interaction -> evidence/outcome receipt: EXISTS in embryo (attestation gates, DiscoveryFeedItem.evidenceRef). Extend with a signed outcome receipt modeled on the Farcaster FIP `AppUsageReceipt` (object ref, actor, action type, timestamp, actor-signed) and the NIP-57 third-party-signed receipt pattern.
- Honest SPONSORED labeling: MISSING. Model on ATProto's labeler defs: a label vocabulary (`sponsored`, `sponsor-disclosure`, `verified-business`) with blurs/severity/default semantics, namespaced per emitting labeler, advisory at render, enforced by a machine-checkable projection validator. Sponsored content appears only as a projection of an explicit sponsor relationship + sponsor-signed offer; the projection MUST render SPONSORED.
- Budget constraints / escrow: EXISTS in embryo (CrawlLedger, TokenBucket, GenerationQuota); OUTPACE-style escrow is the idea for sponsor spend if ever needed.
- Fraud resistance: EXISTS (signed envelopes, attestation gates, claim verification, sellers.json-style authorization ledger borrowable as a data model).
- Discovery without surveillance: EXISTS (both rankers are deterministic, relationship+recency based, no behavioral dossier). Any future "recommendations" surface gets the projection-validator constraint first.

Protocol adapters (ActivityPub signed delivery, ATProto lexicons/labels, Nostr events/30402 offers, MCP capability exposure) are all projections. Canonical objects stay in PING. The no-surveillance constraint is a machine-checkable validator on the projection path, not a paragraph in a doc.

## ADOPT / ADAPT / REJECT (per system)

- ActivityPub: ADAPT (signed S2S delivery, WebFinger discovery, followers-collection audience, FEP-5feb consent, FEP-844e capability discovery). REJECT JSON-LD/C2S/instance identity as canonical.
- ATProto: ADAPT (labeler disclosure pattern, feed-skeleton recommendation shape, lexicon schema discipline incl. evolution rules, strong refs uri+cid, DID/handle separation, signed-repo/MST integrity). Already partially harvested in-repo 2026-09-21. REJECT the PDS/Relay/AppView hosting topology and plc.directory dependency.
- Farcaster: ADAPT (scoped signer delegation, channel-scoped placement, signed usage-receipt pattern for outcome/attribution, storage-rent anti-spam idea). REJECT the onchain identity stack and Snapchain hosting.
- Nostr core: ADAPT (signed-event envelope, d-tag addressable references, NIP-05 DNS identity, NIP-42 relay auth). REJECT Nostr identity as canonical.
- NIP-57 zaps: ADAPT as the outcome-receipt model (third-party-signed receipts with amount + invoice refs; validate against advertised pubkey; receipts are evidence, not settlement proof).
- NIP-99 commerce: ADAPT 30402 as the projection format for merchant-signed offers, with SPONSORED labeling enforced at FYD's projection layer.
- MCP: ADAPT (expose FYD capabilities as an MCP server, projection only; adopt RFC 9728 protected-resource-metadata discovery; pin spec 2026-07-28). REJECT MCP URIs as canonical identity.
- IAB supply chain: ADAPT selectively (sellers.json seller object as sponsorship authorization ledger schema; schain node-chain for placement provenance). REJECT the RTB auction machinery.
- Google Privacy Sandbox: REJECT (dead).
- AdEx: REJECT (dormant AGPL, pivoted company). OUTPACE escrow noted as an idea.
- Brave Rewards/BAT: ADAPT the pattern (on-device matching + signed attention receipts). REJECT BAT as dependency.
- Web Monetization/Interledger: ADAPT (payment-pointer discovery, streaming micropayment sessions). REJECT hard dependency on ILF tooling.
- schema.org Offer: ADOPT as the standard projection vocabulary for offers.
- Prebid: REJECT. Keep the first-party-execution lesson.
- W3C Privacy-Preserving Attribution: ADAPT the constraint (aggregate, non-linkable); REJECT as a build target.

## TEST COMMAND

n/a. Read-only research lane; no code was written and none was tested. When the Sponsored Surface Contract is drafted (next action below), the test is a machine-checkable projection validator: a sponsored projection must carry the SPONSORED label, a valid sponsor signature, and no viewer data beyond the allowed context; a projection missing the label fails. Same contract pattern as Nolan's research contracts (one file renders the rule and drives the validator).

## RISKS

1. Surveillance creep inside "honest" primitives. ATProto feed generators receive a user-signed JWT and can read the whole public firehose; nothing in the protocol stops a generator from building a behavioral dossier. If FYD adopts the skeleton pattern, FYD's own policy layer must restrict matching to object context + viewer-allowed context + explicit relationships + stated intent, or the constraint is theater.
2. Directory/indexer centralization. plc.directory, the practical Relay/AppView stack, Farcaster's onchain registries, and LNURL servers are each single-operator chokepoints. Harvest patterns, not hosted dependencies.
3. Labeler trust is decentralized, not solved. A malicious or captured labeler can mislabel. ATProto's answer (user choice + transparency) only works if FYD clients make labeler subscription visible and revocable. A "sponsored" labeler run by the sponsor itself is self-certification without independent audit.
4. Attribution receipts are pre-standard. The Farcaster signed-receipt design is a discussion proposal; no deployed interoperable conversion-receipt format exists. FYD would be specifying first. Design it as a FYD lexicon record, not as an adopted standard.
5. MCP spec churn. Five breaking revisions in 20 months; pin 2026-07-28 and never let MCP resource URIs become canonical object IDs.
6. Zap receipt trust. Kind 9735 receipts are published by the recipient's LNURL server; they are server claims, not settlement proof. Validate the signature against the advertised nostrPubkey; keep the invoice reference.
7. License gaps. Farcaster protocol spec repo license unverified; market-spec license unverified; Warpcast client LICENSE text unread. Verify before any code-level reuse. Verified safe: ATProto MIT/Apache-2.0, W3C RF commitments, NIPs public domain, Prebid Apache-2.0, schema.org CC BY-SA 3.0 (fine for emitting JSON-LD).
8. Recommendation drift. Any "recommendations" surface can silently slide into behavioral profiling. The projection-validator constraint must exist before any recommendation logic does.
9. Canonicality drift. Every protocol's rich semantics leak into its indexers (AppViews, Neynar, Mastodon extensions). Keep enforcing: protocol/indexer representations are projections; canonical objects stay in PING.

## NEXT HIGHEST-LEVERAGE ACTION

Draft two FYD lexicon-style record types plus one projection contract (in the product lane, after the loop is green; this lane was read-only):

1. A label vocabulary modeled on ATProto's label defs (`sponsored`, `sponsor-disclosure`, `verified-business`; blurs/severity/default semantics; namespaced per emitting labeler; advisory at render). Gives honest SPONSORED labeling with zero new authority.
2. A signed outcome receipt modeled on the Farcaster FIP `AppUsageReceipt` and NIP-57 (object ref, actor, action type, timestamp, actor-signed; third-party-signed payment receipts validated against advertised keys). Gives sponsors verifiable attribution with no behavioral tracking.
3. A Sponsored Surface Contract as projection rules enforced by a machine-checkable validator: sponsored content appears only as a projection of an explicit sponsor relationship plus a sponsor-signed offer; the projection MUST render SPONSORED; matching uses only object context + viewer-allowed context + explicit relationships + capabilities + stated intent; neither record may carry inferred traits, only asserted, signed facts.

Concrete first proof: emit one merchant-signed NIP-99 30402 listing plus schema.org Offer JSON-LD from a canonical FYD offer object, and assert in a test that the projection carries the SPONSORED label, a valid sponsor signature, and no viewer data beyond the allowed context. That single step converts this research into the two load-bearing pieces of non-surveillance sponsorship; everything else (feed slots, channel-scoped inventory, budget escrow) hangs off those two records.
