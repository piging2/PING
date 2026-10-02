"""Canonical-to-mirror prospect digest preflight (2026-09-23, CEO MODE).

Invariant: the goal mirror is DERIVED from the canonical
~/workspace/your_files/ prospect files, one direction only. The preflight
runs first at sweep start: clean when the mirror matches (no writes),
repair + verify when it drifts, fail closed (nonzero) when canonical is
missing or post-copy verification fails. Mirror data never flows back
into canonical.
"""
import importlib.util
import os
import sys
import tempfile

OUTREACH = os.path.expanduser("~/workspace/outreach")


def _load():
    spec = importlib.util.spec_from_file_location(
        "prospect_mirror_preflight",
        os.path.join(OUTREACH, "prospect-mirror-preflight.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _fx():
    d = tempfile.mkdtemp()
    canon = os.path.join(d, "canon")
    mirror = os.path.join(d, "mirror")
    os.makedirs(canon)
    os.makedirs(mirror)
    return d, canon, mirror


def _write(p, data):
    with open(p, "wb") as f:
        f.write(data)


class Runner:
    """Fixture digest builder: writes canonical digest + provenance."""

    def __init__(self):
        self.calls = 0

    def __call__(self, canon):
        self.calls += 1
        _write(os.path.join(canon, "prospect-digest.md"), b"# digest\n")
        _write(os.path.join(canon, "prospect-digest.provenance.json"),
               b'{"source_hash": "x"}')
        return 0


def _paths(canon, mirror):
    return dict(
        canonical_jsonl=os.path.join(canon, "western-co-prospects.jsonl"),
        canonical_digest=os.path.join(canon, "prospect-digest.md"),
        canonical_prov=os.path.join(canon, "prospect-digest.provenance.json"),
        mirror_jsonl=os.path.join(mirror, "western-co-prospects.jsonl"),
        mirror_digest=os.path.join(mirror, "prospect-digest.md"),
        mirror_prov=os.path.join(mirror, "prospect-digest.provenance.json"))


def test_clean_match_produces_no_writes():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    blob = b'{"business_name":"A"}\n'
    for k, v in (("canonical_jsonl", blob), ("mirror_jsonl", blob),
                 ("canonical_digest", b"# digest\n"),
                 ("mirror_digest", b"# digest\n"),
                 ("canonical_prov", b"{}"), ("mirror_prov", b"{}")):
        _write(p[k], v)
    before = {k: os.stat(p[k]).st_mtime_ns for k in p}
    runner = Runner()

    rc = mod.preflight(digest_runner=lambda: runner(canon), **p)

    assert rc == 0
    assert runner.calls == 0, "digest builder must not run on a clean mirror"
    after = {k: os.stat(p[k]).st_mtime_ns for k in p}
    assert before == after, "clean preflight must not write anything"


def test_missing_mirror_rebuilds_from_canonical():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    _write(p["canonical_jsonl"], b'{"business_name":"A"}\n')
    runner = Runner()

    rc = mod.preflight(digest_runner=lambda: runner(canon), **p)

    assert rc == 0
    assert runner.calls == 1
    assert mod.files_equal(p["canonical_jsonl"], p["mirror_jsonl"])
    assert mod.files_equal(p["canonical_digest"], p["mirror_digest"])
    assert mod.files_equal(p["canonical_prov"], p["mirror_prov"])


def test_mismatched_mirror_rebuilds_from_canonical():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    canon_blob = b'{"business_name":"A"}\n'
    _write(p["canonical_jsonl"], canon_blob)
    _write(p["mirror_jsonl"], b'{"business_name":"STALE"}\n')
    canon_mtime = os.stat(p["canonical_jsonl"]).st_mtime_ns
    runner = Runner()

    rc = mod.preflight(digest_runner=lambda: runner(canon), **p)

    assert rc == 0
    with open(p["mirror_jsonl"], "rb") as f:
        assert f.read() == canon_blob
    # one direction: canonical untouched by the repair
    with open(p["canonical_jsonl"], "rb") as f:
        assert f.read() == canon_blob
    assert os.stat(p["canonical_jsonl"]).st_mtime_ns == canon_mtime


def test_stale_digest_mirror_repaired_while_jsonl_matches():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    blob = b'{"business_name":"A"}\n'
    _write(p["canonical_jsonl"], blob)
    _write(p["mirror_jsonl"], blob)
    _write(p["mirror_digest"], b"# stale digest\n")
    runner = Runner()

    rc = mod.preflight(digest_runner=lambda: runner(canon), **p)

    assert rc == 0
    assert runner.calls == 1
    assert mod.files_equal(p["canonical_digest"], p["mirror_digest"])
    assert mod.files_equal(p["canonical_prov"], p["mirror_prov"])


def test_failed_verification_returns_nonzero():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    _write(p["canonical_jsonl"], b'{"business_name":"A"}\n')

    def corrupt_copy(src, dst):
        _write(dst, b"corrupted")

    runner = Runner()
    rc = mod.preflight(digest_runner=lambda: runner(canon),
                       copy_fn=corrupt_copy, **p)
    assert rc == 2


def test_missing_canonical_fails_closed():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    runner = Runner()

    rc = mod.preflight(digest_runner=lambda: runner(canon), **p)

    assert rc == 2
    assert runner.calls == 0, "builder must not run without a canonical"


def test_failing_digest_builder_fails_closed():
    mod = _load()
    d, canon, mirror = _fx()
    p = _paths(canon, mirror)
    _write(p["canonical_jsonl"], b'{"business_name":"A"}\n')

    rc = mod.preflight(digest_runner=lambda: 1, **p)

    assert rc == 2


TESTS = [v for k, v in sorted(globals().items())
         if k.startswith("test_") and callable(v)]


if __name__ == "__main__":
    failed = 0
    for t in TESTS:
        try:
            t()
            print("PASS", t.__name__)
        except Exception as e:
            failed += 1
            print("FAIL", t.__name__, "->", repr(e))
    print("%d/%d prospect mirror preflight tests passed"
          % (len(TESTS) - failed, len(TESTS)))
    sys.exit(1 if failed else 0)
