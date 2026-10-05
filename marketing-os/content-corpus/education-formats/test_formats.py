"""Cheapest relevant test for education-formats: plain asserts, no deps."""
import copy
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from formats import (
    FORMAT_REGISTRY,
    CLAIM_CLASSES,
    compile_format,
    compile_explanation,
    compile_comparison,
    compile_timeline,
    compile_process_diagram,
    compile_faq,
    compile_tutorial,
    compile_concept_map,
)

# Every example below is synthetic ("Example Plumbing Co.") and ILLUSTRATIVE.
# No real business facts are asserted anywhere in this file.


def sample_object():
    return {
        "object_id": "obj-example-plumbing-co",
        "service_name": "Heat pump installation",
        "service_description": "ILLUSTRATIVE: installing an air-source heat pump.",
        "service_benefits": ["Lower winter heating bills", "Cooling in summer"],
        "service_fit": "Homes with existing ductwork",
        "comparison": [
            {
                "attribute": "Upfront cost",
                "ours": "$8,000 ILLUSTRATIVE",
                "alt": "$4,000 ILLUSTRATIVE",
                "ours_binding": "b_cmp_ours_0",
                "alt_binding": "b_cmp_alt_0",
                "alt_label": "Gas furnace (ILLUSTRATIVE)",
            },
        ],
        "milestones": [
            {"label": "Site survey", "date": "2026-11-01",
             "label_binding": "b_milestone_label_0",
             "date_binding": "b_milestone_date_0"},
        ],
        "process_steps": [
            {"title": "Survey", "detail": "Technician visits the site.",
             "title_binding": "b_step_title_0",
             "detail_binding": "b_step_detail_0",
             "order": 1},
        ],
        "faqs": [
            {"question": "How long does installation take?",
             "answer": "One to two days (ILLUSTRATIVE)",
             "answer_binding": "b_faq_answer_0"},
        ],
        "tutorial_steps": [
            {"instruction": "Clear the work area before the crew arrives.",
             "evidence_note": "Install checklist v3 (ILLUSTRATIVE)",
             "evidence_binding": "b_tut_evidence_0"},
        ],
        "concepts": [
            {"label": "Heat pump", "concept_binding": "b_concept_0"},
            {"label": "Refrigerant", "concept_binding": "b_concept_1"},
        ],
        "relations": [
            {"from_binding": "b_concept_0", "to_binding": "b_concept_1",
             "relation": "uses"},
        ],
    }


def sample_bindings():
    oid = "obj-example-plumbing-co"
    return {
        "b_service_name": {"object_id": oid, "field_path": "service_name",
                           "evidence_refs": ["ev-name-1"], "claim_class": "DIRECT_EVIDENCE"},
        "b_service_description": {"object_id": oid, "field_path": "service_description",
                                  "evidence_refs": ["ev-desc-1"], "claim_class": "OWNER_ASSERTED"},
        "b_service_benefits": {"object_id": oid, "field_path": "service_benefits",
                               "evidence_refs": ["ev-ben-1"], "claim_class": "DERIVED"},
        "b_service_fit": {"object_id": oid, "field_path": "service_fit",
                          "evidence_refs": ["ev-fit-1"], "claim_class": "INFERENCE"},
        "b_cmp_ours_0": {"object_id": oid, "field_path": "comparison.0.ours",
                         "evidence_refs": ["ev-cmp-1"], "claim_class": "DIRECT_EVIDENCE"},
        "b_cmp_alt_0": {"object_id": oid, "field_path": "comparison.0.alt",
                        "evidence_refs": ["ev-cmp-2"], "claim_class": "OWNER_ASSERTED"},
        "b_milestone_label_0": {"object_id": oid, "field_path": "milestones.0.label",
                                "evidence_refs": ["ev-ms-1"], "claim_class": "DERIVED"},
        "b_milestone_date_0": {"object_id": oid, "field_path": "milestones.0.date",
                               "evidence_refs": ["ev-ms-2"], "claim_class": "DIRECT_EVIDENCE"},
        "b_step_title_0": {"object_id": oid, "field_path": "process_steps.0.title",
                           "evidence_refs": ["ev-st-1"], "claim_class": "DIRECT_EVIDENCE"},
        "b_step_detail_0": {"object_id": oid, "field_path": "process_steps.0.detail",
                            "evidence_refs": ["ev-st-2"], "claim_class": "OWNER_ASSERTED"},
        "b_faq_answer_0": {"object_id": oid, "field_path": "faqs.0.answer",
                           "evidence_refs": ["ev-faq-1"], "claim_class": "DERIVED"},
        "b_tut_evidence_0": {"object_id": oid, "field_path": "tutorial_steps.0.evidence_note",
                             "evidence_refs": ["ev-tut-1"], "claim_class": "INFERENCE"},
        "b_concept_0": {"object_id": oid, "field_path": "concepts.0.label",
                        "evidence_refs": ["ev-con-1"], "claim_class": "DIRECT_EVIDENCE"},
        "b_concept_1": {"object_id": oid, "field_path": "concepts.1.label",
                        "evidence_refs": ["ev-con-2"], "claim_class": "DERIVED"},
    }


