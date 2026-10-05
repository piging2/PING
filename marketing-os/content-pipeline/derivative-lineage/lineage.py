"""Derivative lineage compiler (MarketingOS content pipeline, idea #8).

Binding source: Nolan's 2026-10-01 content directive: "Preserve ONE canonical
technical artifact. All videos, shorts, posts, diagrams, articles and emails
are lineage-linked derivatives of its claims/evidence."

Core invariants:
  - Every derivative inherits the same claim IDs from the canonical artifact.
  - A derivative may OMIT a claim; it may NEVER silently strengthen one.
  - REFUTED claims must be excluded or explicitly labeled refuted.
  - A stale (state-changed) claim must be traceable to every derivative
    that carries it, so each can be re-verified or withdrawn.

Stdlib only. Pure deterministic functions over dict/JSON. No network, no DB,
no new authorities or stores. This module is machinery, not an authority:
it compiles and checks, it never publishes or decides truth.

Epistemic strength ordering (weakest to strongest):

    REFUTED < UNKNOWN < INFERRED < PARTIALLY_SUPPORTED < CONFIRMED

Documented rationale:
  - REFUTED is weakest: the canonical record holds an active denial. Any
    prose that treats the claim as live, even as "unknown", is an upgrade,
    because it silently drops the refutation. This is why restating a
    REFUTED claim as UNKNOWN is a STRENGTHENED_CLAIM violation.
  - UNKNOWN is zero support: honest ignorance, no positive signal.
  - INFERRED is indirect support: reasoned from other evidence, not observed.
  - PARTIALLY_SUPPORTED is direct but incomplete support: observed yet
    limited (sample size, scope, replication).
  - CONFIRMED is full support: observed, reproduced, or otherwise directly
    established at the canonical artifact's bar.

A derivative's restated state must never sit ABOVE the canonical state's
position in this ordering. Restating WEAKER (hedging) is always allowed.
"""

import hashlib
import json

# Weakest to strongest. Position in this tuple is the epistemic strength.
STRENGTH_ORDER = ("REFUTED", "UNKNOWN", "INFERRED", "PARTIALLY_SUPPORTED", "CONFIRMED")

KINDS = ("video", "short", "post", "diagram", "article", "email")

_STRENGTH = {state: rank for rank, state in enumerate(STRENGTH_ORDER)}


def strength(state):
    """Numeric strength rank of a state. Higher = stronger claim."""
    if state not in _STRENGTH:
        raise ValueError("unknown state: %r (expected one of %s)" % (state, STRENGTH_ORDER))
    return _STRENGTH[state]


def _canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def spec_digest(spec):
    """Deterministic sha256 digest of a derivative spec (or any JSON value)."""
    return hashlib.sha256(_canonical_json(spec).encode("utf-8")).hexdigest()


def _index_claims(canonical):
    """Index canonical claims by id; raises ValueError on malformed input."""
    if not isinstance(canonical, dict):
        raise ValueError("canonical must be a dict")
    if not canonical.get("artifact_id"):
        raise ValueError("canonical must carry artifact_id")
    claims = canonical.get("claims")
    if not isinstance(claims, list):
        raise ValueError("canonical must carry claims list")
    index = {}
    for claim in claims:
        if not isinstance(claim, dict) or not claim.get("id"):
            raise ValueError("every claim must be a dict with an id")
        if claim["id"] in index:
            raise ValueError("duplicate claim id in canonical: %r" % (claim["id"],))
        state = claim.get("state")
        if state not in _STRENGTH:
            raise ValueError(
                "claim %r has unknown state %r (expected one of %s)"
                % (claim["id"], state, STRENGTH_ORDER)
            )
        index[claim["id"]] = claim
    return index


def _violation(code, claim_id, **detail):
    v = {"code": code, "claim_id": claim_id}
    v.update(detail)
    return v


