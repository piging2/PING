# FAIL-6 falsification: adversarial review of the four survivors

Date: 2026-09-23. Research only, no implementation code.

## Method

For each survivor (S1-S4): construct the strongest concrete adversarial case,
then analytically run the survivor's own falsifiable test against it. A "run"
here is a trace of the test's stated steps against the stated attack, asking
only whether the test as written would fail on its own fixture. No fixture
pipeline exists to execute literally, so a "catch" counts only if the test's
own assertions would fire. Strengthenings are proposed per survivor. Verdicts:
WITHSTANDS, WEAKENED, or FALLS, naming the ground lost.

## Verdict summary

| Survivor | Verdict | Ground lost |
|---|---|---|
| S1 positive-license projection gate | WEAKENED | #6: new-channel bypass passes its test; private values in licensed fields delegated silently to S2. #5: linkage only, misbound evidence passes. #2: canonical-spelling scheme check only, normalization variants pass. |
| S2 visibility as canonical schema attribute | WEAKENED | #6: unauthorized flips prevented; authorized-but-wrong marking passes the test and leaks. #4: single-attribute drift caught; mass flips, schema renames, and public-to-private cache blast radius untested. |
| S3 trusted-context tenant enforcement | WEAKENED | #6: outsider attacks prevented; confused-deputy reads (shared build cache, contextless background reads, cache-key confusion, mint-time substitution) pass the test and leak. #8: tested regeneration shape holds; write-path clobbering untested. |
| S4 adversarial boundary test suite | WEAKENED | #6: known-channel mutations caught; novel-channel leaks pass green (the suite would have passed on the pre-Pergola architecture). #2: known-bad strings caught; variant space not covered by denylist assertions. |

No survivor falls outright: each prevents its canonical fixture shape, and
several test clauses are genuinely well designed (S1's silent-skip-is-failure
rule, S2's no-silent-diff rule, S4's determinism double-run). No survivor
withstands: every test verifies behavior on a fixed fixture while the claimed
property is structural, and the realistic failures pass every test as written.

---

## S1. Positive-license projection gate

Claimed to prevent: #6 visibility-error, #5 claim-binding, #2 unsafe-url.

### Attack 1: the channel the gate never sees (the Pergola shape, repeated)

The mechanism promises "exactly one gate... shared by all channels, so a new
channel (like the script payload that leaked Pergola) inherits enforcement
instead of needing its own patch." Note first that the test's channel list is
narrower than the mechanism's: the mechanism claims rendered HTML, client
script payloads, search indexes, Ask FYD context, sitemaps, RSS; the test
captures only rendered HTML, client script payloads, search index, and gate
logs. Ask FYD context, sitemaps, and RSS are claimed but untested.

Now add a fifth channel the gate authors did not enumerate: an RSC flight-data
stream, a JSON-LD dump, an RSS feed, an OG-image generator, Ask FYD tool-call
arguments, or an error page that echoes request context. The new channel's
author serializes from the graph without calling the gate, because nothing in
the mechanism as specified makes that unrepresentable. Trace the test: its
four captured channels are clean, its three denials are logged, no canary
appears in any output byte the test inspects. The test passes. Production
leaks through channel five.

The test measures a fixed channel list, not the chokepoint property. The
Pergola incident was precisely a channel outside the checked set, so S1's test
would have passed on the pre-fix architecture while the leak shipped. The
"silent skip counts as failure" clause is strong against a different cheat
(dropping a payload without logging it) but does not help here: nothing is
skipped; the new channel is simply not observed.

Deeper inconsistency: S4's mutation (a) asks the suite to catch "a code path
that passes the full graph to the client payload builder, bypassing the
gate." If such a code path can be written, the gate is a convention, not a
chokepoint, and S1's "the leak is impossible at the gate" is false. If such a
path cannot be written, mutation (a) is uninjectable and S4's headline case is
vacuous. The two survivors cannot both be true as specified. See cross-cutting
finding C1.

### Attack 2: private fact inside a licensed public field

