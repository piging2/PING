"""Education projection formats (MarketingOS content corpus).

Binding source: 2026-10-04 projection-plane directive, section
"EDUCATION IS ANOTHER PROJECTION": a business object can be projected as
EXPLANATION, COMPARISON, TIMELINE, PROCESS DIAGRAM, FAQ, TUTORIAL, CONCEPT MAP.
The underlying object remains the same; education is a projection, not a
separate product architecture.

Stdlib only. Pure deterministic functions over dict/JSON. No network, no DB,
no new authorities or stores. This module is machinery, not an authority:
it compiles derived projections, it never publishes or decides truth.

Epistemic rules enforced in code:
- Education projections are DERIVED, never canonical. Every output says so.
- Every factual value in the output must reference a binding_id present in
  the bindings dict. A factual field with no valid binding is emitted as
  {"value": None, "status": "UNBOUND", "claim_class": "UNKNOWN"}: the gap is
  shown honestly, never filled with an invented fact.
- Generated copy sections carry claim_class "GENERATED_SUMMARY". Copy is
  templated deterministically from bound values only; the pipeline never
  writes facts the bindings do not supply.
- Claim classes (DIRECT_EVIDENCE, DERIVED, OWNER_ASSERTED, GENERATED_SUMMARY,
  INFERENCE, UNKNOWN) are preserved verbatim from the binding. They are never
  flattened to a confidence number.
- GENERATE != PUBLISH: compiling a projection does not publish it. Publishing
  requires a proposed canonical object transition, which this module cannot do.

Binding dict shape:
    binding_id -> {
        "object_id": str,        # must match business_object["object_id"]
        "field_path": str,       # dotted path into the business object,
                                 # e.g. "service_name" or "milestones.0.label"
        "evidence_refs": [str],  # evidence supporting the bound value
        "claim_class": str,      # preserved verbatim
    }

Determinism: same (business_object, bindings) inputs produce identical
output. Fixed-order field specs are iterated, never raw dict iteration for
output construction; no timestamps; no randomness.
"""

import copy

# Claim classes pass through verbatim. They are labels, not numbers; nothing
# in this module converts them to a confidence score.
CLAIM_CLASSES = (
    "DIRECT_EVIDENCE",
    "DERIVED",
    "OWNER_ASSERTED",
    "GENERATED_SUMMARY",
    "INFERENCE",
    "UNKNOWN",
)

UNBOUND = "UNBOUND"
BOUND = "BOUND"

_GENERATE_NOTE = (
    "GENERATE != PUBLISH: this projection is a derived draft compiled from "
    "bound evidence. Publishing it requires a proposed canonical object "
    "transition; this module cannot perform that transition."
)


class _Missing:
    pass


_MISSING = _Missing()


def _get_path(obj, field_path):
    """Walk a dotted field path (dict keys, integer list indices)."""
    current = obj
    for part in field_path.split("."):
        if isinstance(current, list):
            try:
                index = int(part)
            except ValueError:
                return _MISSING
            if 0 <= index < len(current):
                current = current[index]
            else:
                return _MISSING
        elif isinstance(current, dict) and part in current:
            current = current[part]
        else:
            return _MISSING
    return current


def _unbound(binding_id, reason):
    """Honest degradation for a factual field with no valid binding."""
    return {
        "value": None,
        "status": UNBOUND,
        "binding_id": binding_id,
        "claim_class": "UNKNOWN",
        "reason": reason,
    }


