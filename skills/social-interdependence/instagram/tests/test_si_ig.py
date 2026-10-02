#!/usr/bin/env python3
"""test_si_ig.py: runnable tests for the Instagram autonomous skill.

Every test runs against scratch state (SI_IG_STATE) and a scratch outreach
tree (ENGAGEMENT_GUARD_DIR), both rebuilt by fresh(). The REAL
engagement-guard.py eligibility function, the REAL authority-check.py gate,
and the REAL state machine/budgets/leases/breakers/watchdog/verifier run in
every test. The ONLY fake is the fixture adapter at the adapter boundary.

Run: python3 tests/run_tests.py
"""
import json
import os
import shutil
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
BIN = os.path.join(HERE, "..", "bin")
sys.path.insert(0, BIN)
sys.path.insert(0, os.path.join(HERE, "..", "fixtures"))
sys.path.insert(0, DATA)

import make_scratch  # noqa: E402
from fixture_ig_adapter import FixtureIgAdapter  # noqa: E402
import siig_common  # noqa: E402
import siig_states as states  # noqa: E402
import siig_guard as sguard  # noqa: E402
import siig_budgets as budgets  # noqa: E402
import siig_leases as leases  # noqa: E402
import siig_breakers as breakers  # noqa: E402
import siig_watchdog as watchdog  # noqa: E402
import siig_learner as learner  # noqa: E402
import siig_verify as verify_mod  # noqa: E402
import siig_decisions as decisions  # noqa: E402
import siig_executor as ex  # noqa: E402
from siig_executor import (build_pass, execute_pass, reconcile,
                           InvariantViolation, AuthorityDenied,
                           CrashNow)  # noqa: E402

STATE = os.environ["SI_IG_STATE"]
OUTREACH = os.environ["ENGAGEMENT_GUARD_DIR"]
WORKER = "test-worker"

RESULTS = []


def fresh(stale_cap=False):
    if os.path.isdir(STATE):
        shutil.rmtree(STATE)
    os.makedirs(STATE)
    if stale_cap:
        make_scratch.build_stale_cap(OUTREACH)
    else:
        make_scratch.build(OUTREACH)
    # drop the cached guard module so the new tree is consulted
    sguard._guard_module = None


def discovery(names=None):
    with open(os.path.join(DATA, "discovery_feed.json")) as f:
        feed = json.load(f)
    if names is None:
        return feed
    return [c for c in feed if c["handle"] in names]


def adapter(mode="success", disc=None, truth=None, identity="nolanpigi"):
    return FixtureIgAdapter(script={"mode": mode},
                            discovery=disc if disc is not None
                            else discovery(),
                            truth=truth, identity=identity)


def envelope():
    return ex.load_envelope()


def run(fn):
    try:
        fn()
        RESULTS.append((fn.__name__, True, ""))
        print("PASS %s" % fn.__name__)
    except Exception as e:
        import traceback
        RESULTS.append((fn.__name__, False, "%s: %s"
                        % (type(e).__name__, e)))
        print("FAIL %s: %s: %s" % (fn.__name__, type(e).__name__, e))
        traceback.print_exc()


# ------------------------------------------------------------------ happy
def test_happy_path():
    fresh()
    env = envelope()
    ad = adapter("success")
    plan = build_pass(ad, env, WORKER)
    assert not plan.get("safe_mode"), plan
    assert plan["discovered"] == 7, plan["discovered"]
    assert len(plan["built"]) == 3, plan["built"]
    assert len(plan["dropped"]) == 4, plan["dropped"]
    res = execute_pass(ad, env, WORKER, plan["batch_id"])
    st = states.current_states()
    idx = states.intents_index()
    real = [i for i in idx if not i.startswith("stub:")]
    assert len(real) == 3, real
    for iid in real:
        assert st[iid] == "VERIFIED_SUCCESS", (iid, st[iid])
    assert ad.execution_count() == 3, ad.executions
    assert ad.execution_count("comment") == 1
    assert ad.execution_count("like") == 2
    # never-re-engage loop: the real guard now blocks all three handles
    g = sguard.guard()
    data = g.load_eligibility_data()
    gindex = g.load_index()
    for handle in ("gj_plumbing_pros", "palisade_fence_co",
                   "fruita_electric_co"):
        v = g.eligibility_check(
            gindex, {"platform": "instagram", "type": "like",
                     "url": "https://www.instagram.com/p/CxNew999/",
                     "page": "@" + handle, "text": "some post text"},
            data=data)
        assert v["decision"] == "INELIGIBLE", (handle, v)
        assert "ALREADY_ENGAGED" in v["reasons"], v["reasons"]
    # relationships recorded only from verified success
    rels = json.load(open(os.path.join(STATE, "relationships.json")))
    assert len(rels) == 3, rels.keys()
    # budget committed, not just reserved
    snap = budgets.BudgetStore().snapshot()
    assert snap["likes"]["committed"] == 2, snap
    assert snap["comments"]["committed"] == 1, snap
    # post-pass verify clean
    assert ex.verify_pass(plan["batch_id"]) == []
    assert res["violations"] == []


