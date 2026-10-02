# INTEGRATION REQUEST: lane SOC → lane N (data lineage)

**From:** lane SOC (public-social fabric), 2026-09-23
**Request:** extend the queryable lineage chain to cover public-surface projections.

Current chain (lane N): SOURCE → OBSERVATION → EVIDENCE → OBJECT → SITE SECTION → ANSWER → ACTION.

**Requested extension:** OBJECT → PUBLIC SURFACE (draft) as a named leg, where
each rendered claim line carries its own bindings:

```
ClaimLine { text, grade: ConciergeGrade, fields: [canonical field paths], evidence: {label, source, basis, ref} }
```

This is the same evidence-binding primitive lane G's concierge uses for answers
(AskEvidenceRef / claim classifications); the fabric reuses that vocabulary so
lineage stays one vocabulary end to end (no second claim system — DUP convergence).

**Answered queries the extension unlocks:**
- "Why does this page post say that?" → claim → object fields → evidence → source.
- "If this object field changes, which public drafts are stale?" (joins lane O's index leg).
- "Was this claim ever published without a binding?" → the projector refuses to emit it; lineage records the refusal.

**Boundary:** lineage records DRAFT projections and their refusals. Publication is
a separate human-gated decision outside lineage; the fabric never emits a publish intent.
