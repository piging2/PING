# Harvest Proposal: Oso — Centralized Authorization Facts

**AUTHORITY_OWNER:** capability-kernel
**VERDICT:** ADAPT (re-derive mechanism clean-room; adopt nothing as code)
**proof_ids:** [9, 11, 13]

---

## 1. What I read (exact sources)

| # | Source | Kind | Content captured |
|---|--------|------|------------------|
| 1 | https://www.osohq.com/docs/modeling-in-polar/reference/facts-as-data ("Overview of Facts - Oso Cloud Documentation") | Official docs, full page | Fact structure, three fact tiers, storage recommendations, manage-facts API table, sync guidance, RBAC/ABAC/ReBAC representation |
| 2 | https://www.OSOHQ.COM/docs/develop/facts/insert-facts ("Insert facts") | Official docs, full page via search excerpt | `insert`, `batch` dual-writes pattern, "Oso Cloud maintains an index of authorization data", delete patterns, best practices |
| 3 | https://www.osohq.com/docs/develop/facts/local-authorization ("Local Authorization") | Official docs, full page | "yes, if" conditional evaluation, fact-signature config, SQL generation, 4 local check APIs + OpenAPI endpoints |
| 4 | https://www.OSOHQ.COM/docs/develop/enforce/authorize-requests ("Authorize Requests") | Official docs, full page | Three decision API patterns, local vs centralized, cache-with-TTL caution |
| 5 | https://github.com/osohq/oso (README) | Official source repo, front page | Deprecation notice, product description, library list, Apache-2.0 license claim |
| 6 | https://github.com/osohq/oso/blob/HEAD/docs/content/any/project/faq.md | Official repo docs | "Oso is licensed under the Apache 2.0 license"; "Oso is freely available as an open source product and will always be free and open source. We are also working on a commercial product that will be built around the core open source product." |
| 7 | osohq.com GA blog + thenewstack.io coverage | Official blog + press | "<10 ms" queries, "provably minimal amount of data", context facts definition, CEO quotes on centralizing logic vs data |
| 8 | https://www.osohq.com/docs/oss/* (FAQ, internals, enforcement, quickstart) | Official docs, excerpts | "What data does Oso store?" (policy in memory only; app data stays in app), VM dialog model, ForbiddenError/NotFoundError split, Polar resource-block syntax, 1-2us/instruction perf |
| 9 | https://github.com/aydrian/shared-travel-app OSO_MIGRATION.md + https://www.osohq.com/post/launching-oso-migrate | Third-party + official | Dual-writes migration pattern, shadow-mode dual execution, "logic wrong vs data out of sync" failure diagnosis |

SOURCE_SHA `sha256:ca96d03c4025f44ba052ffa51ee9890ae8a0f632be5ec922043e213b1a889654` = sha256 over the concatenated verbatim captures of inputs 1-9, saved by the worker in `/tmp/oso-inputs/inputs.txt` (ephemeral; input list above is the record).

**Repos inspected (not cloned, no code copied):** `osohq/oso` (deprecated legacy open core), `osohq/oso-python`, `osohq/oso-node`, `osohq/go-oso`, `osohq/sqlalchemy-oso-cloud` (Apache-2.0 client SDKs). Oso Cloud itself has no public repo: closed-source SaaS.

---

## 2. Object model (as documented, re-described)

**Fact.** The unit of authorization data. `Fact = (predicate: String, args: [1..5])`. Each argument is either:
- a **typed ID reference**: `Type{"id"}` — e.g. `User{"alice"}`, `Organization{"acme"}` — an application object reference by (type, id); or
- a **literal value**: string, integer, boolean — e.g. `"admin"`, `42`.

Predicates are conventionally `verb_object`: `has_role`, `has_relation`, `is_banned`, `is_superadmin`, `has_department`, `is_public`. Examples: `has_role(User{"coder"}, "collaborator", Repo{"anvils"})`; `has_relation(Document{"d"}, "folder", Folder{"f"})`.

**Fact signature.** `(predicate, (type-or-literal, ...))`, e.g. `(has_role, (User, String, Organization))`. Oso infers signatures from policy usage; facts not matching a declared/used signature are **rejected** (wrong type, missing args, misspelled predicates). Unused types must be declared explicitly.

**Policy.** Written in Polar: `actor User {}` / `resource Repository { roles = [...]; permissions = [...]; relations = {...}; "read" if "contributor"; "maintainer" if "admin"; }` blocks plus rules `has_role(...)`, `has_permission(...)`, `has_relation(...)`, and the top-level `allow(actor, action, resource)` that enforcement calls.

**Three fact tiers (the core architectural idea):**
1. **Centralized facts** — stored in Oso Cloud; for data that affects multiple services (org/resource roles, global flags like `is_superadmin`/`is_banned`).
2. **Context facts** — sent with the authorization request, exist **only for the duration of the request**; for ephemeral data (IDP token claims, IP, time-of-day). Never persisted.
3. **Local facts** — stay in the application database; Oso never reads the data, only the schema. A YAML config maps fact signatures to SQL `SELECT` queries; Oso compiles policy + signatures into SQL it returns for the app to execute.

