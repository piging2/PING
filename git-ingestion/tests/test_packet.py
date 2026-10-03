"""Integration tests for packet.py over real repositories."""

import pygit2
import pytest

from git_ingest import config
from git_ingest.packet import (
    CONF_CLAIMED_IDENTITY,
    CONF_STRUCTURAL,
    GIT_COMMIT_OBSERVED,
    GIT_PACKET_STALE,
    GIT_REF_OBSERVED,
    GIT_REPO_QUARANTINED,
    build_packet,
)
from git_ingest.snapshot import take_ref_snapshot
from conftest import commit_file, gitdir_of, make_tree, write_raw_object


def _two_commit_repo(repo):
    c1 = commit_file(repo, "refs/heads/main", "a.txt", b"one\n", "first")
    c2 = commit_file(
        repo, "refs/heads/main", "a.txt", b"one\ntwo\n", "second", parents=[c1]
    )
    return c1, c2


class TestBuildPacketOk:
    def test_ok_packet(self, bare_repo):
        c1, c2 = _two_commit_repo(bare_repo)
        packet = build_packet("repo-1", bare_repo)
        assert packet.status == "OK"
        assert packet.quarantines == []
        kinds = [o["eventType"] for o in packet.observations]
        assert GIT_REF_OBSERVED in kinds
        commits = [o for o in packet.observations if o["eventType"] == GIT_COMMIT_OBSERVED]
        assert len(commits) == 2
        assert packet.ref_snapshot_end is not None
        assert packet.stats["commitsWalked"] == 2
        assert packet.stats["commitsCapped"] is False

    def test_commit_observation_shape(self, bare_repo):
        _two_commit_repo(bare_repo)
        packet = build_packet("repo-1", bare_repo)
        obs = next(
            o for o in packet.observations if o["eventType"] == GIT_COMMIT_OBSERVED
        )
        assert obs["logicalId"] == obs["envelope"]["sourceIdentity"]
        assert obs["confidence"] == CONF_STRUCTURAL
        assert obs["lifecycleStage"] == "observation"
        payload = obs["payload"]
        assert payload["claimedAuthor"]["confidence"] == CONF_CLAIMED_IDENTITY
        assert payload["claimedAuthor"]["verified"] is False
        assert payload["claimedAuthor"]["marker"] == "unverified-claim"
        assert payload["signature"]["valid"] is None
        assert payload["signature"]["trusted"] is False
        assert payload["provenance"] == "untrusted-repo-content"
        assert payload["diff"]["modified"] == ["a.txt"]
        env = obs["envelope"]
        assert env["sourceSystem"] == "git"
        assert env["sourceObjectType"] == "commit"
        assert env["sourceVersion"] == env["sourceObjectId"]  # sha is both

    def test_ref_observation_versioning(self, bare_repo):
        c1, c2 = _two_commit_repo(bare_repo)
        packet = build_packet("repo-1", bare_repo)
        ref_obs = next(
            o for o in packet.observations if o["eventType"] == GIT_REF_OBSERVED
        )
        assert ref_obs["payload"]["refName"] == "refs/heads/main"
        assert ref_obs["payload"]["targetSha"] == str(c2)
        assert ref_obs["envelope"]["sourceVersion"] == str(c2)

    def test_allowlist(self, bare_repo):
        _two_commit_repo(bare_repo)
        c3 = commit_file(bare_repo, "refs/heads/other", "b", b"x", "other-branch")
        packet = build_packet("repo-1", bare_repo, ref_allowlist=["refs/heads/main"])
        ref_names = {
            o["payload"]["refName"]
            for o in packet.observations
            if o["eventType"] == GIT_REF_OBSERVED
        }
        assert ref_names == {"refs/heads/main"}
        assert str(c3) not in {
            o["payload"]["sha"]
            for o in packet.observations
            if o["eventType"] == GIT_COMMIT_OBSERVED
        }

    def test_commit_cap_is_bound_not_quarantine(self, bare_repo):
        parent = None
        for i in range(6):
            parent = commit_file(
                bare_repo, "refs/heads/main", f"f{i}", b"x", f"c{i}",
                parents=([parent] if parent else []),
            )
        packet = build_packet("repo-1", bare_repo, max_commits=2)
        assert packet.status == "OK"
        assert packet.stats["commitsCapped"] is True
        commits = [
            o for o in packet.observations if o["eventType"] == GIT_COMMIT_OBSERVED
        ]
        assert len(commits) == 2


