# search-qdrant-truthfulness label audit

**Date:** 2026-09-30, night shift (read-only)
**Backlog item:** `search-qdrant-truthfulness` (BACKLOG_PING.md, PING.F, P1, OPEN)
**Rule applied:** no "hybrid" / "semantic" label unless hybrid actually executes.
**Scope discipline:** read-only. Grep is local. Exactly one read-only HTTP probe was issued, to the Qdrant health endpoint only. No remediation, no restart, no config change, no writes to Qdrant, no gateway probes, no Pig SSH/docker access.

## 1. Label inventory

### 1a. Task-named worktree paths: NOT PRESENT in this sandbox

- `/home/nolan/ping`: does not exist. `/home/nolan` itself is absent (only `/home/hatch` exists on this host).
- `/home/nolan/projects/ping-askfyd-gold`: does not exist; no `ping-askfyd-gold` directory found anywhere on this filesystem (search to depth 6, excluding /proc and /sys).

Consequence: the static grep was run against the FYD surfaces that do exist locally (the FYD website product-lane source, the askfyd harness, the fyd build/lane/portal dirs, and Mission Control sources). If the labels live in the Pig-side checkouts, they are not auditable from this sandbox.

### 1b. FYD website product-lane source (local, closest equivalent)

Tree: `~/workspace/fyd/product-lane/piging2-fyd-a69bb68fc84620a5635e071030cf49a633df7394/src`

- NO "hybrid search" label found (source files only; Next.js build bundles excluded, they contain a false-positive `hybrid` key in vendored router code).
- NO "semantic search" label found.
- Only "hybrid" hits are deck-business terminology, not search:
  - `src/lib/interview-engine-v3.ts:44`: `hybrid_repair_and_refinish:` (deck repair flag)
  - `src/lib/interview-engine-v3.ts:45`: `id: "hybrid_repair_and_refinish",`
  - `src/lib/interview-engine-v3.ts:46`: `label: "Hybrid repair and refinish needed",`
  - `src/lib/interview-engine-v3.ts:107`: `if (flag.id === "hybrid_repair_and_refinish") complexity += 2;`
  - `src/lib/interview-questions-v3.ts:160`: `"Has damaged boards": { flagId: "hybrid_repair_and_refinish", severity: "review" }`
  - `src/lib/interview-questions-v3.ts:320`: same as :160 (second questionnaire block)
- Only Qdrant mention in this tree is infrastructure backup text, not a search label:
  - `src/app/page.tsx:131`: `detail: "Live on Oracle (ping-core-01, native arm64). Backup set created on-box 2026-09-17: pg_dump, Qdrant snapshot, clean source tarball. Same host only, no automation yet.", status: "Experimental"`

### 1c. Mission Control / lane-p01 tree source (local copy of same product lane)

Tree: `~/workspace/lane-p01/tree/src`

- NO "hybrid search" / "semantic search" labels (same deck-repair `hybrid_repair_and_refinish` hits as 1b).
- `src/app/api/mc/technology/route.ts:287`: `{ id: "svc:qdrant", name: "qdrant", url: "http://127.0.0.1:6333/" }` (health-projection entry, container-local URL).
- `src/app/api/mc/technology/route.ts:915`: `qdrant: qcol.ok ? "reachable (:6333)" : "unreachable"` (health projection rendering, not a search-quality label).

### 1d. Other local FYD surface dirs: no labels

- `~/workspace/askfyd`: "semantic" hits are only render-model semantics (e.g. `baseline.test.ts:33`, `known-gaps.test.ts:123` "not semantic-fact-wide"), not search labels. No "hybrid" at all.
- `~/workspace/fyd-build`, `~/workspace/fyd-lane`, `~/workspace/fyd-portal-proof`, `~/workspace/fyd-object-build`, `~/workspace/transfer/fyd-harvest`, `~/workspace/transfer/fyd-owner`: no "hybrid search" / "semantic search" labels.

### 1e. Where "hybrid search" DOES appear in local records (internal docs, not user-facing surfaces)

