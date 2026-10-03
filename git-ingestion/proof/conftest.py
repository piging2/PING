"""Gauntlet fixtures: hostile-repo builders using git CLI plumbing + raw objects.

Isolation contract (never touches the operator's real git config):
  * every git invocation runs with GIT_CONFIG_GLOBAL=/dev/null,
    GIT_CONFIG_SYSTEM=/dev/null and a private HOME under tmp_path
  * user.name / user.email are passed per-command via `-c`
  * fixture repos live under pytest tmp_path (auto-cleaned)

Engine import: tests import the REAL `git_ingest` package (built in parallel
by the engine worker). `gi` fixture uses pytest.importorskip so the suite
collects and SKIPS cleanly when the engine is not yet present, and runs for
real once it lands. Nothing here mocks the engine.
"""
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import zlib

import pytest

SRC = os.environ.get(
    "GIT_INGEST_SRC", "/home/hatch/workspace/git-ingestion/src"
)
if SRC not in sys.path:
    sys.path.insert(0, SRC)

HEX40 = re.compile(r"\b[0-9a-f]{40}\b")

BASE_ENV = {
    "GIT_CONFIG_GLOBAL": os.devnull,
    "GIT_CONFIG_SYSTEM": os.devnull,
    # avoid stray lock files racing the G-09 pusher thread
    "GIT_OPTIONAL_LOCKS": "0",
}


