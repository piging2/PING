#!/usr/bin/env python3
"""Fix the publicGraph helper typing: preserve the full ObjectGraph type."""
import sys
import re

P = "/home/nolan/projects/ping/"

for page in ["src/app/sites/happy-place/page.tsx", "src/app/sites/coppersmith-plumbing/page.tsx"]:
    full = P + page
    s = open(full).read()

    old_helper = """function publicGraph(graph: {
  objects: { id: string; visibility: string }[];
  relationships: { subject: string; object: string }[];
}) {"""
    new_helper = """function publicGraph(graph: ObjectGraph): ObjectGraph {"""
    if s.count(old_helper) != 1:
        print(f"FAIL {page}: helper not found")
        sys.exit(1)
    s = s.replace(old_helper, new_helper, 1)

    # ensure ObjectGraph is imported
    if "ObjectGraph" not in s.split("function publicGraph")[0].split("\n")[-30:].__str__():
        pass
    # add type import if missing
    if 'import type { ObjectGraph }' not in s and 'ObjectGraph } from "@/fyd/sitespec/types"' not in s:
        # find the sitespec/types import or add one
        if 'from "@/fyd/sitespec/types"' in s:
            # extend existing import - find it
            m = re.search(r'import type \{([^}]*)\} from "@/fyd/sitespec/types";', s)
            if m:
                names = m.group(1)
                if "ObjectGraph" not in names:
                    s = s.replace(m.group(0), 'import type {' + names.rstrip() + ', ObjectGraph } from "@/fyd/sitespec/types";', 1)
            else:
                # value import; add a separate type import after it
                m2 = re.search(r'import \{([^}]*)\} from "@/fyd/sitespec/types";', s)
                if m2:
                    s = s.replace(m2.group(0), m2.group(0) + '\nimport type { ObjectGraph } from "@/fyd/sitespec/types";', 1)
        else:
            # add after the ping-object-source import
            s = s.replace(
                'import { getPingObjectGraph } from "@/fyd/data/ping-object-source";',
                'import { getPingObjectGraph } from "@/fyd/data/ping-object-source";\nimport type { ObjectGraph } from "@/fyd/sitespec/types";',
                1,
            )
    open(full, "w").write(s)
    print(f"OK {page.split('/')[3]}")

print("DONE")
