#!/usr/bin/env python3
"""H2: Dispatcher registry assertion. After register_event_handlers(), the
REPLAY_EXECUTED handler must come from workers.witness_worker (canonical),
and NO registered handler may come from the legacy root `witness_worker` module."""
import sys

sys.path.insert(0, "/home/nolan/worktrees/ping-harvest-12h")

from kernel import event_dispatcher as ed

ed.register_event_handlers()
handlers = ed.get_registered_handlers()

ok = True
for etype, h in sorted(handlers.items()):
    mod = getattr(h, "__module__", "?")
    name = getattr(h, "__name__", repr(h))
    print(f"{etype:22s} -> {mod}.{name}")
    if mod == "witness_worker":
        print(f"ASSERT-FAIL: legacy root witness_worker registered for {etype}")
        ok = False

rh = handlers.get("REPLAY_EXECUTED")
if rh is None or getattr(rh, "__module__", "") != "workers.witness_worker":
    print("ASSERT-FAIL: REPLAY_EXECUTED not wired to canonical workers.witness_worker")
    ok = False
else:
    print("OK: REPLAY_EXECUTED wired to canonical workers.witness_worker.handle_replay_executed")

print("H2-RESULT:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
