"""Unit tests for clone.py: env hardening and remote allowlist."""

import os

import pytest

from git_ingest.clone import (
    RefusedRemoteError,
    fetch_mirror,
    open_repo_readonly,
)


class TestOpenRepoReadonly:
    def test_opens_and_hardens_env(self, bare_repo, monkeypatch):
        monkeypatch.delenv("GIT_CONFIG_GLOBAL", raising=False)
        monkeypatch.delenv("GIT_CONFIG_SYSTEM", raising=False)
        repo = open_repo_readonly(bare_repo.path.rstrip("/"))
        assert repo is not None
        assert os.environ["GIT_CONFIG_GLOBAL"] == "/dev/null"
        assert os.environ["GIT_CONFIG_SYSTEM"] == "/dev/null"

    def test_idempotent_does_not_clobber(self, bare_repo, monkeypatch):
        monkeypatch.setenv("GIT_CONFIG_GLOBAL", "/custom/gitconfig")
        open_repo_readonly(bare_repo.path.rstrip("/"))
        assert os.environ["GIT_CONFIG_GLOBAL"] == "/custom/gitconfig"


class TestFetchMirrorAllowlist:
    @pytest.mark.parametrize(
        "url",
        [
            "https://github.com/example/repo.git",
            "https://host:8443/a/b.git",
        ],
    )
    def test_https_allowed_shape(self, url):
        # Only the allowlist decision is unit-tested here (no network);
        # refusal must NOT trigger for these.
        from git_ingest import clone as clone_mod

        # Call the private gate directly to avoid network.
        clone_mod._check_remote_allowed(url)

    @pytest.mark.parametrize(
        "url,reason",
        [
            ("ssh://git@github.com/example/repo.git", "ssh-transport"),
            ("git@github.com:example/repo.git", "scp-like-syntax"),
            ("user@host:path/to/repo.git", "scp-like-syntax"),
            ("git://github.com/example/repo.git", "git-transport"),
            ("file:///tmp/repo.git", "file-transport"),
            ("http://github.com/example/repo.git", "cleartext-http"),
            ("ftp://host/repo.git", "ftp-transport"),
            ("ext::ssh host repo", "ext-transport"),
            ("", "empty-remote"),
        ],
    )
    def test_refused_remotes(self, url, reason):
        with pytest.raises(RefusedRemoteError) as exc:
            fetch_mirror(url, "/tmp/never-created")
        assert exc.value.reason == reason

    def test_local_paths_allowed_shape(self, tmp_path):
        from git_ingest import clone as clone_mod

        clone_mod._check_remote_allowed(str(tmp_path))
        clone_mod._check_remote_allowed("/abs/path/to/repo.git")
        clone_mod._check_remote_allowed("relative/path.git")
