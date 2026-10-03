# Harvest Proposal: AuthZed SpiceDB — Relationship-Based Authority

**AUTHORITY_OWNER:** capability-kernel
**VERDICT:** ADAPT (re-derive mechanisms clean-room; adopt nothing as code)
**proof_ids:** [9, 11, 13]

---

## 1. What I read (exact sources)

| # | Source | Kind | Content captured |
|---|--------|------|------------------|
| 1 | https://github.com/authzed/spicedb, HEAD `dbc16016e92987c531658eae0770261c77434adf` (2026-10-03, "perf(postgres): key limited relationship deletes on (tableoid, ctid) (#3309)") | Official source repo, shallow clone; read, not copied | LICENSE, CheckPermission implementation, consistency middleware, ZedToken encode/decode, caveat compiler/evaluator, WriteSchema path |
| 2 | `/tmp/spicedb-src/LICENSE` (same HEAD) | License file | "Apache License, Version 2.0, January 2004" |
| 3 | `internal/services/v1/permissions.go` lines 62-200 | Source | `CheckPermission`: consistency middleware → snapshot reader at revision → schema validation → `computed.ComputeCheck` → `checkResultToAPITypes` (MEMBER / CAVEATED_MEMBER / default); response `{CheckedAt, Permissionship, PartialCaveatInfo, DebugTrace}` |
| 4 | `pkg/middleware/consistency/consistency.go` | Source | 4-level revision selection: `minimize_latency` → `OptimizedRevision`; `fully_consistent` → `HeadRevision`; `at_least_as_fresh` → `pickBestRevision` (max of token revision vs datastore, honors mismatching-datastore-ID policy); `at_exact_snapshot` → revision decoded from token; optional cursor pins revision |
| 5 | `pkg/zedtoken/zedtoken.go` | Source | ZedToken = base64-encoded protobuf `DecodedZedToken{revision: string, datastoreUniqueIdPrefix: first 8 chars of datastore ID, schemaHash: bytes}`; `DecodeRevision` validates datastore-ID prefix (mismatch → `StatusMismatchedDatastoreID`) and schema-hash lineage |
| 6 | `pkg/caveats/eval.go`, `pkg/caveats/context.go` | Source | Caveats are compiled CEL expressions evaluated with `cel.OptTrackState` partial evaluation and a configurable `CostLimit`; partial results produce a residual AST (`PartialValue()`), `MissingVarNames()`, and the context actually used; context converts via structpb with custom-type serialization |
| 7 | `internal/services/v1/schema.go` lines 123-190 | Source | `WriteSchema`: compile (schema language compiler) → `ValidateSchemaChanges` → apply inside `ReadWriteTx` with schema-hash precondition → returns `WrittenAt` ZedToken binding (revision, schema hash) |
| 8 | https://github.com/authzed/docs/blob/HEAD/app/spicedb/concepts/schema/page.mdx at commit `8286bde6b75330a62bdde879822fe3bebfdd01a8` | Official docs, full page | Schema language reference: definitions, relations, subject relations (`group#member`), wildcards (`user:*`), 4 permission operations `+ & - ->` plus `.any`/`.all`, union-precedence gotcha, arrow rules |
| 9 | https://github.com/authzed/docs/blob/HEAD/app/spicedb/concepts/consistency/page.mdx (same commit) | Official docs, full page | 4 consistency levels + defaults (writes `fully_consistent`, all other reads `minimize_latency`), ZedToken definition, storage guidance (`text` / `varchar(1024)`), snapshot GC window |
| 10 | https://authzed.com/docs/spicedb/concepts/caveats | Official docs, full page | Caveat definitions with typed params, `with` keyword (required vs optional caveat on a relation), `OptionalCaveat{ CaveatName, Context }` on writes, write-time vs check-time context split (write-time takes precedence, partial binding), tuple dedup rule (two relationships differing only by caveat cannot both exist), missing context → check becomes conditional |