**Decision APIs (output shapes):**
1. `authorize(actor, action, resource)` → boolean allow/deny. (`"can actor perform action on resource?"`)
2. `list(actor, action, resource_type)` → collection of resource IDs. (`"for which resources of this type?"`)
3. `actions(actor, resource)` → set of allowed actions. (`"what may this actor do here?"`)
4. Local variants (`authorizeLocal`, `listLocal`, `actionsLocal`, `evaluateLocal`) return **SQL** (boolean query, WHERE fragment, or action set query) instead of decisions; OpenAPI: `POST /authorize_query`, `/list_query`, `/actions_query`, `/evaluate_query_local`.

**Legacy library error model (worth noting):** `authorize` raises `NotFoundError` (surface as 404) when the actor lacks `read` on the resource — the caller must not learn the resource exists — and `ForbiddenError` (403) when the resource is visible but the action is denied. Information-leak-aware denial is part of the mechanism.

---

## 3. ID scheme

- Object IDs are **application-controlled strings** namespaced by type: `User{"alice"}`. Oso assigns no IDs.
- **Facts have no system-generated ID.** A fact's identity is the tuple itself → the fact store behaves as a **set** (insert of an already-present fact is a no-op; delete removes by tuple, with wildcards allowed: `delete(("has_role", None, None, repo))` removes all role facts on that repo).
- No versioning, no timestamps, no provenance fields on facts. Staleness is the operator's problem (dual-write discipline).

## 4. State transitions

