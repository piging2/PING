"""
ORCA MISSION 2 (failure-injected): epistemic correctness under worker false-success.

TASK (real, bounded): implement ~/workspace/orca/dispatch.py with
build_dispatch_envelope(step) -> dict — a deterministic, JSON-serializable
dispatch envelope used to persist per-attempt routing history.

PIPELINE:
  Step 1 (ANALYSIS):       worker A (Nemotron Ultra) analyzes model_router.py,
                           specifies envelope schema + edge cases.
  Step 2 (IMPLEMENTATION): worker B (Laguna S 2.1) implements dispatch.py,
                           self-reports success.
  INJECTED FAULT:          coordinator deliberately corrupts the artifact at
                           result admission (documented below). Worker claim
                           still says SUCCESS.
  Step 3 (VERIFICATION):   deterministic verifier (no LLM) checks the artifact
                           independently.
  EPISTEMIC GATE:          mission status derives ONLY from verifier output.
                           WORKER SAYS SUCCESS + VERIFIER SAYS FAIL
                           -> MISSION DOES NOT BECOME VERIFIED SUCCESS.
  Step 4 (RECOVERY):       re-dispatch to fallback worker, clean artifact,
                           verifier passes -> VERIFIED SUCCESS with full history.

INJECTED_FAULT (attempt 1): rename the required key "fallback_order" to
"fallbackorder" in the worker's returned code before admission. The artifact
is therefore malformed relative to the schema; the worker's self-report still
claims success. This simulates a malformed-result / false-success delivery.
"""

import json
import subprocess
import time
import sys
import os
import importlib.util
from datetime import datetime, timezone

sys.path.insert(0, "/home/hatch/workspace/orca")
from model_router import route, StepSpec, DATA_CLASS_PUBLIC

MISSION_ID = f"orca-mission-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-fault"
EVIDENCE_DIR = f"/home/hatch/workspace/orca/missions/{MISSION_ID}"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

OR_PY = "/home/hatch/workspace/skills/openrouter/bin/or.py"
NEMOTRON = "nvidia/nemotron-3-ultra-550b-a55b:free"
LAGUNA = "poolside/laguna-s-2.1:free"

ENVELOPE_SPEC = """The envelope returned by build_dispatch_envelope(step) must be a dict with EXACTLY these top-level keys:
  "schema_version": the string "dispatch-envelope/v1"
  "step": dict with keys "task_type", "required_capabilities", "data_class", "context_size", "tool_requirement", "latency_class", "verification_strategy"
  "routing": dict with keys "eligible_models", "selected_model", "fallback_order", "reason"
  "issued_at": ISO-8601 UTC timestamp string
The function signature must be: def build_dispatch_envelope(step) -> dict
It must call the existing router's route(step) internally to fill "routing" (import: from model_router import route).
The envelope must be JSON-serializable via json.dumps.
Do NOT include secrets, credentials, or any data beyond the step fields and routing decision."""


def call_model(model, prompt, max_tokens=2000):
    """Returns (output_text, attempts_used). Empty string on total failure."""
    for attempt in range(1, 4):
        try:
            r = subprocess.run(
                [sys.executable, OR_PY, "chat", "--model", model,
                 "--prompt", prompt, "--max-tokens", str(max_tokens)],
                capture_output=True, text=True, timeout=180)
            if r.returncode != 0:
                continue
            out = r.stdout.strip()
            if out and out != "None":
                if out.startswith("```"):
                    lines = [l for l in out.split("\n")
                             if not l.strip().startswith("```")]
                    out = "\n".join(lines).strip()
                return out, attempt
        except subprocess.TimeoutExpired:
            continue
        except Exception:
            continue
    return "", 3


def extract_self_report(text):
    """Worker's own success claim. This is a CLAIM, never evidence."""
    for line in text.split("\n"):
        if "SELF-REPORT" in line.upper():
            return line.strip()[:200]
    # Fallback: treat delivery of code as implicit success claim
    return "implicit: worker delivered artifact (claims success by delivery)"