SOURCE_SHA `sha256:2368e6f46dbe0538ee1d37cc8d42d0bb3c171acf7851d556b90a267a2c92a573` = sha256 over the concatenated verbatim captures of inputs 1-10 (source file excerpts), saved by the worker in `/tmp/authzed-inputs/inputs.txt` (ephemeral; the input table above is the durable record).

**Repos inspected (cloned read-only, no code copied into the proposal):** `authzed/spicedb` only. No code is adopted; the verdict is mechanism-harvest.

---

## 2. Object model (re-described, not copied)

**Definition.** A named object type (class): `definition document { ... }`. Supports namespaced prefixes (`docs/document`) and an optional `use typechecking` mode that turns silent always-false permission bugs into write-time failures.

**Relation.** A named, typed edge slot on a definition: `relation viewer: user | user with ip_allowlist`. The right side enumerates allowed *subject types*, optionally with a required/optional named caveat (`with <caveat>`). Subject types may include *subject relations* (`group#member`, i.e. "the set of members of a group") and *wildcards* (`user:*`, i.e. the type as a whole, used for public grants).

**Permission.** A *computed* set of subjects, never writable, defined as an expression over relations/permissions using four operators:
- `+` union (note: union binds tighter than `&` and `-`; `a + b & c` parses as `(a + b) & c`)
- `&` intersection
- `-` exclusion (set difference)
- `->` arrow: graph walk — `parent_folder->read` means "follow relation `parent_folder`, then take the `read` permission of the object(s) found"; right side should be a permission, not a relation. `.any(...)` is an alias; `.all(...)` is the *intersection arrow* (all left-side objects must grant it).

**Caveat.** A named, typed, boolean expression compiled from CEL (`caveat ip_allowlist(user_ip ipaddress, cidr string) { user_ip.in_cidr(cidr) }`). Caveats attach to relationships at write time; they are "conditional edges": the edge counts as present only if the expression evaluates true *at check time*.

**Relationship (tuple).** The unit of stored data: `resource_type:resource_id # relation @ subject_type:subject_id [#optional_relation] [caveat]` (e.g. `document:d1#viewer@user:bob[caveat during_business_hours]`). Permissions are never stored; they are computed by walking the relationship graph per check.

**Consistency.** Per-request parameter on the API with 4 levels: `minimize_latency` (cache-friendly, may be stale; default for reads), `at_least_as_fresh(ZedToken)` (read-your-writes; recommended pattern), `at_exact_snapshot(ZedToken)` (pin an exact revision; can fail with "Snapshot Expired" past the GC window), `fully_consistent` (head revision, bypasses cache; default for writes).

---

## 3. ID scheme

- **Objects:** application-controlled strings namespaced by type: `user:alice`, `document:d1`. SpiceDB assigns no IDs.
- **Relationships:** no system ID; identity is the full tuple `(resource_type, resource_id, relation, subject_type, subject_id, optional_subject_relation, caveat_name)`. The store behaves as a set. A relationship cannot be duplicated "with or without a caveat": two tuples differing only by caveat cannot both exist; deletion needs no caveat.
- **ZedToken (causal token):** opaque base64 blob encoding `DecodedZedToken { revision: <datastore revision string>, datastoreUniqueIdPrefix: <first 8 chars of the datastore's unique ID>, schemaHash: <schema hash bytes> }`. Tokens therefore carry (a) a point-in-time, (b) which datastore produced them, and (c) which schema version they belong to. Decode validates the datastore-ID prefix and schema-hash lineage.
- **Schema versions:** identified by schema hash; checks bind evaluation to `(revision, schemaHash)` and `WriteSchema` returns a token covering both.

---

## 4. State transitions