Facts are a **mirrored index of application data** (Oso's own words: "similar to updating a search index"). Transitions:

- `insert(fact)` / `tell(fact)` — add on application create/update.
- `delete(fact | pattern)` — remove on application delete; wildcard args supported.
- `batch { ... }` / `bulk` — **atomic** multi insert/delete (recommended; the only transactional surface; CLI has no transaction API).
- Recommended pattern: **dual writes** — application DB write + Oso `batch()` in the same unit of work; bulk for initial loads / periodic re-sync.

In the legacy library there is no fact store at all: the app DB is the only store and Polar reads live objects via foreign-function lookups at query time (revocation is then trivially immediate).

## 5. Authority boundary

- **Policy (logic) authority:** Oso / the policy file. One place for "who can do what."
- **Data authority:** split. The application database remains the **source of truth** for application data; Oso Cloud holds a **synced copy** of authorization-relevant facts for multi-service data. Oso explicitly warns: multi-service facts → centralize; single-service / frequently-changing / high-cardinality → keep in app DB; ephemeral → context facts only.
- **Enforcement authority:** the application. Oso **decides** (or generates SQL); the app acts (return 403/404, filter rows). Oso never enforces on its own.
- Local Authorization's key boundary move: Oso does not need the data, only the schema; it returns `yes, if` — partial evaluation of what it knows, conditions for the client to evaluate locally.

## 6. Persistence semantics

- Centralized facts: persisted server-side in Oso Cloud, "optimized for authorization lookups."
- Context facts: not persisted; request-scoped.
- Local facts: not persisted by Oso; live in the app DB.
- `get`: reads centralized facts with **no inference** — the store is a dumb index, all inference lives in policy evaluation.
- No documented retention/expiry on facts; caching decisions is explicitly warned against ("Cache common checks with appropriate TTL to avoid stale permissions" — staleness is a known hazard, handled by the app, not the store).

## 7. Evidence / receipts

**Oso produces no decision receipts.** Decisions are bare booleans / ID lists / action sets. There is:
- an "Explain" tab / CLI for debugging why a decision was made (developer tooling, not an audit artifact),
- no signed decision records, no decision log, no fact-change history documented,
- audit therefore must be application-side.

**Adaptation must be stronger than Oso here:** in PING semantics every capability decision should bind to a digestible evidence set (the facts evaluated + policy version). Oso's facts also carry no provenance (who asserted the fact, when, from which app write) — the PING adaptation should add writer-identity + source-write reference + digest to each fact (trust-kernel bindings), which Oso lacks entirely.

## 8. Retries / failures

- `batch`/`bulk` are atomic — the fact delta either applies or doesn't. No partial-batch semantics documented.
- **No documented retry/idempotency-key API** beyond set semantics (re-insert is a no-op). SDK retry behavior not specified in the material read → treat as unknown.
- The documented hard failure mode (from Oso Migrate): **logic-wrong vs data-out-of-sync ambiguity.** Dual writes can drift; when a decision looks wrong you must determine whether the policy is wrong or the facts are stale. Oso offers shadow-mode dual execution (legacy vs Oso) to compare during migration — an explicit acknowledgment that the mirror can lie.
- Legacy library failure model: fail-closed via exceptions (`ForbiddenError`/`NotFoundError`); no data to go stale because it reads live app objects.
- Recommendation for adaptation: fact writes idempotent by tuple; readers fail closed on mirror-unavailable; never cache allow-decisions without a TTL bound to fact freshness.

## 9. Revocation model

- **Immediate and total:** deleting the fact (or updating app data in the library model) changes the next evaluation. `delete has_role(User{"alice"}, "member", Org{"acme"})` on user departure.
- Wildcard delete enables bulk revocation (all facts about a resource).
- No grace periods, no TTLs on facts themselves. (Any caching layer the app adds reintroduces a revocation lag — Oso's docs flag this explicitly.)

## 10. Tests

- Legacy library: docs describe policy unit tests, a REPL, and a debugger for tracing unexpected behavior; the `osohq/oso` repo is structured around `polar-core` with test suites per component (observed via repo structure summary; I did not execute them — secondary evidence).
- Oso Cloud: "Explain" tab to verify fact behavior; CLI validation of Local Authorization config intended for CI/CD pipelines; documented CI-and-testing guidance.
- Oso Migrate: shadow-mode comparison testing (run old and new side by side, compare decisions, classify discrepancies) — a reusable pattern for any authorization migration, including a future PING capability-kernel rollout.

---

## 11. Verdict: ADAPT

**Why not ADOPT:** the valuable half — the centralized fact store + decision service (Oso Cloud) — is closed-source proprietary SaaS; there is nothing to take as-is. The open half (`osohq/oso` legacy library: Polar VM + language bindings) is Apache-2.0 but **deprecated** by Oso themselves, and it is a full embedded language runtime (Rust VM, FFI bindings per language) — the opposite of a zero-dependency primitive. Adopting it would drag a product into the kernel.

**Why not REJECT:** the fact model is the cleanest articulation found of how to keep authorization data, policy, and decisions in one place without centralizing everything: the fact tuple, the three-tier sourcing (centralized / context / local), signature validation, atomic batch sync, dual-write mirror discipline, the three decision APIs, `yes, if` partial evaluation, and the leak-aware 404/403 denial split are all mechanism-grade ideas. PING's capability-kernel evaluates actor/action/target with constraints, but it has no canonical statement shape for the *data* those evaluations depend on.

**ADAPT = re-derive clean-room in PING semantics.** No Oso code, no Oso service dependency.

### Smallest missing primitive

**The Authorization Fact**: a first-class canonical statement

```
Fact { predicate: String, args: [1..5] of (TypedRef(type, id) | Literal) }
```

with (a) identity = tuple equality (set semantics, idempotent insert), (b) signatures declared by policy and enforced at write time (invalid facts rejected), (c) three sourcing tiers — persisted centralized, request-scoped context, locally-sourced — and (d) atomic batch write/delete of fact deltas mirroring application writes. Everything else (dual-write discipline, `authorize`/`list`/`actions`, `yes, if` partial evaluation) composes on top of this one shape. Concretely for PING: capability checks in the mission loop (proofs 9/13) and rejection of injected bad results (proof 11) need ground statements like `has_role(Worker{"w"}, "approved", MissionClass{"m"})` or `owns(Owner{"o"}, Object{"x"})` in a canonical, syncable, per-request-injectable form — the capability-kernel has the evaluation, it lacks the statement.

Two deliberate improvements over Oso in the adaptation: (1) bind each fact to trust-kernel provenance — writer identity, source-write reference, canonical-bytes digest — so a capability decision is evidence-backed and replayable (proof 14); Oso facts are provenance-free. (2) Keep the leak-aware denial split (404 vs 403) as a capability-kernel output convention.

---

## 12. Dependency analysis

**Zero dependencies.** Nothing is vendored, linked, or called. The harvest is mechanism-only (clean-room re-derivation); every concept above can be implemented against PING's existing event/evidence/object substrate with no new external package. Any future implementation dependency introduced during the ADAPT build must name a proof_id or be rejected per harvest law — currently none are needed.

**License finding (verified from official sources):**
- `osohq/oso` (legacy open core: Polar engine + language bindings): **Apache-2.0** (repo FAQ: "Oso is licensed under the Apache 2.0 license"; LICENSE file in repo; GitHub license badges across the org).
- Oso Cloud client SDKs (`oso-python`, `oso-node`, `go-oso`, `sqlalchemy-oso-cloud`): **Apache-2.0** (repo pages; pkg.go.dev Apache-2.0 entry).
- **Oso Cloud (the service: fact store, decision API, UI): closed-source commercial SaaS — proprietary. No public repo.** This is the open-core split: free core (now deprecated, "plans for the next open source release") with the centralized product commercial.
- **No GPL/copyleft/SSPL/BSL found on anything in scope.** Nothing to flag for Nolan's copyleft decision beyond the standing note: **do not adopt Oso Cloud as a runtime dependency** — the harvest takes the mechanism, not the service.
