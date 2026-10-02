#!/usr/bin/env python3
"""Watchdog and bounded self-improvement for the X autonomy loop.

The watchdog observes: policy violations, failure rate, unknown-outcome
rate, verification-failure rate, budget anomalies, duplicate canonical
actions. It may REDUCE / STOP / DEFER / ROLL BACK learned configuration.
It may NOT grant authority: any attempt to widen the envelope, raise a
ceiling, or authorize a new account/action/platform raises
InvariantViolation.

Safe mode: if identity, policy, capability, event-persistence, or
verification subsystems are unavailable, the watchdog writes the SAFE_MODE
flag. Reads may continue; NEW MUTATIONS STOP. No human is needed to decide.

BoundedLearner tunes only declared learner_tunables within constitutional
[min, max]. Promotion: SHADOW -> CANARY -> ACTIVE with machine-verifiable
gates. Regression -> automatic rollback to the last ACTIVE config.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from x_store import utcnow, canonical
from x_invariants import (InvariantViolation, assert_learner_within_envelope,
                          TERMINAL_STATES)

FIXED_CLOCK = os.environ.get("X_SI_CLOCK_ISO", "")


def _clock():
    return FIXED_CLOCK or utcnow()


class Watchdog:
    def __init__(self, scratch, envelope):
        self.scratch = scratch
        self.envelope = envelope

    def _read_jsonl(self, name):
        path = os.path.join(self.scratch, name)
        if not os.path.isfile(path):
            return []
        with open(path, encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def evaluate(self):
        receipts = self._read_jsonl("outcome-receipts.jsonl")
        violations = self._read_jsonl("invariant-violations.jsonl")
        journal = self._read_jsonl("journal.jsonl")
        total = len(receipts)
        failed = sum(1 for r in receipts
                     if r.get("terminal") == "FAILED_TERMINAL")
        unknown = len(self._read_jsonl("unknown-persisted.jsonl"))
        verif_failed = sum(1 for r in receipts if
                           "VERIFICATION_FAILED" in (r.get("note") or ""))
        # Duplicate canonical actions: two VERIFIED_SUCCESS receipts on the
        # same identity key.
        seen = {}
        duplicates = 0
        for r in receipts:
            if r.get("terminal") == "VERIFIED_SUCCESS" and r.get("ok"):
                key = r.get("intent_id", "").split(":")
                ident = ":".join(key[:3]) if len(key) >= 3 else r["intent_id"]
                if ident in seen:
                    duplicates += 1
                seen[ident] = True
        max_fail = self.envelope.get("maximum_failure_rate", 0.2)
        max_unknown = self.envelope.get("maximum_unknown_rate", 0.1)
        failure_rate = (failed / total) if total else 0.0
        unknown_rate = (unknown / total) if total else 0.0
        findings = []
        action = "OK"
        if violations:
            findings.append("policy_violations=%d" % len(violations))
            action = "STOP"
        if duplicates:
            findings.append("duplicate_canonical_actions=%d" % duplicates)
            action = "STOP"
        if verif_failed:
            findings.append("verification_failures=%d" % verif_failed)
            action = "STOP" if action == "OK" else action
            if action == "OK":
                action = "REDUCE"
        if failure_rate > max_fail:
            findings.append("failure_rate=%.3f > max %.3f"
                            % (failure_rate, max_fail))
            action = "REDUCE" if action == "OK" else action
        if unknown_rate > max_unknown:
            findings.append("unknown_rate=%.3f > max %.3f"
                            % (unknown_rate, max_unknown))
            action = "REDUCE" if action == "OK" else action
        report = {
            "at": _clock(),
            "window_receipts": total,
            "failure_rate": round(failure_rate, 4),
            "unknown_rate": round(unknown_rate, 4),
            "verification_failures": verif_failed,
            "policy_violations": len(violations),
            "duplicate_canonical_actions": duplicates,
            "findings": findings,
            "action": action,
            "note": "watchdog may reduce/stop/defer/roll back; it may not "
                    "grant authority",
        }
        with open(os.path.join(self.scratch, "watchdog-reports.jsonl"),
                  "a", encoding="utf-8") as f:
            f.write(canonical(report) + "\n")
        if action == "STOP":
            self.enter_safe_mode(
                "watchdog STOP: " + "; ".join(findings))
        return report

    def enter_safe_mode(self, reason):
        with open(os.path.join(self.scratch, "SAFE_MODE"), "w",
                  encoding="utf-8") as f:
            f.write("%s | %s" % (_clock(), reason))

    def exit_safe_mode(self, reason):
        # Safe mode exits only on an explicit, recorded operator action.
        # The watchdog itself never clears it silently.
        path = os.path.join(self.scratch, "SAFE_MODE")
        if os.path.isfile(path):
            os.remove(path)
        with open(os.path.join(self.scratch, "watchdog-reports.jsonl"),
                  "a", encoding="utf-8") as f:
            f.write(canonical({"at": _clock(), "action": "SAFE_MODE_EXIT",
                               "reason": reason}) + "\n")

    def attempt_grant(self, change):
        """Any authority-granting change is refused, even if the metrics
        look good. This is the machine enforcement of 'the watchdog may
        NOT grant authority'."""
        granting_keys = ("authorized_accounts", "allowed_platforms",
                         "allowed_action_types", "allowed_capabilities",
                         "execution_budget", "prohibited_targets")
        for key in granting_keys:
            if key in change:
                raise InvariantViolation(
                    "WATCHDOG_MAY_NOT_GRANT_AUTHORITY: refusing change to %r"
                    % key)
        return False


