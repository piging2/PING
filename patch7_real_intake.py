"""
PATCH 7: ONE CONTROLLED LIVE INTAKE (real network, bounded candidate set).

Uses only the pipeline's existing machinery:
  - GitHubScanner._enrich_with_topics (aiohttp session from BaseScanner,
    RateLimiter, exponential-backoff retry in base._request_with_retry)
  - GitHubScanner.save_results (temporal diff over existing filesystem storage)
  - ClassificationEngine.batch_classify (evidence-aware gating)
  - DailyBriefingGenerator.generate (provenance in brief)

Executes NO code from the candidate repositories. No cloning. No scheduler.
No new infrastructure, no new dependencies, no new HTTP client.

Run twice: first run persists observations (NEW_REPOSITORY), second run
against the same SHAs must report UNCHANGED.
"""
import asyncio
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scanners.github_scanner import GitHubScanner, TrendingRepo
from scanners.classification_engine import ClassificationEngine
from synthesis.engines import DailyBriefingGenerator

# Tiny bounded candidate set, chosen for current FYD bottlenecks.
CANDIDATES = [
    {"owner": "scrapy", "name": "scrapy",
     "bottleneck": "structured web acquisition",
     "description": "Scrapy, a fast high-level web crawling and scraping framework for Python.",
     "language": "Python", "url": "https://github.com/scrapy/scrapy"},
    {"owner": "browser-use", "name": "browser-use",
     "bottleneck": "browser acquisition",
     "description": "Make websites accessible for AI agents. Automate the browser with AI.",
     "language": "Python", "url": "https://github.com/browser-use/browser-use"},
    {"owner": "in-toto", "name": "in-toto",
     "bottleneck": "evidence/provenance",
     "description": "in-toto is a framework to secure the integrity of software supply chains.",
     "language": "Python", "url": "https://github.com/in-toto/in-toto"},
    {"owner": "gohugoio", "name": "hugo",
     "bottleneck": "website generation / schema-driven rendering",
     "description": "The world's fastest framework for building websites.",
     "language": "Go", "url": "https://github.com/gohugoio/hugo"},
]


def rate_limit_state():
    """Independent honest read of GitHub rate-limit state."""
    req = urllib.request.Request(
        "https://api.github.com/rate_limit",
        headers={"User-Agent": "research-pipeline-patch7",
                 "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        body = json.loads(r.read().decode())
        core = body["resources"]["core"]
        return {"limit": core["limit"], "remaining": core["remaining"],
                "used": core["used"], "reset": core["reset"],
                "authenticated": core["limit"] > 60}


async def run_intake(tag):
    started = datetime.now(timezone.utc).isoformat()
    rl_before = rate_limit_state()

    async with GitHubScanner() as scanner:
        seeds = []
        for c in CANDIDATES:
            s = dict(c)
            score, matches, _ = scanner._calculate_relevance(s)
            s["matched_queries"] = matches
            s["relevance_score"] = round(score, 3)
            s["scanned_at"] = datetime.now(timezone.utc).isoformat()
            seeds.append(s)

        enriched = await scanner._enrich_with_topics(seeds)

        failures = []
        scan_results = []
        for e, c in zip(enriched, CANDIDATES):
            if not e.get("repository_id") or not e.get("observed_commit_sha"):
                failures.append({
                    "candidate": f"{c['owner']}/{c['name']}",
                    "repository_id": e.get("repository_id"),
                    "observed_commit_sha": e.get("observed_commit_sha"),
                    "evidence_level": e.get("evidence_level"),
                })
            scan_results.append(TrendingRepo(e).to_scan_result())

        scan_path = scanner.save_results(scan_results)

    rl_after = rate_limit_state()

    # Classify from the persisted scan file: same shape the orchestrator classifies.
    with open(scan_path) as f:
        grouped = json.load(f)
    items = [repo for repos in grouped.values() for repo in repos]

    classifier = ClassificationEngine()
    classified = classifier.batch_classify(items)
    classified_dicts = [{
        "source_id": r.source_id,
        "source_type": r.source_type,
        "title": r.title,
        "url": r.url,
        "adoption_tier": r.adoption_tier.value,
        "architectural_layers": [l.value for l in r.architectural_layers],
        "matched_keywords": r.matched_keywords,
        "confidence": r.confidence,
        "reasoning": r.reasoning,
        "constitutional_concerns": r.constitutional_concerns,
        "deprioritized": r.deprioritized,
        "classified_at": r.classified_at,
        "evidence_level": r.evidence_level,
        "evidence_sources": r.evidence_sources,
        "repository_id": r.repository_id,
        "observed_commit_sha": r.observed_commit_sha,
    } for r in classified]

    brief = DailyBriefingGenerator().generate(classified_dicts)
    brief_path = Path("scan_results") / f"patch7_brief_{tag}.md"
    brief_path.write_text(brief)

    observations = []
    for item, r in zip(items, classified):
        observations.append({
            "candidate": item["id"],
            "bottleneck": next(c["bottleneck"] for c in CANDIDATES
                               if f"{c['owner']}/{c['name']}" == item["id"]),
            "repository_id": item.get("repository_id"),
            "observed_commit_sha": item.get("observed_commit_sha"),
            "evidence_level": item.get("evidence_level"),
            "evidence_sources": item.get("evidence_source"),
            "license_spdx": item.get("license_spdx"),
            "change_status": item.get("change_status"),
            "adoption_tier": r.adoption_tier.value,
        })

    report = {
        "tag": tag,
        "started": started,
        "real_network_request": "PASS" if not failures else "PARTIAL",
        "auth": "UNAVAILABLE" if not rl_before["authenticated"] else "AVAILABLE",
        "rate_limit_before": rl_before,
        "rate_limit_after": rl_after,
        "observations": observations,
        "failures": failures,
        "scan_path": scan_path,
        "brief_path": str(brief_path),
    }
    out = Path("scan_results") / f"patch7_intake_{tag}.json"
    out.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "run1"
    asyncio.run(run_intake(tag))