The gate licenses fields, not values. Take the fixture's item (1), the public
Service, and place canary CANARY-PUBVAL-2201 (introduced for this attack)
inside its public, evidence-backed description, the way a private note pasted
into a public field would land. The test expects item (1) to "render normally"
and checks canaries only for items (2) through (4). The canary renders in
every channel and the test passes. Real-world versions: an owner correction
carrying private context, or a derived value such as response time computed
from private message timestamps. S1's #6 prevention therefore depends entirely
on S2's marking correctness: the gate cannot distinguish "public field, public
value" from "public field, private value." That dependency is unacknowledged
in S1's statement. Related: if licenses are just data fields that the
regeneration job writes, a buggy or compromised regeneration can self-grant a
license, and the gate will honor it. The test never probes license forgery
through the write path.

### Attack 3 (#2): the scheme check without normalization

The test's unsafe URL is the literal string `javascript:alert(document.domain)`.
The gate requires "scheme and origin allowlist." Attack with
`JaVaScRiPt:alert(1)`, a tab character inside the scheme, HTML-entity-encoded
`&#106;avascript:alert(1)` (decoded by the HTML parser after the gate's string
check), `data:text/html` payloads, protocol-relative URLs, and an open
redirect on the allowlisted origin. Whether the gate normalizes before matching
is unspecified, and the test probes exactly one spelling. A gate that
allowlists by string prefix is defeated by the oldest tricks in the book. S1's
#2 claim holds only for the canonical spelling.

### Attack 4 (#5): misbound evidence

The test's bad claim has no evidence item. Attack with a claim bound to an
evidence item that does not support it: claim "licensed and insured," evidence
a photo of a truck. The gate checks linkage, not support, so it licenses the
claim. S1 prevents unbound claims, not false ones. If #5 means "claims
rendered without evidence binding," the mechanism holds. If #5 means "claims
the evidence does not substantiate," the test's pass condition is the
attacker's path, the same structural flaw as S2's authorized-marking problem
below.

### Attack 5: the preview license as a bearer token (open question 1)

The gate model says preview is "a separate license (owner context) on the same
gate." The standard implementation is a preview token in the URL. The
capability then travels in a channel the gate does not govern: browser
history, shared links, referer headers, crawlers. An owner shares a preview
link; the recipient's anonymous request presents the token; the gate sees
"owner context" and binds private objects. The test has no preview case at
all. The gate is correct per request and the leak still happens, because the
license's distribution mechanism is outside the gate's jurisdiction.

### Attack 6 (minor): the denial log as a channel

The test requires three denials recorded in the gate log and sweeps the log
for canary bytes, which is good. But a production denial log that records the
denied field's value (common in debug logging) becomes a channel the gate
cannot gate, a recursion the mechanism does not address. Even a clean log
leaks existence: denied object IDs and field paths tell an observer that
private objects exist and what they are shaped like. The canary sweep does not
catch existence leaks.

### Test-strength assessment

Strong on the fixture: the per-channel canary sweep, the denial accounting,
and especially the "silent skip counts as failure" rule, which defeats the
laziest way to fake compliance. Weak structurally: the test never verifies
that bypass is impossible, never enumerates channels beyond the four it was
built with (fewer than the mechanism claims), never probes value-level content
of licensed fields, uses one spelling for the URL attack, and tests linkage
rather than support for claims.

### Strengthened test

1. Registry completeness: fail if the pipeline's channel registry contains any
   channel whose serializer is not gate-routed. The channel inventory becomes a
   tested artifact, not a comment.
2. The novel-channel property test: after the gate is built, introduce a
   serializer the gate authors never saw, hand it the full graph, and require
   that the only graph type it can name is the gate-projected view. Attempt to
   write a bypass in test code; require a compile-time type failure or a
   runtime refusal. This tests the chokepoint property, not the channel list.
3. Value-level canary: place a canary inside a licensed public field's value;
   require either refusal or a provenance policy (public field values carry
   author and timestamp; values written outside the authorized content path are
   quarantined).
4. URL battery: mixed case, whitespace and control characters, HTML-entity
   encoding, data: URLs, protocol-relative URLs, open redirects on allowlisted
   origins. Assert the positive property on parsed output (every bound URL
   parses to an allowlisted scheme and origin), not the absence of one bad
   string.