- **Relationship write:** `WriteRelationships` applies a list of `RelationshipUpdate{operation, relationship}` with operations CREATE / DELETE / TOUCH / UNTOUCH. `TOUCH` is the idempotent upsert (safe to retry). Defaults to `fully_consistent`; response carries `WrittenAt` ZedToken. The canonical read-your-writes pattern is: capture `WrittenAt`, return it to the client (header/session/DB column), and thread it into the next check as `at_least_as_fresh`.
- **Relationship delete (revocation):** `DeleteRelationships` removes matching tuples; nothing cascades. Because permissions are computed, revocation takes effect on the next check evaluated at a revision at-or-after the delete. For strict read-your-revocation, capture the delete's `WrittenAt` and use `at_least_as_fresh`.
- **Schema change:** `WriteSchema` compiles the schema text to namespace definitions, runs additive-only validation (configurable), then applies inside a read-write transaction guarded by a schema-hash precondition; returns `WrittenAt` token with the new schema hash. Note: schema writes do not touch relationships; a schema change that renames/removes a relation orphans existing tuples rather than deleting them.
- **Check:** `CheckPermission{resource, permission, subject, consistency, context, withTracing?}` → validated against schema → computed at the revision chosen by the consistency middleware → returns `{checked_at: ZedToken, permissionship, partial_caveat_info?, debug_trace?}`. The `checked_at` token is itself a receipt: the caller can pass it into later requests for causal continuity.

---

## 5. Authority boundary

- One SpiceDB instance holds **one schema and one relationship graph**; tenancy is a schema/modeling decision, not an instance property. (Migration docs explicitly warn: extra "stores" are tenant provisioning and must be re-modeled.)
- The authority boundary is the CheckPermission API itself: the application delegates the single question *"is this actor allowed this action on this resource?"* and receives a decision it cannot recompute cheaper. Access to the boundary is bearer-token (pre-shared key) gRPC/HTTP; everything inside (CEL evaluation, graph walk, consistency selection) is trusted server-side execution.
- **Context model:** caveat context is `structpb` JSON-like data supplied per-check (the "runtime evidence"); partial context can also be bound at write time inside `OptionalCaveat.context` (e.g. the `cidr` in `ip_allowlist`). Write-time values take precedence over check-time values for the same key. There are no "contextual tuples" (OpenFGA-style request-scoped relationships are deliberately unsupported; the official migration guidance is to store them or re-model as caveat context).
- **What stays outside:** SpiceDB never sees application data beyond the relationship graph and the context struct; no row-level storage of resources, no user attributes.

---

## 6. Persistence semantics

- Pluggable datastores: in-memory, Spanner, CockroachDB, PostgreSQL, MySQL. Revisions are datastore-native (commit timestamps / integral revisions), quantized per `--datastore-revision-quantization-interval`.
- Only **relationships** and the **schema** are persisted. Permissions are computed at check time; no denormalization table of "who can do what" exists.
- Reads execute against a **snapshot** at the selected revision + schema hash (loaded at API start; writes after the call starts are ignored). `at_exact_snapshot` reads can fail with *Snapshot Expired* after the `--datastore-gc-window`; tokens should not be stored long-term for that mode.
- Caveat context is ephemeral per check, except the write-time partial binding which persists on the relationship itself.

---

## 7. Evidence / receipts

- **`checked_at` ZedToken on every check response:** binds the decision to (revision, datastore, schema hash). It is a replayable receipt: `at_exact_snapshot(checked_at)` re-executes the *same* decision (within the GC window). This is the closest thing in the industry to a causally-bound authorization receipt.
- **`written_at` ZedToken on writes/deletes:** chains mutations to subsequent checks (read-your-writes / read-your-revocation).
- **`withTracing` / debug trace:** the check returns the full traversed relation/permission path in proto form (documented as high-overhead; use `zed explain` for debugging, not production).
- **`PartialCaveatInfo.missing_required_context`:** when a caveat could not be fully evaluated for lack of context, the check names the missing fields — the caller learns exactly what evidence is needed.
- **Caveat evaluation records** which context values were used (`ContextValues()`), so a decision can report its inputs.

---

## 8. Retries / failures

