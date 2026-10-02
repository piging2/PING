# MC-3 design: single tenant authority

Read-only design. No code changed, no branches, no commits. Item MC-3 from
`mc-frontier-recon-2026-09-27.md` (Gap 3): the tenant registry is hardcoded
twice and the two copies can only drift apart.

Modeled on the substrate Gap-3 precedent
(`fyd-lane/journal_identity.py`, 2026-09-27): one module owns the data, a
typed lookup fails closed on unknown input, every consumer resolves through
the module instead of carrying its own magic defaults.

## 1. Catalog: every hardcoded tenant list (file:line) and its consumers

### 1a. Dispatch plane (Mission Control TS slice)

| # | Location | Hardcode | Consumers |
|---|----------|----------|-----------|
| T1 | `~/workspace/lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts:33` | `SLICE_TENANTS = ['happy-place', 'coppersmith-plumbing']` | (a) `src/app/api/mc/dispatch/route.ts:39` import; (b) `route.ts:90` catalog GET `tenants: [...SLICE_TENANTS]`; (c) `route.ts:234-235` the `400 bad_tenant` gate: `tenant must be one of: ...` |
| T2 | `mc-dispatch.ts:68` | `NAMESPACE_RE = /^(core\|tenant)::[a-z0-9_.-]+$/` | `route.ts:34` import; `route.ts:262-263` `bad_namespace` gate on `tenant::<id>`. DUPLICATED in python: `~/workspace/mission-control/mission_intent.py:111` `_RE_NAMESPACE` (comment at `:109` admits it "mirrors the canonicalization authority"; fail-fast pre-check, the adapter still decides). |

### 1b. FYD website surface (TS, same tree)

| # | Location | Hardcode | Consumers |
|---|----------|----------|-----------|
| T3 | `src/fyd/data/fyd-tenant-graph.ts:103-118` | `FYD_TENANT_PINS` keyed on `"happy-place"`, `"coppersmith-plumbing"`; `FydTenantId = keyof typeof FYD_TENANT_PINS`; typed `unknown_tenant` error on miss | `readTenantGraph(siteId)` (`:165`, throws on unknown); `getFydTenantIds()` (`:124`); consumer `src/fyd/media/site-bundle.ts:117,126` (`getFydTenantIds().includes(siteId)` gate, null on miss). Already fail-closed and typed; the KEYS are the second registry copy. |
| T4 | `src/app/sites/happy-place/page.tsx:25` | `SITE_ID = "happy-place"` | page metadata, `compilePublicSite`, hero/gallery lookups (`:31-56`) |
| T5 | `src/app/sites/coppersmith-plumbing/page.tsx:26` | `SITE_ID = "coppersmith-plumbing"` | same pattern |
| T6 | `src/app/sites/page.tsx:21` | `DEMO_SITES = ["happy-place", "coppersmith-plumbing"]` | sites index page |
| T7 | `src/app/portal-rail/page.tsx:19` | `BUSINESSES = ["happy-place", "coppersmith-plumbing"]` | portal rail |
| T8 | `src/app/objects/page.tsx:27` | `SITE_IDS = ["happy-place", "coppersmith-plumbing"]` | objects index |
| T9 | `src/fyd/preview/pipeline.ts:158` | `HOMEPAGE_CIRCLE_SITE_IDS: string[] = ["happy-place", "coppersmith-plumbing"]` | homepage circle |
| T10 | `src/fyd/tenant/tenant-context.ts` (shape gate, NOT a list) | `TENANT_ID_PATTERN = /^[a-z0-9-]{1,64}$/` | `requireTenantContext`, `assertTenantKey`, `tenantScopedDir`, `withTenantContext`. Validates shape, never membership. No change needed; it is the shape authority already. |

### 1c. Known adjacent drift (recorded, resolved by the authority)

- `TENANT_ID_PATTERN` (T10): `[a-z0-9-]{1,64}` vs `mission_intent.py` `_RE_TENANT`: `[a-z0-9_.-]{1,64}` vs `NAMESPACE_RE` (T2): `[a-z0-9_.-]`. Three char classes for "a tenant id", two of them cross-language. The authority pins ONE.

### 1d. What is NOT a second registry (checked, excluded)

- `src/app/api/mc/missions/route.ts` and `missions/[id]/route.ts`: read `m.tenant` off the journal projection. Projection read, not an allowlist.
- Per-test fixtures referencing the two tenants: test data, not authority. The bypass lint must allow-list test fixtures explicitly.

Failure this closes: a third tenant added to the FYD surface renders a
page (T4/T5 pattern) while dispatch 400s `bad_tenant` (T1c). Today the
only signal is an operator staring at the two arrays.

## 2. Design: the single tenant authority

