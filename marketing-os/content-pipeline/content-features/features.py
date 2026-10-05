"""Computed content features (idea #9, recommend-only).

Nolan's binding 2026-10-01 content directive:
  "Introduce computed content features only, never authorities: SurpriseDensity,
   EvidenceStrength, Reproducibility, PracticalConsequence, AudienceFit,
   NoveltyClass and ExplanationCost. Scores recommend; they never publish."

  "SurpriseDensity as a computed feature (not an authority): surprising verified
   conclusions / reader attention required. Counterintuitiveness x Evidence
   Strength x Reproducibility x Practical Consequence x Novelty-to-Audience /
   Explanation Cost. Score = recommendation, never publication authority."

Every function here is a pure deterministic function over dict/JSON inputs
(stdlib only). The output carries an explicit advisory flag:
``recommendation_is_advisory=True`` and ``authorizes_publication=False``.
Scores RECOMMEND; they never authorize publication.

Artifact input schema (all inputs explicit; nothing is inferred):
  artifact = {
      "claims": [
          {"id": str,
           "state": "CONFIRMED" | "PARTIALLY_SUPPORTED" | "INFERRED"
                    | "UNKNOWN" | "REFUTED",
           "evidence_refs": [str, ...],       # supporting evidence pointers
           "counterevidence": [str, ...],     # preserved counterevidence
           "reproduction_grade": "R0".."R5"}, # R0 assertion only ... R5 independent reproduction
          ...
      ],
      "counterintuitiveness": float,  # 0..1, explicit rating of how much the
                                     # central claim violates expert intuition
      "practical_consequence": float, # 0..1, explicit rating of stakes if true
      "novelty_to_audience": float,   # 0..1, explicit rating of freshness to this audience
      "explanation_cost": int,        # 1..5, explicit rating of reader effort
                                     # required (1 = cheap, 5 = very expensive)
      "novelty_class": str,           # recorded class, passthrough:
                                     # "empirical" | "mechanistic" | "explanatory" | "unknown"
      "audience_signals": {
          "interests": [str, ...],          # what the audience cares about
          "intended_audience": [str, ...],  # who this artifact is for
      },
  }
"""

# --- Documented deterministic constants (advisory tuning, not authority) ---

# Epistemic state -> evidence weight. Never upgrades state; REFUTED contributes
# nothing, INFERRED counts for less than CONFIRMED.
STATE_WEIGHTS = {
    "CONFIRMED": 1.0,
    "PARTIALLY_SUPPORTED": 0.65,
    "INFERRED": 0.35,
    "UNKNOWN": 0.15,
    "REFUTED": 0.0,
}

# R0-R5 reproducibility grades (directive 2026-10-01) -> 0..1.
REPRODUCIBILITY_GRADES = {
    "R0": 0.0,  # assertion only
    "R1": 0.2,  # trace / screenshots
    "R2": 0.4,  # code / methodology disclosed
    "R3": 0.6,  # deterministic local reproduction
    "R4": 0.8,  # clean-environment reproduction
    "R5": 1.0,  # independent reproduction
}

# Recorded novelty classes (passthrough set).
NOVELTY_CLASSES = {"empirical", "mechanistic", "explanatory", "unknown"}

# Evidence saturation: how many evidence_refs saturate one claim's coverage.
_EVIDENCE_SATURATION_COUNT = 3
# Counterevidence dampening per counterevidence item.
_COUNTEREVIDENCE_DAMP = 0.5

# Recommendation thresholds on the advisory composite score.
# Note on scale: the directive's formula is multiplicative over five 0..1
# factors divided by a cost >= 1, so absolute scores compress hard: a
# near-perfect artifact at explanation cost 2 scores ~0.25-0.35, at cost 1
# ~0.5-0.65. Thresholds are calibrated to that natural range.
CANDIDATE_MIN_SURPRISE = 0.20
CANDIDATE_MIN_EVIDENCE = 0.40
WEAK_MIN_SURPRISE = 0.08
WEAK_MIN_EVIDENCE = 0.25


