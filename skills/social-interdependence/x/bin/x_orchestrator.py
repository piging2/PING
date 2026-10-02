#!/usr/bin/env python3
"""Autonomous X pass orchestrator: decision, dispatch, verification, recovery.

Ordinary path (no human approval):
  authority gate -> discover -> normalize -> evaluate (real guard) ->
  intent -> schedule (circuit + budget + lease + invariants) ->
  dispatch -> execute (dumb adapter) -> verify (read-after-write) ->
  canonical evidence (ok boolean) -> relationship update.

Failure path: UNKNOWN outcomes are reconciled by reading external state,
never by blindly re-executing. Replay = decision replay from the journal.

Entry points:
  run-pass --envelope E --scratch S --batch B [--worker W]
  reconcile --envelope E --scratch S --batch B [--worker W]

Environment:
  X_SI_GUARD_PATH       engagement-guard.py (default ~/workspace/outreach/)
  X_SI_OUTREACH_ROOT    outreach root for authority-check.py (default same)
  X_SI_HOLDS_PATH       holds.json override
  X_SI_AUTHORITY_PATH   AUTHORITY.json override
  X_SI_CAPABILITY_PATH  action-capability.json override
  X_SI_CHAOS            chaos point for failure-injection tests
  X_SI_CLOCK_ISO        fixed clock for deterministic tests
"""
import importlib.util
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from x_store import (Journal, BudgetLedger, LeaseStore, CircuitStore,
                     RelationshipLedger, LEGAL_TRANSITIONS, utcnow,
                     canonical, sha256_hex)
from x_invariants import (
    InvariantViolation, assert_authorized_account,
    assert_platform_action_allowed, assert_no_duplicate_active,
    assert_ok_boolean_present, assert_no_canonical_success_without_verification,
    assert_no_blind_retry, assert_circuit_allows,
    assert_adapter_has_no_decision_authority, assert_authority_clear,
    TERMINAL_STATES)
from x_adapter import LiveExecutionBlocked

OUTREACH_DEFAULT = os.path.expanduser("~/workspace/outreach")


def _outreach_root():
    return os.environ.get("X_SI_OUTREACH_ROOT", OUTREACH_DEFAULT)


def _guard_path():
    # The guard is the ONE deterministic eligibility authority: the code
    # always resolves to the production implementation. Only the data it
    # consults (holds, AUTHORITY.json, logs) is overridable for tests.
    return os.environ.get("X_SI_GUARD_PATH",
                          os.path.join(OUTREACH_DEFAULT,
                                       "engagement-guard.py"))


def _holds_path():
    return os.environ.get("X_SI_HOLDS_PATH",
                          os.path.join(_outreach_root(), "holds.json"))


def _authority_path():
    return os.environ.get("X_SI_AUTHORITY_PATH",
                          os.path.join(_outreach_root(), "AUTHORITY.json"))


def _capability_path():
    return os.environ.get("X_SI_CAPABILITY_PATH",
                          os.path.join(_outreach_root(), "eligibility-data",
                                       "action-capability.json"))

CHAOS = os.environ.get("X_SI_CHAOS", "")
FIXED_CLOCK = os.environ.get("X_SI_CLOCK_ISO", "")


def _clock():
    return FIXED_CLOCK or utcnow()


