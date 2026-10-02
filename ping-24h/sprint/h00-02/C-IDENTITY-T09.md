# C-IDENTITY-T09: T-09 Pseudo-Vector Reachability + U4 Identity Handoff Map

Date: 2026-09-28 ~19:30-20:00 MDT. Lane C, read-only falsification/observation.
Base references: canonical tree /home/nolan/projects/ping at f877c391 (frozen, dirty 144), convergence tree /home/nolan/projects/ping-fyd-converged at f877c3919941978f07d5014909595df4751ec258, runtime tree /home/nolan/ping.

## VERDICT

T-09: ALL occurrences DORMANT. The sha256-seeded pseudo-vector implementation is confirmed at code level but reached by ZERO live paths: no running process, no cron/systemd timer, no container, no gateway spawn, no import from any served route, worker, or scheduled job. Qdrant is UP and healthy but nothing feeds it pseudo-vectors. "No change" is the correct outcome; nothing to quarantine from this lane (quarantine is a writer decision). Reactivation risk is recorded below.

U4: 12 handoffs enumerated across the five concepts. Four flags raised: one authority-bearing identity accepted from untrusted input (H6, documented loopback-only), one explicitly-unverified seeded identity fenced to demo mode (H3/H4, reactivation risk if the flag is left on in production), one duplicated minting authority bypassing IdentityAuthority in the legacy lane (H12), one register claim found stale (identity_authority.js byte-identical claim falsified by current md5s). No new IdentityAuthority is proposed; the map is contract-convergence input only.

---

## PART 1: T-09 PSEUDO-VECTOR REACHABILITY

### The implementation (confirmed at code level)

File: `/home/nolan/ping/runtime/workers/retriever_worker.py:89-98`

```python
def _text_to_vector(self, text: str) -> list:
    """Generate a deterministic vector from text."""
    import hashlib
    h = hashlib.sha256(text.encode()).hexdigest()
    seed = int(h[:8], 16)
    rng = self._mulberry32(seed)
    dim = 768
    v = [(rng() - 0.5) * 2 for _ in range(dim)]
    norm = sum(x * x for x in v) ** 0.5
    return [x / norm for x in v]
```

sha256(text) -> 32-bit seed -> mulberry32 PRNG -> 768-dim normalized deterministic noise. It is a pseudo-vector, not an embedding.

### Call graph

The ONLY call site in the tree is `process_event` at line 72:

```python
payload = {'vector': self._text_to_vector(query_text), 'limit': 5}
result = self._qdrant_search(payload)
```

Downstream of the output (if the worker ran): `process_event` stores Qdrant hits as `context_packs` rows (line 80-85, context_id minted via `IdentityAuthority.generate_id()`); `reasoner_worker.py` (lines 44-51) reads unreasoned `context_packs` and sends them to the inference model via InferenceAuthority (Ollama); results stored as new events. So a reached pseudo-vector would corrupt retrieval by construction, then feed noise-context into Ollama reasoning.

`_qdrant_search` (lines 100-112): POSTs to `{qdrant_url}/collections/{collection}/points/search`, collection defaults to `constitutional_memory`; on ANY exception returns `[]` (fail-silent, confirmed).

### Reachability evidence (all probes read-only)

- No Python worker process running on the Pig: `ps aux` matched only udev-workers. RetrieverWorker/ReasonerWorker/ProjectionWorker/PlannerWorker/GitHubWorker are all absent.
- No launcher exists: no cron entry, no systemd unit/timer (user units present: ping-mirror-sync, ping-oci-queue only), no docker-compose or start script referencing the workers. The only entry points are `if __name__ == '__main__': worker.run_forever()` in each worker file and ad-hoc `_test_*.py` scripts.
- The live ping-gateway container runs ONLY `node gateway/server.js` (PID 1); zero Python processes inside. `gateway/server.js` contains no `retriever` reference and no Python subprocess spawn.
- Zero references to RetrieverWorker in the Next.js trees (`src/`, `tools/`, `gateway/` of /home/nolan/projects/ping) and in `tools/fyd-journal-gateway/server.mjs`.
- Qdrant IS up: `http://localhost:6333/collections` returned 200 with collections `constitutional_documents`, `constitutional_memory`, `knowledge` (qdrant/qdrant:latest container Up 14h, healthy). But nothing queries it with pseudo-vectors: no live consumer of `_text_to_vector` output.
- The workers package `__init__.py` imports RetrieverWorker (registration), but import is inert without a launcher. Registration is not reachability.

