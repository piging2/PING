"""Shared fixtures for git-ingestion tests.

Builds real repositories with pygit2 (never shelling out to git) so the
tests exercise the REAL ingestion pipeline, not mocks.
"""

import hashlib
import os
import zlib

import pygit2
import pytest


@pytest.fixture
def bare_repo(tmp_path):
    path = str(tmp_path / "repo.git")
    repo = pygit2.init_repository(path, bare=True)
    return repo


def make_sig(name="Nolan Geske", email="nolan@pingsocial.com"):
    return pygit2.Signature(name, email, 1727745600, 0)


def commit_file(repo, refname, filename, content, message, parents=()):
    blob = repo.create_blob(content)
    tb = repo.TreeBuilder()
    tb.insert(filename, blob, pygit2.GIT_FILEMODE_BLOB)
    tree = tb.write()
    return repo.create_commit(
        refname, make_sig(), make_sig(), message, tree, list(parents)
    )


def write_raw_object(gitdir, obj_type, content):
    """Write a raw (possibly spec-violating) object into the ODB.

    Used to craft trees libgit2 would refuse to WRITE but will READ,
    e.g. entries named ".." or "a/b" (T-01 proof shape).
    """
    assert obj_type in ("blob", "tree", "commit", "tag")
    body = obj_type.encode() + b" " + str(len(content)).encode() + b"\x00" + content
    sha = hashlib.sha1(body).hexdigest()
    objdir = os.path.join(gitdir, "objects", sha[:2])
    os.makedirs(objdir, exist_ok=True)
    with open(os.path.join(objdir, sha[2:]), "wb") as fh:
        fh.write(zlib.compress(body))
    return sha


def make_tree(gitdir, entries):
    """entries: list of (mode_str, name_bytes, target_hexsha)."""
    content = b""
    for mode, name, target in sorted(entries, key=lambda e: e[1]):
        content += mode.encode() + b" " + name + b"\x00" + bytes.fromhex(target)
    return write_raw_object(gitdir, "tree", content)


def gitdir_of(repo):
    # Bare repo: repo.path IS the gitdir.
    return repo.path.rstrip("/")