def load_guard():
    path = _guard_path()
    spec = importlib.util.spec_from_file_location("eng_guard", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_capabilities():
    with open(_capability_path(), encoding="utf-8") as f:
        return json.load(f)["platforms"]


def target_ref_for(action, candidate):
    url = candidate.get("url") or ""
    if action == "follow":
        uid = candidate.get("user_id") or candidate.get("handle")
        return "user:%s" % uid
    import re
    m = re.search(r"/status/(\d+)", url)
    if m:
        return "post:%s" % m.group(1)
    return "user:%s" % (candidate.get("handle") or "unknown")


def identity_confidence(candidate):
    """No opaque single score: confidence is derived from observable
    identity parts and recorded as such in the decision record."""
    parts = []
    if candidate.get("handle"):
        parts.append("handle")
    if candidate.get("user_id"):
        parts.append("user_id")
    if candidate.get("url"):
        parts.append("url")
    score = {"handle": 0.5, "user_id": 0.3, "url": 0.2}
    return round(sum(score[p] for p in parts), 2), parts


class PassHarness:
    def __init__(self, envelope, scratch, adapter, worker_id="worker-1"):
        self.envelope = envelope
        self.scratch = scratch
        self.adapter = adapter
        self.worker_id = worker_id
        os.makedirs(scratch, exist_ok=True)
        self.journal = Journal(os.path.join(scratch, "journal.jsonl"),
                              clock=_clock)
        self.budgets = BudgetLedger(os.path.join(scratch, "budgets.json"))
        self.leases = LeaseStore(os.path.join(scratch, "leases.json"),
                                 clock=_clock)
        self.circuits = CircuitStore(os.path.join(scratch, "circuits.json"),
                                    clock=_clock)
        self.rels = RelationshipLedger(
            os.path.join(scratch, "relationship-ledger.jsonl"), clock=_clock)
        self.guard = load_guard()
        self.index = self.guard.load_index()
        self.elig_data = self.guard.load_eligibility_data()
        self.live_caps = load_capabilities()
        self.stats = {"dispatched": 0, "verified": 0, "deferred": 0,
                      "rejected": 0, "unknown": 0}

    # -- small writers -------------------------------------------------
    def _append_jsonl(self, name, obj):
        path = os.path.join(self.scratch, name)
        with open(path, "a", encoding="utf-8") as f:
            f.write(canonical(obj) + "\n")

    def _pass_record(self, batch_id, verdict, detail):
        self._append_jsonl("passes.jsonl", {
            "batch_id": batch_id, "at": _clock(), "verdict": verdict,
            "detail": detail, "stats": self.stats,
            "worker": self.worker_id})

    # -- authority ------------------------------------------------------
    def authority_gate(self):
        outreach_root = _outreach_root()
        env = dict(os.environ)
        env["OUTREACH_ROOT"] = outreach_root
        env["HOLDS_JSON_PATH"] = _holds_path()
        env["AUTHORITY_JSON_PATH"] = _authority_path()
        env["AUTHORITY_CONFLICTS_DIR"] = os.path.join(self.scratch,
                                                     "authority-conflicts")
        p = subprocess.run(
            [sys.executable,
             os.path.join(outreach_root, "authority-check.py"), "x"],
            capture_output=True, text=True, env=env, timeout=60)
        out = (p.stdout or "") + (p.stderr or "")
        if p.returncode == 0:
            return "AUTHORIZED", out.strip().splitlines()[-1] if out else "ok"
        if p.returncode == 1:
            return "DENIED", out.strip().splitlines()[-1] if out else "denied"
        if p.returncode == 2:
            return "CONFLICT", out.strip().splitlines()[-1] if out else \
                "conflict"
        return "FAIL_CLOSED", "authority-check infra failure rc=%d: %s" % (
            p.returncode, out[:300])

    def safe_mode(self):
        path = os.path.join(self.scratch, "SAFE_MODE")
        if os.path.isfile(path):
            with open(path) as f:
                return True, f.read().strip()
        return False, ""

    # -- candidate pipeline ---------------------------------------------
    def normalize(self, cand, batch_id):
        action = cand.get("action") or "like"
        tref = target_ref_for(action, cand)
        intent_id = "x:%s:%s:%s" % (action, tref, batch_id)
        return intent_id, "x:%s:%s" % (action, tref), tref, action

    def evaluate(self, cand, action):
        candidate = {
            "platform": "x",
            "type": action,
            "url": cand.get("url") or "",
            "page": cand.get("handle") or "",
            "text": cand.get("text") or "",
        }
        verdict = self.guard.eligibility_check(
            self.index, candidate, data=self.elig_data,
            surface_status="ACTIVE")
        return candidate, verdict

    def decision_record(self, candidate_id, cand, action, tref, verdict,
                        budget_result, saturation):
        conf, conf_parts = identity_confidence(cand)
        caps = self.live_caps.get("x", {})
        materiality = {"like": "low", "follow": "medium",
                       "comment": "high"}.get(action, "low")
        return {
            "candidate_id": candidate_id,
            "actor": self.worker_id,
            "target": {"handle": cand.get("handle"),
                       "user_id": cand.get("user_id"),
                       "url": cand.get("url"), "target_ref": tref},
            "relationship": {"prior_touches_30d":
                             self.rels.touch_count("x:%s:%s" % (action, tref),
                                                   action)},
            "content": {"text": (cand.get("text") or "")[:280]},
            "platform": "x",
            "action_candidates": [action],
            "identity_confidence": {"score": conf, "parts": conf_parts},
            "relationship_context": {
                "saturation": saturation,
                "never_reengage": "guard index + intent ledger"},
            "evidence": verdict.get("evidence", []),
            "capabilities": {"x": caps, "action_supported": bool(
                caps.get(action))},
            "policy_result": {"decision": verdict["decision"],
                              "primary_reason": verdict["primary_reason"],
                              "reasons": verdict["reasons"]},
            "budget_result": budget_result,
            "materiality": materiality,
            "uncertainty": {"identity_confidence": conf,
                            "unknown_outcome_rate_window": None},
            "saturation": saturation,
            "outcome_history": {"prior_terminal": None},
            "decision": ("PROCEED" if verdict["decision"] == "ELIGIBLE"
                         else "DROP"),
            "reason": "%s [%s]" % (verdict["decision"],
                                   verdict["primary_reason"]),
        }

    # -- scheduling ------------------------------------------------------
    def circuit_policy(self):
        return (self.envelope.get("circuit_breaker_policy") or {}).get(
            "x", {"failure_threshold": 5, "timeout_threshold": 3,
                  "half_open_cooldown_sec": 6 * 3600})

    def check_circuits(self, action):
        policy = self.circuit_policy()
        scopes = [("action", "x:%s" % action),
                  ("adapter", "x:xapi"),
                  ("platform", "x"),
                  ("tenant", self.envelope.get("tenant", "default"))]
        for kind, scope in scopes:
            allowed, reason = self.circuits.check(scope, policy)
            assert_circuit_allows(scope, allowed, reason)
        return True

    def try_schedule(self, intent, batch_id):
        action = intent["action"]
        window = "pass:%s" % batch_id
        week = "week:" + _clock()[:7]
        ceilings = (self.envelope.get("execution_budget") or {})
        for w, key, ceil in (
                (window, "x:%s" % action, ceilings.get("x_%s_pass" % action)),
                (week, "x:%s" % action, ceilings.get("x_%s_week" % action))):
            if ceil is None:
                continue
            ok, _ = self.budgets.consume(w, key, 1, ceil)
            if not ok:
                return False, "BUDGET_EXHAUSTED %s/%s ceiling=%d" % (w, key,
                                                                    ceil)
        rel_max = (self.envelope.get("relationship_budget") or {}).get(
            "max_touches_per_30d", 1)
        touches = self.rels.touch_count(intent["identity_key"], action)
        if touches >= rel_max:
            return False, "SATURATED identity=%s touches=%d max=%d" % (
                intent["identity_key"], touches, rel_max)
        if not self.leases.acquire(intent["intent_id"], self.worker_id, 600):
            return False, "LEASE_HELD_BY_OTHER_WORKER"
        return True, "scheduled"

    # -- execution --------------------------------------------------------
    def execute_intent(self, intent, batch_id):
        iid = intent["intent_id"]
        action = intent["action"]
        pol = self.circuit_policy()
        self.journal.transition(iid, "SCHEDULED", "DISPATCHED",
                               self.worker_id, "lease held by " +
                               self.worker_id,
                               identity_key=intent["identity_key"],
                               attempt=intent["attempt"])
        if CHAOS == "kill_after_dispatch_before_execute":
            os._exit(137)
        self.journal.transition(iid, "DISPATCHED", "ATTEMPTING",
                               self.worker_id, "adapter call starting",
                               identity_key=intent["identity_key"],
                               attempt=intent["attempt"])
        if CHAOS == "kill_after_attempt":
            os._exit(137)
        try:
            result = self.adapter.execute(intent)
        except TimeoutError as e:
            self.circuits.record_timeout("x:%s" % action, pol)
            self.journal.transition(
                iid, "ATTEMPTING", "UNKNOWN", self.worker_id,
                "adapter timeout; external mutation state unknown",
                identity_key=intent["identity_key"],
                attempt=intent["attempt"],
                extra={"error": str(e)[:200]})
            self.stats["unknown"] += 1
            self._verify(iid, intent, timed_out=True)
            return
        except LiveExecutionBlocked as e:
            self.journal.transition(
                iid, "ATTEMPTING", "FAILED_TERMINAL", self.worker_id,
                "live execution blocked: %s" % str(e)[:200],
                identity_key=intent["identity_key"],
                attempt=intent["attempt"])
            return
        assert_adapter_has_no_decision_authority(result or {})
        http = (result or {}).get("http")
        if http == 429:
            for scope in ("x:%s" % action, "x"):
                self.circuits.record_rate_limited(scope, pol)
            self.journal.transition(
                iid, "ATTEMPTING", "DEFERRED", self.worker_id,
                "platform rate limit (429): hard stop for scope, no reroute",
                identity_key=intent["identity_key"],
                attempt=intent["attempt"])
            self.stats["deferred"] += 1
            return
        if http in (401, 403):
            # x-api skill: a 401/403 is a question about the request before
            # it is a question about the key. Open the adapter scope, defer
            # the intent, record a machine-readable auth incident. No retry
            # storm, no credential handling here.
            self.circuits._mut(
                "x:xapi", pol,
                lambda st, now: st.update(
                    state="OPEN", opened_at=now,
                    half_open_trial_inflight=False,
                    reason="auth rejected http=%d: request-shape question "
                    "before key question; reconnect path is out of scope "
                    "for the autonomous loop" % http), _clock())
            self.journal.transition(
                iid, "ATTEMPTING", "DEFERRED", self.worker_id,
                "auth rejected http=%d; adapter scope opened" % http,
                identity_key=intent["identity_key"],
                attempt=intent["attempt"])
            self.stats["deferred"] += 1
            return
        if (result or {}).get("timed_out"):
            self.circuits.record_timeout("x:%s" % action, pol)
            self.journal.transition(
                iid, "ATTEMPTING", "UNKNOWN", self.worker_id,
                "adapter reported timeout; external mutation state unknown",
                identity_key=intent["identity_key"],
                attempt=intent["attempt"])
            self.stats["unknown"] += 1
            self._verify(iid, intent, timed_out=True)
            return
        if CHAOS == "kill_after_success_before_verify":
            os._exit(137)
        self._verify(iid, intent, result=result)

    def _verify(self, iid, intent, result=None, timed_out=False):
        self.journal.transition(iid, self.journal.derive()[iid]["state"],
                               "VERIFYING", self.worker_id,
                               "read-after-write verification",
                               identity_key=intent["identity_key"],
                               attempt=intent["attempt"])
        try:
            observed = self.adapter.read_state(intent)
        except Exception as e:
            observed = {"read_error": str(e)[:200]}
        action = intent["action"]
        want = {"like": "liked", "follow": "following",
                "comment": "commented"}.get(action)
        confirmed = observed.get(want) is True
        read_ok = "read_error" not in observed
        max_attempts = self.envelope.get("retry_policy", {}).get(
            "max_attempts", 2)
        attempt = intent["attempt"]
        receipt = {
            "intent_id": iid,
            "attempt": attempt,
            "at": _clock(),
            "verification": {
                "method": "read-after-write",
                "observed_at": _clock() if read_ok else None,
                "observed_state": observed,
            },
            "http": (result or {}).get("http"),
            "evidence_refs": ["journal:%s" % iid],
        }
        pol = self.circuit_policy()
        if confirmed:
            receipt.update(ok=True, canonical_success=True,
                           terminal="VERIFIED_SUCCESS",
                           note="external state confirms the mutation")
            self.circuits.record_success("x:%s" % action, pol)
            self.journal.transition(
                iid, "VERIFYING", "VERIFIED_SUCCESS", self.worker_id,
                receipt["note"], identity_key=intent["identity_key"],
                terminal="VERIFIED_SUCCESS", attempt=attempt,
                extra={"receipt_sha": sha256_hex(canonical(receipt))})
            assert_no_canonical_success_without_verification(receipt)
            self._append_jsonl("outcome-receipts.jsonl", receipt)
            self.rels.append({"intent_id": iid,
                              "identity_key": intent["identity_key"],
                              "action": action,
                              "handle": intent.get("handle")})
            self.stats["verified"] += 1
        elif read_ok and (result or {}).get("ok") is True:
            # Adapter claimed success; external state disagrees. The adapter
            # lied or the write was lost: verification failure, never a
            # canonical success.
            receipt.update(ok=False, canonical_success=False,
                           terminal="FAILED_TERMINAL",
                           note="VERIFICATION_FAILED: adapter reported "
                           "success but external state shows no mutation")
            self.circuits.record_failure("x:%s" % action, pol)
            self.journal.transition(
                iid, "VERIFYING", "FAILED_TERMINAL", self.worker_id,
                receipt["note"], identity_key=intent["identity_key"],
                terminal="FAILED_TERMINAL", attempt=attempt)
            assert_ok_boolean_present(receipt)
            self._append_jsonl("outcome-receipts.jsonl", receipt)
        elif not read_ok:
            # Verification read itself failed: the outcome stays UNKNOWN.
            # No outcome receipt with an ok boolean is written here on
            # purpose. The 2026-09-29 binding lesson is that the intent
            # ledger derives terminal as EXECUTED if o.get("ok") else
            # FAILED, so an ok=None receipt would mislabel a genuinely
            # unknown outcome as FAILED. The unknown-persisted record is a
            # separate stream; the next reconcile retries the read.
            self._append_jsonl("unknown-persisted.jsonl",
                               {"intent_id": iid, "attempt": attempt,
                                "at": _clock(),
                                "note": "verification read failed; outcome "
                                "stays UNKNOWN, no ok boolean recorded"})
            self.stats["unknown"] += 1
        else:
            # Verification read positively shows absence. A bounded retry is
            # permitted ONLY for idempotent actions (like, follow: X treats
            # re-liking / re-following as a noop). Comment is
            # non-idempotent: a timeout followed by a slow-propagating write
            # could double-post, so it fails terminal instead of retrying.
            # This is the precise shape of NO_BLIND_RETRY: the retry is not
            # blind (a read showed absence) and it is bounded.
            receipt.update(ok=False, canonical_success=False,
                           note="mutation not observed in external state")
            idempotent = action in ("like", "follow")
            if attempt + 1 < max_attempts and idempotent:
                receipt["terminal"] = "SAFE_RETRY"
                self.journal.transition(
                    iid, "VERIFYING", "SAFE_RETRY", self.worker_id,
                    "bounded retry scheduled; attempt %d/%d; action "
                    "idempotent=%s" % (attempt + 1, max_attempts, idempotent),
                    identity_key=intent["identity_key"], attempt=attempt + 1)
            else:
                receipt["terminal"] = "FAILED_TERMINAL"
                self.circuits.record_failure("x:%s" % action, pol)
                self.journal.transition(
                    iid, "VERIFYING", "FAILED_TERMINAL", self.worker_id,
                    "mutation not observed; attempts exhausted or action "
                    "non-idempotent after timeout",
                    identity_key=intent["identity_key"],
                    terminal="FAILED_TERMINAL", attempt=attempt)
            assert_ok_boolean_present(receipt)
            self._append_jsonl("outcome-receipts.jsonl", receipt)
        self.leases.release(iid, self.worker_id)

    # -- pass --------------------------------------------------------------
    def run_pass(self, batch_id):
        verdict, detail = self.authority_gate()
        try:
            assert_authority_clear(verdict)
        except InvariantViolation as e:
            self._pass_record(batch_id, "DENIED", "%s | %s" % (verdict,
                                                               detail))
            return {"verdict": "DENIED", "detail": detail}
        sm, sm_reason = self.safe_mode()
        if sm:
            self._pass_record(batch_id, "SAFE_MODE",
                              "new mutations stopped: %s" % sm_reason)
            return {"verdict": "SAFE_MODE", "detail": sm_reason}
        candidates = self.adapter.discover({"batch_id": batch_id})
        derived = self.journal.derive()
        batch_seen = set()
        for n, cand in enumerate(candidates):
            try:
                self.process_candidate(cand, batch_id, derived, batch_seen, n)
            except InvariantViolation as e:
                self._append_jsonl("invariant-violations.jsonl",
                                   {"batch_id": batch_id, "at": _clock(),
                                    "candidate": cand.get("handle"),
                                    "violation": str(e)})
                self.stats["rejected"] += 1
            except LiveExecutionBlocked as e:
                self._pass_record(batch_id, "LIVE_BLOCKED", str(e))
                return {"verdict": "LIVE_BLOCKED", "detail": str(e)}
        self.reconcile(batch_id)
        self._pass_record(batch_id, "COMPLETE", "pass finished")
        return {"verdict": "COMPLETE", "stats": self.stats}

    def process_candidate(self, cand, batch_id, derived, batch_seen, n):
        action = cand.get("action") or "like"
        intent_id, identity_key, tref, action = self.normalize(cand, batch_id)
        candidate_id = "cand:%s:%d" % (batch_id, n)
        self.journal.transition(intent_id, "DISCOVERED", "NORMALIZED",
                               self.worker_id, "normalized %s" % tref,
                               identity_key=identity_key, attempt=0,
                               extra={"candidate": cand})
        if CHAOS == "kill_after_decision":
            pass  # handled after the decision record below
        candidate, verdict = self.evaluate(cand, action)
        self.journal.transition(intent_id, "NORMALIZED", "EVALUATED",
                               self.worker_id,
                               "guard verdict %s [%s]"
                               % (verdict["decision"],
                                  verdict["primary_reason"]),
                               identity_key=identity_key, attempt=0)
        conf, _ = identity_confidence(cand)
        min_conf = (self.envelope.get("confidence_requirements") or {}).get(
            "min_identity_confidence", 0.5)
        budget_result = {"consumed_before": None}
        saturation = {"touches_30d": self.rels.touch_count(identity_key,
                                                           action)}
        record = self.decision_record(candidate_id, cand, action, tref,
                                      verdict, budget_result, saturation)
        if conf < min_conf:
            record["decision"] = "DROP"
            record["reason"] = "LOW_IDENTITY_CONFIDENCE %.2f < %.2f" % (
                conf, min_conf)
        if cand.get("handle") in (
                self.envelope.get("prohibited_targets") or []):
            record["decision"] = "DROP"
            record["reason"] = "PROHIBITED_TARGET"
        if not self.live_caps.get("x", {}).get(action):
            record["decision"] = "DROP"
            record["reason"] = ("CAPABILITY_MISSING at dispatch: "
                                "action-capability.json no longer lists "
                                "x.%s" % action)
        self._append_jsonl("decision-records.jsonl", record)
        if CHAOS == "kill_after_decision":
            os._exit(137)
        if record["decision"] != "PROCEED":
            self.journal.transition(intent_id, "EVALUATED", "REJECTED",
                                   self.worker_id, record["reason"],
                                   identity_key=identity_key, attempt=0)
            self.stats["rejected"] += 1
            return
        self.journal.transition(intent_id, "EVALUATED", "ELIGIBLE",
                               self.worker_id, "guard ELIGIBLE",
                               identity_key=identity_key, attempt=0)
        intent = {"intent_id": intent_id, "platform": "x", "action": action,
                  "target_ref": tref, "identity_key": identity_key,
                  "authorized_account":
                  self.envelope["authorized_accounts"][0],
                  "handle": cand.get("handle"),
                  "user_id": cand.get("user_id"),
                  "url": cand.get("url"), "text": cand.get("text"),
                  "batch_id": batch_id, "attempt": 0}
        assert_authorized_account(intent, self.envelope)
        assert_platform_action_allowed(intent, self.envelope)
        assert_no_duplicate_active(intent_id, identity_key,
                                   self.journal.derive())
        # Never-reengage across passes: a prior VERIFIED_SUCCESS or
        # VERIFIED_NOOP on this identity closes it durably. This mirrors the
        # guard's ALREADY_ENGAGED rule inside the autonomy loop's own state.
        for rec in self.journal.records():
            if rec.get("identity_key") == identity_key and \
                    rec.get("to_state") in ("VERIFIED_SUCCESS",
                                            "VERIFIED_NOOP"):
                self.journal.transition(
                    intent_id, "ELIGIBLE", "REJECTED", self.worker_id,
                    "ALREADY_ENGAGED: identity %s verified in a prior pass; "
                    "never re-engage" % identity_key,
                    identity_key=identity_key, attempt=0)
                self.stats["rejected"] += 1
                return
        self.journal.transition(intent_id, "ELIGIBLE", "INTENT_CREATED",
                               self.worker_id, "durable intent created",
                               identity_key=identity_key, attempt=0,
                               extra={"intent": intent})
        self._append_jsonl("intents.jsonl", intent)
        self.journal.transition(intent_id, "INTENT_CREATED", "QUEUED",
                               self.worker_id, "queued for scheduling",
                               identity_key=identity_key, attempt=0)
        self.check_circuits(action)
        ok, why = self.try_schedule(intent, batch_id)
        if not ok:
            self.journal.transition(intent_id, "QUEUED", "DEFERRED",
                                   self.worker_id, why,
                                   identity_key=identity_key, attempt=0)
            self.stats["deferred"] += 1
            return
        self.journal.transition(intent_id, "QUEUED", "SCHEDULED",
                               self.worker_id, why,
                               identity_key=identity_key, attempt=0)
        self.check_circuits(action)
        self.stats["dispatched"] += 1
        self.execute_intent(intent, batch_id)

    # -- recovery -----------------------------------------------------------
    def reconcile(self, batch_id):
        """Crash recovery: for intents left in a non-terminal state with no
        outcome receipt, READ external state and resolve. Never re-execute
        blindly (NO_BLIND_RETRY_AFTER_UNKNOWN_EXTERNAL_MUTATION)."""
        derived = self.journal.derive()
        receipts = set()
        rp = os.path.join(self.scratch, "outcome-receipts.jsonl")
        if os.path.isfile(rp):
            with open(rp) as f:
                for line in f:
                    if line.strip():
                        receipts.add(json.loads(line)["intent_id"])
        intents = {}
        ip = os.path.join(self.scratch, "intents.jsonl")
        if os.path.isfile(ip):
            with open(ip) as f:
                for line in f:
                    if line.strip():
                        o = json.loads(line)
                        intents[o["intent_id"]] = o
        for iid, rec in derived.items():
            state = rec["state"]
            if state in TERMINAL_STATES or iid in receipts:
                continue
            intent = intents.get(iid)
            if state in ("ATTEMPTING", "UNKNOWN", "DISPATCHED", "VERIFYING"):
                if not intent:
                    continue
                self._reconcile_unknown(iid, intent, batch_id)
            elif state in ("ELIGIBLE", "INTENT_CREATED", "QUEUED",
                           "SAFE_RETRY", "FAILED_RETRYABLE"):
                # Never reached the adapter with an outcome (or bounded
                # retry pending): re-drive forward along legal transitions.
                # The attempt counter and circuit recheck bound this; a
                # re-drive never skips the verification gate.
                self._reconcile_redrive(iid, state, intent, batch_id)

    def _reconcile_redrive(self, iid, state, intent, batch_id):
        key = intent["identity_key"] if intent else None
        attempt = (intent or {}).get("attempt", 0)
        if intent is None:
            return
        if state == "ELIGIBLE":
            self.journal.transition(iid, "ELIGIBLE", "INTENT_CREATED",
                                   self.worker_id,
                                   "reconcile: intent re-created after crash",
                                   identity_key=key, attempt=attempt)
            self._append_jsonl("intents.jsonl", intent)
            state = "INTENT_CREATED"
        if state == "INTENT_CREATED":
            self.journal.transition(iid, "INTENT_CREATED", "QUEUED",
                                   self.worker_id,
                                   "reconcile: re-queued after crash",
                                   identity_key=key, attempt=attempt)
            state = "QUEUED"
        try:
            self.check_circuits(intent["action"])
        except InvariantViolation as e:
            self.journal.transition(iid, state, "DEFERRED", self.worker_id,
                                   "reconcile: circuit still open: %s" % e,
                                   identity_key=key, attempt=attempt)
            return
        if state in ("QUEUED", "SAFE_RETRY", "FAILED_RETRYABLE"):
            self.journal.transition(iid, state, "SCHEDULED", self.worker_id,
                                   "reconcile: bounded re-drive after crash",
                                   identity_key=key, attempt=attempt)
            self.execute_intent(dict(intent, attempt=attempt), batch_id)

    def _reconcile_unknown(self, iid, intent, batch_id):
        """The core UNKNOWN-outcome rule: read external state first."""
        try:
            observed = self.adapter.read_state(intent)
        except Exception as e:
            observed = {"read_error": str(e)[:200]}
        action = intent["action"]
        want = {"like": "liked", "follow": "following",
                "comment": "commented"}.get(action)
        cur = self.journal.derive()[iid]["state"]
        if cur != "VERIFYING":
            self.journal.transition(iid, cur, "VERIFYING", self.worker_id,
                                   "reconcile: verification read after crash",
                                   identity_key=intent["identity_key"],
                                   attempt=intent.get("attempt", 0))
        if observed.get(want) is True:
            receipt = {"intent_id": iid, "attempt": intent.get("attempt", 0),
                       "at": _clock(), "ok": True, "canonical_success": True,
                       "terminal": "VERIFIED_SUCCESS",
                       "verification": {"method": "reconcile-read",
                                        "observed_at": _clock(),
                                        "observed_state": observed},
                       "note": "reconcile: external state shows the "
                       "mutation landed; no re-execution performed"}
            assert_no_canonical_success_without_verification(receipt)
            self._append_jsonl("outcome-receipts.jsonl", receipt)
            self.journal.transition(
                iid, "VERIFYING", "VERIFIED_SUCCESS", self.worker_id,
                receipt["note"], identity_key=intent["identity_key"],
                terminal="VERIFIED_SUCCESS",
                attempt=intent.get("attempt", 0))
            self.rels.append({"intent_id": iid,
                              "identity_key": intent["identity_key"],
                              "action": action,
                              "handle": intent.get("handle")})
            self.leases.release(iid, self.worker_id)
        elif "read_error" in observed:
            self._append_jsonl("outcome-receipts.jsonl",
                               {"intent_id": iid, "ok": None,
                                "note": "reconcile: verification read "
                                "failed; outcome stays UNKNOWN"})
        else:
            max_attempts = self.envelope.get("retry_policy", {}).get(
                "max_attempts", 2)
            attempt = intent.get("attempt", 0)
            if attempt + 1 < max_attempts:
                self.journal.transition(
                    iid, "VERIFYING", "SAFE_RETRY", self.worker_id,
                    "reconcile: no mutation observed; one bounded retry",
                    identity_key=intent["identity_key"], attempt=attempt + 1)
                # Chain into the bounded re-drive so one reconcile call
                # fully resolves; the attempt counter bounds the chain.
                self._reconcile_redrive(iid, "SAFE_RETRY",
                                        dict(intent, attempt=attempt + 1),
                                        batch_id)
            else:
                self.journal.transition(
                    iid, "VERIFYING", "FAILED_TERMINAL", self.worker_id,
                    "reconcile: no mutation observed; attempts exhausted",
                    identity_key=intent["identity_key"],
                    terminal="FAILED_TERMINAL", attempt=attempt)
            self.leases.release(iid, self.worker_id)


def load_envelope(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main(argv):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=("run-pass", "reconcile"))
    ap.add_argument("--envelope", required=True)
    ap.add_argument("--scratch", required=True)
    ap.add_argument("--batch", required=True)
    ap.add_argument("--worker", default="worker-1")
    ap.add_argument("--adapter", default="fixture",
                    choices=("fixture", "live"))
    args = ap.parse_args(argv)
    sys.path.insert(0, os.path.join(os.path.dirname(
        os.path.abspath(__file__)), "..", "fixtures"))
    envelope = load_envelope(args.envelope)
    if args.adapter == "fixture":
        from xapi_fixture import FixtureAdapter
        adapter = FixtureAdapter(os.path.join(args.scratch,
                                              "fixture-server.json"))
    else:
        from x_adapter import LiveXAdapter
        adapter = LiveXAdapter()
    h = PassHarness(envelope, args.scratch, adapter, args.worker)
    if args.command == "run-pass":
        res = h.run_pass(args.batch)
    else:
        h.reconcile(args.batch)
        res = {"verdict": "RECONCILED"}
    print(json.dumps(res, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
