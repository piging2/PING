# Harvest Proposal: Cymphony — identity/data/activity graph

**Worker:** harvest leaf (piging2), 2026-10-02
**Assignment:** Cymphony — identity/data/activity graph; connects human + machine identity, access, data, behavior into a compounding graph. Relevant to object-kernel + lineage (proofs 3, 6, 14).
**Verdict:** **REJECT** as a harvest source. Clean-room mechanism derivation included below (original design, zero upstream lineage) for coordinator's discretionary ADAPT consideration.

---

## 1. What I read (exact sources, no marketing-only claims repeated uncritically)

Cymphony Inc. (cymphony.io) is a **closed, proprietary enterprise SaaS company**. Launched 2026-09-09; $30M total funding ($25M Series A co-led by Sequoia Capital and SMBC Fin Atlas Beyond Fund, plus earlier seed); founders Shy Dekel, Idan Berkovits, Edi Gotlieb (Talpiot alumni); HQ New York + Tel Aviv; customers cited: KKR, Syngenta, Cass Information Systems, Athennian (Sequoia uses it internally).

**Reading packet inputs** (verbatim packet at `/tmp/cymphony-packet/reading-packet.txt`, `sha256:99fdcb14da405696a4b818e86c3d16b7bf36792d699e5bae4cce0207d7782276`):

1. `https://cymphony.io/` — official homepage, fetched 2026-10-02 (browser session 4186589417831250559). Claims: "Workforce Graph maps every identity, data, activity, and permission"; four modules (AI, Data, Identity, Threat Center); agentless ingestion; "Ask Maestro" conversational investigator ("get any answer with its work shown — the accounts, the access paths, the activity, and why it matters"); remediation ("Revoke access or notify the owner — directly from Cymphony"); metrics: 74% AI-driven data exposure reduction in 30 days, 45% internal blast radius reduction.
2. `https://github.com/luckytaorem/blog/blob/HEAD/content/posts/sequoia-doubles-down-on-cymphony-as-ai-agents-create-new-enterprise-security-risks.md` at commit `af3eb529f97c62b1601eae0292a44ff26e8549f4` — third-party technical deep-dive (NOT official docs; treated as unverified secondary claims). Quotes used for mechanism derivation:
   - Ingest sources: identity providers (Azure AD, Okta, LDAP); asset inventories (AWS IAM, GCP Cloud Identity, Kubernetes RBAC); EDR/SIEM logs; LLM usage logs (OpenAI, Anthropic) "tagging each request with the originating model and purpose".
   - "property graph database optimized for low-latency traversals. Each node (identity, asset, data object) carries metadata such as classification level, last-access timestamp, and provenance. Edge weights represent the strength of the relationship (e.g., 'read', 'write', 'execute')."
   - Prioritization engine: "Scores each risk based on impact, exposure, and likelihood, surfacing the top 5%".
   - Automated remediation: "Issues policy updates via native cloud APIs to revoke or tighten permissions automatically."
   - Privacy claim: metadata extracted, payload hashed and discarded; TLS 1.3 / AES-256; data-residency option.
3. Press/launch snippets: aiunderstanding.org, ai-market-watch.com, cvj.ai, devcuration.com, siliconangle.com (2026-09-09), financialcontent.com wire release (company-issued). Company claim: "continuously maps every AI agent and employee... what systems they can access, what sensitive data they interact with, and how their activity creates security risk."
4. **Closed-status verification:** searches for "Cymphony github open source repository" and "cymphony.io docs API reference schema developer" (2026-10-02) returned **no repository, no docs, no API reference, no schema for Cymphony Inc.** Same-name hits are unrelated projects (documented in packet INPUT 5: zaalipro/cymphony Elixir harness; anhaidgroup/cymphony annotation tool; Txoka/symphony-c-compiler; Sarthakischauhan/symphony). **None were cloned or read in depth; none are harvest sources.**

**What I did NOT read:** no source code (none exists publicly), no official schema, no API docs, no architecture whitepaper. The mechanism below is therefore a **clean-room re-derivation from published concepts + first-principles graph theory**, written by me. No proprietary code was copied; there was none available to copy.

---

## 2. Object model (clean-room, derived)