def resolve_binding(binding_id, bindings, business_object):
    """Resolve one factual value through its binding.

    Returns a BOUND node carrying the value plus its binding provenance
    (object_id, field_path, evidence_refs, verbatim claim_class), or an
    UNBOUND node with claim_class UNKNOWN and a reason. Never invents.
    """
    binding = bindings.get(binding_id) if isinstance(bindings, dict) else None
    if not isinstance(binding, dict):
        return _unbound(binding_id, "BINDING_NOT_FOUND")
    object_id = binding.get("object_id")
    field_path = binding.get("field_path")
    if not isinstance(object_id, str) or not isinstance(field_path, str):
        return _unbound(binding_id, "BINDING_MALFORMED")
    if object_id != business_object.get("object_id"):
        return _unbound(binding_id, "OBJECT_ID_MISMATCH")
    value = _get_path(business_object, field_path)
    if value is _MISSING:
        return _unbound(binding_id, "FIELD_PATH_NOT_FOUND")
    claim_class = binding.get("claim_class", "UNKNOWN")
    if not isinstance(claim_class, str):
        claim_class = "UNKNOWN"
    evidence_refs = binding.get("evidence_refs", [])
    if not isinstance(evidence_refs, list):
        evidence_refs = []
    return {
        "value": copy.deepcopy(value),
        "status": BOUND,
        "binding_id": binding_id,
        "object_id": object_id,
        "field_path": field_path,
        "evidence_refs": list(evidence_refs),
        # Preserved verbatim. Never converted to a confidence number.
        "claim_class": claim_class,
    }


def _copy(text):
    """One generated-copy section. Always labeled GENERATED_SUMMARY."""
    return {
        "kind": "generated_copy",
        "claim_class": "GENERATED_SUMMARY",
        "text": text,
    }


def _label(text):
    """An organizational label (curator-supplied, not a factual claim)."""
    return {
        "kind": "label",
        "claim_class": "GENERATED_SUMMARY",
        "text": text,
    }


def _display(node):
    """Short display text for a resolved node inside copy templates."""
    if node.get("status") == BOUND and node.get("value") not in (None, ""):
        return str(node["value"])
    return "unknown"


def _header(format_name, business_object):
    return {
        "format": format_name,
        "projection_kind": "DERIVED",
        "canonical": False,
        "source_object_id": business_object.get("object_id"),
        "generate_note": _GENERATE_NOTE,
    }


def _validate(business_object, bindings, required_fields, format_name):
    if not isinstance(business_object, dict):
        raise ValueError(
            "format %s: business_object must be a dict, got %s"
            % (format_name, type(business_object).__name__)
        )
    if not isinstance(bindings, dict):
        raise ValueError(
            "format %s: bindings must be a dict, got %s"
            % (format_name, type(bindings).__name__)
        )
    for field in required_fields:
        if field not in business_object:
            raise ValueError(
                "format %s: missing required input field '%s'"
                % (format_name, field)
            )


def _expand_list(node):
    """Expand a bound list value into one node per item, sharing provenance."""
    if node.get("status") != BOUND or not isinstance(node.get("value"), list):
        return [node]
    items = []
    for item in node["value"]:
        items.append(
            {
                "value": item,
                "status": BOUND,
                "binding_id": node["binding_id"],
                "object_id": node["object_id"],
                "field_path": node["field_path"],
                "evidence_refs": list(node["evidence_refs"]),
                "claim_class": node["claim_class"],
            }
        )
    return items


# ---------------------------------------------------------------------------
# Format 1: EXPLANATION
# ---------------------------------------------------------------------------

EXPLANATION_FIELDS = ("object_id", "service_name", "service_description",
                      "service_benefits", "service_fit")
EXPLANATION_BINDINGS = ("b_service_name", "b_service_description",
                        "b_service_benefits", "b_service_fit")


def compile_explanation(business_object, bindings):
    """Compile an EXPLANATION projection: what the service is, in plain terms."""
    _validate(business_object, bindings, EXPLANATION_FIELDS, "EXPLANATION")
    subject = resolve_binding("b_service_name", bindings, business_object)
    definition = resolve_binding("b_service_description", bindings, business_object)
    benefits = resolve_binding("b_service_benefits", bindings, business_object)
    fit = resolve_binding("b_service_fit", bindings, business_object)
    out = _header("EXPLANATION", business_object)
    out["subject"] = subject
    out["definition"] = definition
    out["benefits"] = _expand_list(benefits)
    out["audience_fit"] = fit
    out["sections"] = [
        _copy("What is %s?" % _display(subject)),
        _copy("In plain terms: %s" % _display(definition)),
        _copy("Benefits reported for this service are listed with their "
              "evidence bindings below."),
        _copy("It may suit: %s" % _display(fit)),
    ]
    return out


# ---------------------------------------------------------------------------
# Format 2: COMPARISON
# ---------------------------------------------------------------------------