### 2.1 Location and language

One new TS module, living next to the existing shape gate:

```
src/fyd/tenant/tenant-registry.ts
```

TypeScript, because every registry consumer (T1..T9) is TS and the only
non-TS tenant reference is python's `_RE_NAMESPACE` pre-check, which is a
shape pre-check, not a registry. Python gets nothing new; its pre-check
stays a documented mirror with a cross-language conformance test (see 2.4).
This follows the Gap-3 precedent: the authority lives in the language of
its consumers (`journal_identity.py` is python because its consumers are
python tools).

Placement note: the dispatch plane (`src/app/api/mc/_lib/`) and the FYD
surface (`src/fyd/`) both resolve `@/fyd/...` aliases in this tree (used
by `fyd-tenant-graph.ts`). The implementer verifies the alias resolves
from `src/app/api/mc/_lib/` before landing; if it does not, the module
moves to `src/app/api/mc/_lib/tenant-registry.ts` and the FYD side imports
from there. One module either way, never a copy.

### 2.2 The record and the API

```ts
/** One tenant, as the whole system must agree on it. */
export interface TenantRecord {
  /** Canonical id. Must satisfy TENANT_ID_PATTERN. */
  id: string;
  /** Human display name. */
  displayName: string;
  /** Journal namespace: `tenant::<id>` (core reserved, never a tenant). */
  namespace: string;
  /** Journal scope tag for event queries. */
  journalScope: string;
  /** Public site route. */
  siteRoute: string;
}

/** Typed refusal. Thrown, never returned as a value (tenant-context.ts rule). */
export class TenantRegistryError extends Error {
  readonly code: 'UNKNOWN_TENANT';
  readonly tenantId: string | null;
  constructor(tenantId: unknown) {
    super(`tenant-registry[UNKNOWN_TENANT]: no registered tenant ${JSON.stringify(String(tenantId))}.`);
    this.name = 'TenantRegistryError';
    this.code = 'UNKNOWN_TENANT';
    this.tenantId = typeof tenantId === 'string' ? tenantId : null;
  }
}

// The registry. Adding a tenant = adding one entry here. Nothing else.
const TENANTS: TenantRecord[] = [
  { id: 'happy-place', displayName: 'Happy Place', namespace: 'tenant::happy-place', journalScope: 'tenant::happy-place', siteRoute: '/sites/happy-place' },
  { id: 'coppersmith-plumbing', displayName: 'Coppersmith Plumbing', namespace: 'tenant::coppersmith-plumbing', journalScope: 'tenant::coppersmith-plumbing', siteRoute: '/sites/coppersmith-plumbing' },
];

/** Typed lookup. Fail closed: unknown id throws TenantRegistryError(UNKNOWN_TENANT). */
export function getTenant(id: unknown): TenantRecord { ... }

/** Non-throwing predicate for UI paths that branch on membership. */
export function isTenant(id: unknown): id is string { ... }

/** Ordered id list. The only enumeration any consumer may use. */
export function getTenantIds(): string[] { ... }

/** Single id-pattern authority. Replaces the three drifted char classes (1c). */
export const TENANT_NAMESPACE_RE = /^(core|tenant)::[a-z0-9-]{1,64}$/;
```

Decisions baked in:
- `namespace` is derived, not stored independently: `namespace = 'tenant::' + id` asserted against `TENANT_NAMESPACE_RE`. There is exactly one string that can be a tenant namespace.
- The char class is the T10 one (`[a-z0-9-]`, DNS-safe slugs, matching the siteId convention the tenant-context docstring already states). The python `_RE_TENANT`/`_RE_NAMESPACE` `[a-z0-9_.-]` classes are wider; the conformance test (2.4) documents that TS is authoritative and python accepts a superset as a fail-fast pre-check only.
- Registry entries are data, not behavior. Per-tenant behavior pins (fixture base graph + digest in T3, deadlines, capabilities) stay with their owners, keyed by registry id. The registry owns identity; it does not absorb every tenant-keyed map.

### 2.3 Migration path: what each hardcode becomes