def test_guard_blocks_already_engaged():
    fresh()
    env = envelope()
    ad = adapter("success", discovery(["alreadyengaged_plumbing"]))
    plan = build_pass(ad, env, WORKER)
    assert plan["built"] == [], plan["built"]
    assert plan["dropped"] == ["ig-cand-0-alreadyengaged_plumbing"], \
        plan["dropped"]
    # the stub transition evidence carries the guard reason
    recs = [r for r in siig_common.read_jsonl(
        os.path.join(STATE, "transitions.jsonl"))
        if r["to"] == "REJECTED"]
    assert recs and recs[0]["evidence"]["primary_reason"] == \
        "ALREADY_ENGAGED", recs


def test_guard_blocks_engaged_shortcode_saturation():
    fresh()
    env = envelope()
    # FixtureEngaged1 is in the scratch log via a GUARD-RECORD line, under a
    # different handle: shortcode-level saturation must still block.
    disc = [{"handle": "fresh_handle_xyz", "header_name": "Fresh Handle",
             "country": "US", "city": "Grand Junction", "media_type": "photo",
             "post_text": "Furnace install in Grand Junction.",
             "post_url": "https://www.instagram.com/p/FixtureEngaged1/",
             "suggested_action": "like"}]
    ad = adapter("success", disc)
    plan = build_pass(ad, env, WORKER)
    assert plan["built"] == [], plan["built"]


def test_guard_envelope_tamper_refused_at_dispatch():
    fresh()
    actions = [{
        "platform": "instagram", "type": "like",
        "url": "https://www.instagram.com/p/CxPlumbGJ1/",
        "page": "@gj_plumbing_pros", "text": "repiped ranch house",
        "eligibility": {"decision": "ELIGIBLE", "reasons": [],
                        "evidence": [], "function": "x", "ttl_sec": 21600,
                        "data_sha256": {}, "checked_at":
                        "2026-10-01T12:00:00+00:00",
                        "evidence_hash": "tampered"}}]
    passing, refused = sguard.dispatch_refilter(actions)
    assert passing == [] and len(refused) == 1, (passing, refused)
    assert "tamper" in refused[0]["refusal"] or "mismatch" in refused[0][
        "refusal"], refused[0]["refusal"]


def test_stale_capability_safe_mode_at_plan():
    # capability matrix that no longer allows like: planning must not
    # produce like intents; the executor enters safe mode (reads may
    # continue, NEW MUTATIONS STOP), and nothing executes.
    fresh(stale_cap=True)
    env = envelope()
    ad = adapter("success", discovery(["gj_plumbing_pros"]))
    plan = build_pass(ad, env, WORKER)
    assert plan.get("safe_mode") is True, plan
    assert plan["built"] == []
    assert any("like" in r for r in plan["reasons"]), plan["reasons"]
    assert ad.execution_count() == 0


def test_capability_change_between_plan_and_dispatch():
    # the world changed after the envelope was stamped: the dispatch-time
    # evidence check must refuse rather than trust the stale envelope.
    # (With a stale capability matrix at plan time, safe mode already
    # fires first; see test_stale_capability_safe_mode_at_plan. Here the
    # change lands after planning, so the dispatch-time check is the
    # mechanism that catches it.)
    fresh()
    env = envelope()
    ad = adapter("success", discovery(["gj_plumbing_pros"]))
    plan = build_pass(ad, env, WORKER)
    assert len(plan["built"]) == 1
    bb_path = os.path.join(OUTREACH,
                           "eligibility-data/blocked-businesses.json")
    bb = json.load(open(bb_path))
    bb["businesses"].append(
        {"canonical": "gj plumbing pros", "evidence": "test injection",
         "page_ids": [], "post_ids": [], "reason": "test block",
         "variants": []})
    json.dump(bb, open(bb_path, "w"))
    execute_pass(ad, env, WORKER, plan["batch_id"])
    iid = plan["built"][0]
    assert states.state_of(iid) == "CANCELLED", states.state_of(iid)
    recs = [r for r in siig_common.read_jsonl(
        os.path.join(STATE, "transitions.jsonl"))
        if r["intent_id"] == iid and r["to"] == "CANCELLED"]
    assert recs, "cancel record missing"
    ev = recs[0]["evidence"]
    assert "data changed" in json.dumps(ev), ev
    assert ad.execution_count() == 0


