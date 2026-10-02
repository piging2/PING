#!/usr/bin/env python3
"""X adapter contract for the autonomy loop.

The adapter is DUMB by construction: it receives a fully authorized intent
(account, action, target) and performs the platform call, then reports what
happened. It never chooses targets, sets policy or budgets, and never
declares canonical success: that verdict belongs to the verifier's
read-after-write check plus the outcome receipt's ok boolean.

Sanctioned call path (x-api skill): bin/xapi.py is the only sanctioned
caller; CLIs use the authd surrogate exchange for custom.x; requests are
restricted to api.x.com; raw credentials are never printed, logged, or
persisted. A 401/403 is a question about the request before it is a question
about the key.

Adapter result contract (execute):
  {"ok": True|False|None, "http": int|None, "response": dict|None,
   "note": str, "timed_out": bool}
ok=None means the request outcome is unknown (timeout with indeterminate
server-side state). Only the verifier may resolve UNKNOWN, by reading
external state.

read_state(intent) returns the externally observed state:
  like   -> {"liked": bool}
  follow -> {"following": bool}
  comment-> {"commented": bool, "comment_id": str|None}

LIVE EXTERNAL EXECUTION: BLOCKED in this environment (no credentials here;
custom.x OAuth via authd surrogate is not available in this sandbox). The
LiveXAdapter below refuses rather than faking execution.
"""
import json
import subprocess


class LiveExecutionBlocked(Exception):
    pass


class XAdapter:
    name = "base"

    def cli(self, argv):
        """Run an xapi-shaped CLI and return its stdout string."""
        raise NotImplementedError

    def discover(self, query):
        """Read-only discovery. Returns candidate dicts
        {handle, url, text}. Never mutates."""
        raise NotImplementedError

    def execute(self, intent):
        """Attempt the authorized mutation. Returns the result contract."""
        raise NotImplementedError

    def read_state(self, intent):
        """Read external state for verification/recovery. Read-only."""
        raise NotImplementedError


XAPI = "/home/hatch/workspace/skills/x-api/bin/xapi.py"


class LiveXAdapter(XAdapter):
    """The sanctioned live path: subprocess to bin/xapi.py, never inline
    curl, never raw credentials. BLOCKED here: no credentials in this
    environment, so it refuses instead of fabricating execution."""

    name = "live-xapi"

    def _blocked(self):
        raise LiveExecutionBlocked(
            "LIVE EXTERNAL EXECUTION BLOCKED: no credentials in this "
            "environment (custom.x OAuth via authd surrogate not available "
            "here). Refusing rather than fabricating execution.")

    def cli(self, argv):
        self._blocked()

    def discover(self, query):
        self._blocked()

    def execute(self, intent):
        self._blocked()

    def read_state(self, intent):
        self._blocked()


def run_xapi_cli(argv, timeout=60):
    """The one sanctioned live invocation shape, for use when credentials
    exist. Kept here so the fixture and live paths share the parsing."""
    p = subprocess.run([XAPI] + list(argv), capture_output=True, text=True,
                       timeout=timeout)
    try:
        return json.loads(p.stdout) if p.stdout.strip() else {"ok": False,
               "error": "empty stdout", "stderr": p.stderr[:300]}
    except Exception:
        return {"ok": False, "error": "unparseable xapi output",
                "stdout": p.stdout[:300], "stderr": p.stderr[:300]}
