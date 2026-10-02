# FAIL-6: visibility-error

Failure class: private facts rendered publicly. Private objects or fields cross
the public browser/BFF boundary because a projection reads more than the
viewer's authorization permits, with no enforcement at the boundary.

## (a) Grounding: real instances from FYD

FYD's own architecture already names the seam. FYD is three layers: truth
(objects, relationships, evidence, owner corrections), experience spec
(SiteSpec, bindings, tokens, visibility), and deterministic rendering; the
renderer is a pure projection behind a binding verifier (memory/2026-09-22.md).
The binding verifier is the boundary. The failures below are all breaches of
it.

Instance 1, the Pergola leak (2026-09-23, memory/2026-09-23.md#L1563): the
private Pergola service object of Happy Place was not visible in rendered
text, but the full graph serialized it inside client script payloads. The
render text looked clean; the leak traveled in a different output channel
(the client payload) that nobody had gated. A generic fix script (pass only
public objects and relationships to SiteClient) was authored but not yet
transferred, applied, type-checked, or verified at compaction; the defect
must not be marked fixed. The general shape is confirmed: the projection
read the whole graph, the boundary check (if any) lived in the template
channel only, and the payload channel leaked.

Instance 2, the tenant contract (2026-09-21, memory/2026-09-21.md#L1799):
trusted TenantContext/OwnerContext is required, not request-body tenant
substitution; every tenant-owned object, evidence item, SiteSpec, override,
read, write, search, render, Ask FYD context, and event must preserve tenant
scope. The required attack set is explicit: guessed IDs, private references,
distinctive-string search, Ask FYD over another tenant's evidence, patch and
approval attempts, body/URL tenant substitution, and private rendering.
Happy Place and Coppersmith must be mutually isolated.

Instance 3, taxonomy (2026-09-21, memory/2026-09-22.md#L49): source
observation ownership, canonical public identity, tenant-private state,
tenant presentation, and tenant capabilities are distinct. Two tenants may
reference the same public external observation while having different
corrections, visibility, SiteSpec, private context, and capabilities. This
means visibility cannot be a property of the object alone; it is a property
of the (object, tenant, viewer-context) triple.

Lesson drawn: every real instance has the same structure. The projection
pipeline had legitimate access to private data (it needs it for owner
preview, for corrections, for the builder), and one output path consumed the
full data set instead of a viewer-scoped projection. HTML looked safe while
the script payload carried the graph. The failure is not "someone put a
secret in the template"; it is an unscoped read crossing into a public
channel.

## (b) Surviving mechanisms

Hard rule applied: a mechanism survives only if it prevents at least 2 of
the 9 failure classes. Each survivor below names its prevented classes with
one crisp reason per class, then a falsifiable test.

### S1. Positive-license projection gate (single enforcement chokepoint)

How it works: between the object graph and every public output channel
(rendered HTML, client script payloads, search indexes, Ask FYD context,
sitemaps, RSS) sits exactly one gate. The gate binds a field into public
output only if the field carries a positive license for that channel.
Default license is deny. The license is positive: the data must explicitly
carry permission, not merely lack a "private" flag. The gate is one choke
point shared by all channels, so a new channel (like the script payload that
leaked Pergola) inherits enforcement instead of needing its own patch.

Prevented classes:
- #6 visibility-error: the Pergola object had no public-visible license, so
  no channel could bind it; the leak is impossible at the gate, not merely
  hidden in one template.
- #5 claim-binding: the gate generalizes. A rendered factual claim is just
  another binding, and the gate requires its license too: evidence-backed.
  A claim with no evidence has no license and is refused the same way a
  private field is refused.
- #2 unsafe-url: a URL binding requires its license too: scheme and origin
  allowlist. A javascript: or data: URL has no license and is refused at
  the same gate, before it reaches rendered output.

Falsifiable test: build a fixture graph with four items: (1) a public
Service with evidence-backed claims and an https URL, (2) a private Service
containing canary string CANARY-PRIV-8812, (3) a public field whose value is
`javascript:alert(document.domain)`, (4) a factual claim with no evidence
item. Run the full public pipeline, capturing rendered HTML, client script
payloads, search index, and gate logs. Expected observable outcome: channel
(1) renders normally; items (2), (3), (4) appear in zero output channels;
the gate log records three denials with reasons (no-visibility-license,
no-url-license, no-evidence-license). The mechanism FAILS if any canary or
payload appears in any output byte, or if a payload is absent with no
corresponding denial recorded (silent skip is unverifiable and counts as
failure, because an unlogged skip cannot be distinguished from a leak that
landed nowhere).

### S2. Visibility as a canonical schema attribute with deny-by-default

How it works: visibility is a first-class field on the object and on each
sensitive sub-field in the canonical graph, not a UI or template concern.
The schema default for any new field or object is private until an
authorized actor explicitly marks it public-visible. Visibility changes are
canonical truth changes: they appear in diffs, event logs, and approvals
exactly like a name or price change.

Prevented classes:
- #6 visibility-error: hiding is in the data, not the template, so a new
  template, a new channel, or a refactored component cannot accidentally
  unhide what the data still marks private. The Pergola template looked
  clean while the data was unscoped; schema-level visibility makes the data
  itself the authority.
- #4 fixture-drift: a regeneration that flips a visibility flag is a
  canonical diff on a truth attribute, not silent cosmetic drift. Drift
  detection catches it the same way it catches a changed price, because the
  attribute lives in the same canonical record.

Falsifiable test: take a fixed fixture graph with a mix of public and
private fields. Regenerate the site twice; between runs, inject a
visibility flip on one object (private to public) the way a drifted
regeneration would. Expected observable outcome: the second run emits a
canonical diff event naming the visibility change; the public output of
the second run still excludes the object unless the flip went through the
authorized marking path; if the flip was unauthorized, the render
deny-by-default excludes it and logs a denial. The mechanism FAILS if the
flipped object renders publicly without an authorized marking event, or if
the two runs produce identical logs with no visibility diff recorded (the
flip passed silently).

### S3. Trusted-context tenant enforcement at every read

How it works: tenant_id comes from trusted context (session, deployment
config), never from request body, URL, or caller-supplied parameters. Every
read in the pipeline (object fetch, evidence fetch, SiteSpec load,
correction load, search, Ask FYD context assembly, render) is tenant
filtered at the data access layer, not by convention at the call site.
Cross-tenant references to shared public observations resolve through the
shared canonical identity while tenant-private state (corrections,
visibility, presentation) stays per-tenant.

Prevented classes:
- #6 visibility-error: other tenants' private data is simply unreadable in
  this tenant's projection context, so a confused or hostile read (guessed
  ID, URL substitution, distinctive-string search) returns nothing rather
  than someone else's private facts.
- #8 correction-loss: owner corrections are tenant-private state read
  through the same tenant filter. A regeneration against a changed source
  still reads the same tenant's correction set, so corrections cannot be
  dropped or mixed by an unscoped or wrong-tenant read; scope is part of
  the read invariant, not a hope about the pipeline.

Falsifiable test: create two tenants, HP and CS. Give each a private object
containing a unique canary (CANARY-HP-7F3A, CANARY-CS-9E2B) and give HP an
owner correction on a public field. Run HP's full public pipeline under
trusted HP context, then run the tenant-contract attack set against it:
guessed object ID of the CS private object via URL substitution, request
body with tenant_id=CS substituted, distinctive-string search for
CANARY-CS-9E2B, and an Ask FYD query seeded with CS context. Expected
observable outcome: zero CS canary bytes in any HP output channel, every
attack returns empty or a scope error, and HP's owner correction survives a
regeneration run against a changed source fixture. The mechanism FAILS if
any CS canary appears anywhere in HP's outputs, or if the regeneration
loses HP's correction (showing the read was not scope-consistent).

### S4. Adversarial boundary test suite (red-team the seams, not the happy path)

How it works: a permanent, deterministic test suite whose cases are attacks
on the two seams: the visibility boundary and the input-code seam. It is run
on every pipeline change, and it includes mutation testing: the suite must
be shown capable of catching injected defects, not merely passing on clean
code. The case list starts from the tenant contract's required attacks
(guessed IDs, private references, distinctive-string search, Ask FYD over
another tenant's evidence, body/URL tenant substitution, private rendering)
plus the code-seam attacks (javascript: and data: URLs, script-like source
strings, malformed markup in source data).

Prevented classes:
- #6 visibility-error: the required attack set is exactly the ways
  visibility failures manifest; a suite that runs them on every change
  catches the next Pergola-style payload-channel leak before release.
- #2 unsafe-url: the same suite's code-seam cases are the ways unsafe URLs
  manifest; both classes are hostile content crossing the projection seam,
  so one red-team suite covers both.

Falsifiable test: build the suite against a fixture pipeline and run it
twice for determinism. Then inject two defects by mutation: (a) a code path
that passes the full graph (including a private object with canary
CANARY-MUT-4410) to the client payload builder, bypassing the gate; (b) a
source field containing `javascript:alert(1)` bound into a link. Expected
observable outcome: the suite fails loudly on both mutations, naming the
failing case and the leaked canary. The mechanism FAILS if the suite
reports green while any canary or payload is present in output (the suite
is blind), or if the suite's pass/fail result differs across identical runs
(flaky red-team is unverifiable and counts as failure).

## (c) Cut list

- Render-time field stripping per template: cut. It patches one output
  channel; the Pergola leak traveled in the script payload channel the
  template never saw.
- Per-viewer ACLs evaluated at render: cut. Public FYD sites have anonymous
  viewers, so there is no per-viewer identity to check against; this
  collapses to the public-visible flag anyway and prevents only #6.
- Encrypting private fields at rest: cut. The renderer needs plaintext to
  decide what to show, so encryption prevents neither the projection error
  nor any second class.
- Human review of rendered output before publish: cut. Prevents only #6,
  does not scale, and is a process patch, not a mechanism.
- Sandboxed iframe rendering of third-party content: cut. Contains script
  execution (one class, #2) but does nothing for visibility or any other
  class; fails the two-class rule.
- Audit logging of every render bind: cut. Detective, not preventive;
  a log written after a leak prevents nothing.
- Separate per-tenant databases with no shared identity: cut. Contradicts
  the taxonomy (two tenants may share one canonical public observation
  with different private state); it prevents #6 by duplication but breaks
  the shared-observation model and helps no second class.
- Client-side filtering of private objects after fetch: cut. The private
  data already crossed the boundary into the browser; filtering after
  arrival is the Pergola failure restated.

## (d) Open questions

1. Owner preview versus public render: the owner needs to see private
   objects in the /build preview. Is preview a separate license (owner
   context) on the same gate, or a separate pipeline? The gate model says
   separate license; the test for that decision is whether a preview URL
   can ever be mistaken for a public URL by a crawler or a shared link.
2. Who may mark a field public-visible, and is that marking itself an
   audited, reversible capability? Deny-by-default is only as strong as
   the marking authority; an unguarded "make public" button reintroduces
   the leak one click at a time.
3. Shared canonical observations: two tenants reference one public
   observation with different private state. When the shared observation
   itself changes, which tenant's visibility rules govern the derived
   public rendering? The taxonomy names the distinction but not the
   precedence rule.
4. Ask FYD answers from evidence: is the answer-generation context
   assembled through the same gate as the site render, or does it have its
   own path that needs its own S1/S4 coverage? The Pergola leak suggests
   every new consumer of the graph needs explicit gate coverage; Ask FYD is
   the next most likely new consumer.
5. Mutation coverage for S4: who maintains the mutation set as the
   pipeline gains channels? A red-team suite that stops at the 2026
   channel list will miss the 2027 channel the way the template check
   missed the script payload.
