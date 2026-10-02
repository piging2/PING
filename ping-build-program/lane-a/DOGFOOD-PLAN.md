# DOGFOOD PLAN: ingest PING itself

Lane A. Goal: after ingesting the PING repository, the seven questions
below MUST be answerable with repository evidence cited (commit SHAs,
file blobs, diffs, tags). No em dashes used in this document.

## Ingestion target

The PING repo on the Pig: /home/nolan/projects/ping, branch fyd-factory.
Read-only. Skeleton approach: bare mirror clone with
`--filter=blob:none`, full commit/tree topology first, blob contents
materialized on demand keyed by OID, per-repo byte budget enforced.
Initial cursor: HEAD at ingest time; afterwards incremental
OLD HEAD -> NEW HEAD per ref.

Note: PING is a trusted first-party repo, so the full threat gauntlet is
not the gating factor here, but the pipeline runs the same code path
(same gates, same caps) so dogfood also exercises the safe path.

## The seven questions and what counts as an answer

1. "What implements identity?"
   Answer shape: File nodes for the identity modules (e.g.
   IdentityAuthority and its callers), Commit nodes that introduced or
   changed them (with diffs), and PersonClaim authorship. Evidence: blob
   SHAs of the implementation files, commit SHAs of the introducing
   changes. Pass criterion: every named module resolves to a
   `blob:<sha>` at a specific commit, and the answer lists the commit
   messages that explain why.

2. "Show duplicate event paths"
   Answer shape: import edges (File ->imports-> File) converging on more
   than one event-store or id-generation implementation, plus the
   phase0 classification (CANONICAL_AUTHORITY / ADAPTER / DUPLICATE).
   Evidence: the import graph derived from AST parsing, cross-checked
   with DUP lane findings. Pass criterion: the answer names the files
   and the commits that created each path.

3. "What changed the FYD renderer?"
   Answer shape: Commit nodes touching renderer paths, ordered by time,
   with Change records (exact renames followed across moves), linked
   PR/commit messages. Pass criterion: `rev-list` over the renderer
   subtree returns the same set the answer cites; no cited commit is
   missing from the range.

4. "Which tests protect SiteSpec determinism?"
   Answer shape: test files (path contains test/spec) with import or
   proximity edges to SiteSpec modules, plus CI Workflow observations
   showing they run on push. Evidence: File nodes, Workflow nodes, and
   the workflow YAML blobs. Pass criterion: every claimed test maps to
   an existing blob SHA; the workflow edge is declared_only and honest
   about not having run results (run results are lane CONN's API data).

5. "Which modules can write canonical events?"
   Answer shape: the set of File nodes with import edges to the Event
   Authority's write interface, per the phase0 authority map. Pass
   criterion: the set matches phase0's MAY WRITE list; any disagreement
   is surfaced as a discrepancy, not silently resolved.

6. "What code depends on this schema?"
   Answer shape: reverse edges: Schema node (from a JSON Schema or
   OpenAPI blob) <- defined_in File <- imported_by Files; plus
   Repository depends_on Package edges from lockfiles for schema
   packages. Pass criterion: lockfile-resolved versions are cited, not
   manifest-declared ranges.

7. "Why was this architectural decision made?"
   Answer shape: the commit message body, linked ADRs/docs (Doc nodes),
   and the discussion context available in-repo. Where the repo is
   silent, the answer says UNKNOWN and points at the nearest evidence
   (e.g. the commit that introduced the pattern). Pass criterion: no
   invented rationale; every claim carries a SHA or is marked UNKNOWN.

## Execution steps

1. Mirror: `git clone --filter=blob:none` of the PING repo to the
   ingestion host; record origin, ref snapshot, shallow=false.
2. Full-history packet through the GitReader wrapper (CLI engine);
   manifest detectors over package.json, tsconfig, workflows, Docker,
   schemas.
3. Import-edge pass: AST parse of ts/tsx/js (tree-sitter or swc) for
   File ->imports-> File/Package edges, resolved against tsconfig paths.
4. Load packets as observations through the Event Authority (phase0
   seam); resolve into the object graph.
5. Run the seven questions as Ask FYD queries (lane G consumer);
   grade each against its pass criterion above.
6. Record gaps (e.g. "docs understanding needs AI", "import resolution
   failed for X aliases") as typed findings for the next iteration.

## Success criteria

All seven questions return answers where every factual claim cites a
SHA (commit, blob, tree, or tag) or is explicitly marked UNKNOWN with
the nearest evidence pointer. Zero claims sourced from model memory.
The dogfood run itself is recorded as an ingestion packet (provenance
for the answers about provenance).