COMPARISON_FIELDS = ("object_id", "service_name", "comparison")
COMPARISON_BINDINGS = ("b_service_name",)


def compile_comparison(business_object, bindings):
    """Compile a COMPARISON projection: side-by-side attributes, no ranking."""
    _validate(business_object, bindings, COMPARISON_FIELDS, "COMPARISON")
    subject = resolve_binding("b_service_name", bindings, business_object)
    rows = []
    attributes = business_object.get("comparison") or []
    for entry in attributes:
        if not isinstance(entry, dict):
            continue
        ours = resolve_binding(entry.get("ours_binding"), bindings, business_object)
        alt = resolve_binding(entry.get("alt_binding"), bindings, business_object)
        rows.append(
            {
                "attribute": _label(str(entry.get("attribute", "unnamed attribute"))),
                "ours": ours,
                "alternative": alt,
                "alternative_label": _label(str(entry.get("alt_label", "alternative"))),
            }
        )
    # Deterministic row order regardless of input list order.
    rows.sort(key=lambda r: r["attribute"]["text"])
    out = _header("COMPARISON", business_object)
    out["subject"] = subject
    out["rows"] = rows
    out["sections"] = [
        _copy("How %s compares on key attributes." % _display(subject)),
        _copy("Attributes are shown side by side; no ranking is implied by "
              "this projection."),
    ]
    return out


# ---------------------------------------------------------------------------
# Format 3: TIMELINE
# ---------------------------------------------------------------------------

TIMELINE_FIELDS = ("object_id", "service_name", "milestones")
TIMELINE_BINDINGS = ("b_service_name",)


def compile_timeline(business_object, bindings):
    """Compile a TIMELINE projection: milestones in chronological order."""
    _validate(business_object, bindings, TIMELINE_FIELDS, "TIMELINE")
    subject = resolve_binding("b_service_name", bindings, business_object)
    events = []
    for entry in business_object.get("milestones") or []:
        if not isinstance(entry, dict):
            continue
        label = resolve_binding(entry.get("label_binding"), bindings, business_object)
        date = resolve_binding(entry.get("date_binding"), bindings, business_object)
        events.append({"label": label, "date": date})
    # Deterministic: sort by bound date text, then bound label text.
    events.sort(key=lambda e: (_display(e["date"]), _display(e["label"])))
    out = _header("TIMELINE", business_object)
    out["subject"] = subject
    out["events"] = events
    out["sections"] = [
        _copy("Key milestones for %s, in order." % _display(subject)),
    ]
    return out


# ---------------------------------------------------------------------------
# Format 4: PROCESS DIAGRAM
# ---------------------------------------------------------------------------

PROCESS_DIAGRAM_FIELDS = ("object_id", "service_name", "process_steps")
PROCESS_DIAGRAM_BINDINGS = ("b_service_name",)


def compile_process_diagram(business_object, bindings):
    """Compile a PROCESS DIAGRAM projection: ordered steps with sequence edges."""
    _validate(business_object, bindings, PROCESS_DIAGRAM_FIELDS, "PROCESS DIAGRAM")
    subject = resolve_binding("b_service_name", bindings, business_object)
    nodes = []
    for position, entry in enumerate(business_object.get("process_steps") or []):
        if not isinstance(entry, dict):
            continue
        title = resolve_binding(entry.get("title_binding"), bindings, business_object)
        detail = resolve_binding(entry.get("detail_binding"), bindings, business_object)
        order = entry.get("order", position)
        if not isinstance(order, int):
            order = position
        nodes.append({"index": position, "order": order, "title": title, "detail": detail})
    nodes.sort(key=lambda n: (n["order"], _display(n["title"])))
    for position, node in enumerate(nodes):
        node["index"] = position
    edges = [
        {"from": nodes[i]["index"], "to": nodes[i + 1]["index"], "kind": "sequence"}
        for i in range(len(nodes) - 1)
    ]
    out = _header("PROCESS DIAGRAM", business_object)
    out["subject"] = subject
    out["nodes"] = nodes
    out["edges"] = edges
    out["sections"] = [
        _copy("Steps of the process for %s, in sequence." % _display(subject)),
    ]
    return out