### Per-occurrence verdicts

1. `/home/nolan/ping/runtime/workers/retriever_worker.py:89-98` (_text_to_vector) - DORMANT. Confirmed implementation, zero live reach. Exact would-be reach point: `process_event` line 72, inside a worker loop that is not running anywhere.
2. Same file lines 100-112 (_qdrant_search, fail-silent) - DORMANT, same reach analysis.
3. Duplicate copies in ~20 lane/worktree trees (wr-integrate, wr-failclosed-audit, ping-wave-P-20260923-106-107-108, ping-gauntlet, ping-wave-gateway-integration, ping-orca-safety, ping-orca-state, ping-integrate, ping-wave-gateway-mc-honesty, wave3-repair, ping/worktrees/agent-smoke-abc123def456, gw-jevcandidate-20260928, gw-repair-build, jev-shadow-routing-domain, jev-surgical, replay-input-wiring, wt-orca-port-integration, ping-f01-converge, worktrees/ping-codex-convergence) - DORMANT. Spot md5s of three copies are identical (2ecf92dff3375f38298e713350bc22a4); none has any launcher.
4. `runtime/tools/authority_search.py` Tier1->Tier2->Tier3 retrieval tiers (present in the same dormant runtime trees) - DORMANT, same reason.
5. Next.js/FYD tree (`src/fyd`, `src/app`, `tools/fyd-journal-gateway`) - ABSENT. Repeated term searches (pseudo/fake/dummy/hash embedding, deterministic vector) returned zero hits in source; the sha256 hits there are canonical-JSON digests, lineage, and session signing, not embeddings.

### Reactivation risk (recorded, not acted on)

If any lane re-launches the Python worker loop (e.g. `python runtime/workers/retriever_worker.py`), retrieval corrupts by construction: sha256-noise vectors are searched against a Qdrant collection whose stored vectors come from real embeddings, so "related" hits are arbitrary; the arbitrary hits are persisted as `context_packs` and consumed by ReasonerWorker into Ollama inference. Any future writer re-enabling this lane must replace `_text_to_vector` with a real embedding call or fail closed when no embedding provider is configured. Left untouched per lane rules.

### Commands run (read-only)

- stdin-fed ssh batches via `pigwsl 'wsl -- bash -s'` grepping the Pig trees for pseudo/dummy/fake/hash-embedding terms and `_text_to_vector` / `_qdrant_search` / `class RetrieverWorker` across /home/nolan/projects/ping*, /home/nolan/ping*, /home/nolan/wr-*, /home/nolan/wave3-repair, /home/nolan/wt-orca-port-integration, /home/nolan/worktrees, plus local greps of ~/workspace/ping-24h for prior T-09 references.
- `ps aux | grep -i -e retriever -e worker -e qdrant`; `docker ps`; `docker exec ping-gateway ps aux`; crontab/systemd timer listing.
- `python3 -c` GET on http://localhost:6333/collections (Qdrant UP, 200).

---

## PART 2: U4 IDENTITY HANDOFF MAP

Concept key: ENTITY ID (what a thing is), ACTOR ID (who/what acts), CRYPTOGRAPHIC IDENTITY (proof of identity), TENANT-OWNER BINDING (who owns which tenant scope), AGENT ID (which agent identity executes).

Format: CONCEPT / MINTING AUTHORITY / VERIFYING AUTHORITY / TRUST BASIS / SOURCE / DESTINATION.

### H1. ENTITY ID - runtime UUIDv7 minting

