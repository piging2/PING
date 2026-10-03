#!/usr/bin/env python3
"""Deterministic tests for ~/workspace/outreach/authority-check.py.

Fail-closed gate tests. Every test runs the gate in a throwaway OUTREACH_ROOT
(via the AUTHORITY_JSON_PATH / AUTHORITY_CONFLICTS_DIR / OUTREACH_ROOT env
seams) so no test touches real state. Run: python3 test_authority_check.py
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

GATE = os.path.expanduser("~/workspace/outreach/authority-check.py")


def make_authority(surfaces):
    """surfaces: {name: status} -> AUTHORITY.json dict."""
    doc = {"schema_version": 1, "surfaces": {}}
    for name, status in surfaces.items():
        doc["surfaces"][name] = {
            "status": status,
            "reason": f"test reason for {name}",
            "set_by": "test",
            "set_at": "2026-09-29T11:06:00Z",
            "capability": {"authorized": True, "notes": None, "window": None},
        }
    return doc


class GateTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = self.tmp.name
        self.auth_path = os.path.join(self.root, "AUTHORITY.json")
        self.conflicts = os.path.join(self.root, "authority-conflicts")
        self.env = dict(os.environ, OUTREACH_ROOT=self.root,
                        AUTHORITY_JSON_PATH=self.auth_path,
                        AUTHORITY_CONFLICTS_DIR=self.conflicts)

    def tearDown(self):
        self.tmp.cleanup()

    def write_authority(self, surfaces):
        with open(self.auth_path, "w", encoding="utf-8") as f:
            json.dump(make_authority(surfaces), f)
        # The gate reads holds.json FIRST (step 0, fail-closed on missing)
        # since the 2026-09-30 executable-hold-state change; the fixture
        # must provide it or every test fail-closes before reaching the
        # logic under test. HELD status -> held=true; anything else ->
        # held=false so the AUTHORITY.json status path is what denies.
        holds = {"holds": {
            name: {"held": status == "HELD",
                   "set_by": "test",
                   "set_at": "2026-09-29T11:06:00Z",
                   "reason": f"test hold state for {name}",
                   "ref": "test"}
            for name, status in surfaces.items()}}
        self.write_holds(holds)

    def write_holds(self, holds):
        with open(os.path.join(self.root, "holds.json"), "w",
                  encoding="utf-8") as f:
            json.dump(holds, f)

    def write_file(self, name, text):
        p = os.path.join(self.root, name)
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        return p

    def run_gate(self, surface):
        return subprocess.run([sys.executable, GATE, surface],
                              capture_output=True, text=True, env=self.env)

    def conflict_reports(self):
        if not os.path.isdir(self.conflicts):
            return []
        return sorted(os.listdir(self.conflicts))

    # ---- required behaviors ----

    def test_held_flag_denies(self):
        self.write_authority({"tiktok": "HELD"})
        r = self.run_gate("tiktok")
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("AUTHORITY-DENY", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_suppressed_flag_denies(self):
        self.write_authority({"instagram": "SUPPRESSED"})
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 1, r.stdout)

    def test_active_tiktok_tripwire_blocked_denies(self):
        self.write_authority({"tiktok": "ACTIVE"})
        self.write_file("tiktok-like-recovery-state.json", json.dumps({
            "status": "BLOCKED", "durable_like_cap": 0,
            "reviews": [{"pass_id": "tiktok-20260929-owner-hold",
                         "decision": "hold"}]}))
        r = self.run_gate("tiktok")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)
        reports = self.conflict_reports()
        self.assertEqual(len(reports), 1)
        with open(os.path.join(self.conflicts, reports[0])) as fh:
            rep = json.load(fh)
        self.assertEqual(rep["surface"], "tiktok")
        self.assertIn("reconciliation_required", rep)

    def test_cleared_timer_without_owner_decision_still_denies(self):
        # A cleared platform timer is NOT authorization: tripwire CLEAR but
        # the latest recorded review is still "hold" -> deny + conflict.
        self.write_authority({"tiktok": "ACTIVE"})
        self.write_file("tiktok-like-recovery-state.json", json.dumps({
            "status": "CLEAR", "durable_like_cap": 0,
            "reviews": [{"pass_id": "tiktok-20260929-owner-hold",
                         "decision": "hold"}]}))
        r = self.run_gate("tiktok")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertEqual(len(self.conflict_reports()), 1)

    def test_tiktok_tripwire_fully_clear_allows(self):
        self.write_authority({"tiktok": "ACTIVE"})
        self.write_file("tiktok-like-recovery-state.json", json.dumps({
            "status": "CLEAR", "durable_like_cap": 5,
            "reviews": [{"pass_id": "tiktok-20260929-owner-allow",
                         "decision": "allow"}]}))
        r = self.run_gate("tiktok")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)

    def test_missing_authority_json_denies_fail_closed(self):
        # do not write AUTHORITY.json at all
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 3, r.stdout)
        self.assertIn("AUTHORITY-FAIL-CLOSED", r.stdout)

    def test_invalid_authority_json_denies_fail_closed(self):
        self.write_file("AUTHORITY.json", "{not json")
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 3, r.stdout)

    def test_unknown_surface_denies_fail_closed(self):
        self.write_authority({"facebook": "ACTIVE"})
        r = self.run_gate("nope")
        self.assertEqual(r.returncode, 3, r.stdout)

    def test_unknown_status_denies_fail_closed(self):
        self.write_authority({"facebook": "MAYBE"})
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 3, r.stdout)

    def test_active_vs_unresolved_restriction_conflict(self):
        self.write_authority({"facebook": "ACTIVE"})
        self.write_file("facebook-engagement.md",
                        "pass 200\n- Result: 3 likes landed.\n"
                        "- Anomalies: temporarily blocked from liking.\n")
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)
        reports = self.conflict_reports()
        self.assertEqual(len(reports), 1)
        with open(os.path.join(self.conflicts, reports[0])) as fh:
            rep = json.load(fh)
        self.assertTrue(rep["log_tail_markers"])
        self.assertIn("reconciliation_required", rep)

    def test_clean_active_surface_allows(self):
        self.write_authority({"facebook": "ACTIVE"})
        self.write_file("facebook-engagement.md",
                        "pass 200\n- Result: 3 likes landed.\n"
                        "- Anomalies: none. No blocks, checkpoints, or "
                        "warnings.\n")
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_negated_enumerations_never_conflict(self):
        # Regression: "No action block, checkpoint, or rate warning." and
        # "No restriction/checkpoint/action-block/login signal." must not
        # count as restriction events (false conflicts seen on threads/x).
        self.write_authority({"threads": "ACTIVE", "x": "ACTIVE"})
        negated = ("- Anomalies: none. No action block, checkpoint, or rate "
                   "warning.\n"
                   "- Caps ok. No restriction/checkpoint/action-block/login "
                   "signal.\n"
                   "- No 2FA challenge, no checkpoint, no password field.\n")
        self.write_file("threads-engagement.md", "pass 141\n" + negated)
        self.write_file("x-engagement.md", "pass 90\n" + negated)
        for surface in ("threads", "x"):
            r = self.run_gate(surface)
            self.assertEqual(r.returncode, 0,
                             f"{surface}: {r.stdout}")
        self.assertEqual(self.conflict_reports(), [])

    def test_capability_unauthorized_denies(self):
        doc = make_authority({"facebook": "ACTIVE"})
        doc["surfaces"]["facebook"]["capability"] = {
            "authorized": False, "notes": "session revoked", "window": None}
        with open(self.auth_path, "w", encoding="utf-8") as f:
            json.dump(doc, f)
        self.write_holds({"holds": {"facebook": {
            "held": False, "set_by": "test",
            "set_at": "2026-09-29T11:06:00Z",
            "reason": "test", "ref": "test"}}})
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("AUTHORITY-DENY", r.stdout)

    def test_outreach_engine_held_denies(self):
        self.write_authority({"outreach-engine": "HELD"})
        r = self.run_gate("outreach-engine")
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("AUTHORITY-DENY", r.stdout)

    def test_instagram_hold_lift_session_unauth_denies_via_capability(self):
        # Owner lifted the hold (ACTIVE) but the 2FA session is still down:
        # the capability layer denies (exit 1), not the stale log prose.
        doc = make_authority({"instagram": "ACTIVE"})
        doc["surfaces"]["instagram"]["capability"] = {
            "authorized": False,
            "notes": "Session unauthenticated: 2FA login wall.",
            "window": None}
        with open(self.auth_path, "w", encoding="utf-8") as f:
            json.dump(doc, f)
        self.write_holds({"holds": {"instagram": {
            "held": False, "set_by": "test",
            "set_at": "2026-09-29T11:06:00Z",
            "reason": "test", "ref": "test"}}})
        self.write_file("instagram-engagement.md",
                        "pass 160\n- CLASSIFICATION: OWNER_HOLD. 0 likes.\n"
                        "- OWNER ORDER: INSTAGRAM HELD. Do not request, "
                        "retrieve, automate, or enter 2FA credentials.\n")
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("AUTHORITY-DENY", r.stdout)
        self.assertNotIn("CONFLICT", r.stdout)
        self.assertIn("capability not authorized", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_instagram_session_restored_allows(self):
        # Once the owner restores the session (capability authorized=true)
        # and the log tail is clean, the lifted hold means ALLOW.
        self.write_authority({"instagram": "ACTIVE"})
        self.write_file("instagram-engagement.md",
                        "pass 162\n- Result: 4 likes landed.\n"
                        "- Anomalies: none. No action block, checkpoint, "
                        "or rate warning.\n")
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)

    def test_lift_clause_never_conflicts(self):
        # "owner HOLD lifted" is history of a lift, not an imposed hold.
        self.write_authority({"instagram": "ACTIVE"})
        self.write_file("instagram-engagement.md",
                        "## pass 161\n"
                        "- CONTEXT: owner HOLD lifted mid-morning per owner "
                        "order; resume passes.\n"
                        "- Result: session restored, 2 likes landed.\n")
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_tail_scan_from_line_supersedes_stale_markers(self):
        # Stale hold markers that predate a recorded owner reconciliation
        # (tail_scan_from_line) must not conflict. Control first: without
        # the reconciliation pointer the same log conflicts.
        stale = ("## pass 160\n- INSTAGRAM HELD by owner order.\n"
                 "## pass 161\n- HALTED BY OWNER HOLD.\n")
        self.write_authority({"instagram": "ACTIVE"})
        self.write_file("instagram-engagement.md", stale)
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("CONFLICT", r.stdout)

        doc = json.load(open(self.auth_path, encoding="utf-8"))
        doc["surfaces"]["instagram"]["tail_scan_from_line"] = 4
        doc["surfaces"]["instagram"]["reconciliation"] = {
            "at": "2026-09-29T11:24:00Z", "decided_by": "test",
            "decision": "stale markers superseded"}
        json.dump(doc, open(self.auth_path, "w", encoding="utf-8"))
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)

    def test_new_marker_after_reconciliation_still_conflicts(self):
        # The reconciliation pointer must not blind the gate to NEW holds
        # appended after it.
        self.write_authority({"instagram": "ACTIVE"})
        self.write_file("instagram-engagement.md",
                        "## pass 160\n- INSTAGRAM HELD by owner order.\n")
        doc = json.load(open(self.auth_path, encoding="utf-8"))
        doc["surfaces"]["instagram"]["tail_scan_from_line"] = 2
        json.dump(doc, open(self.auth_path, "w", encoding="utf-8"))
        with open(os.path.join(self.root, "instagram-engagement.md"),
                  "a", encoding="utf-8") as f:
            f.write("## pass 163\n- Temporarily blocked by platform.\n")
        r = self.run_gate("instagram")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("CONFLICT", r.stdout)


    # ---- bare "on hold" blind-spot closure (interval 09) ----
    # The gate must deny an asserted hold state but allow discussion of a
    # hold, historical/lifted holds, and test/log prose that merely mentions
    # holds, without returning to naive substring matching.

    def gate_verdict_for_log_line(self, surface, line):
        self.write_authority({surface: "ACTIVE"})
        self.write_file(f"{surface}-engagement.md",
                        f"## pass 90\n- Note: {line}\n")
        return self.run_gate(surface)

    def test_on_hold_actual_state_denies(self):
        for line in ("the campaign is on hold",
                     "deployment is on hold",
                     "the campaign remains on hold"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 2, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_on_hold_discussion_allows(self):
        for line in ("discussing whether to put the campaign on hold",
                     "should we put the campaign on hold",
                     "proposal: put the campaign on hold",
                     "deciding whether the campaign is on hold"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 0, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_on_hold_lifted_history_allows(self):
        for line in ("the hold was removed yesterday",
                     "owner hold lifted mid-morning",
                     "the campaign was put on hold, then the hold was "
                     "removed"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 0, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_on_hold_test_and_log_prose_allows(self):
        for line in ("test: on hold handling in the gate",
                     'log tail "on hold" markers classified as pacing prose'):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 0, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_on_hold_assertion_after_discussion_adjunct_still_denies(self):
        # Narrowing guard: deliberation vocabulary must not hide a real
        # asserted hold, and a bare recommendation stays fail-closed.
        for line in ("after discussing, the campaign is on hold",
                     "the campaign is on hold, whether we like it or not",
                     "we should put the campaign on hold"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 2, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_prior_false_positive_fixes_hold(self):
        # Regression lock for the interval-08 carve-outs: lock mechanics,
        # precautionary pacing prose, and gate meta-prose stay ALLOW while
        # real restriction events still fire.
        for line in ("the follow driver held the one-driver X Chrome lock",
                     "gate held clean on the x pass",
                     "risking rate-limit flags, so we skipped the pass",
                     'log-tail "rate-limit" markers classified as pacing '
                     "prose"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 0, f"{line}: {r.stdout}")
        self.assertEqual(self.conflict_reports(), [])
        for line in ("rate limit hit on the x pass",
                     "temporarily blocked from liking"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 2, f"{line}: {r.stdout}")


    def test_held_false_assignment_allows(self):
        # Regression lock for the 2026-10-01 11:14/13:14 MDT x incident:
        # pass logs document 'holds.json: x held=false' and discuss the
        # scanner's own classification of the token; neither is a hold.
        # The scanner had DENY-CONFLICTed on its own documentation,
        # self-reinforcing every pass. Real hold assertions, including ones
        # sharing a clause with held=false or scanner vocabulary, still deny.
        for line in ("Gate: authority-check.py x exited 0 (AUTHORITY-ALLOW) "
                     "at run start (holds.json: x held=false, owner "
                     "unfrozen 2026-10-01 ~05:21 MDT)",
                     'state: "held": false per holds.json',
                     "the tail scanner fired on the bare token \"held\" "
                     "inside prior passes' own gate lines"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 0, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])
        for line in ("x held=true per owner order",
                     "held=false but owner hold imposed on x",
                     "false positive review: the account is on hold"):
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 2, f"{line}: {r.stdout}")
            self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_prose_classification_diagnostic_allows(self):
        # 2026-10-02 linkedin incident: the worker's diagnostic note
        # explicitly classifying quoted markers as "PROSE, not restriction
        # events" must not fire the gate on the quoted trigger phrases.
        # Without the carve-out the scanner DENY-CONFLICTs on its own
        # documentation, self-reinforcing every pass.
        self.write_authority({"linkedin": "ACTIVE"})
        self.write_file("linkedin-engagement.md",
                        "## 2026-10-02 - Pass li-1\n"
                        "- The 3 \"log-tail markers\" are header-rules "
                        "PROSE, not restriction events: (1) \"Fail-closed "
                        "on any checkpoint/CAPTCHA/restriction/"
                        "verification wall.\" (policy statement); (2) "
                        "\"Two restriction signals in 7 days pauses the "
                        "channel.\" (policy statement).\n")
        r = self.run_gate("linkedin")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_real_event_beside_prose_classification_still_denies(self):
        # Narrowing guard: the prose-classification carve-out must not hide
        # a real restriction event asserted outside the quoted spans.
        self.write_authority({"linkedin": "ACTIVE"})
        self.write_file("linkedin-engagement.md",
                        "## 2026-10-02 - Pass li-1\n"
                        "- The 3 \"log-tail markers\" are header-rules "
                        "PROSE, not restriction events.\n"
                        "- Anomalies: temporarily blocked from liking.\n")
        r = self.run_gate("linkedin")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_stagger_held_timing_prose_allows(self):
        # 2026-10-02 facebook incident: '>30 min stagger held' between IG/FB
        # passes is timing coordination, not an account hold.
        self.write_authority({"facebook": "ACTIVE"})
        self.write_file("facebook-engagement.md",
                        "## 2026-10-02 - Pass fb-1\n"
                        "- IG stagger: no overlap (last IG pass 202 "
                        "completed; >30 min stagger held).\n")
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_real_hold_beside_stagger_talk_still_denies(self):
        # Narrowing guard: the stagger carve-out requires the exact phrase
        # in order; a real hold asserted near stagger talk still fires.
        self.write_authority({"facebook": "ACTIVE"})
        self.write_file("facebook-engagement.md",
                        "## 2026-10-02 - Pass fb-1\n"
                        "- Account held by owner order; stagger the next "
                        "pass by 60 min.\n")
        r = self.run_gate("facebook")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_restriction_window_status_prose_allows(self):
        # 2026-10-03 linkedin incident: a pass section documenting the
        # 7-day restriction-window count and asserting no new event
        # ("still exactly 1 restriction signal", "threshold is NOT
        # reached") is bookkeeping, not a new platform event. Without the
        # carve-out the gate matches "restriction signal" in that prose and
        # self-reinforces every pass.
        self.write_authority({"linkedin": "ACTIVE"})
        self.write_file("linkedin-engagement.md",
                        "## 2026-10-03 - Pass li-1\n"
                        "- 7-day restriction window: still exactly 1 "
                        "restriction signal (the ~03:00 MDT one from the "
                        "0226 pass). The 2-in-7 channel-pause threshold is "
                        "NOT reached; no second signal.\n")
        r = self.run_gate("linkedin")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_restriction_count_state_rephrase_allows(self):
        # 2026-10-03 linkedin incident, second occurrence: workers rephrase
        # the window bookkeeping freely ("Restriction state: still exactly
        # 1 restriction signal in the last 7 days" vs "7-day restriction
        # window: ..."). The carve-out keys on the explicit no-new-event
        # assertion alone, not on window vocabulary.
        self.write_authority({"linkedin": "ACTIVE"})
        self.write_file("linkedin-engagement.md",
                        "## 2026-10-03 - Pass li-4\n"
                        "- Login state: UNKNOWN (unverifiable while "
                        "transport is down); no login-state change "
                        "claimed. Restriction state: still exactly 1 "
                        "restriction signal in the last 7 days.\n")
        r = self.run_gate("linkedin")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_genuine_second_restriction_signal_still_denies(self):
        # Narrowing guard: the window-status carve-out requires an explicit
        # no-new-event assertion; a genuine second signal in the window
        # keeps firing fail-closed.
        self.write_authority({"linkedin": "ACTIVE"})
        self.write_file("linkedin-engagement.md",
                        "## 2026-10-03 - Pass li-2\n"
                        "- RESTRICTION SIGNAL: second restriction signal "
                        "in 7 days; channel paused per the two-signal "
                        "rule.\n")
        r = self.run_gate("linkedin")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_genuine_block_event_still_denies(self):
        # Narrowing guard: a real platform enforcement event with no
        # window-status framing keeps firing.
        self.write_authority({"linkedin": "ACTIVE"})
        self.write_file("linkedin-engagement.md",
                        "## 2026-10-03 - Pass li-3\n"
                        "- RESTRICTION SIGNAL: li-expand5 hit BLOCKED: "
                        "unusual activity mid-targeted-round.\n")
        r = self.run_gate("linkedin")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)


# ---- held-state negation fixtures (2026-10-01 19:14 MDT x incident) ----
# Semantic classification of the hold-state claim family, driven by fixture
# files so new prose variants are added as data, not code:
#   held-negated-must-allow.txt    -> gate exit 0 (explicit negation)
#   held-affirmative-must-deny.txt -> gate exit 2 (affirmative claim)
#   held-ambiguous-must-deny.txt   -> gate exit 2 (fail closed on ambiguity)
# The pointer-bump workaround was rejected; the parser is fixed instead.

FIXTURE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "authority-check-fixtures")


def load_fixture_lines(name):
    path = os.path.join(FIXTURE_DIR, name)
    with open(path, encoding="utf-8") as f:
        return [ln.strip() for ln in f
                if ln.strip() and not ln.strip().startswith("#")]


class HeldNegationFixtureTest(GateTest):
    def test_negated_hold_claims_allow(self):
        lines = load_fixture_lines("held-negated-must-allow.txt")
        self.assertTrue(lines, "negation fixture file is empty")
        for line in lines:
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 0,
                             f"negated claim denied: {line}: {r.stdout}")
            self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_affirmative_hold_claims_deny(self):
        lines = load_fixture_lines("held-affirmative-must-deny.txt")
        self.assertTrue(lines, "affirmative fixture file is empty")
        for line in lines:
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 2,
                             f"affirmative claim allowed: {line}: {r.stdout}")
            self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_ambiguous_hold_claims_fail_closed(self):
        lines = load_fixture_lines("held-ambiguous-must-deny.txt")
        self.assertTrue(lines, "ambiguous fixture file is empty")
        for line in lines:
            r = self.gate_verdict_for_log_line("x", line)
            self.assertEqual(r.returncode, 2,
                             f"ambiguous claim allowed: {line}: {r.stdout}")
            self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)


# ---- threads newest-first tail-scan regression (2026-10-03) ----
# The gate self-reinforced on stale prose: tail_affirmative_markers applied
# tail_scan_from_line BEFORE the newest-first reversal, which for a
# prepended newest-first log kept the PRE-reconciliation tail -- the exact
# inverse of the documented intent. As new sections were prepended,
# reconciled prose re-entered the scan and the gate parked threads for
# consecutive 0-action passes. Two self-documentation carve-outs came from
# the same incident ('owner-hold re-check', 'rate-limit backoff' mechanism).

class ThreadsNewestFirstRegressionTest(GateTest):
    def write_authority_with_scan(self, surfaces, scan_lines):
        self.write_authority(surfaces)
        with open(self.auth_path, encoding="utf-8") as f:
            doc = json.load(f)
        for name, line in scan_lines.items():
            doc["surfaces"][name]["tail_scan_from_line"] = line
        with open(self.auth_path, "w", encoding="utf-8") as f:
            json.dump(doc, f)

    def test_prepend_keeps_reconciliation_stable(self):
        # The stale marker MUST be a line that fires when scanned, so the
        # test proves the skip works rather than proving the line is quiet.
        stale = ("## Pass 190\n"
                 "- authority gate denied this pass on the unresolved "
                 "pass-186 rate-limit marker\n")
        log = "## Header rules\n" + stale
        self.write_file("threads-engagement.md", log)
        # Owner reconciliation recorded here: skip everything written so far.
        self.write_authority_with_scan(
            {"threads": "ACTIVE"}, {"threads": len(log.splitlines())})
        r = self.run_gate("threads")
        self.assertEqual(r.returncode, 0, r.stdout)
        # The worker prepends new sections after the header. The reconciled
        # prose must not re-enter the scan no matter how many sections land
        # on top of it.
        log = ("## Header rules\n"
               "## Pass 192\n- clean pass, 9 likes\n"
               "## Pass 191\n- clean pass, 9 likes\n" + stale)
        self.write_file("threads-engagement.md", log)
        r = self.run_gate("threads")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)
        self.assertEqual(self.conflict_reports(), [])

    def test_owner_hold_recheck_prose_allows(self):
        r = self.gate_verdict_for_log_line(
            "threads",
            "Authority gate: authority-check.py threads returned "
            "AUTHORITY-ALLOW at pass start (preflight + pre-launch "
            "owner-hold re-check)")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)

    def test_rate_limit_backoff_mechanism_allows(self):
        r = self.gate_verdict_for_log_line(
            "threads",
            "handled via the recovery-budgets rate-limit backoff, long "
            "satisfied by the 2h cadence")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("AUTHORITY-ALLOW", r.stdout)

    def test_genuine_hold_still_denies(self):
        # Narrowing guard: the re-check carve-out requires the compound; a
        # real hold assertion with no re-check keeps firing fail-closed.
        r = self.gate_verdict_for_log_line(
            "threads", "owner hold placed on threads by Nolan")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)

    def test_genuine_rate_limit_event_still_denies(self):
        # Narrowing guard: the backoff carve-out requires the adjacent
        # compound noun; an event phrased as an event keeps firing.
        r = self.gate_verdict_for_log_line(
            "threads", "rate limit hit; backoff initiated")
        self.assertEqual(r.returncode, 2, r.stdout)
        self.assertIn("AUTHORITY-DENY-CONFLICT", r.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
