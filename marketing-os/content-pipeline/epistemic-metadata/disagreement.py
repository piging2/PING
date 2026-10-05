"""Disagreement / expert-response signal classifier.

classify_disagreement(text) maps an expert response to exactly one of the 10
classes (or an honest tie) via explicit keyword/phrase rules:

    AGREEMENT, TECHNICAL_CORRECTION, COUNTEREXAMPLE, TERMINOLOGY_DISPUTE,
    PRIOR_ART_REFERENCE, REPRODUCTION_ATTEMPT, REPRODUCTION_SUCCESS,
    REPRODUCTION_FAILURE, IMPLEMENTATION_QUESTION, LOW_INFORMATION_REACTION

Scoring: each rule row lists phrases; the score for a class is the number of
distinct rule phrases found in the lowercased text. The class (or classes)
with the highest score win. A score of zero for every class yields
classification "UNCLASSIFIED" (never forced into a class).

Ties: when more than one class shares the top score, classification is None
and every tied class is listed in "candidates" -- never silently picked.

to_research_mission(classification, context) emits a mission PROPOSAL dict
{proposed_type: "INTELLIGENCE_RESEARCH", trigger_class, questions[],
 source_ref} for the four mission-feeding classes
(TECHNICAL_CORRECTION, COUNTEREXAMPLE, PRIOR_ART_REFERENCE,
 REPRODUCTION_ATTEMPT) and returns None for everything else. It proposes --
 it never dispatches anything.
"""

# Mission-feeding classes: corrections, counterexamples, prior-art references
# and reproduction attempts feed INTELLIGENCE_RESEARCH missions.
MISSION_FEEDING = {
    "TECHNICAL_CORRECTION",
    "COUNTEREXAMPLE",
    "PRIOR_ART_REFERENCE",
    "REPRODUCTION_ATTEMPT",
}

# Rule rows: (class, tuple of phrases). Specific outcome classes list their
# phrases before the generic REPRODUCTION_ATTEMPT row so exact phrasing
# outscores generic phrasing where relevant; scoring is by hit count only.
_RULE_TABLE = (
    ("REPRODUCTION_FAILURE", (
        "failed to reproduce", "could not reproduce", "couldn't reproduce",
        "unable to reproduce", "does not reproduce", "did not reproduce",
        "got different results", "different results", "reproduction failed",
        "not reproducible", "cannot replicate", "could not replicate",
    )),
    ("REPRODUCTION_SUCCESS", (
        "reproduced successfully", "successfully reproduced",
        "replication succeeded", "confirmed your results",
        "got the same results", "matches your results",
        "reproduced your results",
    )),
    ("REPRODUCTION_ATTEMPT", (
        "tried to reproduce", "attempted to reproduce", "attempted to replicate",
        "tried to replicate", "ran your code", "ran the code",
        "my replication", "my attempt", "tried running",
    )),
    ("PRIOR_ART_REFERENCE", (
        "prior art", "already been done", "already done", "nothing new",
        "was published", "published in", "predates", "known since",
        "invented years ago", "was known", "this is just",
    )),
    ("TECHNICAL_CORRECTION", (
        "correction", "actually,", "not quite", "you're wrong about",
        "misstated", "inaccurate", "the correct", "should be",
        "that number is wrong", "that's not right",
    )),
    ("COUNTEREXAMPLE", (
        "counterexample", "contradicts", "fails to account",
        "but consider", "here's a case", "cherry-pick", "cherry pick",
        "selection bias", "what about",
    )),
    ("TERMINOLOGY_DISPUTE", (
        "terminology", "misuse of the term", "not what",
        "definition of", "redefine", "we call that",
        "that word means", "abuse of terminology",
    )),
    ("IMPLEMENTATION_QUESTION", (
        "how do you", "how did you", "what library", "which version",
        "can you share", "where is the code", "implementation details",
        "how is this implemented", "what's the api", "what is the api",
    )),
    ("AGREEMENT", (
        "agree", "confirmed", "well said", "exactly", "+1",
        "second this", "this is right", "spot on",
    )),
    ("LOW_INFORMATION_REACTION", (
        "lol", "nice", "cool", "interesting", "thanks", "wow",
        "great post", "neat", "awesome",
    )),
)

_ALL_CLASSES = [row[0] for row in _RULE_TABLE]

_RESEARCH_QUESTIONS = {
    "TECHNICAL_CORRECTION": [
        "Is the correction factually accurate against the original evidence?",
        "Which published claims must be amended, qualified, or removed?",
        "Does the correction change the reproducibility grade of the artifact?",
    ],
    "COUNTEREXAMPLE": [
        "Is the counterexample genuine and within the claimed scope?",
        "Does it falsify the claim or only bound it? Restate the claim bounds.",
        "What additional evidence would settle the dispute?",
    ],
    "PRIOR_ART_REFERENCE": [
        "Does the referenced prior art cover the same claim or a different one?",
        "What is the novelty delta vs the prior art (empirical / mechanistic / explanatory)?",
        "Should the publication treatment cite or defer to the prior art?",
    ],
    "REPRODUCTION_ATTEMPT": [
        "What method, environment, and inputs did the reproducer use?",
        "Which step diverged from the original, if any?",
        "Does the attempt support, bound, or undermine the reproducibility grade?",
    ],
}


def _score(text):
    lowered = (text or "").lower()
    scores = {}
    for cls, phrases in _RULE_TABLE:
        hits = [p for p in phrases if p in lowered]
        scores[cls] = {"score": len(hits), "phrases": hits}
    return scores


def classify_disagreement(text):
    """Classify an expert response; ties return all tied candidates.

    Returns {"classification": class|None|"UNCLASSIFIED", "candidates": [...],
    "scores": {class: hits}, "rule": "..."}. Ties list every tied class;
    classification is None for ties (never silently picks a winner).
    """
    scores = _score(text)
    top = max(v["score"] for v in scores.values())
    winners = [cls for cls, v in scores.items() if v["score"] == top]

    if top == 0:
        return {
            "classification": "UNCLASSIFIED",
            "candidates": [],
            "scores": {cls: v["score"] for cls, v in scores.items()},
            "rule": "no rule phrase matched; not forced into any class",
        }
    if len(winners) == 1:
        cls = winners[0]
        return {
            "classification": cls,
            "candidates": [cls],
            "scores": {cls: v["score"] for cls, v in scores.items()},
            "rule": "unique highest phrase-hit score",
        }
    return {
        "classification": None,
        "candidates": sorted(winners),
        "scores": {cls: v["score"] for cls, v in scores.items()},
        "rule": "tie: multiple classes share the top score; no winner picked",
    }


def to_research_mission(classification, context):
    """Propose an INTELLIGENCE_RESEARCH mission for mission-feeding classes.

    context: {"source_ref": str, "artifact_id": str (optional),
              "response_text": str (optional)}.
    Returns the proposal dict, or None for non-feeding classes (including
    UNCLASSIFIED and None). Proposes only; never dispatches.
    """
    if classification not in MISSION_FEEDING:
        return None
    context = context or {}
    return {
        "proposed_type": "INTELLIGENCE_RESEARCH",
        "trigger_class": classification,
        "questions": list(_RESEARCH_QUESTIONS[classification]),
        "source_ref": context.get("source_ref", "UNKNOWN"),
        "artifact_id": context.get("artifact_id", "UNKNOWN"),
    }