**Node types** (six; agents are first-class identities, same as humans — this is the conceptual core worth keeping):

| Node | Meaning | Identity source of record |
|---|---|---|
| `HumanIdentity` | employee, contractor, external collaborator | IdP (Azure AD / Okta / LDAP) |
| `AgentIdentity` | AI agent treated as a "non-human employee" | agent registry / OAuth app / API key owner |
| `MachineIdentity` | service account, API key, workload | cloud IAM / K8s RBAC |
| `DataObject` | file, dataset, table, mailbox folder | SaaS/cloud inventory |
| `System` | application, SaaS tool, LLM endpoint | asset inventory |
| `Grant` | a permission record (role binding, share, API scope) — modeled as a NODE so it can carry constraints: scope, grantor, expiry, provenance | cloud IAM / SaaS ACL |

**Edge types — observed vs. derived (the compounding boundary):**

Observed (appended from connectors, never edited):
- `EMPLOYED_AS` (Human → role/dept), `AUTHENTICATED_VIA` (identity → IdP session fact)
- `GRANTED` (identity → Grant), `PERMITS` (Grant → DataObject/System, action set {read, write, execute})
- `OBSERVED_ACCESS` (identity → DataObject via System; timestamped; carries tool, model, purpose tags from LLM-usage logs)
- `TAGGED` (DataObject → sensitivity label), `ACTED_FOR` (Agent → Human owner/delegator)

Derived (computed by deterministic rules; these are what "compounding" means):
- `EFFECTIVE_READ` / `EFFECTIVE_WRITE` (identity → DataObject): transitive closure over `GRANTED → PERMITS` + group membership + `ACTED_FOR` delegation. **Not observed anywhere; exists only after fusion.** This is the primitive no single source system contains.
- `EXPOSES` (System → DataObject): an AI tool inherits reachability to every object its callers can reach — the 85,000-files incident is exactly this derived edge set.
- `REACHABLE_VIA` (identity → System): path existence through grants.
- `RISK_FACTOR` (identity/data → Finding): score decomposition edges.

**Node/edge properties:** classification level, last-access timestamp, provenance (which connector + which observation IDs), edge weight (action strength: read < write < execute).

## 3. ID scheme (clean-room)

- Identity: `ping:ident/<kind>/<source>/<source-id>` — e.g., `ping:ident/agent/okta/svc-copilot-01`. Human/agent/machine share one namespace so traversals never branch on kind.
- Data: `ping:data/<source>/<content-digest-or-source-id>`.
- Activity observation: `ping:obs/<source>/<monotonic-seq>` — immutable, append-only.
- **Edge identity = content hash:** observed edge id = `sha256(canonical(subject, predicate, object, valid_from))`; derived edge id = `sha256(rule_id, rule_version, subject, predicate, object, inputs_digest)`. Re-derivation over identical inputs yields identical IDs → idempotent, replay-safe, diffable.

## 4. State transitions (clean-room)

- Observation ingestion: `STAGED → NORMALIZED → COMMITTED`; per-record failure quarantines without blocking the journal; schema violation → quarantine, never silent drop.
- Derived edges: `PENDING → DERIVED → SUPERSEDED`. **Never deleted.** Superseded rows retain `(valid_from, superseded_at)` for time-travel queries ("what did the exposure map show on Tuesday?").
- Grants: `ACTIVE → REVOKED → EXPIRED` (revocation is a first-class appended event, not a delete).
- Findings (risk items): `OPEN → TRIAGED → REMEDIATING → VERIFIED_CLOSED → REOPENED`. Closure requires **closed-loop verification**: re-ingest after the fix and confirm the derived `EFFECTIVE_*` edge no longer exists.
- Identity lifecycle: `ACTIVE → SUSPENDED → DEPROVISIONED` (tombstone node retained so historical edges still resolve).

## 5. Authority boundary (clean-room, and the part most relevant to PING)

**The graph is DERIVED truth, never source truth.** Each source system of record owns its facts: the IdP owns identity existence; cloud IAM owns grant facts; SIEM/EDR owns activity facts. The graph may never contradict a source of record — on conflict, source-of-record wins and the graph records `RECONCILIATION_NEEDED`.

