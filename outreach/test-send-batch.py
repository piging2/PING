#!/usr/bin/env python3
"""Fixture tests for send-batch.py draft parsing (parse_draft / _is_meta_line).

Regression origin: round 119 (2026-09-23) — send-batch.py failed to parse
drafts/round17-advanced-window-cleaning-email.md because its header block
uses bare (non-bullet) metadata lines BEFORE the To:/Subject: lines:

    Prospect: Advanced Window Cleaning | Trade: window cleaning | Town: Grand Junction, CO
    Contact route: site-published email advancedwindowgj@gmail.com | Drafted: 2026-09-10 | Round: 17
    Re-voiced 2026-09-21 round 108: ...

The old _is_meta_line did not recognize those prefixes, so the body-start
scan stopped at the "Prospect:" line, To:/Subject: were never extracted,
and parse_draft returned to=None. The batch could not send that draft.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location(
    "send_batch_mod",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "send-batch.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
parse_draft = mod.parse_draft

SIGNOFF = "PING Social, (970) 589-3309"

BODY = (
    "Please read before replying: I am not a customer and this is not a service request.\n"
    "\n"
    "I'm an AI reaching out on behalf of PING Social.\n"
    "\n"
    f"{SIGNOFF}\n"
)


def _parse(text):
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False,
                                     encoding="utf-8") as fh:
        fh.write(text)
        path = fh.name
    try:
        return parse_draft(path)
    finally:
        os.unlink(path)


def test_bare_metadata_prefixes_round17_style():
    # Exact header shape of drafts/round17-advanced-window-cleaning-email.md.
    draft = (
        "# Round 17 email draft \u2014 Advanced Window Cleaning (Grand Junction)\n"
        "\n"
        "Prospect: Advanced Window Cleaning | Trade: window cleaning | Town: Grand Junction, CO\n"
        "Contact route: site-published email advancedwindowgj@gmail.com | Drafted: 2026-09-10 | Round: 17\n"
        "Re-voiced 2026-09-21 round 108: AI identity + sentence-per-line + no-human-name sign-off per 2026-09-20 voice rules\n"
        "\n"
        "To: advancedwindowgj@gmail.com\n"
        "Subject: Calls answered while your crew is on ladders\n"
        "\n"
        "Message:\n"
        "\n"
        + BODY
    )
    to, subject, body = _parse(draft)
    assert to == "advancedwindowgj@gmail.com", to
    assert subject == "Calls answered while your crew is on ladders", subject
    assert body.startswith("Please read before replying:"), body[:60]
    assert body.rstrip("\n").endswith(SIGNOFF), body[-60:]
    assert "Prospect:" not in body, "metadata leaked into body"


def test_bullet_header_style_still_works():
    draft = (
        "- To: test@example.com\n"
        "- Subject: Test subject\n"
        "- Status: drafted\n"
        "---\n"
        + BODY
    )
    to, subject, body = _parse(draft)
    assert to == "test@example.com", to
    assert subject == "Test subject", subject
    assert body.startswith("Please read before replying:"), body[:60]


def test_plain_header_style_still_works():
    draft = (
        "To: plain@example.com\n"
        "Subject: Plain subject\n"
        "\n"
        + BODY
    )
    to, subject, body = _parse(draft)
    assert to == "plain@example.com", to
    assert subject == "Plain subject", subject
    assert SIGNOFF in body


def test_pipe_one_liner_with_metadata_prefix():
    draft = (
        "Prospect: X Shop | Trade: plumbing | Town: Fruita, CO\n"
        "To: x@shop.com | Subject: One liner subject\n"
        "\n"
        + BODY
    )
    to, subject, body = _parse(draft)
    assert to == "x@shop.com", to
    assert subject == "One liner subject", subject
    assert body.startswith("Please read before replying:"), body[:60]


def test_trailing_note_after_signoff_trimmed():
    draft = (
        "To: note@example.com\n"
        "Subject: Note subject\n"
        "\n"
        + BODY
        + "\nRe-voiced 2026-09-22: editorial note that must never be sent\n"
    )
    to, subject, body = _parse(draft)
    assert to == "note@example.com", to
    assert "editorial note" not in body, body[-80:]


def test_header_annotations_before_body():
    # round84 style: annotation lines between Subject: and the body.
    draft = (
        "To: Luke@altituderenovation.com\n"
        "Subject: A question about your estimate requests\n"
        "Copy-test: VARIANT B\n"
        "\n"
        + BODY
    )
    to, subject, body = _parse(draft)
    assert to == "Luke@altituderenovation.com", to
    assert subject == "A question about your estimate requests", subject
    assert body.startswith("Please read before replying:"), body[:60]
    assert "Copy-test" not in body


def test_from_line_is_metadata():
    # round105 style: From: line in the header block.
    draft = (
        "To: hcpaintgj@aol.com\n"
        "Subject: The estimate requests that hit voicemail\n"
        "From: PING Social <nolangesk@gmail.com>\n"
        "\n"
        + BODY
    )
    to, subject, body = _parse(draft)
    assert to == "hcpaintgj@aol.com", to
    assert body.startswith("Please read before replying:"), body[:60]
    assert "From:" not in body


def test_real_round17_draft_parses():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "drafts", "round17-advanced-window-cleaning-email.md")
    if not os.path.exists(path):
        return  # fixture draft may be trashed after its ladder completes
    to, subject, body = parse_draft(path)
    assert to == "advancedwindowgj@gmail.com", to
    assert subject, "subject missing"
    assert body.startswith("Please read before replying:"), body[:60]
    assert body.rstrip("\n").endswith(SIGNOFF), body[-60:]


# ---------------------------------------------------------------------------
# F-04 regression tests (2026-09-27, placeholder-success audit re-verification):
# verify_in_sent must require EXACT full-subject equality (case-insensitive).
# The old fuzzy substring match (first comma-chunk in either direction) could
# false-verify a failed send against an earlier same-subject-prefix message
# inside the 2h window, recording SENT+VERIFIED with the wrong message id.
# ---------------------------------------------------------------------------

import json as _json


class _FakeCompleted:
    def __init__(self, stdout):
        self.stdout = stdout
        self.stderr = ""
        self.returncode = 0


def _triage_stub(messages):
    def _stub(*args, **kwargs):
        return _FakeCompleted(_json.dumps({"messages": messages}))
    return _stub


def test_verify_in_sent_exact_subject_verifies():
    orig, mod.cli = mod.cli, _triage_stub([
        {"id": "msg-aaa", "subject": "Quick question about Tuesday"},
    ])
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Quick question about Tuesday")
        assert ok is True, (ok, detail)
        assert detail == "msg-aaa", detail
    finally:
        mod.cli = orig


def test_verify_in_sent_case_insensitive():
    orig, mod.cli = mod.cli, _triage_stub([
        {"id": "msg-bbb", "subject": "QUICK QUESTION ABOUT TUESDAY"},
    ])
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Quick question about Tuesday")
        assert ok is True, (ok, detail)
        assert detail == "msg-bbb", detail
    finally:
        mod.cli = orig


def test_verify_in_sent_colliding_prefix_does_not_verify():
    # F-04 scenario: an EARLIER send shares only the draft's first
    # comma-chunk. Old code returned True with the wrong id; must be False.
    orig, mod.cli = mod.cli, _triage_stub([
        {"id": "msg-old", "subject": "Quick question"},
        {"id": "msg-older", "subject": "Quick question about pricing"},
    ])
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Quick question, Nolan")
        assert ok is False, (ok, detail)
        assert detail.startswith("not-found"), detail
    finally:
        mod.cli = orig


def test_verify_in_sent_reverse_substring_does_not_verify():
    # Old reverse clause `subj in subject.lower()`: a short sent subject
    # contained in a longer draft subject also false-verified.
    orig, mod.cli = mod.cli, _triage_stub([
        {"id": "msg-old", "subject": "Hello"},
    ])
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Hello from PING Social today")
        assert ok is False, (ok, detail)
    finally:
        mod.cli = orig


def test_verify_in_sent_no_hits():
    orig, mod.cli = mod.cli, _triage_stub([])
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Anything")
        assert ok is False, (ok, detail)
        assert "0 sent-to-address hits" in detail, detail
    finally:
        mod.cli = orig


def test_verify_in_sent_unparseable():
    orig, mod.cli = mod.cli, (lambda *a, **k: _FakeCompleted("not json{{"))
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Anything")
        assert ok is False, (ok, detail)
        assert detail == "triage-unparseable", detail
    finally:
        mod.cli = orig


def test_verify_in_sent_clean_zero_hit_is_not_found_not_unparseable():
    # The CLI's unambiguous zero-hit string is a verdict (False, not-found),
    # not a parse failure. Reuses the marker gmail_sent_count relies on.
    orig, mod.cli = mod.cli, (lambda *a, **k: _FakeCompleted(
        "No messages found matching query: in:sent to:a@b.c newer_than:2h"))
    try:
        ok, detail = mod.verify_in_sent("a@b.c", "Anything")
        assert ok is False, (ok, detail)
        assert detail == "not-found (0 sent-to-address hits)", detail
    finally:
        mod.cli = orig

if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items())
           if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {fn.__name__}: {e}")
    print(f"{len(fns) - failed}/{len(fns)} passed")
    sys.exit(1 if failed else 0)
