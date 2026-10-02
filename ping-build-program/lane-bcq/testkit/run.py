"""CLI entry: run the connector contract test kit.

Usage:
    python3 -m testkit.run                 # fake connector (default)
    python3 -m testkit.run --adapter dotted.path:Factory
                                          # any Connector factory, e.g.
                                          #   python3 -m testkit.run --adapter myconn.adapter:make_connector

Writes results JSON + human summary to testkit/results/<timestamp>/.
Exit 0 when every test passes.
"""
from __future__ import annotations

import importlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load_factory(spec: str):
    if spec == "fake":
        from .fake_connector import FakeWidgetCRM
        return FakeWidgetCRM, "fake-widget-crm"
    module_path, _, attr = spec.partition(":")
    module = importlib.import_module(module_path)
    return getattr(module, attr), spec


def main(argv: list) -> int:
    from .harness import Runner

    spec = "fake"
    for i, a in enumerate(argv):
        if a == "--adapter" and i + 1 < len(argv):
            spec = argv[i + 1]
    factory, label = load_factory(spec)

    runner = Runner(factory)
    report = runner.run()

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    outdir = HERE / "results" / stamp
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "results.json").write_text(json.dumps(report, indent=2, default=str))

    lines = [f"# Contract test kit run: {label}",
             f"ran_at: {report['ran_at']}",
             f"result: {report['passed']}/{report['total']} passed",
             ""]
    for t in report["tests"]:
        mark = "PASS" if t["passed"] else "FAIL"
        lines.append(f"- [{mark}] {t['name']} ({t['duration_ms']}ms)")
        if not t["passed"]:
            lines.append(f"    evidence: {json.dumps(t['evidence'], default=str)[:500]}")
    lines.append("")
    (outdir / "SUMMARY.md").write_text("\n".join(lines))

    print("\n".join(lines))
    print(f"\nresults written to: {outdir}")
    return 0 if report["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
