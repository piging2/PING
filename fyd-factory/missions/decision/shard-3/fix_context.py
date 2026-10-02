#!/usr/bin/env python3
"""Insert missing CONTEXT (4th positional arg) into 17-arg add() calls.

Shard-2 precedent: an AST pass inserted the missing contexts. This script
finds every `add(...)` Name-call with exactly 17 positional args in the
shard-3 theme files and inserts a theme-grounding CONTEXT string after the
question argument (index 2), via line surgery keyed on the AST end_lineno.
"""
import ast, json

CONTEXTS = {
    "theme6_addr.py":
        "Grounding: D-501 (leak:ask-answers:hidden-address) - owner-hidden business address "
        "survives on a related public location and Ask FYD cites it via located_at; "
        "DEFECT-LIST.md TD-002 (Ask FYD lacks field-level privacy gating) is the defect this theme closes.",
    "theme7_claim.py":
        "Grounding: missions/claim.sh atomic claim protocol (mkdir-based, lease 21600s, renew/release/status), "
        "MISSION-PROTOCOL.md claim rule, and this wave's claim/re-list workflow (worker wave2-gen-9b2f35ec).",
    "theme8_golden.py":
        "Grounding: golden-set collapse decisions D-012/D-214/D-217, CLONE-PROVE scoring usage, "
        "and the evidence discipline (adjudicated truth set as the donor-fidelity quality contract).",
    "theme9_bodytext.py":
        "Grounding: ~/workspace/fyd-factory/cohort/COHORT-REPORT.md - 7/7 content sites yielded zero "
        "body-text facts; candidate primitives: generic body-text extraction, tiered schema.org handling, "
        "dropped relationship/entity ledger, builder-agnostic offerings extraction.",
    "theme10_td002.py":
        "Grounding: ~/workspace/fyd-factory/failures/DEFECT-LIST.md TD-002 (OPEN): Ask FYD lacks "
        "field-level privacy gating; acceptance: dual-context test where the public viewer cannot see "
        "the hidden field and the owner viewer can.",
}

for fname, ctx in CONTEXTS.items():
    src = open(fname, encoding="utf-8").read()
    tree = ast.parse(src)
    targets = []
    for node in ast.walk(tree):
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id == "add" and len(node.args) == 17 and not node.keywords):
            targets.append(node.args[2].end_lineno)
    lines = src.split("\n")
    new_line = "    " + json.dumps(ctx) + ","
    for ln in sorted(set(targets), reverse=True):
        lines.insert(ln, new_line)  # ln is 1-based end line; insert directly after it
    open(fname, "w", encoding="utf-8").write("\n".join(lines))
    print(f"{fname}: {len(set(targets))} contexts inserted")
