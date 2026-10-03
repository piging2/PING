"""Unit/integration tests for parse.py over real pygit2 repositories."""

import pygit2
import pytest

from git_ingest import config
from git_ingest.parse import (
    ObjectNotFound,
    PacketTimeout,
    TreeEntry,
    TreeQuarantined,
    diff_commit,
    parse_commit,
    read_blob_meta,
    walk_commits,
    walk_tree_entries,
)
from conftest import commit_file, gitdir_of, make_tree, write_raw_object


def _rename_limit():
    return config.MAX_COMMITS_PER_PACKET // config.SYMREF_MAX_HOPS


class TestReadBlobMeta:
    def test_text_blob(self, bare_repo):
        sha = str(bare_repo.create_blob(b"hello world\n"))
        meta = read_blob_meta(bare_repo, str(sha))
        assert meta.sha == str(sha)
        assert meta.size == 12
        assert meta.truncated is False
        assert meta.is_text is True
        assert meta.magic == "text"
        assert meta.provenance == "untrusted-repo-content"

    def test_binary_sniffed_not_by_extension(self, bare_repo):
        # ELF content regardless of any name: magic-by-sniffing.
        sha = str(bare_repo.create_blob(b"\x7fELF" + b"\x00" * 100))
        meta = read_blob_meta(bare_repo, str(sha))
        assert meta.magic == "elf"
        assert meta.is_text is False

    def test_shebang(self, bare_repo):
        sha = str(bare_repo.create_blob(b"#!/bin/sh\necho hi\n"))
        meta = read_blob_meta(bare_repo, str(sha))
        assert meta.magic == "shebang"

    def test_polyglot_suspect(self, bare_repo):
        # ZIP header plus an embedded script tag: two dangerous families.
        sha = str(bare_repo.create_blob(b"PK\x03\x04" + b"<script>alert(1)</script>"))
        meta = read_blob_meta(bare_repo, str(sha))
        assert meta.polyglot_suspect is True

    def test_oversized_blob_declared_size_checked_first(self, bare_repo, monkeypatch):
        # Declared size over the cap -> truncated metadata, zero content
        # bytes read. Shrink the cap for the test instead of the blob.
        sha = str(bare_repo.create_blob(b"0123456789"))
        monkeypatch.setattr(config, "MAX_BLOB_BYTES", 4)
        meta = read_blob_meta(bare_repo, sha)
        assert meta.truncated is True
        assert meta.size == 10

    def test_lfs_pointer(self, bare_repo):
        body = (
            b"version https://git-lfs.github.com/spec/v1\n"
            b"oid sha256:4d7a214565434789012345678901234567890123456789012345678901234\n"
            b"size 12345\n"
        )
        meta = read_blob_meta(bare_repo, str(bare_repo.create_blob(body)))
        assert meta.lfs_pointer is True
        assert meta.lfs_declared_size == 12345
        assert meta.lfs_pointer_suspect is False

    def test_lfs_pointer_absurd_size_flagged(self, bare_repo):
        body = (
            b"version https://git-lfs.github.com/spec/v1\n"
            b"oid sha256:4d7a214565434789012345678901234567890123456789012345678901234\n"
            b"size 999999999999999\n"
        )
        meta = read_blob_meta(bare_repo, str(bare_repo.create_blob(body)))
        assert meta.lfs_pointer is True
        assert meta.lfs_pointer_suspect is True

    def test_missing_object(self, bare_repo):
        with pytest.raises(ObjectNotFound):
            read_blob_meta(bare_repo, "0" * 40)