5. Evidence support: either narrow the #5 claim to linkage-only in the
   mechanism statement, or require evidence items to carry typed assertions and
   require the claim's assertion type to match.

### Verdict: WEAKENED

Still prevents the canonical shapes on the fixture: unlicensed fields refused
across the known channels, plain `javascript:` URLs refused, unbound claims
refused. No longer prevents, as specified and tested: #6 through any channel
added after the gate (the Pergola shape, which its own test would have passed
pre-fix), #6 through private values in licensed fields (delegated silently to
S2's marking), #6 through license forgery on the write path, #5 through
misbound evidence, #2 through normalization variants and open redirects, and
the preview-token distribution leak.

---

## S2. Visibility as a canonical schema attribute with deny-by-default

Claimed to prevent: #6 visibility-error, #4 fixture-drift.

### Attack 1: authorized-but-wrong marking (open question 2)

The test: "the public output of the second run still excludes the object
unless the flip went through the authorized marking path." So any flip WITH a
marking event is blessed. Concrete attack: the Pergola object is marked
public-visible through the authorized path by a confused owner, a support tool
with broad rights, or a research agent with write authority (the tandem
writes; agent write authority exists in this shop). The marking event exists.
The object renders publicly. The test passes.

The mechanism's entire preventive boundary is the marking authority, and open
question 2 ("who may mark a field public-visible, and is that marking itself
an audited, reversible capability") is unanswered, so the boundary is
unspecified. Note the document's own standard: the cut list rejects "audit
logging of every render bind" as "detective, not preventive." S2's
visibility-change diff is detective by the same standard: it records the wrong
marking faithfully while the leak ships. Deny-by-default constrains only the
unauthorized path; the realistic failure, authorized but wrong, walks through
the front door. The test's binary authorized/unauthorized model also ignores
the dimensions that matter: which actor, which role, what reason, what scope.
It asserts none of them.

### Attack 2: the public-to-private direction and the cache blast radius

The test flips private to public only. Flip public to private instead: the
object was public, and its bytes are already in the CDN edge cache, the search
index, shipped client payloads, RSS readers, and the Wayback Machine. S2
records a canonical diff and future renders exclude the object. The cached
copies keep serving the private fact. The test never inspects previously
emitted artifacts, so it passes while the fact remains public. S2 governs the
data's current visibility, not the blast radius of past emissions. Whether
already-emitted bytes count as a #6 failure is a policy question the mechanism
never answers; the test should force it to answer.

### Attack 3: mass flip and schema drift

Inject 10,000 visibility flips in one regeneration, via a compromised
authorized path or a config change that flips the default. The single-flip
test does not probe the systemic response: is there a circuit breaker, or does
the whole catalog flip behind 10,000 individually "authorized" diffs? Variant:
the regeneration renames the attribute (`visibility` to `isPublic`) or drops
it. If the new renderer treats a missing attribute as "not private" (fail
open), everything renders. The test injects a flip of the known attribute
only; it never asserts the missing-attribute default (deny) that the
mechanism's prose promises ("the schema default for any new field or object is
private"). A deny-by-default that is never tested on the default path is a
slogan.

### Attack 4: shared-observation precedence (open question 3)

Two tenants share one canonical public observation. Tenant A's owner marks a
derived field public-visible; because the visibility attribute lives on the
shared canonical record, the derived public rendering changes for tenant B as
well. Concrete: shared observation "Pergola services in Grand Junction" is
public; HP's private correction "discontinued 2025" is tenant-private; A's
marking of a related field alters B's site. The single-tenant fixture cannot
see this. S2 states no precedence rule, and the test cannot fail on its
absence.

### Attack 5 (residual): emergent sensitivity

No single sub-field is sensitive, but the combination is: service area plus
schedule plus owner name enables targeting; public pricing plus public address
enables scoping. Per-field marking cannot express combination sensitivity.
This is a known limit of field-level schemes, not a claimed capability, but
the verdict should record the residual.

### Test-strength assessment

Good on its chosen shape. The unauthorized-flip case is a real prevention: a
buggy regeneration flipping flags without marking events gets denied and
logged. The "identical logs with no diff counts as failure" rule defeats
silent-pass cheating, mirroring S1's silent-skip rule. But the test's pass
condition (an authorized marking event exists) is exactly the attacker's path
for the realistic failure; it covers one flip direction, one flip at a time,
one tenant, and the known attribute name.

### Strengthened test

1. Unauthorized-actor marking: inject marking events from actor classes that
   must never hold the capability (support tooling, research agents, CI jobs,
   a second tenant's owner); require refusal, not just a diff.
2. Step-up for risky markings: a marking that would expose content matching
   private patterns, or that flips more than k objects in one run, requires a
   second approver event or a reason code; inject the single-event version and
   require a hold.
3. Public-to-private with cache: simulate the CDN and search-index artifacts
   from run one; flip to private; require proof that every captured channel
   stops serving the fact (invalidation receipts), and require the mechanism to
   state its policy on already-emitted bytes.
4. Missing/renamed attribute: regeneration drops or renames the visibility
   attribute; require fail-closed exclusion plus a loud schema-mismatch error,
   never silent rendering.
5. Mass flip: N flips in one run trips a circuit breaker that blocks publish
   pending approval; assert the block, not just the diffs.
6. Two-tenant shared observation: A's marking must not change B's derived
   public output; assert B's bytes are identical before and after A's marking.

### Verdict: WEAKENED

#6: unauthorized flips are genuinely prevented; authorized-but-wrong marking
passes the test and leaks, and that is the realistic shape of the failure.
#4: single-attribute drift is caught as a canonical diff; mass flips, schema
renames, the missing-attribute default, and the reverse-time cache problem are
untested and unhandled as specified.

---

## S3. Trusted-context tenant enforcement at every read

Claimed to prevent: #6 visibility-error, #8 correction-loss.

### Attack 1: the confused deputy in the multi-tenant build loop

The test runs "HP's full public pipeline under trusted HP context," singular.
The real pipeline builds all tenants, often in one process: set context,
render, write, repeat. A shared module-level cache, a DataLoader batching
across tenants, or a memoization keyed without the tenant poisons across
iterations: CS's iteration caches the private object; HP's iteration reads the
warm cache and binds CANARY-CS-9E2B into HP's search index or payload. The
test never runs the loop, never warms a shared cache, and passes while HP's
outputs carry CS bytes. S3's headline promise is "tenant filtered at the data
access layer, not by convention at the call site," but the cache sits beside
the data access layer, and the test never exercises a call site holding the
wrong convention, which is the only failure mode the promise is about.

### Attack 2: mint-time substitution

The test covers request-time substitution (body tenant_id=CS). Move the
substitution one step earlier: the internal preview or debug tool that mints
the "trusted" session takes the tenant from a URL parameter or a dropdown
default. The minted context is then genuinely trusted and genuinely wrong. S3
moved the trust boundary from the request to the minter without securing the
minter. The test does not touch session minting.

### Attack 3: preview/public cache-key confusion (open question 1 again)

The owner previews HP's site under trusted HP-owner context, with private
objects licensed for preview. The CDN caches the response under the public URL
because the cache key does not include the visibility context. An anonymous
request hits the warm cache and receives HP's private objects. Both renders
were individually correct; the cache key was the confused deputy. The test
models no cache layer.

### Attack 4: contextless background reads

ISR revalidation, webhook handlers, scheduled jobs, and the search-index
builder run without request context. If the data access layer's no-context
behavior is fail-open (return unfiltered rows) or default-tenant (deployment
config says HP), the background read binds the wrong tenant's data. The test
never invokes a read without a tenant context and never asserts fail-closed.
This is the highest-severity gap in S3: it is a standing background process,
not an attacker action, and it runs on every deploy.

### Attack 5: the shared retrieval index for Ask FYD

The test seeds "an Ask FYD query seeded with CS context" and expects empty or
a scope error, but it asserts on output emptiness, not on the retrieval query.
If the vector index is shared across tenants with the tenant predicate applied
at the application layer, one code path that forgets the predicate returns CS
evidence into HP's answer context. The test as written cannot distinguish
"filter applied, no results" from "filter forgotten, results happened to be
empty." Assert the query text carries the tenant predicate. Variant: a
multi-turn conversation where turn 1 is CS-scoped and turn 2 is HP-scoped in a
shared session; context carries across the turn boundary.

### Attack 6: write-path clobbering (#8)

The mechanism describes reads; the tenant contract's attack list includes
writes, but S3's "how it works" scopes enforcement to "every read in the
pipeline." CS's pipeline run writes the shared search-index artifact and
clobbers HP's entries; or a regeneration running under a misconfigured trusted
context reads the wrong tenant's (empty) correction set and republishes,
dropping HP's correction. The #8 test (correction survives regeneration
against a changed source) covers read-scope only. A wrong-context write is
correction loss with no read-scope violation anywhere.

### Attack 7: revision history on the shared observation

The shared canonical observation is public today, but an old revision contains
HP-private text that was later moved into the tenant-private correction. The
test's distinctive-string search runs against the current pipeline; the
revision index is a separate channel. CANARY-HP-7F3A sitting in revision 3 of
a public observation leaks through the history channel while the current
render is clean.

### Attack 8: the deployment-config default

Tenant_id from "deployment config" fails when preview deployments share
config: HP and CS preview builds in one hosting project share one TENANT_ID
variable, or a misconfigured default (default=HP) builds CS's site with HP's
data. The test never runs a build with ambiguous or shared deployment config.
Require refusal to build.

### Test-strength assessment

The outsider attack set is the right list for the wrong adversary. Guessed
IDs, body/URL substitution, distinctive-string search, and CS-seeded Ask FYD
are all hostile-outsider moves, and the test would catch a pipeline that
honors forged tenant claims. But the tenant contract's actual subject is the
confused insider: trusted code reading with the wrong trusted context. Every
attack above is a trusted component, a correct session, or a background
process doing the wrong scoping, and none of them is in the test. The test
defends the side of the trust boundary that S3 already concedes (request data
is untrusted) and ignores the side S3 claims to secure (trusted context used
correctly everywhere).

### Strengthened test

1. Multi-tenant build loop in one process with shared caches; assert
   per-tenant cache keying or explicit clearing, and zero cross-tenant canary
   bytes in either tenant's artifacts.
2. Mint-time substitution: attempt to mint a CS preview session via URL/body
   tenant input; require refusal at the minter.
3. Cache-key confusion: run owner-preview then anonymous through the
   production cache-key function; require zero private bytes in the anonymous
   response, and require the key function to include the visibility context
   (assert on the key, not just the output).
4. Contextless reads: invoke every data-access entry point with no tenant
   context; require a scope error, never unfiltered rows; assert no unfiltered
   overload is reachable from pipeline code.
5. Retrieval inspection: assert the Ask FYD retrieval query text contains the
   tenant predicate; run a multi-turn cross-tenant session.
6. Write isolation: run both tenants' pipelines against shared artifact paths;
   require per-tenant paths or refusal; run a regeneration under a wrong
   trusted context and require it to fail rather than publish another tenant's
   correction set as empty.
7. Revision-history search: index revisions; distinctive-string search must not
   hit superseded private text.
8. Ambiguous deployment config: shared or missing tenant default fails the
   build loudly.

### Verdict: WEAKENED

#6: the outsider shapes are prevented; the confused-deputy shapes (shared
build cache, contextless background reads, cache-key confusion, mint-time
substitution) pass the test as written and leak, and the data-access-layer
promise does not cover caches that sit beside the layer. #8: the tested
regeneration shape holds; write-path clobbering and key-rename detachment are
untested.