# ------------------------------------------------------------- authority
def test_authority_deny_blocks_everything():
    fresh()
    holds_path = os.path.join(OUTREACH, "holds.json")
    holds = json.load(open(holds_path))
    holds["holds"]["instagram"]["held"] = True
    holds["holds"]["instagram"]["reason"] = "test hold"
    json.dump(holds, open(holds_path, "w"), indent=1)
    env = envelope()
    ad = adapter("success")
    try:
        build_pass(ad, env, WORKER)
    except AuthorityDenied:
        pass
    else:
        raise AssertionError("expected AuthorityDenied")
    assert ad.execution_count() == 0
    assert states.intents_index() == {}


def test_authority_fail_closed_on_missing_holds():
    fresh()
    os.unlink(os.path.join(OUTREACH, "holds.json"))
    env = envelope()
    ad = adapter("success")
    try:
        build_pass(ad, env, WORKER)
    except AuthorityDenied:
        return
    raise AssertionError("expected AuthorityDenied on missing holds.json")


# ------------------------------------------------------------- identity
def test_identity_ambiguity_mx_rejected():
    fresh()
    env = envelope()
    ad = adapter("success", discovery(["durango_roofing_mx"]))
    plan = build_pass(ad, env, WORKER)
    assert plan["built"] == [], plan["built"]
    recs = [r for r in siig_common.read_jsonl(
        os.path.join(STATE, "transitions.jsonl"))
        if r["to"] == "REJECTED"]
    assert recs and "precision gate" in recs[0]["evidence"]["note"], recs


def test_prohibited_target_rejected():
    fresh()
    env = envelope()
    ad = adapter("success", discovery(["monumentviewcoffee"]))
    plan = build_pass(ad, env, WORKER)
    assert plan["built"] == [], plan["built"]
    recs = [r for r in siig_common.read_jsonl(
        os.path.join(STATE, "transitions.jsonl"))
        if r["to"] == "REJECTED"]
    assert recs and recs[0]["reason"] == "prohibited target", recs


def test_duplicate_handle_in_batch_rejected():
    fresh()
    env = envelope()
    ad = adapter("success")
    plan = build_pass(ad, env, WORKER)
    assert len(plan["built"]) == 3
    dup_rejects = [r for r in siig_common.read_jsonl(
        os.path.join(STATE, "transitions.jsonl"))
        if r["to"] == "REJECTED" and
        r["reason"] == "within-batch duplicate handle"]
    assert len(dup_rejects) == 1, dup_rejects


def test_no_duplicate_active_intent_across_passes():
    fresh()
    env = envelope()
    ad = adapter("success", discovery(["gj_plumbing_pros"]))
    plan1 = build_pass(ad, env, WORKER)
    assert len(plan1["built"]) == 1
    # second pass before the first executed: the handle still has an active
    # intent, so the invariant must fire instead of double-scheduling.
    try:
        build_pass(ad, env, WORKER)
    except InvariantViolation as e:
        assert "NO_DUPLICATE_ACTIVE_INTENT" in str(e), e
        return
    raise AssertionError("expected NO_DUPLICATE_ACTIVE_INTENT")


def test_two_workers_one_lease():
    fresh()
    env = envelope()
    ad = adapter("success", discovery(["gj_plumbing_pros"]))
    plan = build_pass(ad, env, WORKER)
    iid = plan["built"][0]
    assert leases.acquire(iid, "worker-A") is not None
    assert leases.acquire(iid, "worker-B") is None
    assert leases.release(iid, "worker-B") is False
    assert leases.release(iid, "worker-A") is True


