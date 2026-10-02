# DO-NOT-BUILD

Date: 2026-09-30. Companion to report.md and HARVEST-CANDIDATES.md. Everything here is a mechanism, assumption, product, or authority that the survey explicitly flags as out. Harvest mechanisms, never platforms; collapse authority, never semantics.

## 1. Do not create new authorities

Vendor nouns that describe scopes, indexes, or products are not sovereigns. None of these become PING authorities:

- Person360 / Context360 / "Revenue Control Plane" (Common Room)
- 6QA-as-truth, Signalverse (6sense)
- Work IQ as an authority noun (Microsoft); its reasoning layer is not our reasoning layer
- Agent Hub as an authority (HubSpot); per-agent identity is the steal, not the hub
- Infobase (Copy.ai), Company Memory Toggle (Jasper), Knowledge Graph (Writer): mutable trained-knowledge stores with grand names; our knowledge assets are evidence-bound events, never crawl-then-mutate blobs
- Topics as a sovereign (Agentforce): topics are scopes for action allowlists, not truth-owners
- "AI workforce" / "AI employee" nouns (Relevance AI, Lindy): framing, not authority
- Coda's digested universal model as a knowledge authority (Coda Brain)
- ClickUp's opaque "Memory & Preferences" as a knowledge authority
- Dataverse as the data architecture (Microsoft): a dependency trap that recentralizes on their store
- Piper/Qualified reporting inside Salesforce as the analytics surface

Standing law unchanged: the event plane stays PING's, identity authority stays off-repo (do not mint a new one here), enrichment stays observation behavior (never a provider authority).

## 2. Do not assume snapshot amnesia

Architecture assumptions the market normalizes and we reject:

- History as a sidecar: field history kept separate from record data and backfilled via second import passes (Attio migration behavior)
- Story consolidation as "history": silently collapsing multiple changes into the last (Asana); never silently collapse events
- "Continuously updated" mutable profiles as the truth store (Common Room, Warmly, 6sense cadence refreshes)
- Mutable memory files as the store of record (Lindy plain-text files; inspectable, yes; authoritative, no)
- Conversation volume as a truth mechanism: "every resolved conversation makes it smarter" (Intercom flywheel); resolved-conversation count is not evidence
- Score-without-evidence as an interface norm: shipping a number with no drill-down (Freshsales Freddy without floors; Lift AI anonymous scoring)
- Thread-presence-equals-truth (Streak): provenance needs source-event identity, not the inbox view
- Citing-a-page as grounding (Notion): citations must bind to pinned evidence revisions
- Per-node logs mistaken for an event-sourced history (Gumloop); run visualization mistaken for an event record (Relevance AI canvas); dashboards mistaken for lineage (Mutiny experiment dashboards)
- Automation without an observation record: any automated action that leaves no record of what it saw or decided (Bardeen's unlogged runs; the exact failure PING's observation events exist to prevent)

## 3. Dependency traps

No whole-product adoption, no roadmap dependence, no billing-unit-shaped internals:

- Acquired and consolidating: Common Room (Zoom, Jul 2026), Warmly (HubSpot, Sep 2026), Qualified/Piper (Salesforce, Apr 2026). None are safe long-term dependencies.
- Distressed or unstable surfaces: Drift (unverified Sep 2026 shutdown chatter; do not build on it); Coda Brain (reported mid-transition into Superhuman Go, unreplicated: verify before relying on it as a stable API surface).
- Platform lock-ins: Salesforce (highest-order trap), Microsoft/Dataverse/Power Platform, HubSpot Smart CRM, Pipedrive, Close, Copper (Google-only), Lindy, Relevance AI (enterprise-only pricing), Gumloop, Asana, Linear, Notion, ClickUp, Coda, Clay (hosted tables and credit metering), Attio (as store), Folk (CRM-as-database reverses our substrate relationship).
- Do not shape our internals around a vendor's billing unit: credit metering (Clay, Copy.ai, HubSpot), per-resolution pricing ($0.50/conversation), credit pools (Lindy), Maker billing (Coda). Budgets and cost accounting are ours to define; the vendor's meter is theirs.
- Do not adopt model ownership: Palmyra (Writer), Apex (Intercom). Model ownership is not our lane; governance sits above the model layer.
- Do not adopt telephony as a knowledge authority: Close's dialer-centrism is a channel, and a cold-outbound channel at that; trades owners do inbound. Steal the queue/event primitives, not the dialer.
- Do not adopt managed deliverability infrastructure (Unify's warmup/domain rotation): commodity, not intelligence.
- Do not build a second event system (continuity guardrail, 2026-09-13: audit what PING has before creating any new continuity, event, or agent store). The missing layer is instrumentation plus correlation IDs plus projection, not another persistence system.
- Do not build on the extension/closed-ecosystem surface as the architecture: Gmail/Chrome-extension lock-in (Streak), closed vendor-published plugin ecosystems (Microsoft's model is the wrong shape; our tool surface must be open and tenant-composable).

## 4. Trust failures as standing lessons

Free lessons the market already paid for:

- **HubSpot, July 2026:** attempted to pool customers' business-card contact data into a shared enrichment dataset by default; reversed within four days after public backlash. Standing rule: enrichment data-pooling is opt-in with visible provenance. Our evidence plane makes the source of every enriched fact visible by construction.
- **Pipedrive passive enrichment:** ~70% hit rate, no verify prompt, documented misattributed B2B records. Standing rule: enrichment without a verification step and without per-field attribution is a provenance failure, not a feature. Learn from it; do not copy it.
- **Asana story consolidation:** the 24h collapse that destroys the audit trail while calling it an audit trail. Standing rule: never silently collapse events; consolidation is a presentation concern with explicit, disclosed rules.
- **Jasper's crawl-into-mutable-blob:** the exact knowledge-staleness anti-pattern (8-days-stale, 4/7-empty) already flagged in our ledger. Standing rule: ingest goes through observation -> evidence -> owner confirmation, never a blind crawl.
- **Fin's reasoning loops:** user-written guidance unintentionally creating reasoning loops (the failure shape the Fin debugger exists to catch). Standing rule: this is why guidance changes get replay-as-proof before adoption.

## 5. Governance law: things that must never happen by default

- No silent agent writes. Every consequential agent action is proposal -> named approval -> attempt -> result -> verification. Silence never approves; no expiry path approves (already law in our approval authority).
- No default-on data pooling, capture-without-consent UX, or cross-tenant learning. Customer data never trains anyone else's critic (Lavender loop), segments (Mutiny), or models. Our learning stays tenant-scoped and evidence-bound.
- No score without a support set and no number without a data floor. UNKNOWN is a first-class state, never a low number and never an empty dashboard.
- No automation without replay. An automation you cannot re-derive from its inputs is a liability (Unify snapshot plays, Bardeen unlogged runs, Drift session machines).
- No privacy-hostile machinery: firmographic de-anonymization (Clearbit-style reveal) is not our business and not our audiences' business.
- No "AI replaces your team" framing anywhere in product or copy. PING strengthens the owner and the skilled worker; it never replaces their judgment.
- No opaque engines as acceptable foundations: if we cannot inspect it, we do not build on it. The Atlas lesson is "author governance around a fixed engine," not "inherit the opacity."
- No reactive-chat-only model as the thesis: waiting for the visitor to engage is the old world. Proactive, evidence-triggered action with owner governance is ours.
- No freeform owner scheming without governance (Attio's flexibility warning): owners define their world in plain language; the schema stays governed.

## 6. Vendor nouns to collapse, not import

Person360, Context360, Revenue Control Plane, 6QA, Signalverse, Work IQ, Agent Hub, Infobase, Company Memory, Knowledge Graph (vendor sense), Topics (as sovereign), AI workforce, AI employee, smart workflows (as product nouns), Magic (as a mechanism name). Where a noun names a real primitive, take the primitive under our own name and our own authority; where it names a product surface, leave it with the vendor.