**Remediation is an external effect** (revoke a grant, notify an owner). It must flow: graph finding → **proposal** (proposed transition + digest) → **approval binding** → execution via the provider's native API → **re-ingest confirms the derived edge is gone**. This maps directly onto PING's proposal-kernel + capability-kernel + event-kernel. No graph→source writes except through that gate. (Notably, Cymphony's "Automatic Operation" mode claims auto-remediation without human intervention — that is their product choice and their liability; for PING semantics the approval binding stays mandatory.)

## 6. Persistence semantics (clean-room)

Append-only event journal is the system of record; the graph (nodes, edges, scores) is a **projection**, fully rebuildable by replay. Observed edges immutable once committed. Derived edges materialized as rows keyed by content-hash ID with validity intervals; superseded rows retained for audit. Recovery = latest snapshot + journal tail. This is the standard event-kernel projection pattern — nothing exotic, which is the point: it composes with PING's existing spine rather than competing with it.

## 7. Evidence / receipts (clean-room)

- Every derived edge carries: `rule_id` + `rule_version`, `inputs_digest` (hash over the sorted input observation IDs), `evidence_ids[]` (the observation events), `derived_at`, `derived_by` (component identity).
- Every risk score carries its factor breakdown: impact (max sensitivity reachable via derived edges) × exposure (fan-out: count of derived paths) × likelihood (deviation of `OBSERVED_ACCESS` activity from the identity's baseline) — plus the weights used. A score with no factor breakdown is inadmissible.
- Every remediation carries: `proposal_id` + approval record + provider receipt + re-ingest confirmation timestamp.

## 8. Retries / failures (clean-room)

- Connectors are pull-based with persisted cursors/watermarks; gaps detected by sequence/timestamp; backfill on resume.
- Per-record quarantine; a poisoned record never blocks the journal.
- **UNKNOWN is legitimate:** an observation that cannot be verified yields an edge marked `UNVERIFIED`, which is **excluded from `EFFECTIVE_*` derivation** until confirmed. Unknown never upgrades itself into access.
- Staleness is explicit, not silent: edges carry `last_confirmed_at`; a grant not re-observed within TTL becomes `STALE` (still derived from, but flagged) rather than silently dropped. Nothing in the derivation layer ever confuses "not recently seen" with "revoked".

## 9. Revocation model (clean-room)

Revocation = first-class appended events: `GRANT_REVOKED`, `IDENTITY_DEPROVISIONED`, `TOKEN_ROTATED`. On the next derivation pass, any `EFFECTIVE_*` edge whose `inputs_digest` transitively depends on a revoked grant is `SUPERSEDED` — countermanding edges, not deletions, so the full audit trail survives for replay (proof 14). The remediation loop then verifies the closure no longer contains the path (closed-loop). This is the mechanism behind "built to fix, not just flag": the fix is itself a journaled, verifiable event.

## 10. "Compounding" — what it means mechanically

Compounding is not a metaphor. It is three concrete mechanisms:

1. **Derived-edge emergence:** each new source fused into the graph multiplies the derived-edge set, because `EFFECTIVE_ACCESS` is a cross-source transitive closure. Identity graph alone: who exists. Grant graph alone: what permissions exist. Fused: who can actually reach what — a fact present in neither source. Value grows with the product of sources, not the sum.
2. **Enrichment compounding:** LLM-usage logs tag `OBSERVED_ACCESS` edges with (model, purpose); sensitivity tags label data; baselines profile identities. Each enrichment layer multiplies the discriminating power of the same edges (used vs. unused access, appropriate vs. anomalous purpose).
3. **Feedback compounding:** remediation appends revocation events, which shrink future derived closures; verified-closure confirmations become evidence that improves the next derivation cycle's confidence. The graph gets more accurate the more it acts — the loop is the compounder.

## 11. Tests (clean-room invariant suite — to be written at implementation)

1. Closure correctness: `EFFECTIVE_*` on a hand-built fixture matches brute-force reachability. 2. Idempotent re-derivation: same journal → byte-identical edge IDs, zero duplicates. 3. Revoke suppression: append `GRANT_REVOKED`, re-derive, assert the `EFFECTIVE` edge is superseded and absent from the live closure. 4. Determinism: fixed journal → identical derived snapshot across runs and machines. 5. Evidence binding: every derived edge resolves to ≥1 committed observation; a dangling derived edge fails the suite. 6. Time travel: replay journal to T−1h reproduces the exposure count reported at that time (proof 14 support).

## 12. SMALLEST MISSING PRIMITIVE

**`DerivedEdge` — a first-class lineage edge in the object-kernel.**

PING's object-kernel has objects, relationships, and evidence refs. What it does not have is an edge that records *its own computation*: `(predicate, subject, object, rule_id, rule_version, inputs_digest, evidence_ids[])` as an immutable, content-addressed record with monotonic `SUPERSEDE`-not-delete semantics and deterministic re-derivation from the event journal.

Why this is the smallest valuable unit: proofs 3, 6, and 14 all need the same thing. Proof 3 (deterministic evidence-backed graphs) needs graph facts that are evidence-bound, not recomputed prose. Proof 6 (Ask FYD answers from evidence) needs answers like "this object's price came from evidence X via rule Y" to be queryable graph traversals, so Maestro-style "show the work" becomes a path query over `DerivedEdge`s instead of an LLM reconstruction. Proof 14 (replay reconstructs relevant state) needs derived state to be rebuildable — which falls out of content-addressed, journal-derived edges for free.

Without this primitive, every "compounding" behavior has to be re-derived ad hoc and cannot be audited, time-traveled, or replayed. With it, one 200-line mechanism (rule registry + content-hash IDs + supersede-on-rederive + evidence binding) unlocks the whole Cymphony-shaped capability in PING semantics. Zero new stores, zero new authorities, zero new subsystems: it is a relationship kind + a derivation contract inside the existing object-kernel and event-kernel.

Explicitly NOT harvested: risk scoring weights, the "Maestro" assistant, auto-remediation policy, the property-graph database choice, connectors. Those are product, not primitive.

## 13. Dependency analysis

**Zero dependencies.** No code is adopted (nothing open exists to adopt). The mechanism is a design; implementation would use only PING's existing event journal + object store. Every line of future implementation would be written fresh against PING semantics. DEPENDENCY_COST: zero.

## 14. License finding

**CLOSED / proprietary — verified.** No public repository, no OSS license, no published schema, no API docs for Cymphony Inc. (cymphony.io). Marketing site + press coverage only. There is **no GPL/copyleft/SSPL/BSL exposure** because nothing is taken. Same-name artifacts (zaalipro/cymphony, anhaidgroup/cymphony, Txoka/symphony-c-compiler, Sarthakischauhan/symphony) are unrelated projects and were not used. **No proprietary code was copied** — none was available, and the derivation above is original design; flagging for Nolan: the clean-room mechanism in sections 2–11 is mine, carries zero upstream license lineage, and may be implemented freely.

## 15. Verdict: REJECT (with reason)

**REJECT Cymphony as a harvest source.** Reason: there is nothing open to harvest — no code, no schema, no docs, no license grant. ADOPT is impossible (nothing to take as-is) and ADAPT is inapplicable (nothing to adapt without reverse-engineering a closed product, which the directive forbids). The value extracted is the **mechanism pattern** (identity/data/activity fusion → derived effective-access edges → evidence-bound scores → revocation-as-event → closed-loop verification), re-derived clean-room above with zero upstream lineage. Coordinator's option: treat sections 2–11 as an original design input for the object-kernel `DerivedEdge` primitive (proof_ids 3, 6, 14). That is a design decision, not a harvest.

---

*Reading packet: `/tmp/cymphony-packet/reading-packet.txt` — `sha256:99fdcb14da405696a4b818e86c3d16b7bf36792d699e5bae4cce0207d7782276`*
*Packet inputs: cymphony.io homepage (fetched 2026-10-02); luckytaorem blog technical deep-dive at commit af3eb529f97c62b1601eae0292a44ff26e8549f4; press snippets (aiunderstanding.org, ai-market-watch.com, cvj.ai, devcuration.com, siliconangle.com, financialcontent.com); closed-status verification searches (2026-10-02).*