class TestWalkTreeEntries:
    def test_kinds(self, bare_repo):
        repo = bare_repo
        blob = repo.create_blob(b"data")
        link_blob = repo.create_blob(b"target/path")
        tb = repo.TreeBuilder()
        tb.insert("file.txt", blob, pygit2.GIT_FILEMODE_BLOB)
        tb.insert("link", link_blob, pygit2.GIT_FILEMODE_LINK)
        tb.insert("submod", blob, pygit2.GIT_FILEMODE_COMMIT)
        tree_sha = str(tb.write())
        entries = {e.name: e for e in walk_tree_entries(repo, tree_sha)}
        assert entries["file.txt"].kind == "blob"
        assert entries["link"].kind == "symlink"
        assert entries["link"].target == "target/path"
        assert entries["submod"].kind == "gitlink"

    def test_symlink_target_never_resolved(self, bare_repo):
        blob = bare_repo.create_blob(b"../../../../etc/passwd")
        tb = bare_repo.TreeBuilder()
        tb.insert("evil", blob, pygit2.GIT_FILEMODE_LINK)
        tree_sha = str(tb.write())
        entries = list(walk_tree_entries(bare_repo, tree_sha))
        assert entries[0].kind == "symlink"
        assert entries[0].target == "../../../../etc/passwd"

    def test_nested_walk(self, bare_repo):
        inner = bare_repo.TreeBuilder()
        inner.insert("deep.txt", bare_repo.create_blob(b"x"), pygit2.GIT_FILEMODE_BLOB)
        inner_sha = inner.write()
        outer = bare_repo.TreeBuilder()
        outer.insert("sub", inner_sha, pygit2.GIT_FILEMODE_TREE)
        outer_sha = str(outer.write())
        entries = {e.name: e for e in walk_tree_entries(bare_repo, outer_sha)}
        assert entries["sub"].kind == "tree"
        assert entries["sub/deep.txt"].kind == "blob"

    @pytest.mark.parametrize(
        "evil_name",
        [b"..", b"a/b", b".", b".git", b"", b"../../etc/cron.d/x"],
    )
    def test_malicious_tree_quarantined(self, bare_repo, evil_name):
        # Craft the tree bytes directly: libgit2 refuses to WRITE these
        # names but will READ a hostile object (T-01 proof shape).
        gitdir = gitdir_of(bare_repo)
        blob_sha = write_raw_object(gitdir, "blob", b"pwn")
        tree_sha = make_tree(gitdir, [("100644", evil_name, blob_sha)])
        with pytest.raises(TreeQuarantined) as exc:
            list(walk_tree_entries(bare_repo, tree_sha))
        # libgit2 itself refuses to parse the empty-name tree; every
        # hostile shape quarantines one way or another.
        assert exc.value.reason.startswith(("malformed-tree", "tree-unreadable"))

    def test_depth_cap(self, bare_repo):
        # Build MAX_TREE_DEPTH + 2 nested trees via raw objects.
        gitdir = gitdir_of(bare_repo)
        blob_sha = write_raw_object(gitdir, "blob", b"x")
        inner = make_tree(gitdir, [("100644", b"f", blob_sha)])
        for _ in range(config.MAX_TREE_DEPTH + 1):
            inner = make_tree(gitdir, [("040000", b"sub", inner)])
        with pytest.raises(TreeQuarantined) as exc:
            list(walk_tree_entries(bare_repo, inner))
        assert exc.value.reason == "tree-too-deep"


class TestParseCommit:
    def test_claimed_identity_and_message(self, bare_repo):
        sha = commit_file(
            bare_repo, "refs/heads/main", "f", b"x", "do the thing\x1b[2J"
        )
        obs = parse_commit(bare_repo, str(sha))
        assert obs.sha == str(sha)
        assert obs.claimed_author == "Nolan Geske"
        assert obs.claimed_author_email == "nolan@pingsocial.com"
        assert "\x1b" not in obs.message
        assert obs.message_truncated is False
        assert len(obs.parents) == 0
        assert obs.committed_at.startswith("2024-10-")
        assert obs.signature_present is False
        assert obs.signature_key_id is None
        assert obs.signature_valid is None
        assert obs.signature_trusted is False

    def test_message_truncation(self, bare_repo):
        big = "z" * (config.MAX_MESSAGE_BYTES + 100)
        sha = commit_file(bare_repo, "refs/heads/main", "f", b"x", big)
        obs = parse_commit(bare_repo, str(sha))
        assert obs.message_truncated is True
        assert obs.message.endswith("[...truncated]")
        assert len(obs.message.encode("utf-8")) <= config.MAX_MESSAGE_BYTES

    def test_unsigned_commit_gpg_signature_absent(self, bare_repo):
        sha = commit_file(bare_repo, "refs/heads/main", "f", b"x", "m")
        commit = bare_repo.get(sha)
        assert commit.gpg_signature == (None, None)