- `~/workspace/fyd-lane/harvest-report.md:55`: "The pattern is small; the Qdrant/hybrid-search half is irrelevant to FYD now."
- `~/workspace/fyd-lane/harvest-wave1/code-evidence/hash-authority.ts:81`: comment "NOT a recursively stringified hybrid JSON/string tree." (not search-related)
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/harvest-lanes-2026-09-30/08-search-retrieval-memory.md:21`: "NO HybridSearch or retrieval module in TypeScript. The only Qdrant reference in TS is `src/app/api/mc/technology/route.ts` (health inspection of the `ping-qdrant` container and its `knowledge` collection)."
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/harvest-lanes-2026-09-30/08-search-retrieval-memory.md:22`: "The actual HybridSearch lives inside the `ping-gateway` container: `/app/ping-runtime/search/hybrid_search.js` (129 lines) and `qdrant_adapter.js` (76 lines)."
- `~/workspace/goals/ping-agent-execution-stack/hidden_files/convergence-99h/harvest-lanes-2026-09-30/08-search-retrieval-memory.md:24`: "The task brief's 'KnowledgeGraph + HybridSearch + Qdrant' describes the gateway container's retrieval front door, not the Ask FYD path."
- `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md:43`: "the only working semantic search in the estate (Ollama nomic-embed-text, Qdrant 768-d cosine, deterministic fallback vectors); FYD's discovery stage needs this behind the BFF, not reimplemented."
- `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md:139` (G3): "FYD's discovery surface cannot do semantic search without new plumbing."
- `~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260925-090421-b-new-business-radar.provenance.json:144` (and repeats): "Residual noted: hybrid_search knowledge leg returns rejected nodes with visible status marker (coordinator-deferred read-side gap, not patched in this lane)."
- `~/workspace/BACKLOG_PING.md:639`: the item's own claim: "semantic search is down (Qdrant unreachable/unhealthy; embedding init degrades to null) while surfaces still wear the 'hybrid search' label: Postgres keyword search in a hybrid costume."

## 2. Qdrant reachability probe (the single authorized network action)

**Endpoint found by config grep:** `~/workspace/ping-gateway-promotion/ping-gateway.compose.yml:33` sets the deployed gateway's default `QDRANT_URL` to `http://host.docker.internal:6333`, i.e. Qdrant on the Pig host port 6333. Pig address from standing records: `100.79.154.43`. (The MC technology route's `http://127.0.0.1:6333/` is the container-internal view; unreachable from outside by design.)

**Probe:** `curl -s -m 12 http://100.79.154.43:6333/healthz` (Qdrant's unauthenticated HTTP health endpoint; read-only GET).

**Result:**
- `http_code=000`, curl exit 52 (empty reply from server), elapsed ~0.19s.
- No Qdrant health response of any kind.

**Verdict: UNREACHABLE.** From this sandbox, the Qdrant HTTP API on the deployed gateway host does not answer. This matches the backlog item's premise ("Qdrant unreachable/unhealthy; embedding init degrades to null") but is an external, sandbox-perspective check only; it cannot distinguish service-down from firewall-drop, and no container-level recheck was attempted (out of scope for this read-only item).

No credentials were encountered in cleartext in the scanned config files; none are recorded here. (Credential-bearing values were filtered out of the grep by design.)

## 3. Label vs reachability verdict

Applying "no hybrid label unless hybrid executes":

1. **No user-facing FYD surface source in this sandbox currently wears a "hybrid search" or "semantic search" label.** The FYD website and MC sources audited contain no such text. The backlog's "Postgres keyword search in a hybrid costume" label, if it exists, is not in the local trees; it likely lives in the Pig-side checkouts that this sandbox cannot read (hard rule: no Pig access).
2. **The only executing hybrid search lives in the ping-gateway container** (`/app/ping-runtime/search/hybrid_search.js` + `qdrant_adapter.js`, per the 08-search-retrieval-memory harvest lane), which requires a reachable Qdrant. **Qdrant is unreachable from this sandbox**, so the one real hybrid implementation cannot execute from any surface this sandbox can see.
3. Net: **nothing auditable here legitimately claims "hybrid search" or "semantic search" today.** If the Pig-side FYD surfaces still carry the label (per BACKLOG_PING.md:639), the label is untruthful under the rule until Qdrant is restored from the deployed gateway's network namespace (the backlog's own prescribed fix) or the label is removed everywhere.

## 4. Blockers and open questions

- The two task-named paths (`/home/nolan/ping`, `/home/nolan/projects/ping-askfyd-gold`) do not exist on this host; the Pig-side checkout audit is the missing half of part (a).
- The probe distinguishes only "Qdrant answered" vs "Qdrant did not answer" from this sandbox; exit 52 (empty reply) could be a dropped/filtered connection rather than a down service.
- No remediation attempted (belongs to the deploying lane, per the item).
- No drift into crew lanes: FOCUS/Bug/website-synthesis/owner-loop surfaces were not touched or re-litigated; this is a pure label-vs-reachability record.
