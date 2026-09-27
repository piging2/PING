#!/usr/bin/env python3
"""Front-door adapters: legacy callers wrapped as MissionIntent submitters.

Each adapter maps one legacy caller onto the narrow contract
(MissionIntent -> validate -> authorize -> dispatch -> observe). The
adapter owns ROUTING (which agent, which capability, which executor for
its mission class). The grant/deny DECISION stays with the existing
authority; the adapter never invents one.

MIGRATED_CLASSES is the registry of mission classes that have been
migrated and replay-tested. Direct bypass of the front door is illegal
for those classes, and detect_bypass() makes the bypass detectable by
scanning the journal for execution events with no covering intent record.

Reference adapter: SpineDryRunObserverAdapter wraps the spine lane's
dry-run observer (outreach/spine_observe.py --dry-run --json). That
caller is read-only and emits nothing itself, which makes it the safe
first adapter: it proves the adapter shape (intent, authorization via
the existing adapter path, work-order issuance, typed executor result,
canonical observation events) without changing what the legacy caller
does.
"""

import json
import os
import subprocess
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import mission_intent as mi

SOURCE_ARTIFACT = "mission-control/frontdoor_adapters.py"

# Registry of migrated + replay-tested mission classes. Bypass of the
# front door is illegal for exactly these classes (Batch 6: no flag day;
# per-class illegality only after migration + replay test).
MIGRATED_CLASSES = {
    "spine-observe-dry-run": {
        "adapter": "SpineDryRunObserverAdapter",
        "execution_event_prefix": "MC_PASS_",
        "bind_key": "pass_id",
        "migrated": True,
        "replay_test": "mission-control/tests/test_mission_intent.py",
    },
}


def is_bypass_illegal(mission_class):
    """True only for migrated + replay-tested classes."""
    entry = MIGRATED_CLASSES.get(mission_class)
    return bool(entry and entry.get("migrated"))


class _DryRunObserverExecutor(mi.Executor):
    """Runs the legacy spine observer as a black-box subprocess in
    dry-run mode: it folds the pass artifacts and reports, but emits
    nothing itself. The front door's observe() stage is the only
    canonical emission."""

    name = "spine-dry-run-observer"

    def __init__(self, observer_path, passes_dir, ledger_path,
                 timeout_s=120):
        self.observer_path = observer_path
        self.passes_dir = passes_dir
        self.ledger_path = ledger_path
        self.timeout_s = timeout_s
        self.calls = 0

    def execute(self, intent, work_order):
        self.calls += 1
        pass_id = intent["inputs"]["pass_id"]
        cmd = [sys.executable, self.observer_path,
               "--pass-id", pass_id,
               "--passes-dir", self.passes_dir,
               "--ledger", self.ledger_path,
               "--dry-run", "--json"]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True,
                                  timeout=self.timeout_s)
        except (OSError, subprocess.SubprocessError) as e:
            raise RuntimeError("observer subprocess failed to run: %s" % e)
        if proc.returncode != 0:
            raise RuntimeError(
                "observer exited %d: %s" % (
                    proc.returncode, (proc.stderr or "").strip()[:500]))
        folded = _parse_folded_json(proc.stdout)
        stages = [e.get("event_type") for e in folded]
        return {
            "status": "completed",
            "summary": "dry-run folded %d pass events for %s; stages: %s"
                       % (len(folded), pass_id, ",".join(stages)),
            "artifacts": [],
            "folded_event_types": stages,
        }


def _parse_folded_json(stdout):
    """Extract the --json folded-events array from observer stdout.

    The observer prints 'fold:' note lines, then the JSON array
    (indent=1, so it opens with '[' and closes with a line ']'), then
    per-event lines. Only the array is parsed.
    """
    lines = (stdout or "").splitlines()
    buf = []
    in_array = False
    for line in lines:
        if not in_array:
            if line.strip() == "[":
                in_array = True
                buf.append(line)
            continue
        buf.append(line)
        if line.strip() == "]":
            break
    if not buf:
        raise RuntimeError("observer output contained no folded JSON array")
    try:
        data = json.loads("\n".join(buf))
    except (json.JSONDecodeError, ValueError) as e:
        raise RuntimeError("observer folded JSON unparseable: %s" % e)
    if not isinstance(data, list):
        raise RuntimeError("observer folded JSON is not a list")
    return data


