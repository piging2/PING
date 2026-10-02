#!/usr/bin/env python3
"""run_tests.py: set scratch env first, then import and run the suite.

Env is set before any siig module is imported because module-level paths
are bound at import time. Nothing here touches the production outreach
tree, the production ledger, or the production logs.
"""
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(HERE)

scratch = tempfile.mkdtemp(prefix="siig-test-")
os.environ["SI_IG_STATE"] = os.path.join(scratch, "state")
os.environ["ENGAGEMENT_GUARD_DIR"] = os.path.join(scratch, "outreach")

sys.path.insert(0, os.path.join(SKILL, "bin"))
sys.path.insert(0, os.path.join(SKILL, "fixtures"))
sys.path.insert(0, HERE)

import test_si_ig  # noqa: E402

if __name__ == "__main__":
    sys.exit(test_si_ig.run_all())