- MINTING AUTHORITY: `IdentityAuthority.generate_id()` (/home/nolan/ping/runtime/authorities/identity_authority.py:78). Prefers Postgres `SELECT uuidv7()`, falls back to pure-Python RFC 9562 v7 (os.urandom-backed).
- VERIFYING AUTHORITY: none (format-only `isUuid` checks exist in the TS lane; the Python lane does not verify).
- TRUST BASIS: EXPLICIT. Single owned minting function; the module docstring declares every UUID originates here.
- SOURCE: worker/tool code -> DESTINATION: Postgres events, context_packs, claims tables.
- Note: legacy lanes also carry `identity_authority.js` copies; the register claimed three byte-identical copies (sha c05060d0) but current md5s show divergence (10c6f64b68aa9af0ebb2add8d7a99305 vs 61529b695b9223ff5fe20bd68009f62f) between `runtime/kernel/authorities/` and `ping-runtime/authorities/` copies in wr-integrate. The register claim is STALE; FLAG 4.

### H2. ENTITY ID - FYD deterministic identity derivation

- MINTING AUTHORITY: `deriveIdentityId` (src/fyd/identity/principal.ts:57-59) = uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:" + provider + "::" + issuer + "::" + subject).
- VERIFYING AUTHORITY: `verifyGoogleIdToken` via JWKS (src/fyd/identity/provider.ts:215); session HMAC verify (src/fyd/identity/session.ts:57-60).
- TRUST BASIS: EXPLICIT. Provider-stable (issuer, subject) is the canonical key; email is explicitly an attribute/claim and never canonical; no silent merge on email match (principal.ts:1-20); account linking requires the verified ID token of the current flow.
- SOURCE: Google OIDC (currently the only wired provider; Apple OFF by 2026-09-21 directive) -> DESTINATION: FYD identity binding records -> HMAC-signed session cookie (HttpOnly, SameSite=Lax).

### H3. ACTOR ID - FYD demo owner (seeded, unverified)

- MINTING AUTHORITY: constant `DEMO_OWNER_ACTOR = { id: "demo-owner", label: "Demo Owner (seeded, unverified)" }` (src/fyd/owner-mode/capability.ts:61-64).
- VERIFYING AUTHORITY: ABSENT. The code comment: "This mapping is the demo. It verifies nothing." The customize route stamps every response "DEMO OWNER MODE - not real authentication. No identity was verified."
- TRUST BASIS: ABSENT (explicitly declared). Fencing: localhost/private host + `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` (gate.ts:38), and `:3100` is always restarted with the flag ON by /home/nolan/start-3100.sh per standing protocol.
- SOURCE: env flag + host check -> DESTINATION: customize approve path (`approvedBy: DEMO_OWNER_LABEL`, owner-proposal.ts:675).
- FLAG 1: an authority-bearing actor ("controller of every demo site") with no verification. Currently fenced; reactivation risk if the flag ever applies on a public host. Recorded, not acted on.

### H4. TENANT-OWNER BINDING - FYD demo relationship

- MINTING AUTHORITY: `resolveDemoRelationship` (src/fyd/owner-mode/capability.ts:76+): the seeded demo actor is treated as controller of EVERY demo site; any other actor id maps to no relationship.
- VERIFYING AUTHORITY: ABSENT (same demo fencing as H3).
- TRUST BASIS: ABSENT.
- SOURCE: (siteId, demo actor) -> DESTINATION: owner-state writes (customize approve/clear, owner overlays).
- FLAG: same as H3; silent reconstruction of a controller relationship, honest only inside the demo fence.

### H5. TENANT-OWNER BINDING - MC dispatch POST (Mission J, live)

- MINTING AUTHORITY: operator-provisioned caller registry `dispatch-identities.json` at /home/nolan/workspace/mission-control/ (read per request; read/parse failure throws and the route refuses, fail closed). Maps provisioned key -> { agent_id, tenant, entitled_tenants }.
- VERIFYING AUTHORITY: `resolveCaller` (src/app/api/mc/_lib/mc-dispatch-identity.ts:66-72) reads `x-mc-caller-key` header; the live route (src/app/api/mc/dispatch/route.ts:57,246-286) 401s `identity_required` when the key is missing/unknown and 403s `tenant_mismatch` when the body tenant disagrees with the authenticated tenant. "The tenant is derived from the authenticated caller, never from the request body."
- TRUST BASIS: EXPLICIT (key-authenticated, server-side registry, fail-closed).
- SOURCE: operator registry + HTTP header -> DESTINATION: mission journal records (agent, tenant fields).
- Provenance note: `mc-dispatch-identity.ts` is UNTRACKED (??) and `route.ts` is MODIFIED (M) in the frozen tree; this dirty state IS the served :3100 path. The pre-J body-tenant defect is fixed in the served bytes.