# ---------------------------------------------------------------------------
# Format 5: FAQ
# ---------------------------------------------------------------------------

FAQ_FIELDS = ("object_id", "service_name", "faqs")
FAQ_BINDINGS = ("b_service_name",)


def compile_faq(business_object, bindings):
    """Compile an FAQ projection: questions with evidence-bound answers."""
    _validate(business_object, bindings, FAQ_FIELDS, "FAQ")
    subject = resolve_binding("b_service_name", bindings, business_object)
    entries = []
    for entry in business_object.get("faqs") or []:
        if not isinstance(entry, dict):
            continue
        question = _copy(str(entry.get("question", "Unasked question")))
        answer = resolve_binding(entry.get("answer_binding"), bindings, business_object)
        entries.append({"question": question, "answer": answer})
    out = _header("FAQ", business_object)
    out["subject"] = subject
    out["entries"] = entries
    out["sections"] = [
        _copy("Common questions about %s, answered from business evidence."
              % _display(subject)),
    ]
    return out


# ---------------------------------------------------------------------------
# Format 6: TUTORIAL
# ---------------------------------------------------------------------------

TUTORIAL_FIELDS = ("object_id", "service_name", "tutorial_steps")
TUTORIAL_BINDINGS = ("b_service_name",)


def compile_tutorial(business_object, bindings):
    """Compile a TUTORIAL projection: numbered instructions, each evidence-tied."""
    _validate(business_object, bindings, TUTORIAL_FIELDS, "TUTORIAL")
    subject = resolve_binding("b_service_name", bindings, business_object)
    steps = []
    for position, entry in enumerate(business_object.get("tutorial_steps") or [], start=1):
        if not isinstance(entry, dict):
            continue
        instruction = _copy(str(entry.get("instruction", "No instruction given")))
        evidence = resolve_binding(entry.get("evidence_binding"), bindings, business_object)
        steps.append(
            {"step_number": position, "instruction": instruction, "evidence": evidence}
        )
    out = _header("TUTORIAL", business_object)
    out["subject"] = subject
    out["steps"] = steps
    out["sections"] = [
        _copy("How to proceed with %s, one step at a time. Each step names "
              "the evidence it rests on." % _display(subject)),
    ]
    return out


# ---------------------------------------------------------------------------
# Format 7: CONCEPT MAP
# ---------------------------------------------------------------------------

CONCEPT_MAP_FIELDS = ("object_id", "service_name", "concepts", "relations")
CONCEPT_MAP_BINDINGS = ("b_service_name",)


def compile_concept_map(business_object, bindings):
    """Compile a CONCEPT MAP projection: bound concepts plus labeled relations."""
    _validate(business_object, bindings, CONCEPT_MAP_FIELDS, "CONCEPT MAP")
    subject = resolve_binding("b_service_name", bindings, business_object)
    nodes = []
    for entry in business_object.get("concepts") or []:
        if not isinstance(entry, dict):
            continue
        binding_id = entry.get("concept_binding")
        label = resolve_binding(binding_id, bindings, business_object)
        nodes.append({"id": binding_id, "label": label})
    edges = []
    for entry in business_object.get("relations") or []:
        if not isinstance(entry, dict):
            continue
        from_node = resolve_binding(entry.get("from_binding"), bindings, business_object)
        to_node = resolve_binding(entry.get("to_binding"), bindings, business_object)
        edges.append(
            {
                "from": entry.get("from_binding"),
                "to": entry.get("to_binding"),
                "from_label": from_node,
                "to_label": to_node,
                "relation": _copy(str(entry.get("relation", "relates to"))),
            }
        )
    # Deterministic node order by bound label text.
    nodes.sort(key=lambda n: _display(n["label"]))
    out = _header("CONCEPT MAP", business_object)
    out["subject"] = subject
    out["nodes"] = nodes
    out["edges"] = edges
    out["sections"] = [
        _copy("Key concepts around %s and how they relate." % _display(subject)),
    ]
    return out


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

