# education-formats

The one machinery item in the 90-item corpus not covered by the 12 pipeline
primitives: seven deterministic education projection formats for business
objects, from the 2026-10-04 projection-plane directive
("EDUCATION IS ANOTHER PROJECTION").

The formats: EXPLANATION, COMPARISON, TIMELINE, PROCESS DIAGRAM, FAQ,
TUTORIAL, CONCEPT MAP. An object projected as "What is a heat pump?" or
"How does installation work?" is still the same underlying Service object;
education is a projection of it, not a separate product architecture.

## What it is

`formats.py` compiles a business-object dict plus a bindings dict into a
projection intermediate representation (IR). A binding is
`binding_id -> {object_id, field_path, evidence_refs, claim_class}`: the
value is read from the object at `field_path`, the claim class is preserved
verbatim from the binding. `FORMAT_REGISTRY` holds all seven formats with
name, description, input contract, output contract, and the pure
`compile_<format>` function. `compile_format(key, obj, bindings)` dispatches
by registry key. `formats.json` is the human-readable spec; `test_formats.py`
is the pytest suite.

## The boundary (read this first)

This module is a **derived projection**, never an authority:

- Every output declares `projection_kind: DERIVED` and `canonical: false`.
- Every factual field must resolve through a valid binding. No binding, no
  value: the field degrades honestly to
  `{"value": null, "status": "UNBOUND", "claim_class": "UNKNOWN"}` with a
  machine-readable reason. The gap is shown, never filled with an invented
  fact.
- Generated copy sections always carry `claim_class: GENERATED_SUMMARY`.
  Copy is templated deterministically from bound values only; this pipeline
  cannot write facts the bindings do not supply.
- Claim classes (DIRECT_EVIDENCE, DERIVED, OWNER_ASSERTED,
  GENERATED_SUMMARY, INFERENCE, UNKNOWN) are preserved verbatim. They are
  labels, never flattened to a confidence number.
- **GENERATE != PUBLISH.** Compiling a projection does not publish it.
  Publishing requires a proposed canonical object transition, which this
  module cannot perform. There is no publish function here, by design.

## How it composes with the 12 pipeline primitives

The module consumes and feeds the existing primitives; it replaces none:

- **source-packet**: bindings reference source packets via `evidence_refs`.
  The packet is where evidence lives; the binding is where a projection
  value points at it.
- **claim-ledger**: bound factual nodes are ledger-ready (claim text +
  evidence_refs + verbatim class). The ledger's certainty-phrase guard
  applies to any prose later built from these projections.
- **epistemic-metadata**: claim classes flow through projections unchanged,
  so downstream grading and attribution see the same epistemics the binding
  declared.
- **derivative-lineage**: a compiled projection is a derivative; its
  lineage records source_object_id, format, and the bindings used.
- **edit-classifier / adversarial-review / prior-art**: generated-copy
  sections are the reviewable surface (labeled GENERATED_SUMMARY, easy to
  challenge); factual nodes are checkable against their field_paths.
- **production-manifest / distribution-package / video-verification /
  marker-metrics / content-features**: projections enter production only
  through the manifest and packaging machinery, never directly from this
  compiler.

## Running the tests

```
python3 -m pytest test_formats.py -q
```

All examples in tests and docs are synthetic ("Example Plumbing Co.") or
marked ILLUSTRATIVE. No real business facts are asserted.
