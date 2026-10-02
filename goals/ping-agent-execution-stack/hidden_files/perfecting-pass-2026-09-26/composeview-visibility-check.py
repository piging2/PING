#!/usr/bin/env python3
"""
composeview-visibility-check.py

Static invariant check for backlog item `visibility-composeObjectView-bypass`.

The ObjectView (and the Circle projection built on it) must apply the
digest-verified owner field-visibility decisions BEFORE any contact field
or capability is read, otherwise an owner-hidden phone/email leaks into
the rendered page.

Checks (all must hold for the lane copy at LANE_ROOT):
  1. composeObjectView calls applyFieldVisibility before reading fields.
  2. loadObjectView resolves decisions from the projection's fieldVisibility
     block and passes them (plus a public viewer) into composeObjectView.
  3. visibilityDecisionsFromBlock is defined exactly once, in the canonical
     visibility authority (sitespec/field-visibility.ts), and
     customize/server.ts imports it rather than redefining it.

Usage:
  python3 composeview-visibility-check.py --lane-root <path-to-fyd-product-lane>
Exit 0 = invariant holds; exit 1 = bypass present.
"""
import argparse
import re
import sys
from pathlib import Path

VIEW = "src/fyd/object/view.ts"
FV = "src/fyd/sitespec/field-visibility.ts"
SRV = "src/fyd/customize/server.ts"


def read(root: Path, rel: str) -> str:
    p = root / rel
    if not p.exists():
        return ""
    return p.read_text()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lane-root", required=True)
    args = ap.parse_args()
    root = Path(args.lane_root)

    view = read(root, VIEW)
    fv = read(root, FV)
    srv = read(root, SRV)

    failures: list[str] = []

    # 1. composeObjectView must project before reading fields.
    m = re.search(
        r"export function composeObjectView\((.*?)\)(?::\s*ObjectView)?\s*\{",
        view,
        re.S,
    )
    if not m:
        failures.append("composeObjectView definition not found in object/view.ts")
    else:
        body_start = m.end()
        body = view[body_start : body_start + 4000]
        apply_pos = body.find("applyFieldVisibility(")
        # first field read after the gate comment
        read_m = re.search(r"const (phone|email|description|website)\s*=\s*field\(", body)
        if apply_pos == -1:
            failures.append("composeObjectView never calls applyFieldVisibility")
        elif read_m and read_m.start() < apply_pos:
            failures.append(
                "composeObjectView reads fields before the applyFieldVisibility gate"
            )

    # 2. loadObjectView must wire the projection's fieldVisibility block in.
    if "visibilityDecisionsFromBlock(projection.fieldVisibility)" not in view.replace(
        " ", ""
    ).replace("\n", ""):
        # whitespace-tolerant fallback
        if not re.search(
            r"visibilityDecisionsFromBlock\s*\(\s*projection\.fieldVisibility\s*\)", view
        ):
            failures.append(
                "loadObjectView does not resolve decisions from projection.fieldVisibility"
            )
    if "decisions:" not in view or "composeObjectView(" not in view:
        failures.append("loadObjectView does not pass decisions into composeObjectView")

    # 3. One definition, in the canonical visibility authority.
    fv_defs = len(re.findall(r"export function visibilityDecisionsFromBlock", fv))
    srv_defs = len(re.findall(r"export function visibilityDecisionsFromBlock", srv))
    if fv_defs != 1:
        failures.append(
            f"visibilityDecisionsFromBlock must be defined exactly once in "
            f"sitespec/field-visibility.ts (found {fv_defs})"
        )
    if srv_defs != 0:
        failures.append(
            "customize/server.ts redefines visibilityDecisionsFromBlock "
            "(must import it from the visibility authority)"
        )
    if "visibilityDecisionsFromBlock" not in srv:
        failures.append("customize/server.ts no longer uses visibilityDecisionsFromBlock")

    if failures:
        print("FAIL: visibility-composeObjectView-bypass invariant NOT satisfied:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS: composeObjectView is routed through the resolved FieldVisibilityBlock.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