| Hardcode | Becomes | Deprecation shape |
|----------|---------|-------------------|
| T1 `SLICE_TENANTS` (`mc-dispatch.ts:33`) | Thin consumer: `export const SLICE_TENANTS = getTenantIds();` kept ONE release as a deprecated alias, then deleted. | `@deprecated` JSDoc naming `tenant-registry.ts` as the owner; the bypass lint (3a) fails on any NEW file importing it. |
| T1b catalog GET (`route.ts:90`) | `tenants: getTenantIds()` | Same JSON shape; `as_of` timestamp already varies. |
| T1c `bad_tenant` gate (`route.ts:234-235`) | `try { getTenant(tenant); } catch (e) { if (e instanceof TenantRegistryError) return bad(400, 'bad_tenant', 'tenant must be one of: ' + getTenantIds().join(', ') + '.'); throw e; }` | Response body for the two existing tenants is byte-identical (same list, same template). |
| T2 `NAMESPACE_RE` (`mc-dispatch.ts:68`) | `export const NAMESPACE_RE = TENANT_NAMESPACE_RE;` (re-export) or direct import; then delete the local const. | Re-export for one release, then remove. |
| T3 `FYD_TENANT_PINS` keys | Keys derived: pin map is rebuilt as `Record<registered id, pin>` with a static assertion that `Object.keys(PINS)` deep-equals `getTenantIds()`. The pin VALUES (fixture + base digest) stay; they are per-tenant provenance data, not a registry. | The `unknown_tenant` error code is kept (it is the typed contract the ask lane maps to `projection_unavailable`); its throw site now delegates to `getTenant` first. |
| T4/T5 per-page `SITE_ID` | STAY. Per the sibling design, `SITE_ID` is the page-side tenant binding source of truth. New invariant, enforced by test (3a): every page `SITE_ID` must satisfy `isTenant(SITE_ID)`, and every registered tenant must have a route at its `siteRoute`. | No deprecation; binding stays page-local, membership moves to the registry. |
| T6/T7/T8/T9 UI lists (`DEMO_SITES`, `BUSINESSES`, `SITE_IDS`, `HOMEPAGE_CIRCLE_SITE_IDS`) | Curated subsets stay as code, but each becomes `getTenantIds().filter(...)` or a literal with a `// CURATED SUBSET of tenant-registry` marker, plus a test asserting `subset ⊆ getTenantIds()`. | Curated display lists are legitimate; UNMARKED duplicate full lists are the bypass-lint violation. The lint distinguishes "subset with marker" from "second registry". |

What the deprecation looks like concretely: `SLICE_TENANTS` keeps its
export name and its `as const` tuple shape for one release so no consumer
changes signature; its definition line is the only line that changes, plus
a `@deprecated` tag pointing at `tenant-registry.ts`. After the bypass
lint is green and the falsification (3b) passes, the alias is deleted and
remaining importers switch to `getTenantIds()`.

### 2.4 Cross-language conformance (python)

`mission_intent.py:109-111` keeps `_RE_NAMESPACE` as a fail-fast
pre-check with its existing comment, plus a new comment naming
`tenant-registry.ts` as the authority. A conformance test (python, in the
mission-control tests dir) reads the TS module's `TENANT_NAMESPACE_RE`
source line and asserts the python regex accepts a superset of the TS
regex's language (TS authoritative on what a tenant id IS; python only
pre-checks shape). If the two ever disagree on a registered id, the TS
side wins and the python side is patched.

## 3. Falsification plan

### 3a. The authority is the single owner (bypass lint)

A lint script (ripgrep-based, runs in CI and in the lane's verify step)
fails on:

1. Any `*.ts`/`*.tsx` outside `src/fyd/tenant/tenant-registry.ts` and
   outside `__tests__`/`__fixtures__` containing a string-literal array
   with both `'happy-place'` and `'coppersmith-plumbing'` (regex:
   `['"]happy-place['"].*['"]coppersmith-plumbing['"]` and the reverse),
   UNLESS the array carries a `// CURATED SUBSET of tenant-registry`
   marker comment on an adjacent line AND a corresponding subset test
   exists. This kills future T1/T6/T7/T8/T9-style copies at introduction.
2. Any `*.ts`/`*.tsx` outside the registry matching
   `includes\(\s*tenant\s*\)` or a `.includes(` against a local tenant
   array in `src/app/api/mc/` (the T1c gate pattern): dispatch-plane
   membership checks must go through `getTenant`.
3. Any NEW import of the deprecated `SLICE_TENANTS` alias (allow-list the
   existing importers during the deprecation window; the list must shrink
   to zero).
4. Test `__tests__/tenant-registry.test.ts` asserts:
   `getTenantIds()` deep-equals the registry's own entries (no silent
   second source inside the module), `getTenant('no-such-tenant')` throws
   `TenantRegistryError` with `code === 'UNKNOWN_TENANT'`, every page
   `SITE_ID` satisfies `isTenant`, and every `siteRoute` has a route file.

Today (pre-migration) the lint FAILS on T1, T2, T3-keys, T6, T7, T8, T9:
that failure is the baseline proving the lint sees the current
duplication. Post-migration it must pass.

### 3b. All existing consumers behave identically (byte-identical)

Pre-migration, capture fixtures (normalize only the `as_of` timestamp):

