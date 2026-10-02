# Edge outcomes

The edge-outcomes compiler answers one question per candidate edge: what
happened to it. No candidate is ever silently dropped: every well-formed
candidate gets exactly one outcome, and unknown shapes throw (fail
closed).

## The outcome enum

Seven outcomes, 1:1 with the CEO's seven (kebab-case for the two-word
ones). Each outcome names the lifecycle stage where the candidate
stopped, plus a one-line human reason and a `via` pointer (binding id,
winning candidate id, or null).

| Outcome | Stage | Meaning |
|---|---|---|
| `accepted` | rendered | The edge projected into a section binding and renders. |
| `unresolved` | observed | Observed but unresolved: no evidenceRef and no observationRef, so the fact cannot be traced to evidence. |
| `ambiguous` | observed | Observed but unresolved: two candidate predicates assert the same fact and the evidence cannot disambiguate. More evidence needed. |
| `duplicate` | resolved | Resolved, but the same canonical fact was already accepted via another candidate. The canonical forward form (employs, has_member) wins; the inverse is the duplicate. No double-count. |
| `unsupported` | filtered or projected | Resolved, but no supported path: a private endpoint (filtered), an ineligible component (filtered), or no planner binding consumes the predicate (projected). |
| `policy-suppressed` | projected | Bound into a section, but an honored owner operating constraint removes that component. Projected but never rendered. |
| `schema-rejected` | resolved | Observed but unresolved: illegal predicate or dangling endpoint. |

## The stage model

```
OBSERVED -> RESOLVED -> FILTERED -> PROJECTED -> RENDERED
```

A candidate dies at exactly one stage. Gates, in order:

1. **Shape gate** (throws, never silent): id, subject, predicate, object
   must be non-empty strings; candidate ids must be unique.
2. **Observed gate**: no evidenceRef and no observationRef -> `unresolved`.
3. **Ambiguity gate**: two distinct non-inverse-equivalent predicates for
   the same ordered (subject, object) pair -> `ambiguous` for all of them.
4. **Resolve gate**: predicate outside the schema vocabulary, or an
   endpoint missing from the verified graph -> `schema-rejected`.
5. **Duplicate gate**: the canonical fact (inverse pairs normalized to the
   forward form) was already accepted -> `duplicate`.
6. **Visibility filter**: a private endpoint -> `unsupported`.
7. **Project gate**: no planner binding consumes the predicate (either
   direction, mirroring the generator) -> `unsupported`.
8. **Eligibility filter**: the bound component is not eligible ->
   `unsupported`.
9. **Policy gate**: an honored owner operating constraint removes the
   bound component -> `policy-suppressed`.
10. Otherwise -> `accepted`.

Processing order is canonical (forward form first, then id order);
outcomes are emitted sorted by candidate id. Deterministic.

Inverse pairs mirror the object builder's derivation rules
(`works_for`-inverse-`employs`, `member_of`-inverse-`has_member`): the
forward form is what the generator traverses, so an explicit forward
edge always wins over its inverse. The predicate vocabulary mirrors
`LEGAL_PREDICATES` in `builder/object-builder.ts` (that file is the
authority). Operating constraints resolve through the same table the
planner honors (`builder/owner-intent.ts`); unknown constraints are
recorded, never applied.

## Employment re-run results

Synthetic graph: biz-1 (public business), person-1 (public person),
person-2 (private person), post-1 (public post), one attested
relationship (person-1 works_for biz-1). People is eligible (team count
1). Binding under test: `home:People:0` (component People).

| # | Candidate edge | Outcome | Stage | Reason |
|---|---|---|---|---|
| a | person-1 works_for biz-1 | accepted | rendered | bound into "People" via binding "home:People:0": renders |
| b | biz-1 employs person-1 | accepted | rendered | bound into "People" via binding "home:People:0": renders |
| c | both directions present | employs accepted; works_for duplicate | rendered / resolved | same fact as accepted candidate "cand-c2" (canonical "biz-1 employs person-1"): inverse form, no double-count |
| d | person-1 works_for biz-gone | schema-rejected | resolved | dangling object "biz-gone": no object with that id in the verified graph |
| e | person-1 manages biz-1 | schema-rejected | resolved | illegal predicate "manages": outside the schema vocabulary the planner can reason over |
| f | person-1 works_for biz-1, owner constraint "no-people" | policy-suppressed | projected | bound into "People" via binding "home:People:0" but owner operating constraint "no-people" removes the component: projected, never rendered |
| g | biz-1 employs person-2 (private) | unsupported | filtered | object "person-2" is private: the fact cannot be used as evidence or rendered |
| h | person-1 works_for biz-1 AND person-1 member_of biz-1 | ambiguous (both) | observed | candidate predicates "member_of" and "works_for" assert the same fact ("person-1", "biz-1"): evidence cannot disambiguate, more evidence needed |
| i | person-1 works_for biz-1, no refs | unresolved | observed | no evidenceRef and no observationRef: the fact was observed but cannot be traced to evidence |
| j | biz-1 publishes post-1 (no binding) | unsupported | projected | no planner binding consumes predicate "publishes": schema-legal but no section can present the fact |
| k | person-1 works_for biz-1, People ineligible | unsupported | filtered | component "People" is not eligible: team count 0 |

CEO's four questions, answered per edge:

- a, b: projected and rendered. Not never-observed, not observed-but-unresolved, not resolved-but-filtered, not projected-but-not-rendered.
- c: the accepted edge projected and rendered; the duplicate resolved and was superseded (resolved but never projected, no double-count).
- d, e: observed but unresolved (failed the resolve gate).
- f: projected but not rendered (owner constraint removed the component).
- g, k: resolved but filtered (visibility / eligibility).
- h, i: observed but unresolved (needs evidence / untraceable).
- j: schema-legal, reached projection, but no section can present it.
- Never observed: a fact with no candidate (person-2 with zero evidence) gets no outcome; the compiler invents nothing.

## Open questions

1. **Intake shape**: candidates today are hand-built proposals. When the
   real intake seam emits them, the `observationRef` contract (what counts
   as a traceable observation) needs pinning, or the `unresolved` gate
   will fire on legitimate intake.
2. **Binding source**: the compiler takes planner bindings as input. If
   the planner's binding manifest drifts from the generator's predicate
   match sets, `unsupported` at projected becomes a false negative. A
   cross-check between the two match sets would close that.
3. **LEGAL_PREDICATES duplication**: the vocabulary is copied from
   `builder/object-builder.ts` because that constant is not exported.
   Exporting it from the builder would remove the drift risk (not done:
   out of this lane's write scope).