class SpineDryRunObserverAdapter(object):
    """Reference adapter: the spine's dry-run observer behind the
    MissionIntent front door."""

    MISSION_CLASS = "spine-observe-dry-run"
    # Routing only: the hermes profile is the existing read-only,
    # LIVE, harmless capability holder. The DECISION is the adapter's.
    AGENT_ID = "hermes"
    CAPABILITY = "fixture.read"
    CONSTRAINTS = {
        "read_only": True,
        "no_writes": True,
        "no_network": True,
        "no_canonical_events": True,
        "no_mission_state_writes": True,
    }

    def __init__(self, observer_path=None, adapter_dir=None,
                 node_bin="node"):
        self.observer_path = observer_path or os.path.normpath(
            os.path.join(_HERE, "..", "outreach", "spine_observe.py"))
        self.adapter_dir = adapter_dir
        self.node_bin = node_bin
        if not os.path.isfile(self.observer_path):
            raise RuntimeError(
                "legacy observer not found at %s" % self.observer_path)

    def build_intent(self, pass_id, passes_dir, ledger_path, actor,
                     auth_ctx):
        # Tenant hardening: the tenant is derived from the AUTHENTICATED
        # context, never supplied as an ordinary routing parameter. A
        # caller that tries to route a tenant explicitly cannot: there is
        # no tenant parameter to fill.
        if not isinstance(auth_ctx, mi.AuthenticatedContext):
            raise ValueError(
                "an AuthenticatedContext is required: the tenant is "
                "derived from the authenticated context, never a routing "
                "parameter")
        tenant = auth_ctx.tenant
        inputs = {
            "pass_id": pass_id,
            "passes_dir": passes_dir,
            "ledger": ledger_path,
            "dry_run": True,
        }
        return {
            "mission_class": self.MISSION_CLASS,
            "actor": actor,
            "tenant": tenant,
            "capability": self.CAPABILITY,
            "inputs_hash": mi.canonical_inputs_hash(inputs),
            # The tenant is part of the key: without it, a dry-run
            # observed for tenant B would duplicate-suppress to tenant
            # A's work order record (cross-tenant disclosure).
            "idempotency_key": "spine-observe:%s:%s" % (tenant, pass_id),
            "inputs": inputs,
            "event_bind": {"pass_id": pass_id},
        }

    def submit(self, pass_id, passes_dir, ledger_path, actor, auth_ctx,
               journal_file=None):
        """Submit one dry-run observation through the full contract.

        The tenant comes from auth_ctx (the authenticated context), not
        from a caller-supplied routing parameter. The agent-to-tenant
        entitlement is enforced by mi.submit (fail closed).
        """
        intent = self.build_intent(pass_id, passes_dir, ledger_path,
                                   actor, auth_ctx)
        executor = _DryRunObserverExecutor(
            self.observer_path, passes_dir, ledger_path)
        result = mi.submit(intent, self.AGENT_ID, self.CONSTRAINTS,
                           executor, journal_file=journal_file,
                           adapter_dir=self.adapter_dir,
                           node_bin=self.node_bin, auth_ctx=auth_ctx)
        result["executor_calls"] = executor.calls
        return result


def _journal_events(journal_file):
    if not os.path.exists(journal_file):
        return
    with open(journal_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except (json.JSONDecodeError, ValueError):
                continue


def _verified_coverage(journal_file, mission_class, bind_key):
    """(tenant, bind_value) pairs covered by VERIFIED terminals.

    A terminal covers a bind value only when it chains to a preceding
    MC_WORK_ORDER_ISSUED for the same work order, tenant, idempotency
    key, and intent digest. Unattributed terminal events are never
    trusted and cover nothing.
    """
    events = [ev for ev in _journal_events(journal_file)
              if ev.get("aggregate_id") == "mc:lane:" + mi.INTENT_LANE]
    issuance = mi._issuance_index(events)
    covered = set()
    for pos, ev in enumerate(events):
        if ev.get("event_type") != "MC_LANE_COMPLETED":
            continue
        _, rec = mi._unpack_summary(
            (ev.get("event_data") or {}).get("summary"))
        if not rec or rec.get("mission_class") != mission_class:
            continue
        if not mi._terminal_verified(rec, issuance, pos):
            continue
        if bind_key in rec:
            covered.add((rec.get("tenant"), rec[bind_key]))
    return covered


def detect_bypass(journal_file, mission_class, tenant=None):
    """Detect front-door bypass for a migrated mission class.

    An execution event (per the class's execution_event_prefix) is
    covered only if a VERIFIED terminally-completed intent record for
    the class binds the same (tenant, bind_key) value. A terminal is
    verified only when it chains to a preceding MC_WORK_ORDER_ISSUED
    for the same work order, tenant, key, and digest: unattributed
    terminal events never cover anything. Uncovered execution events
    are bypass violations: someone ran the legacy caller directly
    instead of through the front door.

    When tenant is given, coverage and executions are scoped to that
    tenant. When omitted, coverage is keyed by bind value alone
    (legacy).

    Returns {"mission_class", "covered": [...bind values...],
    "violations": [{"event_id", "event_type", bind_key}...]}.
    Raises ValueError for a class that is not migrated.
    """
    entry = MIGRATED_CLASSES.get(mission_class)
    if not entry or not entry.get("migrated"):
        raise ValueError(
            "bypass detection only applies to migrated classes; "
            "got %r" % (mission_class,))
    prefix = entry["execution_event_prefix"]
    bind_key = entry["bind_key"]

    covered = _verified_coverage(journal_file, mission_class, bind_key)
    if tenant is not None:
        covered_values = {b for (t, b) in covered if t == tenant}
    else:
        covered_values = {b for (t, b) in covered}
    executions = []
    for ev in _journal_events(journal_file):
        etype = ev.get("event_type") or ""
        edata = ev.get("event_data") or {}
        if etype.startswith(prefix) and bind_key in edata:
            ev_tenant = edata.get("tenant")
            if tenant is not None and ev_tenant != tenant:
                continue
            executions.append({
                "event_id": ev.get("event_id"),
                "event_type": etype,
                bind_key: edata.get(bind_key),
            })
    violations = [e for e in executions
                  if e[bind_key] not in covered_values]
    return {
        "mission_class": mission_class,
        "covered": sorted(covered_values),
        "violations": violations,
    }
