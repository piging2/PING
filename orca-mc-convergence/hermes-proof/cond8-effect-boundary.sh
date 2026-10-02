#!/bin/bash
# cond8-effect-boundary.sh — Condition 8: result after potential external effect.
# NO live fire: an effectful prompt is forbidden by the lane contract, and the
# harmless prompts used in this lane cannot cross an external-effect boundary.
# This condition is therefore proven by code-level evidence + gap analysis:
#  8a. WHERE authority is checked (transport is not authority).
#  8b. WHAT the outcome vocabulary can and cannot express (effect-state gap).
set -u
HERE=/home/hatch/workspace/orca-mc-convergence/hermes-proof

echo "--- 8a: authority leg (code locations, all BEFORE any transport invocation)"
grep -n "DENIED_IDENTITY_IDS\|authorizeWorkOrder\|issueWorkOrder\|dispatchHermes(prompt" \
  /home/hatch/workspace/orca-adapter/adapter.js | head -12
echo "--- vendored authorizeWorkOrder gates:"
sed -n '171,210p' /home/hatch/workspace/orca-adapter/vendor/external_agent_adapter.js | grep -n "granted: false" | head -8
echo "--- bridge scripts contain zero authority checks:"
grep -c -e "authoriz" -e "capabilit" /home/hatch/workspace/bin/prompt-hermes.sh || echo "prompt-hermes.sh: 0 authority references (pure transport)"

echo "--- 8b: effect-state gap"
grep -n "COMPLETED:\|FAILED:\|UNKNOWN:\|DENIED:\|ESCALATED:" /home/hatch/workspace/orca-adapter/outcomes.js | head -6
echo "--- constraints reach the worker? (buildWorkerPrompt renders: 8-field spec, context lines, taskBrief, input JSON)"
grep -n "constraints" /home/hatch/workspace/orca-adapter/adapter.js | grep -i "prompt\|buildWorker" || echo "buildWorkerPrompt never renders constraints into the prompt (authorization-time gate only)"
echo "--- safe-mode invocation documented vs actual:"
grep -n "safe-mode" /home/hatch/workspace/orca-adapter/vendor/external_agent_adapter.js | head -2
echo "(vendored profile documents: hermes.exe -z PROMPT --safe-mode -t <toolsets>)"
echo "(actual launcher hermes-launch.py: [VENV_PY, MAIN_PY, -z, prompt] -- no --safe-mode, no toolsets; main.py contains no 'safe-mode' string -- observed via Pig-side grep RC=1)"

python3 <<'PY'
import json
rec = {"condition": 8, "name": "result after potential external effect", "pass": False,
 "verdict": "PARTIAL: transport-not-authority PROVEN; EFFECT_UNKNOWN/HOLD for verified-completed envelopes NOT implemented -> DEFECT-2",
 "evidence": {
  "8a_authority_leg": {
   "location": "orca-adapter/adapter.js dispatchExecution steps 1-3, BEFORE step 4 (dispatch)",
   "step1": "identity fence: identity_5..10 explicitly DENIED (Nolan 2026-09-25)",
   "step2": "vendor.authorizeWorkOrder (external_agent_adapter.js:171) fail-closed: known profile, not blockedExternal/PENDING_AUTH, capability in allowlist, namespace valid, constraints tighten profile max, HARD-requires no_canonical_events=true + no_mission_state_writes=true",
   "step3": "issueWorkOrder re-authorizes (line 213); deterministic work_order_id",
   "bridge": "prompt-hermes.sh / hermes-run.sh / hermes-launch.py contain zero authority checks: pure transport. Bridge is TRANSPORT, never authority: PROVEN.",
  },
  "8b_effect_state_gap_DEFECT_2": {
   "vocabulary": "outcomes.js: {completed, failed, unknown, denied, escalated} -- no external-effect dimension",
   "consequence": "a verified 'completed' envelope from an effectful capability -> terminalOutcome(COMPLETED) -> WORKER_COMPLETED when a runtime is injected. Nothing distinguishes 'completed, no possible effect' from 'completed after unknown effects'. Exit-1 != no-effect is honored for failures/unknowns, but NOT for verified completions.",
   "self_report": "envelope evidence.capabilityPerformed is worker self-report; O5: worker output is a claim until independently proven",
   "constraints": "hermes profile allows only read-only capabilities (fixture.read/text.transform/text.summarize) with maxConstraints {read_only,no_writes,no_network} -- but constraints are authorization-time gates only: buildWorkerPrompt never renders them into the prompt, and nothing technically enforces them on the worker process",
   "safe_mode_discrepancy": "vendored profile documents 'hermes.exe -z PROMPT --safe-mode -t <toolsets>'; actual hermes-launch.py runs [VENV_PY, MAIN_PY, -z, prompt] with no --safe-mode / toolset flags, and main.py contains no 'safe-mode' string (Pig-side grep, RC=1). The read-only posture rests on capability-name allowlisting + prompt instructions, not an enforced sandbox flag in the invocation path.",
   "hold_ownership": "transport half of Q10/HOLD holds: adapter propagates UNKNOWN and never retries (proven cond4/cond7). The caller (WorkerRuntime/Mission Control) owns reconcile-vs-retry. But NOTHING in the spine can emit EFFECT_UNKNOWN/HOLD for a verified-completed envelope.",
   "no_live_fire": "firing this live requires an effectful prompt: forbidden. Harmless prompts in this lane cannot cross the boundary, so EFFECT_UNKNOWN could not honestly arise here either.",
  },
  "candidate_implication": "Hermes may be a CANDIDATE executor for read-only capabilities only AFTER DEFECT-1 (bridge down) is repaired. For any effectful capability, DEFECT-2 (no effect-state in outcome/event vocabulary, no independent effect verification, safe-mode invocation not matching the launcher) must be closed first; until then a verified 'completed' would be recorded clean.",
 }}
json.dump(rec, open("/home/hatch/workspace/orca-mc-convergence/hermes-proof/evidence/cond8-evidence.json", "w"), indent=2)
print(json.dumps(rec, indent=2)[:1500])
print("...COND8_RESULT=PARTIAL (DEFECT-2 filed)")
PY
