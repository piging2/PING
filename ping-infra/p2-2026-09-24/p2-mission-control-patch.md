# P2: Mission Control technology projection — patch spec (2026-09-24)

File: `/home/nolan/projects/ping/src/app/api/mc/technology/route.ts` (Pig, 1016 lines)
Status: **SPEC ONLY — NOT APPLIED.** Applying needs `npm run build` + a
`:3100` restart via `/home/nolan/start-3100.sh` (the sanctioned restart
protocol). That restart is the one action needing a go-ahead; the patch
itself is read-only projections, no control paths.

## What the projection already does right

* Reads live docker state per request; `incident:qdrant-health-probe` is
  conditional on live health, so it correctly stopped firing after the
  2026-09-24 qdrant probe fix. No change needed there.
* `snapshot:qdrant` honestly reports UNWIRED backup automation. Keep.
* No control actions exist in this route. Keep it that way:
  **NO CONTROL WITHOUT REAL BACKEND MUTATION.**

## Gap 1: no Qdrant authority object

The route reports collections and health but never answers "who owns Qdrant
and who uses it". Add after the `snapshot:qdrant` push (~line 648):

```ts
// ---- QDRANT AUTHORITY (P2 2026-09-24, verified live) ----
const qCounts = await (async () => {
  const out: Record<string, number | null> = {};
  for (const name of colNames ?? []) {
    try {
      const r = await fetchJson(
        `http://127.0.0.1:6333/collections/${name}/points/count`,
        { method: "POST", body: "{}" }
      );
      out[name] = r.ok
        ? (r.body as { result?: { count?: number } }).result?.count ?? null
        : null;
    } catch { out[name] = null; }
  }
  return out;
})();
const pqNet = inspByName.get("ping-qdrant")?.NetworkSettings?.Networks;
objects.push(
  obj(
    "QdrantAuthority",
    "qdrant:authority",
    "qdrant authority (this host)",
    "DERIVED",
    {
      effectiveQdrant: "brain-qdrant (host :6333)",
      // NOTE: :6333 on this host is brain-qdrant, NOT ping-qdrant.
      constitutionalMemoryPoints: qCounts["constitutional_memory"] ?? null,
      constitutionalMemoryConsumers: "none observed (P2 2026-09-24: zero code refs, zero live readers/writers)",
      pingQdrantState: "orphaned: no published ports, isolated on ping_ping_internal, unreachable from ping-gateway",
      pingQdrantClassification: "decommission candidate (deletion NOT authorized)",
      deadConfig: "ping-gateway QDRANT_HOST=ping-qdrant is unreachable (gateway is on bridge); effective URL is QDRANT_URL=http://host.docker.internal:6333",
      tenantSemantics: "payload-namespace convention only (tenant::hpp, core::owner, core::system); no Qdrant-level enforcement",
      canonicalSource: "none: Qdrant is derived recall-only; canonical truth is brain-postgres/ping_runtime + file journal",
    },
    {
      effectiveQdrant: "OBSERVED",
      constitutionalMemoryPoints: "PROVEN",
      constitutionalMemoryConsumers: "DERIVED",
      pingQdrantState: "OBSERVED",
      pingQdrantClassification: "DERIVED",
      deadConfig: "OBSERVED",
      tenantSemantics: "OBSERVED",
      canonicalSource: "DERIVED",
    },
    "live :6333 API + docker inspect + P2 codebase/container evidence 2026-09-24"
  )
);
```

Also add `{ label: "qdrant authority", objectId: "qdrant:authority" }` to the
technology-tree children near the existing `{ label: "qdrant", objectId:
"snapshot:qdrant" }` entry (~line 994).

## Gap 2: stale `risk:masked-health` basis

Current text: "qdrant and vault are docker-unhealthy while serving 200s".
qdrant is healthy now, so the basis overstates. Change to computed text:

```ts
basis: (() => {
  const q = /unhealthy/i.test(String(qHealth?.Status ?? ""));
  const v = /unhealthy/i.test(String(vHealth?.Status ?? ""));
  const who = [q && "ping-qdrant", v && "ping-vault"].filter(Boolean).join(" and ") || "none currently";
  return `${who} docker-unhealthy while serving 200s; any real outage would look identical`;
})(),
```

Keep the risk itself: the pattern (unhealthy-but-serving masks real
failure) is still true for vault.

## Out of P2 scope (other lanes own these)

The CEO surface list also names: canonical event health, scheduler health,
HOLD missions, UNKNOWN effects, reconciliation queue, gateway release
identity. Those belong to the P0 HOLD/reaper lane and the gateway-promotion
lane, not P2 infra. P2's surfaces (Qdrant authority, backup freshness via
`backup:postgres`/`snapshot:qdrant`, restore freshness, deployment
provenance via release objects, config drift) are covered by this patch plus
existing objects. Do not duplicate the scheduler lane's work here.

## Apply procedure (when authorized)

1. Apply the two edits above to route.ts on the Pig.
2. `cd /home/nolan/projects/ping && npm run build` (must be green).
3. Restart ONLY via `/home/nolan/start-3100.sh` from a non-PTY ssh
   (never by hand, never from a PTY).
4. Verify: `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` in the running process env,
   then `GET /api/mc/technology` → 200 and the new `qdrant:authority`
   object present with `constitutionalMemoryPoints: 0`.
5. Rollback: `git checkout` the file, rebuild, restart via the same script.