### H6. TENANT-OWNER BINDING - MC missions READ routes (Mission L, live)

- MINTING AUTHORITY: the caller itself, via the `x-mc-tenant` header (src/app/api/mc/_lib/mc-tenant-gate.ts:45-51). Absent header -> operator view (all missions); valid header -> that tenant's view.
- VERIFYING AUTHORITY: shape check only (`CALLER_TENANT_RE`). The module docstring explicitly states this "is NOT authorization against a deliberate loopback caller."
- TRUST BASIS: INFERRED. Trust rests on the loopback-only deployment assumption, not on authentication.
- SOURCE: HTTP header -> DESTINATION: read-scope filter over the single mixed-tenant missions JSONL.
- FLAG 2: authority-bearing read scope accepted from untrusted input. Documented and deliberately scoped (loopback operator surface), but any exposure of these routes beyond loopback converts it to a cross-tenant read hole. Flagged for the contract, not patched.

### H7. TENANT-OWNER BINDING - FYD journal gateway

- MINTING AUTHORITY: the appending caller supplies `tenant_id` (tools/fyd-journal-gateway/server.mjs).
- VERIFYING AUTHORITY: the gateway itself: 400 `tenant_required` when missing, 400 `tenant_mismatch` when the event tenant disagrees with the bound tenant, 400 `request_id_tenant_conflict` on replay conflicts. Register notes the binding rule as "requested wins iff bound".
- TRUST BASIS: INFERRED (caller-asserted, consistency-enforced; no cryptographic caller binding at the gateway today).
- SOURCE: HTTP append request -> DESTINATION: journal events (tenant-namespaced) -> projections via dump.py.
- This is the strongest REACHED tenant enforcement on the write path; it is the model cited by the register.

### H8. AGENT ID - MC dispatch target agent

- MINTING AUTHORITY: static `SLICE_AGENTS` list (src/app/api/mc/_lib/mc-dispatch.ts:33); broker identity state at /home/nolan/copilot-broker/state/identities.json (BROKER_STATE).
- VERIFYING AUTHORITY: route allowlist check (`SLICE_AGENTS.includes(agent)`, route.ts:241) for the body-selected agent; the authenticated `CallerContext.agent_id` (H5) is EXPLICIT.
- TRUST BASIS: INFERRED for the dispatch target (body-selected but allowlist-bounded); EXPLICIT for the caller agent_id (registry-derived).
- SOURCE: request body (dispatch target) / operator registry (caller) -> DESTINATION: broker execution (`runBroker` with identityId) and journal `agent` field.
- Note: body.agent is accepted from untrusted input but can only select from the static slice list; actual execution identity (broker identityId, ollama path) is server-side. Bounded risk, recorded.

### H9. AGENT ID - Copilot broker identities

- MINTING AUTHORITY: copilot broker state file (operator-managed).
- VERIFYING AUTHORITY: broker-side (runBroker reads broker classification; identities 1-4 authorized per 2026-09-26 Nolan directive, 5-10 denied).
- TRUST BASIS: INHERITED (operator-managed broker state).
- SOURCE: broker state -> DESTINATION: agent execution via broker lane-d shim.

### H10. CRYPTOGRAPHIC IDENTITY - FYD owner auth

- MINTING AUTHORITY: Google OIDC (issuer + sub); session secret `FYD_SESSION_SECRET`.
- VERIFYING AUTHORITY: `verifyGoogleIdToken` (JWKS signature check, provider.ts:215); session HMAC verify with `timingSafeEqual` (session.ts:57-60); sessions fail closed when the secret is missing or a placeholder (loadSessionConfig, session.ts:31-47, 32-char minimum).
- TRUST BASIS: EXPLICIT.
- SOURCE: Google ID tokens -> DESTINATION: verified account -> identity binding (H2) -> signed session.