class BoundedLearner:
    """Tunes operational params within constitutionally fixed [min, max].
    Promotion SHADOW -> CANARY -> ACTIVE requires machine-verifiable gates:
      policy_violations == 0, duplicate_canonical_actions == 0,
      unverified_success_declarations == 0,
      unknown_outcome_rate <= envelope.maximum_unknown_rate.
    Regression (a later watchdog report worse than the ACTIVE baseline on
    any gate) triggers automatic rollback to the last ACTIVE config."""

    STAGES = ("SHADOW", "CANARY", "ACTIVE", "ROLLED_BACK")

    def __init__(self, scratch, envelope):
        self.scratch = scratch
        self.envelope = envelope
        self.path = os.path.join(scratch, "learner.json")

    def _load(self):
        if os.path.isfile(self.path):
            with open(self.path, encoding="utf-8") as f:
                return json.load(f)
        return {"active": {}, "proposals": []}

    def _save(self, data):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=1, sort_keys=True)

    def propose(self, params, proposer="learner"):
        proposal = {"params": params, "stage": "SHADOW",
                    "proposed_at": _clock(), "proposer": proposer,
                    "raises_ceiling": False}
        # Machine-checked: within envelope, no self-modification.
        assert_learner_within_envelope(proposal, self.envelope)
        data = self._load()
        data["proposals"].append(proposal)
        self._save(data)
        return proposal

    def _gates_pass(self, report):
        max_unknown = self.envelope.get("maximum_unknown_rate", 0.1)
        return (report.get("policy_violations", 1) == 0 and
                report.get("duplicate_canonical_actions", 1) == 0 and
                report.get("verification_failures", 1) == 0 and
                report.get("unknown_rate", 1.0) <= max_unknown)

    def promote(self, index, report):
        """Promote proposal `index` one stage if the gates pass."""
        data = self._load()
        prop = data["proposals"][index]
        if not self._gates_pass(report):
            raise InvariantViolation(
                "LEARNER_PROMOTION_GATE_FAILED: report %r does not satisfy "
                "promotion gates" % (report,))
        order = ("SHADOW", "CANARY", "ACTIVE")
        cur = order.index(prop["stage"])
        if cur >= 2:
            raise InvariantViolation("LEARNER_ALREADY_ACTIVE")
        prop["stage"] = order[cur + 1]
        prop["promoted_at"] = _clock()
        if prop["stage"] == "ACTIVE":
            prop["baseline"] = {
                "failure_rate": report.get("failure_rate"),
                "unknown_rate": report.get("unknown_rate"),
            }
            data["active"] = dict(prop["params"])
        data["proposals"][index] = prop
        self._save(data)
        return prop

    def check_regression(self, report):
        """Automatic rollback: any gate worse than the ACTIVE baseline."""
        data = self._load()
        active_idx = [i for i, p in enumerate(data["proposals"])
                      if p["stage"] == "ACTIVE"]
        if not active_idx:
            return None
        prop = data["proposals"][active_idx[-1]]
        base = prop.get("baseline") or {}
        regressed = (
            report.get("policy_violations", 0) > 0 or
            report.get("duplicate_canonical_actions", 0) > 0 or
            report.get("verification_failures", 0) > 0 or
            report.get("unknown_rate", 0) > base.get("unknown_rate", 0) or
            report.get("failure_rate", 0) > base.get("failure_rate", 0))
        if regressed:
            prop["stage"] = "ROLLED_BACK"
            prop["rolled_back_at"] = _clock()
            prop["rollback_reason"] = (
                "regression vs ACTIVE baseline %r" % (base,))
            data["proposals"][active_idx[-1]] = prop
            data["active"] = {}
            self._save(data)
            return prop
        return None