# ------------------------------------------------------------- unknown
def test_timeout_after_success_recovers_without_duplicate():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    truth = {}
    ad = adapter("timeout-after-success", disc, truth=truth)
    plan = build_pass(ad, env, WORKER)
    execute_pass(ad, env, WORKER, plan["batch_id"])
    iid = plan["built"][0]
    assert states.state_of(iid) == "UNKNOWN", states.state_of(iid)
    assert ad.execution_count() == 1
    ad2 = adapter("success", disc, truth=truth)
    rep = reconcile(ad2, env)
    assert states.state_of(iid) == "VERIFIED_SUCCESS", (
        states.state_of(iid), rep)
    assert ad2.execution_count() == 0, "reconcile must not re-execute"
    rels = json.load(open(os.path.join(STATE, "relationships.json")))
    assert len(rels["gj_plumbing_pros"]["touches"]) == 1


def test_adapter_lie_caught_by_verification():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    ad = adapter("lie", disc)
    plan = build_pass(ad, env, WORKER)
    # the lie is caught at verify time on every attempt; bounded retries
    # exhaust and the intent lands FAILED_TERMINAL, never a false success
    res = None
    for _ in range(3):
        res = execute_pass(ad, env, WORKER, plan["batch_id"])
    iid = plan["built"][0]
    st = states.state_of(iid)
    assert st == "FAILED_TERMINAL", st
    assert any(v["kind"] == "adapter-truth-mismatch"
               for v in res["violations"]), res["violations"]
    # no canonical success: no relationship touch, no guard history entry
    assert not os.path.exists(os.path.join(STATE, "relationships.json")) or \
        "gj_plumbing_pros" not in json.load(
            open(os.path.join(STATE, "relationships.json")))
    g = sguard.guard()
    gindex = g.load_index()
    assert "gj_plumbing_pros" not in gindex["platforms"]["instagram"][
        "handles"]


def test_unknown_stays_unknown_on_outage():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    truth = {}
    ad = adapter("timeout-after-success", disc, truth=truth)
    plan = build_pass(ad, env, WORKER)
    execute_pass(ad, env, WORKER, plan["batch_id"])
    iid = plan["built"][0]
    assert states.state_of(iid) == "UNKNOWN"
    # the recovery read itself fails: the honest outcome is to stay UNKNOWN
    rep = reconcile(adapter("outage", disc, truth=truth), env)
    assert states.state_of(iid) == "UNKNOWN", (
        states.state_of(iid), rep)
    assert not os.path.exists(os.path.join(STATE, "relationships.json"))
    # recovery remains possible later; still no duplicate execution
    ad2 = adapter("success", disc, truth=truth)
    reconcile(ad2, env)
    assert states.state_of(iid) == "VERIFIED_SUCCESS"
    assert ad2.execution_count() == 0
    assert ad.execution_count() == 1


def test_kill_after_dispatched_recovers():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    truth = {}
    ad = adapter("success", disc, truth=truth)
    plan = build_pass(ad, env, WORKER)
    iid = plan["built"][0]
    try:
        execute_pass(ad, env, WORKER, plan["batch_id"],
                     crash_points=("after_dispatched",))
    except CrashNow:
        pass
    else:
        raise AssertionError("expected CrashNow")
    # decision replay: the stranded state is exactly DISPATCHED
    assert states.state_of(iid) == "DISPATCHED", states.state_of(iid)
    assert ad.execution_count() == 0
    ad2 = adapter("success", disc, truth=truth)
    rep = reconcile(ad2, env)
    # the crash landed before ATTEMPTING, so adapter.execute() never ran:
    # re-dispatch is safe, and the intent is SCHEDULED, not UNKNOWN
    assert states.state_of(iid) == "SCHEDULED", (
        states.state_of(iid), rep)
    execute_pass(ad2, env, WORKER, plan["batch_id"])
    assert states.state_of(iid) == "VERIFIED_SUCCESS", states.state_of(iid)
    assert ad2.execution_count() == 1
    assert ad.execution_count() == 0


def test_kill_after_attempting_recovers():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    truth = {}
    ad = adapter("success", disc, truth=truth)
    plan = build_pass(ad, env, WORKER)
    iid = plan["built"][0]
    try:
        execute_pass(ad, env, WORKER, plan["batch_id"],
                     crash_points=("after_attempting",))
    except CrashNow:
        pass
    else:
        raise AssertionError("expected CrashNow")
    assert states.state_of(iid) == "ATTEMPTING", states.state_of(iid)
    assert ad.execution_count() == 1
    ad2 = adapter("success", disc, truth=truth)
    reconcile(ad2, env)
    assert states.state_of(iid) == "VERIFIED_SUCCESS", states.state_of(iid)
    assert ad2.execution_count() == 0, "reconcile must not re-execute"
    assert ad.execution_count() == 1


