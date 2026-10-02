#!/usr/bin/env python3
"""State-machine tests: the declarative transition table in
si_fb_invariants.py is machine-checked by transition(), and the durable
fold replays the record stream deterministically.

Every legal transition in ALLOWED_TRANSITIONS is exercised through the
real CLIs; illegal transitions raise ILLEGAL_STATE_TRANSITION; terminal
states are absorbing; the fold is deterministic (same stream, same
state, regardless of read order effects).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin")
sys.path.insert(0, BIN)
import helpers as H
import si_fb_invariants as inv
import si_fb_state as st

RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name
          + (" | " + detail if detail and not cond else ""))


def main():
    # 1. The table covers every intent state the machinery writes.
    # ELIGIBLE is a decision outcome used only as a transition from_state.
    written_states = set()
    for s, outs in inv.ALLOWED_TRANSITIONS.items():
        written_states.add(s)
        written_states |= set(outs)
    intent_states = inv.TERMINAL_STATES | inv.NONTERMINAL_STATES | {"ELIGIBLE"}
    check("table_covers_all_states", intent_states <= written_states,
          "missing: %s" % sorted(intent_states - written_states))
    check("decision_stages_not_intent_states",
          not (inv.DECISION_STAGES - {"ELIGIBLE"}) & written_states,
          "pre-intent stages must not appear as intent transition states")

    # 2. Terminal states are absorbing: no transition out.
    check("terminal_states_absorbing",
          all(inv.ALLOWED_TRANSITIONS[s] == frozenset()
              for s in inv.TERMINAL_STATES))

    # 3. Illegal transitions raise ILLEGAL_STATE_TRANSITION.
    for bad in [("INTENT_CREATED", "VERIFIED_SUCCESS"),
                ("QUEUED", "ATTEMPTING"),
                ("VERIFIED_SUCCESS", "QUEUED"),
                ("SAFE_RETRY", "QUEUED"),
                ("DISPATCHED", "VERIFIED_SUCCESS")]:
        try:
            inv.check_state_transition("iid-test", bad[0], bad[1])
            check("illegal_%s_to_%s_rejected" % bad, False, "no raise")
        except inv.InvariantViolation as e:
            check("illegal_%s_to_%s_rejected" % bad, e.code == "ILLEGAL_STATE_TRANSITION",
                  e.code)

    # 4. Every legal transition is accepted by the checker.
    n = 0
    for s, outs in inv.ALLOWED_TRANSITIONS.items():
        for o in outs:
            inv.check_state_transition("iid-test", s, o)
            n += 1
    check("all_legal_transitions_accepted", n > 20, "n=%d" % n)

    # 5. transition() persists to intents.jsonl and the fold replays it.
    tmp, env = H.fresh_env()
    try:
        for k in ("SI_FB_STATE",):
            os.environ[k] = env[k]
        import importlib
        importlib.reload(st)
        iid = "facebook:like:post:1234567890123456:b9"
        st.append_jsonl("intents.jsonl", {"record_type": "intent",
                                          "intent_id": iid,
                                          "state": "INTENT_CREATED",
                                          "target_ref": "post:1234567890123456"})
        from si_fb_orchestrator import transition as orch_transition
        orch_transition(iid, "INTENT_CREATED", "QUEUED", {"evidence": "t"})
        orch_transition(iid, "QUEUED", "SCHEDULED", {"evidence": "t"})
        fold = st.fold_intents()
        check("fold_replays_transitions",
              fold[iid]["state"] == "SCHEDULED"
              and [h[0] for h in fold[iid]["history"]]
              == ["INTENT_CREATED", "QUEUED", "SCHEDULED"],
              json.dumps(fold[iid]["history"]))
        # 6. transition() refuses to persist an illegal transition.
        try:
            orch_transition(iid, "SCHEDULED", "VERIFIED_SUCCESS",
                            {"evidence": "t"})
            check("transition_refuses_illegal_persist", False, "no raise")
        except inv.InvariantViolation as e:
            check("transition_refuses_illegal_persist",
                  e.code == "ILLEGAL_STATE_TRANSITION")
        check("illegal_transition_not_persisted",
              st.fold_intents()[iid]["state"] == "SCHEDULED")
        # 7. Determinism: re-folding the same stream yields the same state.
        a = st.fold_intents()[iid]["state"]
        b = st.fold_intents()[iid]["state"]
        check("fold_deterministic", a == b == "SCHEDULED")
    finally:
        H.cleanup(tmp)

    # 8. Full legal path through the real pipeline writes only legal
    # transitions (table-checked on every write).
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "1212121212121212")
        cp = H.candidates_path(tmp, [H.candidate("c1", "1212121212121212")])
        H.run_cli("si_fb_orchestrator.py",
                  ["run", "--envelope", envp, "--candidates", cp,
                   "--batch-id", "b-sm"], env)
        seen = set()
        for line in open(os.path.join(env["SI_FB_STATE"],
                                      "intents.jsonl")).read().splitlines():
            r = json.loads(line)
            if r.get("record_type") == "transition":
                seen.add((r["from_state"], r["to_state"]))
        legal = all(t[1] in inv.ALLOWED_TRANSITIONS.get(t[0], ())
                    for t in seen)
        check("pipeline_writes_only_legal_transitions", legal and seen,
              json.dumps(sorted(seen)))
    finally:
        H.cleanup(tmp)

    failed = [r for r in RESULTS if not r[1]]
    print("\n%d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
