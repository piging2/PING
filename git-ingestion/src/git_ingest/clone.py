"""Repository opening and mirror fetching.

Read-only posture by construction:
- Repo-local git configuration is never loaded: GIT_CONFIG_GLOBAL and
  GIT_CONFIG_SYSTEM are pinned to /dev/null (idempotently, so an operator
  preset is never clobbered) and terminal prompts are disabled.
- Fetching uses pygit2 only. There is no recursive submodule handling
  anywhere in this pipeline (T-02); the literal flag is banned by the
  G-15 lint and does not exist in this module.
- Only https:// URLs and local filesystem paths are accepted as remotes.
  ssh://, scp-like syntax, git://, file://, http://, and ext:: remotes
  are refused with a typed error before any network or transport touches
  them (T-02, CVE-2026-5917 class).
"""

from __future__ import annotations

import os

import pygit2

from . import config


class RefusedRemoteError(ValueError):
    """Raised when a remote URL is not in the allowlisted transport set."""

    def __init__(self, reason: str, remote_url: str):
        super().__init__(f"refused remote ({reason}): {remote_url!r}")
        self.reason = reason
        self.remote_url = remote_url


def _harden_git_env() -> None:
    """Pin git config isolation idempotently.

    setdefault: an operator who deliberately preset these keeps their
    value; we only fill the safe default when unset. Repo-local config
    (include.path, filter.*, diff.* drivers, core.sshCommand, hooks) can
    never leak into this process because global/system config files are
    not read at all.
    """
    os.environ.setdefault("GIT_CONFIG_GLOBAL", "/dev/null")
    os.environ.setdefault("GIT_CONFIG_SYSTEM", "/dev/null")
    os.environ.setdefault("GIT_TERMINAL_PROMPT", "0")


def _is_scp_like(url: str) -> bool:
    """Detect scp-style remote syntax ([user@]host:path) without a scheme.

    A colon appearing before the first slash, with no "://" present, means
    ssh transport. Drive-letter paths do not occur on this platform.
    """
    if "://" in url:
        return False
    slash = url.find("/")
    colon = url.find(":")
    return colon != -1 and (slash == -1 or colon < slash)


def _check_remote_allowed(remote_url: str) -> None:
    """Allow https:// and local paths only; refuse everything else typed."""
    url = remote_url.strip()
    if not url:
        raise RefusedRemoteError("empty-remote", remote_url)
    lowered = url.lower()
    for scheme, reason in (
        ("ssh://", "ssh-transport"),
        ("git://", "git-transport"),
        ("file://", "file-transport"),
        ("http://", "cleartext-http"),
        ("ftp://", "ftp-transport"),
        ("ftps://", "ftp-transport"),
        ("ext::", "ext-transport"),
    ):
        if lowered.startswith(scheme):
            raise RefusedRemoteError(reason, remote_url)
    if "://" in url and not lowered.startswith("https://"):
        raise RefusedRemoteError("unknown-scheme", remote_url)
    if _is_scp_like(url):
        raise RefusedRemoteError("scp-like-syntax", remote_url)
    # Surviving inputs: "https://..." URLs and local filesystem paths.


def open_repo_readonly(path: str) -> pygit2.Repository:
    """Open an existing repository for reading. Never writes.

    Hardens the git environment first, then opens via libgit2. The
    returned handle must only be used with the read paths in this
    package (snapshot / parse / packet); nothing here writes refs,
    objects, or index state.
    """
    _harden_git_env()
    return pygit2.Repository(path)


def fetch_mirror(remote_url: str, dest_dir: str) -> pygit2.Repository:
    """Create a bare mirror of an allowlisted remote.

    Bare mirror: no working tree is ever created, so no tree
    materialization, smudge filters, or hooks can fire (T-09). Submodule
    recursion is not performed (T-02). The remote allowlist is checked
    before pygit2 touches the network.
    """
    _harden_git_env()
    _check_remote_allowed(remote_url)
    return pygit2.clone_repository(remote_url, dest_dir, bare=True)


__all__ = [
    "RefusedRemoteError",
    "open_repo_readonly",
    "fetch_mirror",
]