- Writes use `OPERATION_TOUCH` for idempotent upserts — safe to retry without double effects; `CREATE` fails on duplicates (by tuple identity). Writes default to `fully_consistent` (committed before response).
- Reads default to `minimize_latency` and can be stale (the New Enemy Problem); the documented fix is token threading, never blind fully-consistent reads (cache bypass).
- Check outcome is **ternary**, not binary: `HAS_PERMISSION`, `CONDITIONAL_PERMISSION` (treat as deny unless your code explicitly evaluates the named caveat context), `NO_PERMISSION`. A caveated edge with no context supplied yields `CONDITIONAL_PERMISSION`, not `NO_PERMISSION` — the system distinguishes "no" from "maybe, if".
- CEL caveat evaluation has a configurable cost limit (`EvaluationConfig.MaxCost` → `cel.CostLimit`) to bound per-check compute.
- Failure modes surfaced explicitly: invalid/unknown revision ("invalid revision requested"), snapshot expiry, mismatched datastore ID on token decode, schema-validation errors at write time (compile + typecheck), and a dedicated `MissingVarNames` error path for partial caveats.

---

## 9. Revocation model

- **Revocation = relationship deletion.** There is no grant object, no TTL on grants by default, no cascading revoke; deleting `document:d1#viewer@user:bob` removes exactly that edge.
- Wildcard grants (`user:*`) are revoked by deleting the single wildcard tuple.
- Optional "expiring relationships" feature flag exists (`expiringRelsEnabled`), allowing tuples with an expiry, but revocation in the base model is explicit delete.
- **Gap to note:** schema changes orphan tuples instead of migrating them; revoking a whole relation's meaning (e.g. removing `viewer` from a definition) requires either deleting every tuple or relying on compile-time schema validation to stop serving it.

---

## 10. Tests (as found in the repo and docs)

- `pkg/caveats/compile_test.go`, `eval_test.go`, `context_test.go`, `structure_test.go` — caveat compile/eval/context-merge unit tests.
- `pkg/zedtoken/zedtoken_test.go` — token encode/decode round-trip and datastore-ID mismatch handling.
- `internal/services/v1/permissions_test.go`, `relationships_test.go`, `schema_test.go` — API-level service tests.
- Docs: schema integration testing via YAML assertions (`assertTrue`, `assertFalse`, `assertCaveated` — the last asserts a check returns *conditional*, i.e. the three-valued model is testable), runnable with `spicedb serve-testing` or the AuthZed CI action.
- Consistency deep-dive guidance (official `authzed-marketplace` skill docs) documents adversarial expectations: token routing, snapshot-expiry behavior, and the "never a bare no-token fallback" rule.

---

## 11. Verdict: ADAPT

**Adapt the mechanisms; adopt no code.**

Reason: SpiceDB the system is a Go gRPC service with five datastore backends and a CEL engine — the wrong shape for piging2's zero-dependency TypeScript core, and adopting it would drag in a Go runtime, a datastore, and the `authzed-go`/`authzed-cel-go` dependency graph with nothing mapping to a proof_id as a dependency. What is valuable is mechanism-only and small:

1. **Three-valued check outcome** (`ALLOW / CONDITIONAL / DENY`) with named missing inputs — see smallest primitive below.
2. **Causal token on decisions:** an opaque token encoding `(revision-or-sequence, origin-id, schema-or-config-hash)` returned with every mutation and every check, enabling read-your-writes, read-your-revocation, and replay-at-revision. piging2's event-kernel wants exactly this for proof 14 (replay reconstructs state) — a token that pins "as of this event" for capability decisions.
3. **Permissions-as-computed-graph:** store relations (edges), compute permissions (walks with `+ & - ->`), never persist decisions. PING's capability-kernel already separates actor/target/action/allow-deny; SpiceDB's discipline is that allow/deny is a *pure function of (graph snapshot, schema, context)*, which makes decisions replayable and makes revocation trivially correct.
4. **Write-time partial context binding:** constraints split into stable parts bound at write time (stored with the edge) and volatile parts supplied at check time, with write-time precedence. This is the clean way to do "grant with parameters" (e.g. a mission grant scoped to a CIDR, a time window, a tenant).

Nothing here requires SpiceDB the binary. All four adapt clean-room into PING semantics: relationships become PING event-journal facts; caveats become typed constraint expressions over the existing constraints slot; ZedTokens become event-spine sequence tokens.

