"""G-15: static no-execution lint over src/git_ingest/.

Fails the build if the ingestion codebase contains any execution
primitive reachable from untrusted bytes: subprocess, os.system/popen,
eval/exec, worktree materialization verbs, submodule recursion flags,
external diff driver invocation, LFS fetch calls, or network imports
outside ingest_client.py (which may only contact the PING gateway).
"""

from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src" / "git_ingest"

# Substring -> why it is banned.
BANNED_EVERYWHERE = {
    "subprocess": "no subprocess spawning (T-04, T-09, T-11)",
    "os.system": "no shell execution",
    "os.popen": "no shell execution",
    "popen(": "no shell execution",
    "eval(": "no eval of repo-derived strings",
    "exec(": "no exec of repo-derived strings",
    "checkout": "no worktree materialization of untrusted repos (T-01, T-08, T-09)",
    "recurse-submodules": "no submodule recursion, ever (T-02)",
    "recurse_submodules": "no submodule recursion, ever (T-02)",
    # LFS FETCH invocations (the magic-byte string
    # "version https://git-lfs.github.com/spec/v1" in parse.py is detection
    # data, not a fetch call, and is therefore not banned).
    "lfs fetch": "no LFS fetch (T-10)",
    "lfs_fetch": "no LFS fetch (T-10)",
    "fetch_lfs": "no LFS fetch (T-10)",
    "git lfs ": "no LFS fetch (T-10)",
}

# Import statements banned outside ingest_client.py.
BANNED_NETWORK_IMPORTS = (
    "import socket",
    "import urllib",
    "from urllib",
    "import requests",
    "from requests",
    "import http.client",
    "from http",
)


def _sources():
    return sorted(SRC_DIR.glob("*.py"))


def test_no_execution_primitives():
    offenders = []
    for path in _sources():
        text = path.read_text()
        for banned, why in BANNED_EVERYWHERE.items():
            if banned in text:
                offenders.append(f"{path.name}: {banned!r} ({why})")
    assert not offenders, "\n".join(offenders)


def test_network_imports_only_in_ingest_client():
    offenders = []
    for path in _sources():
        if path.name == "ingest_client.py":
            continue
        for i, line in enumerate(path.read_text().splitlines(), 1):
            stripped = line.strip()
            for banned in BANNED_NETWORK_IMPORTS:
                if stripped.startswith(banned):
                    offenders.append(f"{path.name}:{i}: {stripped}")
    assert not offenders, "\n".join(offenders)


def test_ingest_client_never_contacts_repo_urls():
    text = (SRC_DIR / "ingest_client.py").read_text()
    # The only network call this module may make is requests.post against
    # the caller-supplied gateway URL. Repo-derived URL shapes
    # (.gitmodules / .lfsconfig targets) must never appear as fetch
    # targets; the docstring may NAME them only to forbid them.
    assert text.count("requests.post") == 1
    assert 'requests.post(req["url"]' in text
    for banned in ("gitmodules", "lfsconfig"):
        assert banned not in text.lower(), f"ingest_client references {banned}"