---

## S4. Adversarial boundary test suite with mutation testing

Claimed to prevent: #6 visibility-error, #2 unsafe-url.

### Attack 1: mutation-set rot (open question 5, unanswered)

The test injects exactly two mutations, both in 2026 channels: the client
payload builder and a link binding. Ship a new channel in 2027, a JSON-LD
dump, an RSS feed, an OG-image generator, Ask FYD tool-call arguments, each
with a leak, and add no mutation for it. The suite is green; the leak ships.
The test contains no assertion relating the mutation set to the channel
inventory, so rot is invisible to the test by construction. This is the same
blind spot that caused Pergola, one level up: then the checked set was
templates, now it is the 2026 channel list.

### Attack 2: green before Pergola

Run S4's test as written against the pre-fix architecture. The fixture models
the known channels; the script-payload channel that actually leaked is
unmodeled; mutation (a) targets the known payload builder. The suite passes
loudly and deterministically. The real system leaked. S4 as specified prevents
recurrence of known shapes; it does not prevent the class. A red-team suite
whose fixture lacks the leaking channel is a test of the fixture, not of the
system.

### Attack 3: unreached mutants

Inject mutation (a) on a code path the suite never executes: a dead branch, an
admin-only channel, a path behind a feature flag. The suite stays green. Green
now means "no executed mutant leaked," which is consistent with a live leak on
an unexecuted path. The test requires no coverage proof that mutants lie on
executed paths. Standard mutation-testing practice requires killed mutants to
be reachable; the test omits this.