---

## 12. Smallest missing primitive

**Conditional permission with named missing inputs.**

PING's capability-kernel evaluates `(actor, target, action, constraints) -> allow/deny`. SpiceDB proves the verdict should be three-valued: `ALLOW / CONDITIONAL(missing: [...]) / DENY`, where `CONDITIONAL` is produced by *partially evaluating* a named, typed constraint expression whose context is split between write-time partial bindings and check-time inputs. When evaluation cannot complete for lack of inputs, the evaluator returns the residual: exactly which named inputs are missing (`MissingRequiredContext`), instead of collapsing to a silent deny.

This is the smallest thing because:
- It is a pure refinement of the verdict type the capability-kernel already produces; no new store, no new service, no schema language required to start.
- It enables negotiated authorization: a worker whose mission action is `CONDITIONAL(missing: ["mfa_verified"])` knows what evidence to produce, rather than retrying blind or being denied opaquely. This is the mechanism behind proofs 11 (reject a bad/incomplete result with a reason) and 13 (independent verification that can ask for the missing evidence).
- It composes with the existing `constraints` slot: constraints become named typed expressions evaluated against a context map; partial evaluation is a ~100-line mechanism with zero dependencies (no CEL needed to start; a tiny expression evaluator suffices).

What it is not: it is not the whole caveat/CEL system, not the ZedToken (valuable but belongs to the event-kernel replay story, a separate harvest), and not ReBAC graph walking (the Oso harvest already covered fact-grounded evaluation; SpiceDB's distinct contribution at this granularity is the conditional verdict).

---

## 13. Dependency analysis

| Candidate dependency | Cost | proof_id | Disposition |
|---|---|---|---|
| `authzed/spicedb` server (Go, gRPC, 5 datastores) | Heavy: Go runtime + datastore + operational burden | none | REJECTED as dependency |
| `github.com/authzed/authzed-go` client / API protos | Medium: proto client for a service we will not run | none | REJECTED as dependency |
| `github.com/authzed/cel-go` (CEL fork for caveat eval) | Medium: full expression engine | none | REJECTED as dependency; partial-eval semantics re-derived on a tiny evaluator |
| Adapted mechanisms (ternary verdict, partial constraint eval, causal decision tokens, computed-permission discipline) | **Zero**: clean-room TypeScript on PING's event spine + capability-kernel | 9, 11, 13 | ADOPT as mechanisms |

**DEPENDENCY_COST: zero.** No third-party package is taken; nothing in this harvest names a proof_id as a dependency, so per the binding rule every dependency is rejected.

---

## 14. License finding

SpiceDB core (`github.com/authzed/spicedb`): **Apache License 2.0**, verified from the `LICENSE` file at HEAD `dbc16016e92987c531658eae0770261c77434adf` (file opens with "Apache License, Version 2.0, January 2004"). No GPL/copyleft/SSPL/BSL on anything in scope. The official docs repo (`authzed/docs`) carries its own docs license, but only mechanism knowledge was extracted from it, not text. Nothing is copied, so no license obligation attaches to the harvest; the Apache-2.0 finding is recorded for Nolan in case any future adoption (rather than adaptation) is proposed.

---

## 15. Proof mapping

- **Proof 9 (create one mission):** mission creation is a capability grant — a partially-bound constraint (write-time context: mission scope, expiry; check-time: worker identity evidence) gates whether a worker may act.
- **Proof 11 (injected bad result is rejected):** the ternary verdict gives *rejection with named cause* — a worker result failing constraint evaluation returns `DENY` or `CONDITIONAL(missing: [...])`, never an opaque boolean.
- **Proof 13 (VERIFIED only after independent verification):** an independent verifier re-evaluates the same decision at a pinned point (token-bound), and `CONDITIONAL` lets it demand the exact missing evidence before promoting to `ALLOW`.
- Proof 14 relevance is noted but deliberately out of scope for this harvest (ZedToken-style replay tokens belong to the event-kernel; no proof_id claimed for it here to keep the harvest minimal).
