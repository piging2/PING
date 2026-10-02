#!/usr/bin/env python3
"""Vertical slice: authorized account -> discovery ingest -> candidate ->
deterministic eligibility (real guard) -> durable intent -> autonomous
scheduling -> authorized execution (FIXTURE adapter at the boundary only) ->
read-after-write verification -> canonical evidence -> relationship update.

Also covers the production intent-ledger pattern (real
action-intent-ledger.py against a scratch ledger) and the scheduler tick.
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import helpers as H

RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name
          + (" | " + detail if detail and not cond else ""))


def state_files(tmp_state):
    out = {}
    for n in ("intents.jsonl", "transitions.jsonl", "observations.jsonl",
              "decision_records.jsonl", "watchdog.jsonl", "budgets.json",
              "relationships.json"):
        p = os.path.join(tmp_state, n)
        out[n] = p if os.path.isfile(p) else None
    return out


def main():
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        # Seed two fake posts on the fake Facebook.
        H.seed_adapter_post(env, "4476644419276001")
        H.seed_adapter_post(env, "4476644419276002")
        cands = [H.candidate("c1", "4476644419276001"),
                 H.candidate("c2", "4476644419276002", page="Second Bakery",
                             text="Bagels every morning! (970) 555-0102.")]

        # 1. Envelope validates; effective budget follows the ramp formula.
        p = H.run_cli("si_fb_envelope.py", ["validate", "--envelope", envp],
                      env)
        v = json.loads(p.stdout)
        check("envelope_validates", v["ok"] and v["action_types"] == ["like", "comment"],
              p.stdout[:200])
        import datetime
        weeks = max(0, (datetime.date.today()
                        - datetime.date(2026, 9, 8)).days // 7)
        check("budget_ramp_formula",
              v["effective_window_budget"]["like"] == 75 + 5 * weeks
              and v["effective_window_budget"]["comment"] == 20 + 3 * weeks,
              json.dumps(v["effective_window_budget"]))

        # 2. Scheduler tick starts a pass (all gates green).
        p = H.run_cli("si_fb_scheduler.py", ["tick", "--envelope", envp], env)
        tick = json.loads(p.stdout)
        check("scheduler_starts_pass", tick["pass_started"], p.stdout[:300])
        batch = tick["batch_id"]

        # 3. Orchestrator runs the slice.
        cp = H.candidates_path(tmp, cands)
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", batch], env)
        out = json.loads(p.stdout)
        states = {r["candidate"]: r["state"] for r in out["results"]}
        check("slice_two_verified_success",
              states == {"c1": "VERIFIED_SUCCESS", "c2": "VERIFIED_SUCCESS"},
              json.dumps(states))

        # 4. Intent ids follow the contract form; intents are durable.
        sf = state_files(env["SI_FB_STATE"])
        intents = [json.loads(l) for l in
                   open(sf["intents.jsonl"]).read().splitlines()
                   if json.loads(l).get("record_type") == "intent"]
        import re
        pat = re.compile(r"^facebook:like:post:\d+:%s$" % re.escape(batch))
        check("intent_id_contract_form",
              len(intents) == 2 and all(pat.match(i["intent_id"])
                                        for i in intents),
              json.dumps([i["intent_id"] for i in intents]))
        check("intent_carries_envelope",
              all(i["eligibility"]["decision"] == "ELIGIBLE"
                  and len(i["eligibility"]["evidence_hash"]) == 64
                  for i in intents))

        # 5. Decision records carry the contract fields (no opaque AI score).
        drecs = [json.loads(l) for l in
                 open(sf["decision_records.jsonl"]).read().splitlines()]
        need = {"candidate_id", "actor", "target", "relationship", "content",
                "platform", "action_candidates", "identity_confidence",
                "relationship_context", "evidence", "capabilities",
                "policy_result", "budget_result", "materiality",
                "uncertainty", "saturation", "outcome_history", "decision",
                "reason"}
        check("decision_record_contract_fields",
              all(need <= set(d.keys()) for d in drecs)
              and all(d["decision"] == "proceed" for d in drecs))

        # 6. Verification evidence is orchestrator read-after-write.
        obs = [json.loads(l) for l in
               open(sf["observations.jsonl"]).read().splitlines()]
        check("observations_verified_success",
              len(obs) == 2 and all(o["state"] == "VERIFIED_SUCCESS"
                                    and o["terminal"] for o in obs),
              json.dumps([o["state"] for o in obs]))
        det = obs[0]["detail"]
        check("verification_is_read_after_write",
              det["method"] == "read_after_write"
              and det["observer"] == "orchestrator"
              and det["observed_effect"] is True, json.dumps(det)[:200])

        # 7. Relationship touches updated.
        rel = json.load(open(sf["relationships.json"]))
        check("relationship_touches",
              len(rel.get("test bakery", {}).get("touches", [])) == 1
              and len(rel.get("second bakery", {}).get("touches", [])) == 1,
              json.dumps(rel))

        # 8. Budgets consumed atomically.
        budgets = json.load(open(sf["budgets.json"]))
        check("budget_consumed",
              budgets["fb:execution:like"]["consumed"] == 2,
              json.dumps(budgets))

        # 9. Re-running the same batch is idempotent: the already-terminal
        # states are reported; nothing is re-created, no budget re-consumed,
        # the platform never touched.
        budgets_before = json.load(open(sf["budgets.json"]))
        n_intents_before = sum(
            1 for l in open(sf["intents.jsonl"]).read().splitlines()
            if json.loads(l).get("record_type") == "intent")
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", batch], env)
        out2 = json.loads(p.stdout)
        check("duplicate_batch_idempotent",
              all(r["state"] == "VERIFIED_SUCCESS"
                  and "already terminal" in r.get("reason", "")
                  for r in out2["results"]), json.dumps(out2["results"]))
        check("duplicate_batch_no_new_intents",
              sum(1 for l in open(sf["intents.jsonl"]).read().splitlines()
                  if json.loads(l).get("record_type") == "intent")
              == n_intents_before)
        check("duplicate_batch_no_budget_reconsumed",
              json.load(open(sf["budgets.json"])) == budgets_before)

        # 10. Production ledger pattern: real action-intent-ledger.py on a
        # scratch ledger (write-intents + record-outcomes with ok booleans).
        job = {"actions": [{"type": "like",
                            "url": "https://www.facebook.com/x/posts/111/",
                            "page": "Ledger Bakery"}],
               "minDelaySec": 60, "maxDelaySec": 120}
        jp = os.path.join(tmp, "job.json")
        json.dump(job, open(jp, "w"))
        lp = os.path.expanduser("~/workspace/outreach/action-intent-ledger.py")
        r = subprocess.run(
            [sys.executable, lp, "write-intents", "--platform", "facebook",
             "--fb-job", "--in", jp, "--pass-id", "fb-test-1"],
            capture_output=True, text=True, env=env, timeout=60)
        check("ledger_write_intents", r.returncode == 0, r.stderr[:200])
        res = {"results": [{"type": "like",
                            "url": "https://www.facebook.com/x/posts/111/",
                            "ok": True, "note": "like registered"}]}
        rp = os.path.join(tmp, "result.json")
        json.dump(res, open(rp, "w"))
        r = subprocess.run(
            [sys.executable, lp, "record-outcomes", "--platform", "facebook",
             "--pass-id", "fb-test-1", "--result-json", rp],
            capture_output=True, text=True, env=env, timeout=60)
        check("ledger_record_outcomes", r.returncode == 0, r.stderr[:200])
        lines = [json.loads(l) for l in
                 open(env["ENGAGEMENT_INTENT_LEDGER"]).read().splitlines()]
        terms = [l.get("terminal") for l in lines
                 if l.get("record_type") == "observation"]
        check("ledger_terminal_executed", "EXECUTED" in terms,
              json.dumps(terms))

        # 11. Scheduler refuses a second pass inside the cadence window.
        p = H.run_cli("si_fb_scheduler.py", ["tick", "--envelope", envp], env)
        tick2 = json.loads(p.stdout)
        check("scheduler_cadence_blocks",
              not tick2["pass_started"] and "cadence" in tick2["reason"],
              tick2["reason"])
    finally:
        H.cleanup(tmp)
    failed = [r for r in RESULTS if not r[1]]
    print("\n%d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