def test_kill_after_intent_created_resumes():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    ad = adapter("success", disc)
    try:
        build_pass(ad, env, WORKER, crash_points=("after_intent_created",))
    except CrashNow:
        pass
    else:
        raise AssertionError("expected CrashNow")
    idx = states.intents_index()
    real = [i for i in idx if not i.startswith("stub:")]
    assert len(real) == 1
    assert states.state_of(real[0]) == "INTENT_CREATED"
    rep = reconcile(ad, env)
    assert states.state_of(real[0]) == "QUEUED", rep
    assert ad.execution_count() == 0, "no execution happened before crash"


def test_expired_credential_enters_safe_mode():
    fresh()
    env = envelope()
    ad = adapter("auth-expired")
    plan = build_pass(ad, env, WORKER)
    assert plan.get("safe_mode") is True, plan
    assert plan["built"] == []
    assert ad.execution_count() == 0


# ------------------------------------------------------------- budget/breaker
def test_budget_race_single_winner():
    fresh()
    budgets.BASE_LIKES = 2
    try:
        store = budgets.BudgetStore()
        assert store.reserve("like") is True
        results = []
        def racer():
            results.append(store.reserve("like"))
        threads = [threading.Thread(target=racer) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert results.count(True) == 1, results
        assert results.count(False) == 3, results
    finally:
        budgets.BASE_LIKES = 50


def test_budget_exhausted_defers():
    fresh()
    budgets.BASE_LIKES = 1
    try:
        env = envelope()
        disc = discovery(["gj_plumbing_pros", "palisade_fence_co"])
        ad = adapter("success", disc)
        plan = build_pass(ad, env, WORKER)
        assert len(plan["built"]) == 1, plan["built"]
        deferred = [r for r in siig_common.read_jsonl(
            os.path.join(STATE, "transitions.jsonl"))
            if r["to"] == "DEFERRED"]
        assert len(deferred) == 1, deferred
    finally:
        budgets.BASE_LIKES = 50


def test_circuit_breaker_opens_on_checkpoint():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros", "palisade_fence_co"])
    ad = adapter("checkpoint", disc)
    plan = build_pass(ad, env, WORKER)
    assert len(plan["built"]) == 2
    execute_pass(ad, env, WORKER, plan["batch_id"])
    st = states.current_states()
    terms = sorted(st[i] for i in plan["built"])
    assert terms == ["DEFERRED", "FAILED_TERMINAL"], terms
    assert breakers.is_open("like") is True
    assert ad.execution_count() == 1


def test_no_execution_after_breaker_open():
    fresh()
    breakers.trip_platform("test trip")
    assert breakers.is_open("like") is True
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    ad = adapter("success", disc)
    plan = build_pass(ad, env, WORKER)
    execute_pass(ad, env, WORKER, plan["batch_id"])
    assert states.state_of(plan["built"][0]) == "DEFERRED"
    assert ad.execution_count() == 0


def test_watchdog_stops_on_failure_rate():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    ad = adapter("fail", disc)
    plan = build_pass(ad, env, WORKER)
    # a failed pass is retried; after the bounded retries exhaust the
    # intent is FAILED_TERMINAL and the watchdog stops dispatch
    for _ in range(3):
        execute_pass(ad, env, WORKER, plan["batch_id"])
    iid = plan["built"][0]
    assert states.state_of(iid) == "FAILED_TERMINAL", states.state_of(iid)
    assert watchdog.stop_active() is True
    m = watchdog.pass_metrics(plan["batch_id"])
    assert m["failure_rate"] > env["maximum_failure_rate"], m


def test_budget_anomaly_trips_stop():
    fresh()
    budgets.atomic_write_json(
        budgets.budget_path(),
        {"window_key": budgets.window_key(), "likes_reserved": 999,
         "likes_committed": 0, "comments_reserved": 0,
         "comments_committed": 0, "updated_at": "x"})
    store = budgets.BudgetStore()
    notes = watchdog.budget_anomaly_check(store.snapshot())
    assert notes, "expected anomaly notes"
    assert watchdog.stop_active() is True


def test_negative_feedback_spike_trips_platform():
    fresh()
    env = envelope()
    disc = discovery(["gj_plumbing_pros"])
    ad = adapter("limited", disc)
    plan = build_pass(ad, env, WORKER)
    execute_pass(ad, env, WORKER, plan["batch_id"])
    iid = plan["built"][0]
    # the effect is honestly recorded...
    assert states.state_of(iid) == "VERIFIED_SUCCESS", states.state_of(iid)
    # ...but the platform breaker opens on the negative-feedback signal
    assert breakers.is_open("like") is True


# ------------------------------------------------------------- learner
def test_learner_out_of_envelope_refused():
    fresh()
    try:
        learner.propose_shadow({"inter_action_delay_sec": 30})
    except ValueError as e:
        assert "outside" in str(e), e
    else:
        raise AssertionError("expected refusal for out-of-bounds param")
    try:
        learner.propose_shadow({"budget": 999})
    except ValueError as e:
        assert "forbidden" in str(e), e
    else:
        raise AssertionError("expected refusal for forbidden key")
    assert not os.path.exists(os.path.join(STATE, "learner", "shadow.json"))


def test_learner_promotion_gates():
    fresh()
    env = envelope()
    learner.propose_shadow({"inter_action_delay_sec": 75})
    learner.promote_shadow_to_canary()
    good = {"unknown_rate": 0.0, "failure_rate": 0.0}
    # gate fails on unverified-success declarations
    try:
        learner.promote_canary_to_active(good, good, env,
                                         unverified_success=1)
    except ValueError as e:
        assert "unverified" in str(e), e
    else:
        raise AssertionError("expected promotion refusal")
    # gate fails when canary is worse than active
    worse = {"unknown_rate": 0.09, "failure_rate": 0.0}
    try:
        learner.promote_canary_to_active(worse, good, env)
    except ValueError as e:
        assert "worse" in str(e), e
    else:
        raise AssertionError("expected promotion refusal")
    # clean promotion passes
    cfg = learner.promote_canary_to_active(good, good, env)
    assert cfg["inter_action_delay_sec"] == 75
    assert learner.active_config()["inter_action_delay_sec"] == 75
    # automatic rollback restores last-known-good
    assert learner.rollback_to_last_known_good("test regression") is True
    assert learner.active_config()["inter_action_delay_sec"] == 90


# ------------------------------------------------------------- content policy
def test_comment_content_policy():
    assert decisions.check_comment_content(
        "Panel labels this clean deserve a frame. Sharp work.") == []
    bad = decisions.check_comment_content(" ".join(["word"] * 21))
    assert any("words" in b for b in bad), bad
    bad = decisions.check_comment_content("Nice work \u2014 really clean.")
    assert any("em dash" in b for b in bad), bad
    bad = decisions.check_comment_content("Great, visit https://example.com")
    assert any("forbidden" in b for b in bad), bad
    bad = decisions.check_comment_content("I need a quote for my panel")
    assert any("customer-posing" in b for b in bad), bad


def test_comment_action_end_to_end():
    fresh()
    env = envelope()
    disc = discovery(["fruita_electric_co"])
    ad = adapter("success", disc)
    plan = build_pass(ad, env, WORKER)
    assert len(plan["built"]) == 1
    iid = plan["built"][0]
    assert iid.split(":")[1] == "comment", iid
    execute_pass(ad, env, WORKER, plan["batch_id"])
    assert states.state_of(iid) == "VERIFIED_SUCCESS"
    assert ad.executions[0]["content"] == \
        "Panel labels this clean deserve a frame. Sharp work."


# ------------------------------------------------------------- misc invariants
def test_no_adapter_decision_authority():
    # the adapter returns observations; every decision is made by the
    # executor/verifier/guard. The fixture has no decide() method at all.
    ad = adapter("success")
    assert not hasattr(ad, "decide")
    assert not hasattr(ad, "choose_target")
    assert not hasattr(ad, "set_policy")


def test_transition_table_forbids_unknown_to_attempting():
    assert "ATTEMPTING" not in states.TRANSITIONS["UNKNOWN"]
    assert not states.legal("UNKNOWN", "ATTEMPTING")
    try:
        states.transition("x", "UNKNOWN", "ATTEMPTING", "evil", {})
    except ValueError as e:
        assert "ILLEGAL TRANSITION" in str(e), e
    else:
        raise AssertionError("expected illegal-transition refusal")


def run_all():
    fns = [v for k, v in sorted(globals().items())
           if k.startswith("test_") and callable(v)]
    for fn in fns:
        run(fn)
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    print("\n%d/%d tests passed" % (passed, len(RESULTS)))
    for name, ok, err in RESULTS:
        if not ok:
            print("FAILED: %s %s" % (name, err))
    return 0 if passed == len(RESULTS) else 1
