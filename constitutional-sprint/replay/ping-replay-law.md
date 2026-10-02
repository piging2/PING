# REPLAY LAW

**Status:** FROZEN CONSTITUTIONAL AUTHORITY
**Scope:** Replay determinism and reconstruction law only. No implementation details.
**Root Law:** TRUTH_LAW.md (replay produces derived truth, not constitutional truth)
**Date:** 2026-06-24 (formalized)

---

# FORMAL REPLAY SEMANTICS

## Constitutional Invariants

```yaml
replay:
  deterministic:
    required: true
  exact_reconstruction:
    required: true
  divergence:
    constitutional_incident: true
  forking:
    prohibited: true
  partial_replay:
    verification:
      permitted: true
    authoritative_state:
      prohibited: true
  state_derivation:
    deterministic_only: required
    non_deterministic_derivation: prohibited
    external_dependencies: prohibited
```

## Constitutional Principles

```
Replay may be partial ONLY for verification.
Replay may NOT produce authoritative truth from partial execution.
Partial replay may verify truth.
Partial replay may NOT produce truth.
Replay produces derived truth, not constitutional truth.
Constitutional truth = immutable verified event (TRUTH_LAW.md).
```

---

# CONSTITUTIONAL REPLAY SEMANTICS

## Axiom 1 — Replay Determinism

**AXIOM:** Replay must be deterministic. Identical event stream must always produce identical state.

**RATIONALE:** Without deterministic replay, constitutional truth cannot be verified, state cannot be reconstructed, and integrity cannot be guaranteed.

**VIOLATION CONSEQUENCE:** Replay divergence is a constitutional incident.

---

# REPLAY DETERMINISM

## Constitutional Requirement

Deterministic reconstruction requires sufficient information to:
1. Reproduce every identity assignment under declared law
2. Traverse every lineage edge in recorded order
3. Replay every event occurrence in constitutional order
4. Re-evaluate every policy decision under the policy law active at each boundary
5. Verify every persisted witness without external mutable reference
6. Produce identical state projection at any declared boundary

---

# MINIMUM REPLAY SET

| Element | Constitutional Justification |
|---------|------------------------------|
| **Complete event sequence** | Axiom 3 — history is append-only events; without total ordering of occurrences, constitutional time is undefined |
| **Artifact content or content-addressed retrievals for all referenced identities** | Axiom 1 — identity is content-derived; reconstruction cannot resolve artifacts without content |
| **Identity law version for each era** | Axiom 1 — identity determinism is versioned law, not implicit convention |
| **Complete lineage edge set** | Axiom 2 — ancestry is constitutional fact; state without lineage is ungrounded |
| **Policy law version for each era** | Axiom 5 — mutations require policy; replay must re-derive authorization, not assume it |
| **Recorded policy decisions** | Axiom 5 — dispositions are facts, not recomputable opinions without recorded judgment context |
| **Claim records and dispositions** | Links propositional intent to authorized mutations; legitimacy chain is not inferable from events alone |
| **Actor identity for each event** | Agency and authority chains require knowing who acted |
| **Persisted witness attestations (when recorded)** | Axiom 8 — attestations are part of the integrity substrate when durably recorded |
| **Declared reconstruction boundary** | Axiom 4 — determinism is bounded to a point in constitutional time |

---

# EXPLICIT EXCLUSIONS FROM MINIMUM REPLAY SET

- State projections (derived)
- Ephemeral caches and agent context (non-constitutional)
- Narrative summaries (non-authoritative)
- Transport metadata not recorded as constitutional events
- Implementation-specific storage coordinates

---

# REPLAY CONSTRAINTS

## Determinism Constraints

Replay MUST be:
- **Deterministic:** Same inputs → same outputs
- **Pure:** No side effects during reconstruction
- **Infrastructure-independent:** No network IO, no clock dependence
- **Transport-independent:** No HTTP, no protocol dependencies
- **Provider-independent:** No external provider dependencies

Replay MUST NEVER depend on:
- Live databases
- Mutable APIs
- Network timing
- Current clocks
- External providers
- Runtime side effects

---

## Reconstruction Boundaries

Replay MUST support reconstruction at any declared boundary:
- Event index
- Policy version boundary
- Identity law version boundary
- Custom constitutional time marker

Replay MUST produce identical state projections for identical boundaries.

---

## Integrity Verification

Replay MUST verify:
- Lineage acyclicity
- Identity consistency
- Policy decision validity
- Witness attestation correctness
- Invariant satisfaction

Replay MUST detect:
- Divergence from expected state
- Invalid lineage edges
- Missing required facts
- Violated invariants

---

# REPLAY PROOF

## Witness Generation

Witness generation MUST:
- Use minimum replay set as input
- Apply deterministic canonicalization
- Compute deterministic fingerprint
- Verify lineage integrity
- Reconstruct state deterministically
- Generate witness root via Merkle tree

Witness MUST be:
- Deterministic: same inputs → same witness
- Pure: no side effects
- Infrastructure-independent: no external dependencies
- Verifiable: can be recomputed independently

---

## Witness Verification

Witness verification MUST:
- Recompute witness from minimum replay set
- Compare with persisted witness
- Detect divergence
- Report violations deterministically

Witness verification MUST NOT depend on:
- External mutable state
- Network services
- Current timestamps
- Runtime configuration

---

# REPLAY FAILURE SEMANTICS