def register_derivative(canonical, spec):
    """Compile and validate a derivative of the canonical artifact.

    canonical: {artifact_id, digest, claims: [{id, text, state}]}
    spec: {derivative_id, kind in {video, short, post, diagram, article, email},
           included_claim_ids: [claim_id],
           restated_states: {claim_id: state} (optional; defaults to canonical)}

    Validation:
      (1) every included claim id must exist in the canonical artifact;
      (2) no restated state may be stronger than the canonical state
          (strengthening = violation); weaker restatements are allowed;
      (3) a REFUTED claim must be excluded, or included only with its
          refutation explicitly restated (restated state == REFUTED).

    Returns a derivative record:
      {derivative_id, kind, claim_ids, effective_states, canonical_id,
       canonical_digest, spec_digest, violations}.
    An empty violations list means the derivative registered clean.
    """
    violations = []
    if not isinstance(spec, dict):
        raise ValueError("spec must be a dict")

    derivative_id = spec.get("derivative_id")
    if not derivative_id:
        raise ValueError("spec must carry derivative_id")
    kind = spec.get("kind")
    if kind not in KINDS:
        violations.append(_violation("INVALID_KIND", None, kind=kind, allowed=list(KINDS)))

    included = spec.get("included_claim_ids")
    if not isinstance(included, list):
        raise ValueError("spec must carry included_claim_ids list")
    restated = spec.get("restated_states") or {}
    if not isinstance(restated, dict):
        raise ValueError("spec restated_states must be a dict")

    for claim_id, state in restated.items():
        if state not in _STRENGTH:
            violations.append(
                _violation("INVALID_RESTATED_STATE", claim_id, restated_state=state,
                           allowed=list(STRENGTH_ORDER))
            )

    seen = set()
    for claim_id in included:
        if claim_id in seen:
            violations.append(_violation("DUPLICATE_CLAIM_ID", claim_id))
        seen.add(claim_id)

    claim_index = _index_claims(canonical)

    claim_ids = []
    effective_states = {}
    for claim_id in included:
        canonical_claim = claim_index.get(claim_id)
        if canonical_claim is None:
            violations.append(_violation("UNKNOWN_CLAIM_ID", claim_id))
            continue
        canonical_state = canonical_claim["state"]
        restated_state = restated.get(claim_id, canonical_state)
        if claim_id not in claim_ids:
            claim_ids.append(claim_id)
        effective_states[claim_id] = restated_state

        # Rule (3): REFUTED claims must be excluded or explicitly labeled refuted.
        # Explicit labeling = restated as REFUTED in the derivative.
        if canonical_state == "REFUTED" and restated_state != "REFUTED":
            violations.append(
                _violation(
                    "REFUTED_CLAIM_INCLUDED", claim_id,
                    canonical_state=canonical_state, restated_state=restated_state,
                    guidance="exclude this claim or restate it as REFUTED",
                )
            )
        # No continue here: a refuted claim included without its refuted label
        # is ALSO a strengthening whenever the restated state outranks REFUTED
        # (e.g. REFUTED -> UNKNOWN silently drops the denial). Both fire.

        # Rule (2): never silently strengthen. Weaker restatement is allowed.
        if restated_state not in _STRENGTH:
            continue  # already flagged as INVALID_RESTATED_STATE
        if strength(restated_state) > strength(canonical_state):
            violations.append(
                _violation(
                    "STRENGTHENED_CLAIM", claim_id,
                    canonical_state=canonical_state, restated_state=restated_state,
                    guidance="restatement is stronger than canonical state",
                )
            )

    claim_ids.sort()

    return {
        "derivative_id": derivative_id,
        "kind": kind,
        "claim_ids": claim_ids,
        "effective_states": effective_states,
        "canonical_id": canonical.get("artifact_id"),
        "canonical_digest": canonical.get("digest"),
        "spec_digest": spec_digest(spec),
        "violations": violations,
    }


def _record_claim_ids(record):
    """Accept either a registered derivative record or a raw spec."""
    if "claim_ids" in record:
        return record["claim_ids"]
    return record.get("included_claim_ids", [])


def trace_stale_claim(canonical, claim_id, new_state, derivatives):
    """Trace a state-changed claim to every derivative that must be revisited.

    canonical: current canonical artifact (used to read the old state).
    claim_id: the claim whose epistemic state changed.
    new_state: the new state (must be a known state).
    derivatives: iterable of derivative records (from register_derivative)
        or raw derivative specs ({derivative_id, included_claim_ids}).

    Returns:
      {claim_id, old_state, new_state, direction, affected_derivative_ids,
       affected_count}
    where direction in {"strengthened", "weakened", "unchanged", "unknown"}.
    """
    if new_state not in _STRENGTH:
        raise ValueError("new_state %r not in %s" % (new_state, STRENGTH_ORDER))
    claim_index = _index_claims(canonical)
    old_state = claim_index[claim_id]["state"] if claim_id in claim_index else None

    affected = sorted(
        r["derivative_id"] for r in derivatives if claim_id in _record_claim_ids(r)
    )

    if old_state is None:
        direction = "unknown"
    elif strength(new_state) > strength(old_state):
        direction = "strengthened"
    elif strength(new_state) < strength(old_state):
        direction = "weakened"
    else:
        direction = "unchanged"

    return {
        "claim_id": claim_id,
        "old_state": old_state,
        "new_state": new_state,
        "direction": direction,
        "affected_derivative_ids": affected,
        "affected_count": len(affected),
    }