### H11. CRYPTOGRAPHIC IDENTITY - runtime dev signer

- MINTING AUTHORITY: `generateKeyPairSync` Ed25519 per identityId, keys under `PING_DEV_KEY_DIR` (src/lib/ping/dev-signer.ts).
- VERIFYING AUTHORITY: server-side verify.
- TRUST BASIS: EXPLICIT but DEV-ONLY. The module is labeled a "clearly labeled dev stand-in, not the constitutional path"; canonicalization authority stays with the runtime. No new authority is created by using it.
- SOURCE -> DESTINATION: practice-page dev envelopes only.

### H12. ENTITY ID - legacy claim lane direct uuid4 (DUPLICATED)

- MINTING AUTHORITY: `/home/nolan/ping/claim_worker.py` calls `uuid.uuid4()` directly at lines 88, 101, 158, 165 for claim IDs and event IDs, bypassing `IdentityAuthority`.
- VERIFYING AUTHORITY: none.
- TRUST BASIS: DUPLICATED. A parallel minting authority in the legacy observation->claim lane (referenced from `constitutional_runtime.py` and `kernel/event_dispatcher.py`).
- SOURCE -> DESTINATION: legacy observations/claims/event tables.
- FLAG 3: duplicate minting authority. Lane reachability is UNKNOWN/DORMANT (same unlaunched class as the RetrieverWorker lane); recorded for convergence, not touched.

### H0 (minor). ACTOR ID - Python runtime worker names

- MINTING AUTHORITY: class attribute strings (`name = 'RetrieverWorker'` etc.).
- VERIFYING AUTHORITY: none. TRUST BASIS: ABSENT (self-declared).
- Included for completeness; these names are labels, not authority.

### Flags summary

- FLAG 1 (H3/H4): seeded unverified demo-owner is controller of every demo site. Honest and fenced today (localhost/private + env flag + "not real authentication" stamps); reactivation risk if the flag is ever on for a public host.
- FLAG 2 (H6): `x-mc-tenant` header asserts read scope; shape-checked only, documented as not-authorization, safe only on loopback. Exposure beyond loopback is the break condition.
- FLAG 3 (H12): `claim_worker.py` mints entity IDs with `uuid.uuid4()` directly, bypassing the single owned `IdentityAuthority`. Duplicated authority in the legacy lane.
- FLAG 4: the prelaunch register's claim "identity_authority.js x3 byte-identical (sha c05060d0)" is STALE; current md5s of the js copies diverge (10c6f64b... vs 61529b69...). Do not treat that register line as current.

### Consistency check against the register

The register (02#1) says "20 handoffs include 1 accepted-from-untrusted-input, 1 incorrectly reconstructed, 5 absent." This map's 12 reached handoffs are consistent in shape: untrusted-input acceptance (H6), silently reconstructed binding (H4), absent verification (H3, H4, H0). The remaining register handoffs (namespace laundering bridge, event-bridge, etc.) belong to the U2 namespace unit, not U4, and were out of this lane's scope.

---

## EVIDENCE AND COMMANDS (read-only)

All Pig probes were stdin-fed ssh batches (`ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes pigwsl 'wsl -- bash -s' < script`), no writes to any product tree. Local greps over ~/workspace/ping-24h for prior T-09/U4 references. Files read (not modified): retriever_worker.py, reasoner_worker.py, workers/__init__.py, identity_authority.py, mc-dispatch.ts, mc/dispatch/route.ts, mc-dispatch-identity.ts, mc-tenant-gate.ts, session.ts, provider.ts, principal.ts, capability.ts, owner-identity.ts, dev-signer.ts, claim_worker.py, server.mjs (journal gateway), fyd-journal-gateway sections. Report written only to ~/workspace/ping-24h/sprint/h00-02/C-IDENTITY-T09.md.

Qdrant probe: `python3 -c urllib GET http://localhost:6333/collections` -> 200, collections: constitutional_documents, constitutional_memory, knowledge. Read-only.

No em dashes were used in this report.