1. `GET /api/mc/dispatch` catalog JSON: `tenants`, `agents`, `constraints`,
   `prompt_max`, `deadlines_seconds` must be byte-identical post-migration.
2. `POST` with `tenant: "no-such-tenant"` -> `400` body
   `{"error":"bad_tenant","message":"tenant must be one of: happy-place, coppersmith-plumbing."}`
   byte-identical post-migration.
3. `POST` with `tenant: ""` and `tenant: "HAPPY-PLACE"` -> same 400 bodies
   pre/post (shape-invalid and case-variant stay rejected the same way).
4. `POST` with `tenant: "happy-place"`, valid agent/capability/prompt:
   passes the gate identically pre/post (the mission-id timestamp means
   full dispatch is non-deterministic, so the harness asserts on the
   gate decision + `namespace === 'tenant::happy-place'` reaching the
   adapter call, using the lane's existing mock-adapter pattern from the
   sibling's 39/39 verified wiring tests).
5. FYD side: `getFydTenantIds()` deep-equals `['happy-place',
   'coppersmith-plumbing']` pre/post; `readTenantGraph('happy-place')`
   returns the same graph digest pre/post; `site-bundle.ts` null-gate
   behavior unchanged for a non-tenant id.

Run: existing jest suites for `src/fyd/tenant/__tests__`,
`src/app/api/mc/**/__tests__`, and `src/fyd/data` must pass with zero
test edits (tests assert behavior, not the registry's address).

### 3c. Third tenant end-to-end (the old hardcodes would have 400'd)

1. Add ONE entry to the registry:
   `{ id: 'maple-street-bakery', displayName: 'Maple Street Bakery',
   siteRoute: '/sites/maple-street-bakery', ... }`. No other code change.
2. Assert: catalog `GET` lists `maple-street-bakery`; the dispatch gate
   accepts it (`getTenant` returns the record; `namespace`
   `tenant::maple-street-bakery` passes `TENANT_NAMESPACE_RE`);
   `isTenant('maple-street-bakery')` is true on the FYD side and
   `getFydTenantIds()` includes it once its pin entry lands.
3. Prove the old code would have failed: check out the pre-migration
   `route.ts` validation against the same POST body and assert the
   `400 bad_tenant` with the two-tenant message. This is the falsifying
   control: same input, old gate 400s, new gate accepts.
4. Negative control: `getTenant('maple-street-bakeryy')` (typo) throws
   `UNKNOWN_TENANT`; the dispatch POST for the typo still 400s
   `bad_tenant`. The authority is strict, not fuzzy.
5. Roll the fixture tenant back out. Registry diff is the entire change
   under test.

### 3d. Replay note

The dispatch-plane steps (3b.1-4) run against the lane-p01 exemplar tree,
whose byte-identity vs the Pig-deployed checkout is UNVERIFIED-LOCAL
(recon UNKNOWN). The implementer re-runs 3b on the Pig-side website tree
after landing; this design's fixtures are the pre-landing snapshot that
makes that comparison possible.

## 4. What needs Nolan's word

1. **FYD product surface adopts the same authority?** The design proposes
   `tenant-registry.ts` as shared by the dispatch plane AND the FYD site
   pages (T3 pins, T4/T5 binding invariant, T6-T9 subsets). The tenant
   record's product fields (`displayName`, `siteRoute`) are a product
   call. This is the Gap-4-Q3-class decision the task flagged: adopting
   the registry on the website surface is a product-surface decision, not
   an engineering inevitability. If Nolan says no, the authority still
   lands for the MC dispatch plane (T1/T2) and the FYD side keeps its
   current lists with the drift risk documented.
2. **Curated UI subsets: collapse or keep?** Recommendation above is keep
   as marked `⊆ registry` subsets (T6-T9 may legitimately not show every
   tenant). If Nolan wants a single display list, T6/T7/T8/T9 collapse to
   `getTenantIds()` and the subset mechanism is deleted.
3. **Landing tree.** `lane-p01/tree` is an UNTRACKED exemplar; the real
   website tree is Pig-side. Nolan's word on whether this lands in the
   website repo directly (Pig-side implementer) or stays exemplar-only
   until the MC->FYD wiring work settles.
4. **No new registry semantics.** The registry is identity only. If a
   future tenant needs per-tenant dispatch policy (deadlines,
   capabilities), that stays in the owning modules keyed by registry id;
   the registry does not grow policy fields without a new design pass.

## Verdict

**NEEDS-DECISION** — the design is implementation-ready pending Nolan's
word on items 1-3 above. The falsification plan (3a-3c) is fully specified
and can be executed by a lane the moment the decisions land. If Nolan
approves shared adoption (item 1), no redesign is needed: the module,
migration table, and lint are specified end to end.