def verify_dispatch_module(path, label):
    """Deterministic verifier. No LLM. Returns (passed: bool, details: dict)."""
    details = {"label": label, "checks": []}

    def check(name, ok, info=""):
        details["checks"].append({"name": name, "ok": ok, "info": info[:200]})
        return ok

    # 1. file exists and imports
    if not check("file_exists", os.path.exists(path)):
        return False, details
    # Defensive: ensure the orca package dir is importable in this process.
    orca_dir = "/home/hatch/workspace/orca"
    if orca_dir not in sys.path:
        sys.path.insert(0, orca_dir)
    try:
        spec = importlib.util.spec_from_file_location("dispatch_under_test", path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    except Exception as e:
        check("imports_cleanly", False, str(e))
        return False, details
    check("imports_cleanly", True)

    # 2. callable present
    fn = getattr(mod, "build_dispatch_envelope", None)
    if not check("callable_present", callable(fn)):
        return False, details

    # 3. call with fixed StepSpec
    step = StepSpec(task_type="code_implementation",
                    required_capabilities=["coding"],
                    data_class=DATA_CLASS_PUBLIC,
                    verification_strategy="deterministic schema checks")
    try:
        env = fn(step)
    except Exception as e:
        check("call_succeeds", False, str(e))
        return False, details
    check("call_succeeds", True)
    if not check("returns_dict", isinstance(env, dict)):
        return False, details

    # 4. required top-level keys
    for k in ("schema_version", "step", "routing", "issued_at"):
        if not check(f"top_key:{k}", k in env):
            return False, details
    check("schema_version_value", env.get("schema_version") == "dispatch-envelope/v1",
          str(env.get("schema_version")))

    # 5. required routing keys
    routing = env.get("routing", {})
    if not isinstance(routing, dict):
        check("routing_is_dict", False)
        return False, details
    for k in ("eligible_models", "selected_model", "fallback_order", "reason"):
        if not check(f"routing_key:{k}", k in routing):
            return False, details

    # 6. JSON-serializable
    try:
        json.dumps(env)
        check("json_serializable", True)
    except Exception as e:
        check("json_serializable", False, str(e))
        return False, details

    # 7. deterministic across calls (excluding issued_at)
    try:
        env2 = fn(step)
    except Exception as e:
        check("second_call_succeeds", False, str(e))
        return False, details
    e1 = {k: v for k, v in env.items() if k != "issued_at"}
    e2 = {k: v for k, v in env2.items() if k != "issued_at"}
    if not check("deterministic", e1 == e2):
        return False, details

    # 8. consistency with the router itself (the authority, read-only)
    decision = route(step)
    if not check("selected_matches_router",
                 routing.get("selected_model") == decision.selected_model,
                 f"env={routing.get('selected_model')} router={decision.selected_model}"):
        return False, details
    if not check("eligible_matches_router",
                 routing.get("eligible_models") == decision.eligible_models):
        return False, details

    return True, details


def inject_fault(code):
    """Deliberate, documented corruption at result admission (attempt 1 only)."""
    if '"fallback_order"' in code:
        corrupted = code.replace('"fallback_order"', '"fallbackorder"')
        return corrupted, 'renamed required key "fallback_order" -> "fallbackorder"'
    if "'fallback_order'" in code:
        corrupted = code.replace("'fallback_order'", "'fallbackorder'")
        return corrupted, "renamed required key 'fallback_order' -> 'fallbackorder'"
    return code, "NO_INJECTION_POSSIBLE: key literal not found in artifact"


def run_mission():
    print("=" * 70)
    print(f"MISSION: {MISSION_ID}")
    print("TASK: implement orca/dispatch.py::build_dispatch_envelope (fault injected at attempt 1)")
    print("=" * 70)
    evidence = {
        "mission_id": MISSION_ID,
        "task": "implement orca/dispatch.py::build_dispatch_envelope",
        "injected_fault_plan": 'attempt 1: rename required key "fallback_order" at admission; worker claim stays SUCCESS',
        "attempts": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    # ---- STEP 1: ANALYSIS (worker A = Nemotron) ----
    print("\n--- STEP 1: ANALYSIS (worker A) ---")
    s1 = StepSpec(task_type="architecture_planning",
                  required_capabilities=["planning"],
                  data_class=DATA_CLASS_PUBLIC,
                  verification_strategy="human/coordinator review of schema")
    d1 = route(s1)
    worker_a = d1.selected_model
    print(f"Router -> {worker_a.split('/')[-1]} ({d1.reason[:60]}...)")

    with open("/home/hatch/workspace/orca/model_router.py") as f:
        router_src = f.read()
    prompt_a = (
        "You are analyzing a small Python module (pasted below) that routes mission steps "
        "to models. Task: specify where and how to add a new module-level function "
        "`build_dispatch_envelope(step) -> dict` in a NEW file dispatch.py.\n\n"
        f"ENVELOPE SCHEMA (must be honored):\n{ENVELOPE_SPEC}\n\n"
        "ROUTER SOURCE (read-only, do not modify):\n" + router_src[:6000] +
        "\n\nReturn: (1) exact function placement, (2) how it calls route(step), "
        "(3) edge cases (e.g. SENSITIVE data_class -> empty eligible list), "
        "(4) what the deterministic verifier should check. Be concise. No code.")
    analysis, attempts_a = call_model(worker_a, prompt_a)
    evidence["analysis"] = {
        "worker": worker_a, "router_reason": d1.reason,
        "attempts_used": attempts_a,
        "analysis_chars": len(analysis),
        "analysis_path": f"{EVIDENCE_DIR}/analysis.md",
    }
    with open(f"{EVIDENCE_DIR}/analysis.md", "w") as f:
        f.write(analysis or "(worker A produced no output)")
    print(f"Analysis received: {len(analysis)} chars (recorded, not graded)")

    # ---- STEP 2: IMPLEMENTATION (worker B = Laguna), attempt 1 with injected fault ----
    print("\n--- STEP 2: IMPLEMENTATION (worker B), attempt 1 [FAULT INJECTED] ---")
    s2 = StepSpec(task_type="code_implementation",
                  required_capabilities=["coding"],
                  data_class=DATA_CLASS_PUBLIC,
                  verification_strategy="deterministic schema checks by Mission Control")
    d2 = route(s2)
    # Ensure worker B differs from worker A for the two-worker proof
    worker_b = d2.selected_model
    if worker_b == worker_a and d2.fallback_order:
        worker_b = d2.fallback_order[0]
    print(f"Router -> {worker_b.split('/')[-1]}")

    prompt_b = (
        "Implement a NEW Python file's full contents. The file will be saved as dispatch.py. "
        "It must define exactly one public function:\n\n"
        "def build_dispatch_envelope(step) -> dict:\n"
        '    """Build a deterministic dispatch envelope for a mission step."""\n\n'
        f"SCHEMA (must be honored exactly):\n{ENVELOPE_SPEC}\n\n"
        "The `step` argument is a StepSpec dataclass with attributes: task_type, "
        "required_capabilities, data_class, context_size, tool_requirement, latency_class, "
        "verification_strategy.\n"
        "EXACT API FACTS about model_router (do not invent anything else):\n"
        "- from model_router import route, StepSpec, DATA_CLASS_PUBLIC, DATA_CLASS_INTERNAL, DATA_CLASS_SENSITIVE, DATA_CLASS_RESTRICTED_LOGGING\n"
        "- route(step) returns a RoutingDecision DATACLASS instance. Access its fields as ATTRIBUTES: "
        "decision.eligible_models, decision.selected_model, decision.fallback_order, decision.reason. "
        "It is NOT a dict; decision[\"eligible_models\"] will raise TypeError.\n"
        "- There is NO name DATA_CLASS_PRIVATE in model_router. Do not import it.\n"
        "For the 'step' dict in the envelope, include all seven StepSpec attributes. "
        "issued_at: datetime.now(timezone.utc).isoformat(). "
        "Handle SENSITIVE data_class honestly: route() already returns empty eligible_models; "
        "pass the decision through unchanged.\n\n"
        "Return ONLY the complete file contents: imports, then the function. "
        "No explanation, no markdown fences.\n"
        'End your response with the line: SELF-REPORT: implementation complete, all checks pass.')
    code_b, attempts_b = call_model(worker_b, prompt_b)
    worker_claim = extract_self_report(code_b)
    print(f"Worker B claim: {worker_claim[:100]}")

    # Strip the SELF-REPORT line from code before admission
    code_lines = [l for l in code_b.split("\n") if "SELF-REPORT" not in l]
    clean_code = "\n".join(code_lines).strip()

    # INJECTED FAULT at admission
    admitted_code, fault_desc = inject_fault(clean_code)
    print(f"INJECTED FAULT: {fault_desc}")
    attempt1_path = f"{EVIDENCE_DIR}/dispatch_attempt1.py"
    with open(attempt1_path, "w") as f:
        f.write(admitted_code)

    # ---- STEP 3: DETERMINISTIC VERIFICATION of attempt 1 ----
    print("\n--- STEP 3: INDEPENDENT VERIFICATION (attempt 1) ---")
    passed1, details1 = verify_dispatch_module(attempt1_path, "attempt_1_injected")
    failed_checks = [c["name"] for c in details1["checks"] if not c["ok"]]
    print(f"Verifier: {'PASS' if passed1 else 'FAIL'}; failed checks: {failed_checks}")

    attempt1 = {
        "n": 1,
        "worker": worker_b,
        "worker_claim": worker_claim,
        "injected_fault": fault_desc,
        "verifier_passed": passed1,
        "failed_checks": failed_checks,
        "artifact_path": attempt1_path,
    }
    evidence["attempts"].append(attempt1)

    # ---- EPISTEMIC GATE ----
    print("\n--- EPISTEMIC GATE ---")
    if passed1:
        print("UNEXPECTED: verifier passed on corrupted artifact. Mission cannot proceed honestly.")
        evidence["epistemic_gate"] = "INCONCLUSIVE: fault did not trigger verifier"
        evidence["mission_status"] = "INCONCLUSIVE"
    else:
        # THE CORE PROOF: worker said SUCCESS, verifier says FAIL.
        evidence["epistemic_gate"] = {
            "worker_claim": "SUCCESS",
            "verifier_result": "FAIL",
            "mission_becomes_verified_success": False,
            "statement": "WORKER SAYS SUCCESS + VERIFIER SAYS FAIL -> MISSION DOES NOT BECOME VERIFIED SUCCESS",
        }
        evidence["mission_status"] = "NOT_VERIFIED_AFTER_ATTEMPT_1"
        print("Worker claim: SUCCESS | Verifier: FAIL")
        print("=> mission_status = NOT_VERIFIED_AFTER_ATTEMPT_1 (NOT verified success)")

    # ---- STEP 4: RECOVERY via fallback worker, clean artifact ----
    print("\n--- STEP 4: RECOVERY (fallback worker, clean artifact) ---")
    s4 = StepSpec(task_type="code_implementation",
                  required_capabilities=["coding"],
                  data_class=DATA_CLASS_PUBLIC,
                  verification_strategy="deterministic schema checks by Mission Control")
    d4 = route(s4)
    # Fallback: first eligible model that is NOT worker B
    worker_c = next((m for m in [d4.selected_model] + d4.fallback_order if m != worker_b),
                    d4.selected_model)
    print(f"Router fallback -> {worker_c.split('/')[-1]}")
    prompt_c = prompt_b.replace(
        "End your response with the line: SELF-REPORT: implementation complete, all checks pass.",
        "A previous attempt produced a malformed envelope (missing required key). "
        "Produce the correct implementation carefully honoring every required key. "
        "No explanation, no markdown fences.\n"
        "End your response with the line: SELF-REPORT: implementation complete, all checks pass.")
    code_c, attempts_c = call_model(worker_c, prompt_c)
    claim_c = extract_self_report(code_c)
    clean_c = "\n".join(l for l in code_c.split("\n") if "SELF-REPORT" not in l).strip()
    # NO fault injection on recovery attempt: admit cleanly
    attempt2_path = f"{EVIDENCE_DIR}/dispatch_attempt2.py"
    with open(attempt2_path, "w") as f:
        f.write(clean_c)

    print("\n--- STEP 5: INDEPENDENT VERIFICATION (attempt 2, clean) ---")
    passed2, details2 = verify_dispatch_module(attempt2_path, "attempt_2_clean")
    failed2 = [c["name"] for c in details2["checks"] if not c["ok"]]
    print(f"Verifier: {'PASS' if passed2 else 'FAIL'}; failed checks: {failed2}")

    evidence["attempts"].append({
        "n": 2,
        "worker": worker_c,
        "worker_claim": claim_c,
        "injected_fault": None,
        "verifier_passed": passed2,
        "failed_checks": failed2,
        "artifact_path": attempt2_path,
    })

    # Promote attempt 2 artifact to the real module ONLY if verifier passed
    final_path = "/home/hatch/workspace/orca/dispatch.py"
    if passed2:
        with open(final_path, "w") as f:
            f.write(clean_c)
        evidence["mission_status"] = "VERIFIED_SUCCESS"
        evidence["promoted_artifact"] = final_path
        print(f"\nPromoted verified artifact -> {final_path}")
    else:
        evidence["mission_status"] = "NOT_VERIFIED_AFTER_ATTEMPT_2"
        print("\nRecovery attempt also failed verification; nothing promoted.")

    evidence["completed_at"] = datetime.now(timezone.utc).isoformat()
    with open(f"{EVIDENCE_DIR}/evidence.json", "w") as f:
        json.dump(evidence, f, indent=2)

    # ---- FINAL SCREEN ----
    print("\n" + "=" * 70)
    print("MISSION:", "VERIFIED SUCCESS" if evidence["mission_status"] == "VERIFIED_SUCCESS"
          else evidence["mission_status"])
    print("=" * 70)
    workers = sorted(set([evidence["analysis"]["worker"].split("/")[-1]] +
                         [a["worker"].split("/")[-1] for a in evidence["attempts"]]))
    print(f"WORKERS: {', '.join(workers)}")
    print("ATTEMPT 1: worker=SUCCESS claim, injected fault, verifier=FAIL -> NOT verified success")
    print(f"ATTEMPT 2: worker={worker_c.split('/')[-1]}, clean, verifier={'PASS' if passed2 else 'FAIL'}")
    print(f"EVIDENCE: {EVIDENCE_DIR}/evidence.json")
    total_retries = attempts_a + attempts_b + attempts_c - 3
    print(f"RETRIES/FALLBACKS: model-call retries={total_retries}, fallback worker used=yes")
    print("COST: $0 (free endpoints)")


if __name__ == "__main__":
    run_mission()