# --------------------------------------------------------------------------
# git plumbing runner
# --------------------------------------------------------------------------
@pytest.fixture
def iso_home(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    return str(home)


@pytest.fixture
def run_git(iso_home):
    def _run(*args, cwd, env_extra=None, input_data=None, timeout=180,
             check=True):
        env = dict(os.environ)
        env.update(BASE_ENV)
        env["HOME"] = iso_home
        env["GIT_AUTHOR_NAME"] = "Gauntlet"
        env["GIT_AUTHOR_EMAIL"] = "gauntlet@example.invalid"
        env["GIT_COMMITTER_NAME"] = "Gauntlet"
        env["GIT_COMMITTER_EMAIL"] = "gauntlet@example.invalid"
        if env_extra:
            env.update(env_extra)
        proc = subprocess.run(
            ["git", *args], cwd=cwd, env=env, input=input_data,
            capture_output=True, timeout=timeout,
        )
        if check and proc.returncode != 0:
            raise RuntimeError(
                "git %s failed in %s\nstdout=%s\nstderr=%s"
                % (" ".join(args), cwd,
                   proc.stdout.decode("utf-8", "replace")[:2000],
                   proc.stderr.decode("utf-8", "replace")[:2000])
            )
        return proc
    return _run


@pytest.fixture
def make_repo(tmp_path, run_git):
    """Create an empty repo under tmp_path. Returns (repo_path, run_git)."""
    counter = {"n": 0}

    def _make(name=None, bare=False):
        counter["n"] += 1
        name = name or "repo%d" % counter["n"]
        path = str(tmp_path / name)
        args = ["init", "-q"]
        if bare:
            args.append("--bare")
        args += ["-b", "main", path]
        run_git(*args, cwd=str(tmp_path))
        return path
    return _make


# --------------------------------------------------------------------------
# raw object writers (the attacker's path: bypasses git's own validation)
# --------------------------------------------------------------------------
def _write_object(repo_path, objtype, body: bytes) -> str:
    header = ("%s %d\0" % (objtype, len(body))).encode("ascii")
    digest = hashlib.sha1(header + body).hexdigest()
    objdir = os.path.join(repo_path, ".git", "objects", digest[:2])
    os.makedirs(objdir, exist_ok=True)
    with open(os.path.join(objdir, digest[2:]), "wb") as fh:
        fh.write(zlib.compress(header + body))
    return digest


@pytest.fixture
def rawobj(make_repo):
    class Raw:
        @staticmethod
        def blob(repo_path, data: bytes) -> str:
            return _write_object(repo_path, "blob", data)

        @staticmethod
        def tree(repo_path, entries) -> str:
            """entries: list of (mode:int, name:bytes|str, sha_hex:str).

            Written in the given order (attackers do not sort)."""
            raw = b""
            for mode, name, sha in entries:
                if isinstance(name, str):
                    name = name.encode("utf-8")
                raw += ("%o " % mode).encode("ascii") + name + b"\0" \
                    + bytes.fromhex(sha)
            return _write_object(repo_path, "tree", raw)

        @staticmethod
        def commit(repo_path, tree, parents, message,
                   author="A U Thor <author@example.invalid>",
                   committer=None, extra_headers=()) -> str:
            lines = ["tree %s" % tree]
            for p in parents:
                lines.append("parent %s" % p)
            ident = "%s 0 +0000" % author
            lines.append("author %s" % ident)
            lines.append("committer %s" % (committer or ident))
            lines.extend(extra_headers)
            if isinstance(message, str):
                message = message.encode("utf-8")
            body = ("\n".join(lines)).encode("ascii") + b"\n\n" + message
            return _write_object(repo_path, "commit", body)

    return Raw()


@pytest.fixture
def commit_tree_plumbing(run_git):
    """git commit-tree + update-ref without any tree validation."""
    def _commit(repo_path, tree_sha, message="x", parents=(),
                branch="refs/heads/main"):
        args = ["commit-tree", tree_sha, "-m", message]
        for p in parents:
            args += ["-p", p]
        sha = run_git(*args, cwd=repo_path).stdout.decode().strip()
        run_git("update-ref", branch, sha, cwd=repo_path)
        return sha
    return _commit


# --------------------------------------------------------------------------
# engine import (real pipeline, never mocked)
# --------------------------------------------------------------------------
@pytest.fixture(scope="session")
def gi():
    """The real git_ingest engine package (submodules imported).

    Skips the test if the engine is absent. packet/envelope/ingest_client
    landed mid-run 2026-10-02; they are imported too (importorskip per
    module so a partially-built engine still yields partial coverage).
    """
    pytest.importorskip("git_ingest", reason="git_ingest engine not built yet")
    import importlib
    for sub in ("config", "clone", "snapshot", "validate", "parse",
                "packet", "envelope", "ingest_client"):
        try:
            importlib.import_module("git_ingest.%s" % sub)
        except ImportError:
            pass
    import git_ingest
    return git_ingest


@pytest.fixture(scope="session")
def packet_mod():
    """git_ingest.packet (build_packet). Skips cleanly until built."""
    return pytest.importorskip(
        "git_ingest.packet", reason="git_ingest.packet not built yet")


@pytest.fixture
def open_repo(gi):
    def _open(repo_path):
        return gi.clone.open_repo_readonly(repo_path)
    return _open


# --------------------------------------------------------------------------
# packet introspection helpers (schema-tolerant)
# --------------------------------------------------------------------------
def packet_raw_text(packet) -> str:
    """Concatenate every string reachable in the packet, RAW (no escaping)."""
    import dataclasses
    try:
        root = dataclasses.asdict(packet)
    except Exception:
        root = getattr(packet, "__dict__", packet)
    parts = []

    def rec(o):
        if isinstance(o, str):
            parts.append(o)
        elif isinstance(o, (bytes, bytearray)):
            parts.append(o.decode("utf-8", "backslashreplace"))
        elif isinstance(o, dict):
            for v in o.values():
                rec(v)
        elif isinstance(o, (list, tuple, set, frozenset)):
            for v in o:
                rec(v)
        elif o is not None and hasattr(o, "__dict__"):
            rec(o.__dict__)

    rec(root)
    return "\n".join(parts)


def packet_json_text(packet) -> str:
    import dataclasses

    def default(o):
        if isinstance(o, (bytes, bytearray)):
            return o.decode("utf-8", "backslashreplace")
        if isinstance(o, (set, frozenset)):
            return sorted(o)
        if hasattr(o, "__dict__"):
            return o.__dict__
        return str(o)

    try:
        root = dataclasses.asdict(packet)
    except Exception:
        root = getattr(packet, "__dict__", {})
    return json.dumps(root, default=default)


def all_hex40(packet):
    return set(HEX40.findall(packet_raw_text(packet)))


def snapshot_tree(root):
    """{relative_path: size} snapshot for pre/post diffs."""
    out = {}
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in filenames:
            full = os.path.join(dirpath, fn)
            try:
                out[os.path.relpath(full, root)] = os.path.getsize(full)
            except OSError:
                out[os.path.relpath(full, root)] = -1
    return out


def maxrss_mb():
    import resource
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: marks slow gauntlet tests")


# --------------------------------------------------------------------------
# GPG throwaway keys
# --------------------------------------------------------------------------
@pytest.fixture
def gpg_home(tmp_path):
    if shutil.which("gpg") is None:
        pytest.skip("gpg not available in sandbox")
    home = tmp_path / "gnupg"
    home.mkdir(mode=0o700)
    return str(home)


def gen_gpg_key(gpg_home, name, email):
    param = (
        "Key-Type: RSA\nKey-Length: 2048\nSubkey-Type: RSA\n"
        "Subkey-Length: 2048\nName-Real: %s\nName-Email: %s\n"
        "Expire-Date: 0\n%%no-protection\n%%commit\n" % (name, email)
    )
    env = dict(os.environ, GNUPGHOME=gpg_home)
    subprocess.run(["gpg", "--batch", "--gen-key"],
                   input=param.encode(), env=env, capture_output=True,
                   check=True, timeout=120)
    out = subprocess.run(
        ["gpg", "--batch", "--list-keys", "--with-colons", email],
        env=env, capture_output=True, check=True, timeout=30).stdout.decode()
    for line in out.splitlines():
        if line.startswith("fpr:"):
            return line.split(":")[9]
    raise RuntimeError("key generation produced no fingerprint")
