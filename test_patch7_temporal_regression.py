"""PATCH 7 regression: re-observing the same repository at the same pinned SHA
must report UNCHANGED and preserve repository_id, observed_commit_sha,
evidence_level, and evidence_sources across SCAN -> EVIDENCE -> CLASSIFICATION.
Pure unit test: no network."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scanners.base import ScanResult
from scanners.github_scanner import GitHubTrendingScanner


def _result(sha, observed_at):
    return ScanResult(
        source="github",
        source_type="trending_repo",
        id="scrapy/scrapy",
        title="scrapy/scrapy",
        url="https://github.com/scrapy/scrapy",
        description="Scrapy, a fast high-level web crawling and scraping framework for Python.",
        matched_keywords=["scraping"],
        relevance_score=0.5,
        deprioritized=False,
        metadata={
            "repository_id": 529502,
            "observed_commit_sha": sha,
            "evidence_level": "L2_SOURCE_EVIDENCE",
            "evidence_sources": ["README", "SOURCE_STRUCTURE"],
            "license_spdx": "BSD-3-Clause",
            "observed_at": observed_at,
        },
        scanned_at=observed_at,
    )


def test_repeat_observation_same_sha_is_unchanged_and_preserves_evidence():
    scanner = GitHubTrendingScanner()
    sha = "40dc142961080e37fdc2096ad1a79733bf932e45"
    previous = {529502: {"repository_id": 529502,
                         "observed_commit_sha": sha,
                         "evidence_level": "L2_SOURCE_EVIDENCE"}}
    current = [_result(sha, "2026-09-21T16:15:45+00:00")]

    out = scanner._compute_temporal_diff(current, previous)

    assert out[0].metadata["change_status"] == "UNCHANGED"
    assert out[0].metadata["repository_id"] == 529502
    assert out[0].metadata["observed_commit_sha"] == sha
    assert out[0].metadata["evidence_level"] == "L2_SOURCE_EVIDENCE"
    assert out[0].metadata["evidence_sources"] == ["README", "SOURCE_STRUCTURE"]
    assert out[0].metadata["previous_commit_sha"] == sha
    print("PASS: test_repeat_observation_same_sha_is_unchanged_and_preserves_evidence")


if __name__ == "__main__":
    test_repeat_observation_same_sha_is_unchanged_and_preserves_evidence()