def _check_unit(name, value):
    """Validate an explicit 0..1 input; raise ValueError on violation."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("%s must be a number in [0, 1], got %r" % (name, value))
    value = float(value)
    if not 0.0 <= value <= 1.0:
        raise ValueError("%s must be in [0, 1], got %r" % (name, value))
    return value


def _check_cost(value):
    """Validate the explicit explanation-cost input (small int 1..5)."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("explanation_cost must be an int in [1, 5], got %r" % (value,))
    if not 1 <= value <= 5:
        raise ValueError("explanation_cost must be in [1, 5], got %r" % (value,))
    return value


def _claim_state_weight(claim):
    state = str(claim.get("state", "UNKNOWN")).upper()
    return STATE_WEIGHTS.get(state, STATE_WEIGHTS["UNKNOWN"])


def compute_evidence_strength(claims):
    """EvidenceStrength in [0, 1] from claim states + evidence counts.

    Per claim: state_weight * coverage * counterevidence_dampening, where
      coverage = min(len(evidence_refs), 3) / 3   (saturates at 3 refs)
      dampening = 1 / (1 + 0.5 * len(counterevidence))
    Result is the mean over claims; empty claim list -> 0.0.
    REFUTED claims contribute 0. INFERRED never upgrades to CONFIRMED weight.
    """
    claims = list(claims or [])
    if not claims:
        return 0.0
    total = 0.0
    for claim in claims:
        refs = claim.get("evidence_refs") or []
        counter = claim.get("counterevidence") or []
        coverage = min(len(refs), _EVIDENCE_SATURATION_COUNT) / float(_EVIDENCE_SATURATION_COUNT)
        dampening = 1.0 / (1.0 + _COUNTEREVIDENCE_DAMP * len(counter))
        total += _claim_state_weight(claim) * coverage * dampening
    return total / len(claims)


def compute_reproducibility(claims):
    """Reproducibility in [0, 1] from R0-R5 reproduction grades.

    Grade map: R0=0.0, R1=0.2, R2=0.4, R3=0.6, R4=0.8, R5=1.0.
    Missing/unrecognized grade -> R0 (0.0). Mean over claims;
    empty claim list -> 0.0.
    """
    claims = list(claims or [])
    if not claims:
        return 0.0
    total = 0.0
    for claim in claims:
        grade = str(claim.get("reproduction_grade", "R0")).upper()
        total += REPRODUCIBILITY_GRADES.get(grade, 0.0)
    return total / len(claims)


def compute_practical_consequence(artifact):
    """PracticalConsequence in [0, 1]: explicit input, validated, passthrough."""
    return _check_unit("practical_consequence", artifact.get("practical_consequence", 0.0))


def compute_audience_fit(artifact):
    """AudienceFit in [0, 1]: overlap of intended audience with audience interests.

    fit = |intended INTERSECT interests| / |intended| (case-insensitive).
    Empty intended_audience -> 0.5 (neutral; audience unknown, not a veto).
    """
    signals = artifact.get("audience_signals") or {}
    intended = [str(t).strip().lower() for t in (signals.get("intended_audience") or [])]
    interests = {str(t).strip().lower() for t in (signals.get("interests") or [])}
    if not intended:
        return 0.5
    hits = sum(1 for t in intended if t in interests)
    return hits / float(len(intended))


def compute_novelty_class(artifact):
    """NoveltyClass: passthrough of the recorded class, documented range.

    Range: one of {"empirical", "mechanistic", "explanatory", "unknown"}.
    Input is case-normalized; unrecognized input records as "unknown"
    (normalization of a record, not invention of a class).
    """
    raw = str(artifact.get("novelty_class", "unknown")).strip().lower()
    return raw if raw in NOVELTY_CLASSES else "unknown"


