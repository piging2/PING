# Proof 2 comparison: same machinery, different graph

Proof 1 (Happy Place Carpentry LLC, Adair Village OR) and proof 2
(Coppersmith Plumbing & HVAC, Grand Junction CO) both run the IDENTICAL
`runSlice()` from `packages/sitespec/src/pipeline.ts`. No branches, no
per-business special cases, no Coppersmith-specific code anywhere in the
pipeline or the test. Every difference below is a pure function of the
different input graph.

## Input graphs (captured records, machine-generated, website_statement)

|                 | Happy Place (proof 1)                  | Coppersmith (proof 2)                        |
| --------------- | -------------------------------------- | -------------------------------------------- |
| Business        | Happy Place Carpentry LLC              | Coppersmith Plumbing - HVAC - Mechanical     |
| Source          | https://happy-place-platform.vercel.app/ | https://www.coppersmithplumbing.com/       |
| Objects         | 7 (business, location, 5 services)     | 8 (business, ext profile, location, person, 4 services) |
| Services        | Repairs, Fencing, Painting, Drywall, Restoration | Plumbing, Heating & Cooling, HVAC, Ventilation |
| Location        | Adair Village, OR, US                  | Grand Junction, Colorado, 81501, US          |

The Coppersmith capture carries two object kinds Happy Place lacks: an
`ext` external-profile object (`coppersmithplumbing.com`) and a `person`
object (`coppersmithplm`). Everything the pipeline does with them goes
through the same query seam as every other object.

## Pipeline outputs (observed, asserted in the tests)

|                 | Proof 1 | Proof 2 |
| --------------- | ------- | ------- |
| Evidence records| 55      | 60      |
| Spec pages      | home, about, services, explore | home, about, services, explore |
| Sections        | 12      | 14      |
| Projected objects (anonymous) | 7 | 8    |
| Bindings        | 14/14   | 14/14   |
| Evidence coverage | 1.0   | 1.0     |

## Why the output differs (no special cases)

- The page set is IDENTICAL (home/about/services/explore) because the
  SiteSpec compiler derives pages from graph structure, and both graphs
  share the same structural shape (business + services + location).
  Structure in, structure out.
- The record/section/object counts differ because they are functions of
  graph CONTENT: 8 objects instead of 7 yields 60 evidence records
  instead of 55, 14 sections instead of 12. The same binding machinery
  binds every factual claim in both cases (14/14), and the evidence
  coverage product metric is 1.0 for both.
- The render model differs (different canonical bytes, different
  modelDigest) because it embeds the business's own titles, descriptions,
  and services. Determinism holds WITHIN each graph: same input graph
  always produces the same digest (asserted by the determinism test).
- The fail-closed behavior is the same check in both proofs: strip any
  object's `provenance.ref` and `runSlice` throws
  `BindingVerificationError` ("Binding verification refused") instead of
  emitting an unbound claim. The truth boundary does not know which
  business it is guarding.

Proof 2 verdict: the pipeline is business-agnostic. Feed it a different
captured record and it produces an explainably different experience with
the same guarantees (attested evidence, verified bindings, deterministic
render model), which is exactly what the proof was required to show.
