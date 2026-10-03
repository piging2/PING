"""Unit tests for validate.py: tree-entry gates, ref rules, symrefs, sanitization."""

import pygit2
import pytest

from git_ingest import config, validate
from git_ingest.validate import (
    resolve_symref,
    sanitize_text,
    validate_ref_name,
    validate_tree_entry_name,
)


class TestTreeEntryNames:
    @pytest.mark.parametrize(
        "name,reason",
        [
            (b"", "empty-name"),
            (b".", "dot-entry"),
            (b"..", "dotdot-entry"),
            (b".git", "dotgit-entry"),
            (b"a/b", "slash-in-name"),
            (b"../../etc/cron.d/x", "slash-in-name"),
            (b"x" * 256, "name-too-long"),
        ],
    )
    def test_malicious_names_rejected(self, name, reason):
        assert validate_tree_entry_name(name) == reason

    @pytest.mark.parametrize(
        "name",
        [b"README.md", b"src", b".gitignore", b"a b", b"x" * 255, "caf\u00e9".encode()],
    )
    def test_benign_names_accepted(self, name):
        assert validate_tree_entry_name(name) is None


class TestRefNames:
    @pytest.mark.parametrize(
        "name",
        [
            "refs/heads/main",
            "refs/tags/v1.0.0",
            "refs/heads/feature/x",
        ],
    )
    def test_valid(self, name):
        assert validate_ref_name(name) is True

    @pytest.mark.parametrize(
        "name",
        [
            "",
            "@",
            "refs/heads/a..b",
            "refs/heads/a b",
            "refs/heads/a~b",
            "refs/heads/a^b",
            "refs/heads/a:b",
            "refs/heads/a?b",
            "refs/heads/a*b",
            "refs/heads/a[b",
            "refs/heads/a\\b",
            "/refs/heads/a",
            "refs/heads/a/",
            "refs//heads/a",
            ".refs/heads/a",
            "refs/heads/.a",
            "refs/heads/a.",
            "refs/heads/a.lock",
            "refs/heads/a@{b}",
            "refs/heads/a\x01b",
            "refs/heads/a\x7fb",
            "plainname",
        ],
    )
    def test_invalid(self, name):
        assert validate_ref_name(name) is False


class TestSymref:
    def test_direct_ref_zero_hops(self, bare_repo):
        from conftest import commit_file

        sha = commit_file(bare_repo, "refs/heads/main", "f", b"x", "m")
        target, reason = resolve_symref(bare_repo, "refs/heads/main")
        assert reason is None
        assert target == str(sha)

    def test_symbolic_chain(self, bare_repo):
        from conftest import commit_file

        commit_file(bare_repo, "refs/heads/main", "f", b"x", "m")
        bare_repo.create_reference_symbolic("refs/heads/alias", "refs/heads/main", True)
        target, reason = resolve_symref(bare_repo, "refs/heads/alias")
        assert reason is None
        assert target == str(bare_repo.references["refs/heads/main"].target)
        assert len(target) == 40

    def test_cycle_cut(self, bare_repo):
        bare_repo.create_reference_symbolic("refs/heads/a", "refs/heads/b", True)
        bare_repo.create_reference_symbolic("refs/heads/b", "refs/heads/a", True)
        target, reason = resolve_symref(bare_repo, "refs/heads/a")
        assert target is None
        assert reason == "symref-cycle"

    def test_hop_cap(self, bare_repo):
        # Chain longer than SYMREF_MAX_HOPS must not resolve.
        depth = config.SYMREF_MAX_HOPS + 2
        for i in range(depth):
            nxt = f"refs/heads/c{i + 1}" if i + 1 < depth else "refs/heads/nowhere"
            bare_repo.create_reference_symbolic(f"refs/heads/c{i}", nxt, True)
        target, reason = resolve_symref(bare_repo, "refs/heads/c0")
        assert target is None
        assert reason == "symref-max-hops"

    def test_dangling(self, bare_repo):
        bare_repo.create_reference_symbolic("refs/heads/d", "refs/heads/gone", True)
        target, reason = resolve_symref(bare_repo, "refs/heads/d")
        assert target is None
        assert reason == "symref-dangling"

    def test_missing(self, bare_repo):
        target, reason = resolve_symref(bare_repo, "refs/heads/nope")
        assert target is None
        assert reason == "ref-not-found"


class TestSanitize:
    def test_ansi_neutralized(self):
        # CSI clear-screen, OSC title-set, and a real OSC-8 hyperlink.
        dirty = b"\x1b[2J\x1b]0;pwned\x07hello\x1b]8;;http://evil\x1b\\link"
        clean, truncated = sanitize_text(dirty, 1024)
        assert "\x1b" not in clean
        assert clean == "hellolink"
        assert truncated is False

    def test_malformed_csi_leaves_no_escape(self):
        # A malformed CSI is not a valid terminal sequence; the security
        # property is that no ESC byte survives, even if inert debris does.
        dirty = b"\x1b[8;;http://evil]text"
        clean, _ = sanitize_text(dirty, 1024)
        assert "\x1b" not in clean

    def test_log_forgery_chars_stripped(self):
        dirty = "[INFO] INGEST OK\r\n[INFO] forged".encode()
        clean, _ = sanitize_text(dirty, 1024)
        assert "\r" not in clean
        assert "[INFO] forged" in clean  # content kept, carriage-return attack gone

    def test_bidi_isolated(self):
        dirty = "abc\u202edef".encode("utf-8")
        clean, _ = sanitize_text(dirty, 1024)
        assert clean == "abc\u2066\u202e\u2069def"

    def test_c0_c1_stripped_except_tab_newline(self):
        # Raw C0 bytes are stripped; a real C1 code point (U+0085 NEL,
        # UTF-8 bytes C2 85) is stripped after decoding; \t and \n stay.
        dirty = b"a\x00b\x01c\td\ne\x7ff\xc2\x85g"
        clean, _ = sanitize_text(dirty, 1024)
        assert clean == "abc\td\nefg"

    def test_truncation_marker(self):
        clean, truncated = sanitize_text(b"x" * 100, 30)
        assert truncated is True
        assert clean.endswith("[...truncated]")
        assert len(clean.encode("utf-8")) <= 30

    def test_no_truncation_at_boundary(self):
        clean, truncated = sanitize_text(b"y" * 10, 10)
        assert truncated is False
        assert clean == "y" * 10