def _all_sections(output):
    """Collect every generated-copy/label section from any output shape."""
    found = []
    for section in output.get("sections", []):
        found.append(section)
    for entry in output.get("entries", []):
        found.append(entry["question"])
    for step in output.get("steps", []):
        if isinstance(step, dict) and "instruction" in step:
            found.append(step["instruction"])
    for edge in output.get("edges", []):
        if isinstance(edge, dict) and "relation" in edge:
            found.append(edge["relation"])
    for row in output.get("rows", []):
        found.append(row["attribute"])
        found.append(row["alternative_label"])
    return found


def test_registry_has_seven_formats():
    assert len(FORMAT_REGISTRY) == 7
    for key in ("explanation", "comparison", "timeline", "process_diagram",
                "faq", "tutorial", "concept_map"):
        entry = FORMAT_REGISTRY[key]
        assert entry["name"]
        assert entry["description"]
        assert entry["input_contract"]["required_fields"]
        assert entry["output_contract"]["fields"]
        assert callable(entry["compile"])


def test_all_formats_compile_deterministically():
    obj = sample_object()
    bindings = sample_bindings()
    compilers = {
        "explanation": compile_explanation,
        "comparison": compile_comparison,
        "timeline": compile_timeline,
        "process_diagram": compile_process_diagram,
        "faq": compile_faq,
        "tutorial": compile_tutorial,
        "concept_map": compile_concept_map,
    }
    assert set(compilers) == set(FORMAT_REGISTRY)
    for key, compiler in compilers.items():
        first = compiler(copy.deepcopy(obj), copy.deepcopy(bindings))
        second = compiler(copy.deepcopy(obj), copy.deepcopy(bindings))
        assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True), key
        assert first["format"] == FORMAT_REGISTRY[key]["name"]
        assert first["projection_kind"] == "DERIVED"
        assert first["canonical"] is False
        assert first["source_object_id"] == obj["object_id"]


def test_compile_format_dispatch():
    obj = sample_object()
    bindings = sample_bindings()
    out = compile_format("faq", obj, bindings)
    assert out["format"] == "FAQ"
    try:
        compile_format("no_such_format", obj, bindings)
    except ValueError as exc:
        assert "no_such_format" in str(exc)
    else:
        raise AssertionError("expected ValueError for unknown format")


def test_unbound_field_degrades_honestly():
    obj = sample_object()
    bindings = sample_bindings()
    del bindings["b_service_fit"]
    out = compile_explanation(obj, bindings)
    fit = out["audience_fit"]
    assert fit == {"value": None, "status": "UNBOUND", "binding_id": "b_service_fit",
                   "claim_class": "UNKNOWN", "reason": "BINDING_NOT_FOUND"}
    # The rest still resolves; one missing binding never sinks the projection.
    assert out["subject"]["status"] == "BOUND"


def test_unbound_on_object_id_mismatch():
    obj = sample_object()
    bindings = sample_bindings()
    bindings["b_service_name"] = dict(bindings["b_service_name"])
    bindings["b_service_name"]["object_id"] = "obj-someone-else"
    out = compile_explanation(obj, bindings)
    assert out["subject"]["status"] == "UNBOUND"
    assert out["subject"]["reason"] == "OBJECT_ID_MISMATCH"
    assert out["subject"]["claim_class"] == "UNKNOWN"


