"""G-16: every Global Boundaries cap lives in config.py, enforced at use.

Asserts the exact cap values AND that no numeric literal duplicates of
those values appear anywhere else in src/git_ingest/ (token-based scan,
so comments and strings cannot smuggle them either).
"""

import io
import tokenize

from git_ingest import config

SRC_DIR = __import__("pathlib").Path(__file__).resolve().parent.parent / "src" / "git_ingest"

EXPECTED = {
    "MAX_BLOB_BYTES": 64 * 1024 * 1024,
    "MAX_PACK_EXPANSION_RATIO": 100,
    "MAX_PACKET_DECOMPRESSED_BYTES": 1024 * 1024 * 1024,
    "MAX_TREE_DEPTH": 32,
    "MAX_TREE_ENTRIES": 100000,
    "MAX_GITLINKS_PER_PACKET": 1000,
    "MAX_COMMITS_PER_PACKET": 10000,
    "MAX_REFS_PER_PACKET": 5000,
    "MAX_MESSAGE_BYTES": 10 * 1024,
    "MAX_SYMLINK_TARGET_BYTES": 4 * 1024,
    "PACKET_TIMEOUT_SECONDS": 120,
    "SYMREF_MAX_HOPS": 5,
    "DELTA_CHAIN_MAX_DEPTH": 64,
    "CONNECTOR_ID": "git-ingest",
    "PRINCIPAL": "ping-git-ingest",
    "NAMESPACE": "core::git",
}


def test_cap_values_exact():
    for name, value in EXPECTED.items():
        assert getattr(config, name) == value, name


def _number_literals(path):
    with open(path, "rb") as fh:
        tokens = tokenize.tokenize(fh.readline)
        for tok in tokens:
            if tok.type == tokenize.NUMBER:
                text = tok.string
                try:
                    yield int(text, 0)
                except ValueError:
                    continue


def test_no_numeric_cap_duplicates_outside_config():
    cap_values = {
        v for k, v in EXPECTED.items() if isinstance(v, int)
    } - {0, 1}
    offenders = []
    for path in sorted(SRC_DIR.glob("*.py")):
        if path.name == "config.py":
            continue
        for literal in _number_literals(path):
            if literal in cap_values:
                offenders.append(f"{path.name}: literal {literal}")
    assert not offenders, "numeric duplicates of config caps: " + "; ".join(offenders)
