#!/usr/bin/env python3
"""Adversarial tests: the machinery under attack. Each test stages a
realistic adversarial condition and asserts the fail-closed behavior.

All state is scratch; the only fake is the boundary adapter fixture.
"""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import helpers as H

RESULTS = []


def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name
          + (" | " + detail if detail and not cond else ""))


def fold_states(env):
    p = os.path.join(env["SI_FB_STATE"], "intents.jsonl")
    if not os.path.isfile(p):
        return {}
    intents = {}
    for line in open(p).read().splitlines():
        r = json.loads(line)
        iid = r.get("intent_id")
        if not iid:
            continue
        if r.get("record_type") == "intent":
            intents[iid] = r.get("state")
        elif r.get("record_type") == "transition":
            intents[iid] = r["to_state"]
    return intents


def set_hold(env, held):
    with open(env["HOLDS_JSON_PATH"], "w") as f:
        json.dump({"holds": {"facebook": {"held": held}}}, f)


def main():
    # 1. Duplicate discovery in one batch: the guard's batch dedup means
    # only one intent is created for the same post.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2020202020202020")
        c = H.candidate("c1", "2020202020202020")
        c2 = H.candidate("c2", "2020202020202020")
        cp = H.candidates_path(tmp, [c, c2])
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-1"], env)
        out = json.loads(p.stdout)
        states = {r["candidate"]: r["state"] for r in out["results"]}
        check("duplicate_discovery_one_intent",
              states["c1"] == "VERIFIED_SUCCESS"
              and states["c2"] in ("REJECTED", "DEFERRED"),
              json.dumps(states))
        n = sum(1 for s in fold_states(env).values()
                if s == "VERIFIED_SUCCESS")
        check("duplicate_discovery_single_mutation", n == 1,
              json.dumps(fold_states(env)))
    finally:
        H.cleanup(tmp)

    # 2. Cross-batch duplicate while in flight: batch 2 for the same post
    # is refused even though the intent_ids differ.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2121212121212121")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2121212121212121")])
        env["SI_FB_CRASH_AT"] = "before_execute"
        H.run_cli("si_fb_orchestrator.py",
                  ["run", "--envelope", envp, "--candidates", cp,
                   "--batch-id", "b-adv-2a"], env, expect=99)
        env.pop("SI_FB_CRASH_AT", None)
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-2b"], env, expect=2)
        check("cross_batch_in_flight_refused",
              "NO_DUPLICATE_ACTIVE_INTENT" in p.stderr, p.stderr[:200])
        check("cross_batch_no_mutation",
              json.load(open(os.path.join(
                  env["SI_FB_STATE"],
                  "adapter_facebook.json")))["posts"]["2121212121212121"]
              ["like_count"] == 0)
    finally:
        H.cleanup(tmp)

    # 3. Two workers, one dispatch lease: the loser does not execute.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2222222222222222")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2222222222222222")])
        # Simulate another worker holding the dispatch lease.
        lp = os.path.join(env["SI_FB_STATE"], "leases.json")
        json.dump({"fb:dispatch": {"holder": "other-worker",
                                   "acquired": time.time(),
                                   "expires": time.time() + 900}},
                  open(lp, "w"))
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-3"], env, expect=None)
        like_count = json.load(open(os.path.join(
            env["SI_FB_STATE"],
            "adapter_facebook.json")))["posts"]["2222222222222222"]["like_count"]
        check("lease_contention_no_execution", like_count == 0,
              "like_count=%r rc=%r" % (like_count, p.returncode))
        check("lease_contention_fails_closed", p.returncode != 0,
              "rc=%r" % p.returncode)
    finally:
        H.cleanup(tmp)

    # 4. Authority revoked before the pass: nothing is created, nothing
    # mutates. The machine-readable hold is the only freeze mechanism.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2323232323232323")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2323232323232323")])
        set_hold(env, True)
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-4"], env, expect=None)
        check("hold_blocks_pass", p.returncode != 0, "rc=%r" % p.returncode)
        check("hold_no_intents", fold_states(env) == {})
        check("hold_no_mutation",
              json.load(open(os.path.join(
                  env["SI_FB_STATE"],
                  "adapter_facebook.json")))["posts"]["2323232323232323"]
              ["like_count"] == 0)
        set_hold(env, False)
    finally:
        H.cleanup(tmp)

    # 5. Authority revoked between crash and resume: resume refuses at the
    # gate; the in-flight intent is not dispatched.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2424242424242424")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2424242424242424")])
        env["SI_FB_CRASH_AT"] = "before_execute"
        H.run_cli("si_fb_orchestrator.py",
                  ["run", "--envelope", envp, "--candidates", cp,
                   "--batch-id", "b-adv-5"], env, expect=99)
        env.pop("SI_FB_CRASH_AT", None)
        set_hold(env, True)
        p = H.run_cli("si_fb_orchestrator.py",
                      ["resume", "--envelope", envp,
                       "--batch-id", "b-adv-5"], env, expect=None)
        check("hold_blocks_resume", p.returncode != 0, "rc=%r" % p.returncode)
        check("hold_resume_no_mutation",
              json.load(open(os.path.join(
                  env["SI_FB_STATE"],
                  "adapter_facebook.json")))["posts"]["2424242424242424"]
              ["like_count"] == 0)
        set_hold(env, False)
    finally:
        H.cleanup(tmp)

    # 6. Expired credential: reported, never blind-retried. Recovery goes
    # through resume with the full gate chain, not a naked re-execute.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2525252525252525")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2525252525252525")])
        env["SI_FB_ADAPTER_FAULT"] = "expired_credential"
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-6"], env)
        out = json.loads(p.stdout)
        check("expired_credential_failed_retryable",
              out["results"][0]["state"] == "FAILED_RETRYABLE",
              json.dumps(out["results"]))
        env.pop("SI_FB_ADAPTER_FAULT", None)
        p = H.run_cli("si_fb_orchestrator.py",
                      ["resume", "--envelope", envp,
                       "--batch-id", "b-adv-6"], env)
        out = json.loads(p.stdout)
        check("expired_credential_resume_recovers",
              out["resumed"][0]["state"] == "VERIFIED_SUCCESS",
              json.dumps(out["resumed"]))
    finally:
        H.cleanup(tmp)

    # 7. Adapter lies about success: read-after-write verification catches
    # the lie; the lie is recorded as a verification failure.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2626262626262626")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2626262626262626")])
        env["SI_FB_ADAPTER_FAULT"] = "lie_about_success"
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-7"], env)
        env.pop("SI_FB_ADAPTER_FAULT", None)
        out = json.loads(p.stdout)
        check("adapter_lie_caught",
              out["results"][0]["state"] == "FAILED_RETRYABLE",
              json.dumps(out["results"]))
        wd = [json.loads(l) for l in
              open(os.path.join(env["SI_FB_STATE"],
                                "watchdog.jsonl")).read().splitlines()]
        check("adapter_lie_recorded",
              any(w.get("event") == "verification_failure"
                  for w in wd), json.dumps(wd)[:200])
        check("adapter_lie_no_real_mutation",
              json.load(open(os.path.join(
                  env["SI_FB_STATE"],
                  "adapter_facebook.json")))["posts"]["2626262626262626"]
              ["like_count"] == 0)
    finally:
        H.cleanup(tmp)

    # 8. Budget race: five processes hammer the same scope; the atomic
    # consume admits exactly the cap, never more.
    tmp, env = H.fresh_env()
    try:
        bin_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "..", "bin")
        script = (
            "import os, sys; sys.path.insert(0, %r); "
            "os.environ['SI_FB_STATE'] = %r; "
            "import si_fb_state as st; "
            "wins = sum(1 for _ in range(4) "
            "if st.budget_consume('race:scope', 3, 3600)[0]); "
            "print(wins)"
            % (bin_dir, env["SI_FB_STATE"]))
        procs = [subprocess.Popen([sys.executable, "-c", script],
                                  stdout=subprocess.PIPE, env=env)
                 for _ in range(5)]
        total_wins = 0
        for pr in procs:
            out, _ = pr.communicate(timeout=60)
            total_wins += int(out.decode().strip().split()[-1])
        budgets = json.load(open(os.path.join(env["SI_FB_STATE"],
                                              "budgets.json")))
        consumed = budgets["race:scope"]["consumed"]
        check("budget_race_exact_cap", consumed == 3 and total_wins == 3,
              "consumed=%r wins=%r" % (consumed, total_wins))
    finally:
        H.cleanup(tmp)

    # 9. Lease expiry: a dead holder's lease does not block forever.
    tmp, env = H.fresh_env()
    try:
        bin_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "..", "bin")
        script = (
            "import os, sys; sys.path.insert(0, %r); "
            "os.environ['SI_FB_STATE'] = %r; "
            "import si_fb_state as st, time; "
            "a = st.lease_acquire('l1', 'holder-a', 900); "
            "b = st.lease_acquire('l1', 'holder-b', 900); "
            "c = st.lease_acquire('l2', 'holder-a', -1); "
            "d = st.lease_acquire('l2', 'holder-b', 900); "
            "print(a, b, c, d)"
            % (bin_dir, env["SI_FB_STATE"]))
        p = subprocess.run([sys.executable, "-c", script],
                           capture_output=True, text=True, env=env,
                           timeout=60)
        check("lease_expiry_semantics", p.stdout.strip() == "True False True True",
              p.stdout.strip() + p.stderr[:200])
    finally:
        H.cleanup(tmp)

    # 10. Identity ambiguity: a candidate with no identity signals is
    # dropped, never dispatched on a guess.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        amb = {"candidate_id": "amb", "platform": "facebook", "type": "like"}
        cp = H.candidates_path(tmp, [amb])
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-10"], env)
        out = json.loads(p.stdout)
        check("identity_ambiguity_dropped",
              out["results"][0]["state"] in ("REJECTED", "DEFERRED"),
              json.dumps(out["results"]))
        check("identity_ambiguity_no_intent", fold_states(env) == {})
    finally:
        H.cleanup(tmp)

    # 11. Relationship saturation: two touches in 30d exhaust the budget;
    # the third candidate is dropped.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        H.seed_adapter_post(env, "2727272727272727")
        now = subprocess.run(
            [sys.executable, "-c",
             "from datetime import datetime, timezone; "
             "print(datetime.now(timezone.utc).isoformat())"],
            capture_output=True, text=True, timeout=30).stdout.strip()
        with open(os.path.join(env["SI_FB_STATE"],
                               "relationships.json"), "w") as f:
            json.dump({"test bakery": {"touches": [now, now]}}, f)
        cp = H.candidates_path(tmp, [H.candidate("c1", "2727272727272727")])
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-11"], env)
        out = json.loads(p.stdout)
        check("saturation_dropped",
              out["results"][0]["state"] in ("REJECTED", "DEFERRED"),
              json.dumps(out["results"]))
        check("saturation_no_mutation",
              json.load(open(os.path.join(
                  env["SI_FB_STATE"],
                  "adapter_facebook.json")))["posts"]["2727272727272727"]
              ["like_count"] == 0)
    finally:
        H.cleanup(tmp)

    # 12. Negative-feedback spike: the watchdog opens the platform breaker;
    # the breaker grants no authority, only stops mutations.
    tmp, env = H.fresh_env()
    try:
        envp = H.envelope_path(tmp)
        for i in range(5):
            pid = "28%014d" % i
            H.seed_adapter_post(env, pid, liked=True, like_count=3,
                                negative_feedback=True)
        p = H.run_cli("si_fb_watchdog.py",
                      ["tick", "--envelope", envp], env)
        tick = json.loads(p.stdout)
        brk = json.load(open(os.path.join(
            env["SI_FB_STATE"], "circuit_breakers.json")))
        check("neg_feedback_opens_breaker",
              brk.get("platform:facebook", {}).get("open") is True,
              json.dumps(tick)[:300])
        # With the breaker open, a new pass dispatches nothing.
        H.seed_adapter_post(env, "2828282828282828")
        cp = H.candidates_path(tmp, [H.candidate("c1", "2828282828282828")])
        p = H.run_cli("si_fb_orchestrator.py",
                      ["run", "--envelope", envp, "--candidates", cp,
                       "--batch-id", "b-adv-12"], env, expect=None)
        check("breaker_stops_dispatch",
              json.load(open(os.path.join(
                  env["SI_FB_STATE"],
                  "adapter_facebook.json")))["posts"]["2828282828282828"]
              ["like_count"] == 0)
    finally:
        H.cleanup(tmp)

    # 13. Learner stays SHADOW: no code path applies learner output to
    # policy. The only learner touchpoint is the bounds check in the
    # invariants module; envelope.py mentions the learner only to say it
    # cannot change the envelope.
    import io as _io
    import tokenize as _tk
    offenders = []
    for fn in sorted(os.listdir(bin_dir)):
        if not fn.endswith(".py"):
            continue
        src = open(os.path.join(bin_dir, fn)).read()
        if fn in ("si_fb_invariants.py",):
            continue  # the bounds check itself
        # Strip comments, docstrings, and string literals; only code counts.
        toks = []
        try:
            for t in _tk.generate_tokens(_io.StringIO(src).readline):
                if t.type in (_tk.COMMENT, _tk.STRING):
                    continue
                toks.append(t.string)
        except _tk.TokenError:
            toks = src.split()
        if "learner" in toks:
            offenders.append(fn)
    check("learner_shadow_no_apply_path", offenders == [],
          "learner referenced in code: %s" % offenders)

    failed = [r for r in RESULTS if not r[1]]
    print("\n%d/%d passed" % (len(RESULTS) - len(failed), len(RESULTS)))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