def compute_surprise_density(counterintuitiveness, evidence_strength,
                             reproducibility, practical_consequence,
                             novelty_to_audience, explanation_cost):
    """SurpriseDensity in [0, 1], the directive's formula sketch:

        SurpriseDensity = Counterintuitiveness x EvidenceStrength
                        x Reproducibility x PracticalConsequence
                        x Novelty-to-Audience / ExplanationCost

    All factors are explicit 0..1 inputs except explanation_cost, an explicit
    small int 1..5 (1 = cheap to explain, 5 = very expensive). Dividing by a
    cost >= 1 keeps the result in [0, 1]: cheap-to-explain surprises score
    highest; expensive-to-explain ones are discounted.
    """
    ci = _check_unit("counterintuitiveness", counterintuitiveness)
    es = _check_unit("evidence_strength", evidence_strength)
    rp = _check_unit("reproducibility", reproducibility)
    pc = _check_unit("practical_consequence", practical_consequence)
    nv = _check_unit("novelty_to_audience", novelty_to_audience)
    cost = _check_cost(explanation_cost)
    return (ci * es * rp * pc * nv) / float(cost)


def recommend(surprise_density, evidence_strength):
    """Advisory recommendation from the two headline features.

    Thresholds (documented, tunable, advisory only; calibrated to the
    multiplicative formula's compressed scale, see constants above):
      "candidate" if surprise_density >= 0.20 and evidence_strength >= 0.40
      "weak"      if surprise_density >= 0.08 or  evidence_strength >= 0.25
      "reject"    otherwise
    This RECOMMENDS. It never authorizes publication.
    """
    if surprise_density >= CANDIDATE_MIN_SURPRISE and evidence_strength >= CANDIDATE_MIN_EVIDENCE:
        return "candidate"
    if surprise_density >= WEAK_MIN_SURPRISE or evidence_strength >= WEAK_MIN_EVIDENCE:
        return "weak"
    return "reject"


def compute_features(artifact):
    """Compute all content features for one artifact; return features + advisory
    recommendation. Pure deterministic function over dict/JSON.

    Output:
      {"features": {surprise_density, evidence_strength, reproducibility,
                    practical_consequence, audience_fit, novelty_class,
                    novelty_to_audience, explanation_cost},
       "recommendation": "candidate" | "weak" | "reject",
       "recommendation_is_advisory": True,   # score is advisory only
       "authorizes_publication": False}      # score can NEVER authorize publication
    """
    if not isinstance(artifact, dict):
        raise ValueError("artifact must be a dict, got %r" % type(artifact).__name__)

    claims = artifact.get("claims") or []
    evidence_strength = compute_evidence_strength(claims)
    reproducibility = compute_reproducibility(claims)
    practical_consequence = compute_practical_consequence(artifact)
    audience_fit = compute_audience_fit(artifact)
    novelty_class = compute_novelty_class(artifact)
    novelty_to_audience = _check_unit("novelty_to_audience", artifact.get("novelty_to_audience", 0.0))
    explanation_cost = _check_cost(artifact.get("explanation_cost", 3))
    counterintuitiveness = _check_unit("counterintuitiveness", artifact.get("counterintuitiveness", 0.0))

    surprise_density = compute_surprise_density(
        counterintuitiveness=counterintuitiveness,
        evidence_strength=evidence_strength,
        reproducibility=reproducibility,
        practical_consequence=practical_consequence,
        novelty_to_audience=novelty_to_audience,
        explanation_cost=explanation_cost,
    )

    def _r4(x):
        return round(float(x), 4)

    return {
        "features": {
            "surprise_density": _r4(surprise_density),
            "evidence_strength": _r4(evidence_strength),
            "reproducibility": _r4(reproducibility),
            "practical_consequence": _r4(practical_consequence),
            "audience_fit": _r4(audience_fit),
            "novelty_class": novelty_class,
            "novelty_to_audience": _r4(novelty_to_audience),
            "explanation_cost": explanation_cost,
        },
        "recommendation": recommend(surprise_density, evidence_strength),
        # Explicit advisory flag: the score RECOMMENDS; it can NEVER
        # authorize publication. This is a computed feature, not an authority.
        "recommendation_is_advisory": True,
        "authorizes_publication": False,
    }