### Attack 4: fixture drift, S4's own unclaimed class

The suite runs against "a fixture pipeline." Nothing in the test requires the
fixture to match production. Production gains a channel; the fixture does
not; the suite stays green on the fixture while production leaks. S4 is
vulnerable to #4 fixture-drift, a class it does not claim to prevent, and the
vulnerability voids its #6 claim silently. The test needs a fixture-fidelity
assertion: fail if production's channel registry contains anything the fixture
lacks.

### Attack 5 (#2): denylist testing

Mutation (b) is a single known-bad string, `javascript:alert(1)`. The variant
space is unbounded: mixed case, whitespace, entity encoding, data: URLs,
protocol-relative URLs, open redirects. A suite that asserts "no known-bad
string in output" is a denylist and is falsified by construction; the first
variant not on the list ships. The correct assertion is the positive property:
every URL bound in output parses to an allowlisted scheme and origin, and
every HTML binding is escaped or sanitized by construction. S4's #2 coverage as
written is coverage of the test author's imagination, not of the class.

### Attack 6: self-policing

"Run on every pipeline change" with no separation of duties: the PR that
introduces the leak can also edit the suite, weaken a case, or add an
exclusion. The test asserts the suite runs; it does not assert the suite is
hard to subvert. At minimum, suite changes need a different approval path than
pipeline changes, or the suite lives outside the pipeline repo with its own
owners.