class TestDiffCommit:
    def test_added_deleted_modified(self, bare_repo, tmp_path):
        work = pygit2.init_repository(str(tmp_path / "w"))
        open(tmp_path / "w" / "a.txt", "w").write("one\n")
        open(tmp_path / "w" / "b.txt", "w").write("two\n")
        work.index.add_all()
        work.index.write()
        t1 = work.index.write_tree()
        c1 = work.create_commit(
            "refs/heads/main",
            pygit2.Signature("a", "a@x"),
            pygit2.Signature("a", "a@x"),
            "c1",
            t1,
            [],
        )
        open(tmp_path / "w" / "a.txt", "w").write("one changed\n")
        open(tmp_path / "w" / "c.txt", "w").write("three\n")
        (tmp_path / "w" / "b.txt").unlink()
        work.index.add_all()
        work.index.write()
        t2 = work.index.write_tree()
        c2 = work.create_commit(
            "refs/heads/main",
            pygit2.Signature("a", "a@x"),
            pygit2.Signature("a", "a@x"),
            "c2",
            t2,
            [c1],
        )
        summary = diff_commit(work, str(c2), rename_limit=_rename_limit())
        assert summary.added == ["c.txt"]
        assert summary.deleted == ["b.txt"]
        assert summary.modified == ["a.txt"]
        assert summary.merge is False
        assert summary.files_changed == 3

    def test_exact_rename_is_fact(self, bare_repo, tmp_path):
        work = pygit2.init_repository(str(tmp_path / "w"))
        open(tmp_path / "w" / "old.txt", "w").write("same bytes\n")
        work.index.add_all()
        work.index.write()
        t1 = work.index.write_tree()
        c1 = work.create_commit(
            "refs/heads/main", pygit2.Signature("a", "a@x"),
            pygit2.Signature("a", "a@x"), "c1", t1, [],
        )
        (tmp_path / "w" / "old.txt").rename(tmp_path / "w" / "new.txt")
        work.index.add_all()
        work.index.write()
        t2 = work.index.write_tree()
        c2 = work.create_commit(
            "refs/heads/main", pygit2.Signature("a", "a@x"),
            pygit2.Signature("a", "a@x"), "c2", t2, [c1],
        )
        summary = diff_commit(work, str(c2), rename_limit=_rename_limit())
        assert summary.exact_renames == [("old.txt", "new.txt")]
        assert summary.inexact_renames == []

    def test_rename_ceiling_flag(self, bare_repo):
        summary = diff_commit(
            bare_repo,
            str(commit_file(bare_repo, "refs/heads/main", "f", b"x", "root")),
            rename_limit=_rename_limit(),
        )
        assert summary.rename_ceiling_hit is False

    def test_merge_uses_first_parent(self, bare_repo, tmp_path):
        work = pygit2.init_repository(str(tmp_path / "w"))
        open(tmp_path / "w" / "base.txt", "w").write("base\n")
        work.index.add_all()
        work.index.write()
        t0 = work.index.write_tree()
        sig = pygit2.Signature("a", "a@x")
        c0 = work.create_commit("refs/heads/main", sig, sig, "base", t0, [])
        open(tmp_path / "w" / "m1.txt", "w").write("m1\n")
        work.index.add_all()
        work.index.write()
        c1 = work.create_commit("refs/heads/main", sig, sig, "m1", work.index.write_tree(), [c0])
        work.references.create("refs/heads/other", c0)
        open(tmp_path / "w" / "m2.txt", "w").write("m2\n")
        (tmp_path / "w" / "m1.txt").unlink(missing_ok=True)
        work.index.add_all()
        work.index.write()
        c2 = work.create_commit("refs/heads/other", sig, sig, "m2", work.index.write_tree(), [c0])
        merged = work.create_commit(
            "refs/heads/main", sig, sig, "merge",
            str(work.get(c2).tree_id), [c1, c2],
        )
        summary = diff_commit(work, str(merged), rename_limit=_rename_limit())
        assert summary.merge is True
        # First-parent diff: main@{m1} -> merge tree == other branch's delta.
        assert "m2.txt" in summary.added

    def test_root_commit_lists_additions(self, bare_repo):
        sha = commit_file(bare_repo, "refs/heads/main", "f", b"x", "root")
        summary = diff_commit(bare_repo, str(sha), rename_limit=_rename_limit())
        assert summary.added == ["f"]
        assert summary.merge is False


class TestWalkCommits:
    def test_topological_order_and_cap(self, bare_repo):
        parent = None
        for i in range(5):
            parent = commit_file(
                bare_repo, "refs/heads/main", f"f{i}", b"x", f"c{i}",
                parents=([parent] if parent else []),
            )
        shas, capped = walk_commits(bare_repo, [str(parent)], max_commits=3)
        assert len(shas) == 3
        assert capped is True
        assert shas[0] == str(parent)

    def test_deadline(self, bare_repo):
        sha = commit_file(bare_repo, "refs/heads/main", "f", b"x", "m")
        with pytest.raises(PacketTimeout):
            walk_commits(bare_repo, [str(sha)], deadline=0)