class TestQuarantine:
    def test_malformed_tree_quarantines_packet(self, bare_repo):
        gitdir = gitdir_of(bare_repo)
        blob_sha = write_raw_object(gitdir, "blob", b"pwn")
        evil_tree = make_tree(gitdir, [("100644", b"..", blob_sha)])
        sig = pygit2.Signature("a", "a@x")
        c = bare_repo.create_commit(
            "refs/heads/main", sig, sig, "evil", evil_tree, []
        )
        packet = build_packet("repo-evil", bare_repo)
        assert packet.status.startswith("QUARANTINED:malformed-tree")
        assert packet.observations[0]["eventType"] == GIT_REPO_QUARANTINED
        assert any(q.code.startswith("malformed-tree") for q in packet.quarantines)
        # Fail closed: no commit observations leak from a quarantined packet.
        assert not any(
            o["eventType"] == GIT_COMMIT_OBSERVED for o in packet.observations
        )

    def test_invalid_ref_dropped_not_quarantining(self, bare_repo, monkeypatch):
        _two_commit_repo(bare_repo)
        import git_ingest.packet as packet_mod

        real_validate = packet_mod.validate_ref_name

        def fake_validate(name, require_slash=True):
            if name == "refs/heads/main":
                return False
            return real_validate(name, require_slash)

        monkeypatch.setattr(packet_mod, "validate_ref_name", fake_validate)
        # Keep the end snapshot consistent with the simulated-invalid
        # start snapshot so the STALE check does not fire on the
        # artificial inconsistency.
        real_take = packet_mod.take_ref_snapshot

        def fake_take(repo):
            snap = real_take(repo)
            snap.refs.pop("refs/heads/main", None)
            return snap

        monkeypatch.setattr(packet_mod, "take_ref_snapshot", fake_take)
        packet = build_packet("repo-1", bare_repo)
        assert packet.status == "OK"
        assert any(q.code == "invalid-ref-name" for q in packet.quarantines)

    def test_symref_cycle_ref_dropped(self, bare_repo):
        _two_commit_repo(bare_repo)
        bare_repo.create_reference_symbolic("refs/heads/a", "refs/heads/b", True)
        bare_repo.create_reference_symbolic("refs/heads/b", "refs/heads/a", True)
        packet = build_packet("repo-1", bare_repo)
        assert packet.status == "OK"
        assert any(q.code == "ref-unresolvable" for q in packet.quarantines)
        ref_names = {
            o["payload"]["refName"]
            for o in packet.observations
            if o["eventType"] == GIT_REF_OBSERVED
        }
        assert "refs/heads/a" not in ref_names


class TestStale:
    def test_ref_move_marks_stale(self, bare_repo, monkeypatch):
        _two_commit_repo(bare_repo)
        import git_ingest.packet as packet_mod

        # Simulate a force-push landing between the start and end
        # snapshots: snapshots_moved reports the move, the packet must go
        # STALE and discard its observations rather than emit a mix.
        monkeypatch.setattr(
            packet_mod,
            "snapshots_moved",
            lambda old, new: ["refs/heads/main (moved)"],
        )
        packet = build_packet("repo-1", bare_repo)
        assert packet.status == "STALE"
        assert len(packet.observations) == 1
        assert packet.observations[0]["eventType"] == GIT_PACKET_STALE
        assert packet.ref_snapshot is not None
        assert packet.ref_snapshot_end is not None