FORMAT_REGISTRY = {
    "explanation": {
        "name": "EXPLANATION",
        "description": (
            "Plain-language explanation of what the business's service is, "
            "what it does, and who it suits. Facts bound to evidence; prose "
            "labeled GENERATED_SUMMARY."
        ),
        "input_contract": {
            "required_fields": list(EXPLANATION_FIELDS),
            "required_bindings": list(EXPLANATION_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "definition", "benefits", "audience_fit", "sections"],
            "factual_nodes": ["subject", "definition", "benefits", "audience_fit"],
            "copy_sections": ["sections"],
        },
        "compile": compile_explanation,
    },
    "comparison": {
        "name": "COMPARISON",
        "description": (
            "Side-by-side comparison of the service against an alternative "
            "across named attributes. Bound values only; no ranking implied."
        ),
        "input_contract": {
            "required_fields": list(COMPARISON_FIELDS),
            "required_bindings": list(COMPARISON_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "rows", "sections"],
            "factual_nodes": ["subject", "rows[].ours", "rows[].alternative"],
            "copy_sections": ["sections"],
        },
        "compile": compile_comparison,
    },
    "timeline": {
        "name": "TIMELINE",
        "description": (
            "Milestones of the service engagement in chronological order. "
            "Each label and date resolves through its own binding."
        ),
        "input_contract": {
            "required_fields": list(TIMELINE_FIELDS),
            "required_bindings": list(TIMELINE_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "events", "sections"],
            "factual_nodes": ["subject", "events[].label", "events[].date"],
            "copy_sections": ["sections"],
        },
        "compile": compile_timeline,
    },
    "process_diagram": {
        "name": "PROCESS DIAGRAM",
        "description": (
            "Ordered process steps as nodes with sequence edges. Step titles "
            "and details are evidence-bound; edges are structural."
        ),
        "input_contract": {
            "required_fields": list(PROCESS_DIAGRAM_FIELDS),
            "required_bindings": list(PROCESS_DIAGRAM_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "nodes", "edges", "sections"],
            "factual_nodes": ["subject", "nodes[].title", "nodes[].detail"],
            "copy_sections": ["sections"],
        },
        "compile": compile_process_diagram,
    },
    "faq": {
        "name": "FAQ",
        "description": (
            "Frequently asked questions with answers bound to business "
            "evidence. Questions are curator copy labeled GENERATED_SUMMARY."
        ),
        "input_contract": {
            "required_fields": list(FAQ_FIELDS),
            "required_bindings": list(FAQ_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "entries", "sections"],
            "factual_nodes": ["subject", "entries[].answer"],
            "copy_sections": ["entries[].question", "sections"],
        },
        "compile": compile_faq,
    },
    "tutorial": {
        "name": "TUTORIAL",
        "description": (
            "Numbered how-to instructions. Instructions are generated copy; "
            "each step carries an evidence binding naming its source."
        ),
        "input_contract": {
            "required_fields": list(TUTORIAL_FIELDS),
            "required_bindings": list(TUTORIAL_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "steps", "sections"],
            "factual_nodes": ["subject", "steps[].evidence"],
            "copy_sections": ["steps[].instruction", "sections"],
        },
        "compile": compile_tutorial,
    },
    "concept_map": {
        "name": "CONCEPT MAP",
        "description": (
            "Concepts as nodes and their relations as labeled edges. Node "
            "labels are evidence-bound; relation labels are generated copy."
        ),
        "input_contract": {
            "required_fields": list(CONCEPT_MAP_FIELDS),
            "required_bindings": list(CONCEPT_MAP_BINDINGS),
        },
        "output_contract": {
            "fields": ["format", "projection_kind", "canonical",
                       "source_object_id", "generate_note", "subject",
                       "nodes", "edges", "sections"],
            "factual_nodes": ["subject", "nodes[].label", "edges[].from_label",
                              "edges[].to_label"],
            "copy_sections": ["edges[].relation", "sections"],
        },
        "compile": compile_concept_map,
    },
}


def compile_format(format_key, business_object, bindings):
    """Dispatch helper: compile one named format by registry key."""
    entry = FORMAT_REGISTRY.get(format_key)
    if entry is None:
        raise ValueError(
            "unknown education format '%s'; known: %s"
            % (format_key, ", ".join(sorted(FORMAT_REGISTRY)))
        )
    return entry["compile"](business_object, bindings)
