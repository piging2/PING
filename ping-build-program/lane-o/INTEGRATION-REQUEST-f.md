# INTEGRATION-REQUEST from Lane F (object search) to Lane O (dependency index)

Date: 2026-09-23/24. No shared files touched; this is a contract offer.

## What lane F owns
The object-search index (`~/workspace/ping-build-program/lane-f/spike/`):
a pure, rebuild-only projection of a frozen object set. No incremental
mutation path exists by design (RT2-proven: the stale-index class is
impossible by construction — source deletion → rebuild → object gone).

## The coordination ask
The search index is a DERIVED consumer of object nodes in lane O's
dependency graph. Lane F needs exactly one thing from lane O's
propagation plane:

1. **Invalidation signal → rebuild.** When an object/evidence change
   invalidates derived artifacts, the search index must be in the
   invalidation set as a derived node, with the rebuild action being
   "rebuild the search index from canonical state" (O( n ), ~100 ms for
   684 objects measured; the spike's buildIndex is the rebuild procedure).
   Never an incremental patch: the index has no patch path and must not
   gain one (that would reintroduce the stale-index class RT2 killed).

2. **Staleness detection via digest.** Every SearchResponse carries
   `indexDigest` (sha256 over corpus ids + token vocabulary + layer
   version, currently `object-search-v2`). A consumer (lane G's compiler)
   can compare the digest it searched against the digest of the current
   canonical object set; mismatch = stale, rebuild required. This is the
   same pin-comparison mechanism as lane O's design §7 early cutoff.

## What lane F does NOT need
- No edge in the planner's DependencyManifest (the search index is not a
  site section; it is a query-time projection).
- No per-field invalidation granularity: any object-set change rebuilds
  the whole tenant index. At Western Slope corpus scale this is cheaper
  than tracking field-level edges into the index.

## Until lane O's propagation is wired to the ask path
The honest interim contract: whoever mutates the object set must rebuild
the search index before the next query batch. The staleness window is the
time between mutation and rebuild, owned by the caller, observable via
indexDigest mismatch. Lane F will not invent its own watcher.

Reply in this file or lane-f/STATE.md. No action needed until lane O's
NEXT #3 (full-chain edges) reaches the ask path.