## Failure Classification

Replay failures MUST be deterministic:
- **INVALID_EVENT_STREAM:** Event stream cannot be parsed or is malformed
- **INVALID_EVENT_ORDER:** Events violate constitutional ordering
- **INVALID_LINEAGE:** Lineage contains cycles or duplicate edges
- **IDENTITY_DIVERGENCE:** Identity does not match content under declared law
- **POLICY_VIOLATION:** Mutation lacks required policy authorization
- **INVARIANT_VIOLATION:** Reconstructed state violates invariant
- **WITNESS_DIVERGENCE:** Witness does not match recomputed witness

## Failure Handling

Replay MUST:
- Fail deterministically with structured failure codes
- Never throw generic errors
- Provide sufficient context for diagnosis
- Allow replay to be re-executed for verification

---

# REPLAY VERSIONING

## Version Requirements

Replay MUST version:
- Replay algorithm version
- Identity law version
- Policy law version
- Invariant version
- Canonicalization version

Version changes MUST:
- Be recorded in event stream
- Be traceable in minimum replay set
- Be verifiable in witness generation

---

# FORMAL REPLAY SEMANTICS

## Replay Determinism

**Requirement:** Replay must be deterministic

**Definition:** Identical event stream must always produce identical state

**Constitutional Constraint:**
```yaml
replay:
  deterministic:
    required: true
  exact_reconstruction:
    required: true
  divergence:
    constitutional_incident: true
```

**Violation:** Replay divergence is a constitutional incident

---

## Exact Reconstruction

**Requirement:** Replay must produce exact reconstruction

**Definition:** State at any boundary must be identical across all replay executions

**Constitutional Constraint:**
```yaml
replay:
  exact_reconstruction:
    required: true
  state_identicality:
    required: true
  boundary_reproducibility:
    required: true
```

**Violation:** State divergence is a constitutional incident

---

## Replay Divergence

**Definition:** Replay produces different state from expected state

**Constitutional Consequence:** Constitutional incident

**Divergence Types:**
- Identity divergence (identity assignment differs)
- State divergence (state projection differs)
- Witness divergence (witness hash differs)
- Lineage divergence (lineage edges differ)

**Remediation Required:**
1. Identify divergence point
2. Investigate cause
3. Fix constitutional violation
4. Re-run replay
5. Verify convergence

---

## Forking Prohibition

**Definition:** Replay forking is prohibited

**Constitutional Constraint:**
```yaml
replay:
  forking:
    prohibited: true
  single_truth_line:
    required: true
  alternative_histories:
    prohibited: true
```

**Rationale:** Forking creates alternative constitutional truths, violating single source of truth principle

**Violation:** Replay forking is a constitutional incident

---

## Partial Replay

**Definition:** Replay may be partial for verification only

**Constitutional Constraint:**
```yaml
partial_replay:
  verification:
    permitted: true
  authoritative_state:
    prohibited: true
  truth_production:
    prohibited: true
```

**Verification-Only Replay:**
- May replay subset of events for verification
- May NOT produce authoritative state from partial replay
- May NOT create truth from partial execution
- Result is verification status, not constitutional truth

**Prohibited:**
- Partial replay producing authoritative state
- Partial replay creating constitutional truth
- Partial replay for state reconstruction

**Constitutional Principle:**
```
Partial replay may verify truth.
Partial replay may NOT produce truth.
```

---

## State Derivation

**Definition:** State derivation must be deterministic only

**Constitutional Constraint:**
```yaml
state_derivation:
  deterministic_only:
    required: true
  non_deterministic_derivation:
    prohibited: true
  external_dependencies:
    prohibited: true
```

**Prohibited:**
- Non-deterministic state derivation
- External dependency during state derivation
- Network calls during state derivation
- Clock dependence during state derivation

**Required:**
- Pure functions for state derivation
- Deterministic computation only
- No side effects during derivation

---

# REPLAY FAILURE SEMANTICS

## Failure Classification

Replay failures MUST be deterministic:
- **INVALID_EVENT_STREAM:** Event stream cannot be parsed or is malformed
- **INVALID_EVENT_ORDER:** Events violate constitutional ordering
- **INVALID_LINEAGE:** Lineage contains cycles or duplicate edges
- **IDENTITY_DIVERGENCE:** Identity does not match content under declared law
- **POLICY_VIOLATION:** Mutation lacks required policy authorization
- **INVARIANT_VIOLATION:** Reconstructed state violates invariant
- **WITNESS_DIVERGENCE:** Witness does not match recomputed witness
- **REPLAY_DIVERGENCE:** Replay produces different state from expected state
- **FORKING_DETECTED:** Replay forking detected

## Failure Handling

Replay MUST:
- Fail deterministically with structured failure codes
- Never throw generic errors
- Provide sufficient context for diagnosis
- Allow replay to be re-executed for verification
- Open constitutional incident on divergence

## Constitutional Incident

**Trigger Conditions:**
- Replay divergence
- Witness divergence
- Identity divergence
- State divergence
- Forking detected

**Incident Response:**
1. Stop replay
2. Open constitutional incident
3. Investigate cause
4. Fix constitutional violation
5. Re-run replay
6. Verify convergence

---

**Document ID:** CONSTITUTION-REPLAY-LAW-1.0
**Status:** FROZEN
**Amendment:** Requires constitutional amendment process