### Test-strength assessment

The determinism double-run and the loud-failure requirement are genuine
hygiene, and mutation testing is the right instrument. But the test aims it at
a fixed 2026 threat list on a fixture of unknown fidelity, which is exactly
the posture that missed the Pergola payload channel. The suite would have been
green the day before the leak.

### Strengthened test

1. Registry-derived mutations: a meta-test fails the suite if any channel in
   the pipeline's channel registry lacks at least one leak mutation. A new
   channel without a mutation is a suite failure, not a gap. This answers open
   question 5 structurally: the mutation set is generated from the registry,
   not hand-maintained.
2. Mutant reachability: each injected mutant must lie on a path the clean-run
   trace executes; prove it from coverage, not from hope.
3. Fixture fidelity: generate the fixture's channel list from the production
   registry; fail if they differ. The suite tests the system, not a model of
   it.
4. Positive-property assertions for the code seam: parse every URL in output
   and assert allowlisted scheme and origin; assert every HTML binding went
   through the sanitizer by construction (for example, typed HTML strings).
   Replace denylist assertions.
5. Normalization-adversarial battery for the URL mutations.
6. Separation of duties: suite edits require an approval path distinct from
   pipeline edits, or separate ownership.

### Verdict: WEAKENED

#6: mutations in known channels are caught loudly; novel-channel leaks pass
green, and the suite would have passed on the pre-Pergola architecture. #2:
known-bad strings are caught; the variant space is not covered by denylist
assertions.

---

## Cross-cutting findings