def test_generated_summary_labeling_on_copy_sections():
    obj = sample_object()
    bindings = sample_bindings()
    compilers = [compile_explanation, compile_comparison, compile_timeline,
                 compile_process_diagram, compile_faq, compile_tutorial,
                 compile_concept_map]
    for compiler in compilers:
        out = compiler(obj, bindings)
        sections = _all_sections(out)
        assert sections, compiler.__name__
        for section in sections:
            assert section["claim_class"] == "GENERATED_SUMMARY", (
                compiler.__name__, section)
            assert section["kind"] in ("generated_copy", "label")


def test_missing_required_field_raises_naming_the_field():
    obj = sample_object()
    bindings = sample_bindings()
    del obj["service_name"]
    try:
        compile_explanation(obj, bindings)
    except ValueError as exc:
        assert "service_name" in str(exc)
    else:
        raise AssertionError("expected ValueError naming 'service_name'")


def test_missing_required_field_per_format():
    cases = [
        (compile_comparison, "comparison"),
        (compile_timeline, "milestones"),
        (compile_process_diagram, "process_steps"),
        (compile_faq, "faqs"),
        (compile_tutorial, "tutorial_steps"),
        (compile_concept_map, "concepts"),
    ]
    for compiler, field in cases:
        obj = sample_object()
        del obj[field]
        try:
            compiler(obj, sample_bindings())
        except ValueError as exc:
            assert field in str(exc), (compiler.__name__, str(exc))
        else:
            raise AssertionError("expected ValueError for %s" % field)


def test_claim_classes_preserved_verbatim_no_confidence_flattening():
    obj = sample_object()
    bindings = sample_bindings()
    out = compile_explanation(obj, bindings)
    by_binding = {
        "b_service_name": out["subject"],
        "b_service_description": out["definition"],
        "b_service_benefits": out["benefits"][0],
        "b_service_fit": out["audience_fit"],
    }
    expected = {
        "b_service_name": "DIRECT_EVIDENCE",
        "b_service_description": "OWNER_ASSERTED",
        "b_service_benefits": "DERIVED",
        "b_service_fit": "INFERENCE",
    }
    for binding_id, node in by_binding.items():
        assert node["claim_class"] == expected[binding_id] == bindings[binding_id]["claim_class"]
    # No confidence number may appear anywhere in any projection.
    for key in FORMAT_REGISTRY:
        output = compile_format(key, obj, bindings)
        dumped = json.dumps(output, sort_keys=True).lower()
        assert "confidence" not in dumped, key
    # The class vocabulary is the six known classes, preserved as strings.
    assert set(CLAIM_CLASSES) == {"DIRECT_EVIDENCE", "DERIVED", "OWNER_ASSERTED",
                                  "GENERATED_SUMMARY", "INFERENCE", "UNKNOWN"}


def test_process_edges_are_sequential_and_deterministic():
    obj = sample_object()
    bindings = sample_bindings()
    obj["process_steps"].append({
        "title": "Install", "detail": "Crew installs the unit.",
        "title_binding": "b_step_title_1", "detail_binding": "b_step_detail_1",
        "order": 2,
    })
    bindings["b_step_title_1"] = {"object_id": obj["object_id"],
                                  "field_path": "process_steps.1.title",
                                  "evidence_refs": [], "claim_class": "DIRECT_EVIDENCE"}
    bindings["b_step_detail_1"] = {"object_id": obj["object_id"],
                                   "field_path": "process_steps.1.detail",
                                   "evidence_refs": [], "claim_class": "DIRECT_EVIDENCE"}
    out = compile_process_diagram(obj, bindings)
    assert [n["index"] for n in out["nodes"]] == [0, 1]
    assert out["edges"] == [{"from": 0, "to": 1, "kind": "sequence"}]


def test_no_invented_facts_in_copy():
    # Copy templates may only echo bound values or say "unknown".
    obj = sample_object()
    bindings = sample_bindings()
    del bindings["b_service_description"]
    out = compile_explanation(obj, bindings)
    for section in out["sections"]:
        assert "unknown" in section["text"].lower() or \
            "Heat pump installation" in section["text"] or \
            "benefits" in section["text"].lower() or \
            "suit" in section["text"].lower() or \
            "plain terms" in section["text"].lower()