C1. S1 and S4 contradict each other on bypass representability. S1: "the leak
is impossible at the gate." S4 mutation (a): "a code path that passes the full
graph to the client payload builder, bypassing the gate." If bypass can be
written, S1's "impossible" is false and S1's real content is a licensing
discipline whose enforcement is S4's suite. If bypass cannot be written,
mutation (a) is uninjectable and S4's headline case is vacuous. Resolution:
pick the structural reading. Make the raw graph type unnameable outside the
gate module so channel code can only touch gate-projected views; then S4's
mutation (a) becomes "attempt to write an unlicensed bind in test code," which
must fail at compile time. Rewrite both tests to assert the structural
property, not fixture behavior.

C2. The grounding does not instantiate the survivor. Instance 1's actual fix,
"pass only public objects and relationships to SiteClient," is per-channel
call-site filtering. The cut list rejects exactly this: "Render-time field
stripping per template: cut. It patches one output channel." The real fix is a
member of the cut class, not of S1. The survivors are therefore specified
against an architecture that does not exist yet. Every test should run against
the production pipeline, or S4's fixture-fidelity assertion becomes the
load-bearing test of the whole set.

C3. The fixture-behavioral pattern. All four tests verify behavior on a fixed
fixture; none verifies the structural property the mechanism claims
(unbypassability for S1, marking-authority soundness for S2, no-unfiltered-path
for S3, mutation coverage of the channel inventory for S4). Every
strengthening proposed above has the same shape: promote the test from
behavioral-on-fixture to structural-property. Suggested standing rule for the
challenge: a survivor's test must include a property-removal mutant, a variant
of the system where the structural property is removed but fixture behavior is
preserved, which the test must fail.

C4. Unmapped composition dependencies. S1's #6 depends on S2's marking
correctness (S1 Attack 2). S1's enforcement depends on S4's suite (C1). S3's
"any HP output channel" inherits S1's channel-inventory problem. S4's #6
depends on fixture fidelity, which is #4, a class no survivor claims. A silent
failure in any dependency voids the dependent's claim with no test failing.
Each dependent's test should include a dependency-failure injection: S1's test
with a wrong marking, S3's test with an incomplete channel list, S4's test
with a drifted fixture.

---

## The five open questions, mapped to attacks

1. Owner preview vs public license: S1 Attack 5 (preview token as a bearer
   credential in an ungoverned channel), S3 Attack 2 (mint-time substitution),
   S3 Attack 3 (preview/public cache-key confusion). The question is
   load-bearing for both survivors; neither test touches preview.
2. Who may mark fields public-visible: S2 Attack 1. This is the strongest
   single falsification in the set: the test's pass condition is the
   attacker's path, and the marking authority is unspecified, so S2's
   preventive boundary is unspecified.
3. Shared-observation precedence: S2 Attack 4 (A's marking changes B's
   rendering), S3 Attack 7 (revision history). No survivor states a precedence
   rule or a two-tenant test.
4. Ask FYD through the same gate: S1's test channel list omits tool-call
   arguments even though the mechanism claims Ask FYD context; S3 Attack 5
   (shared retrieval index, uninspected query); S4 has no Ask FYD mutation. The
   next Pergola-shaped leak most likely lives here.
5. Mutation-set maintenance: S4 Attack 1. Proposed structural answer: derive
   the mutation set from the channel registry and fail the suite on any channel
   without a mutation.

---

## Bottom line

No survivor falls outright: each prevents its canonical fixture shape, and
several test clauses (S1's silent-skip-is-failure, S2's no-silent-diff rule,
S4's determinism double-run) are genuinely well designed. But no survivor
withstands either: every test verifies behavior on a fixed fixture while the
claimed property is structural, every test's threat list is frozen at 2026
channels, and the realistic failures (authorized-but-wrong marking,
confused-deputy reads, novel channels, variant-space URLs) pass every test as
written. Verdicts: S1 WEAKENED, S2 WEAKENED, S3 WEAKENED, S4 WEAKENED, with the
specific lost ground named per survivor above. The single highest-value repair
is C1's resolution: make the gate structural (unnameable raw graph type) and
re-derive S1's and S4's tests from that property. The second is S4's
registry-derived mutation set, which is also the structural answer to open
question 5.
