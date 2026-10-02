#!/usr/bin/env python3
"""X engagement adaptive-cadence + seed-tier state recorder.

Owns ~/workspace/pig-fb/x-tier-state.json. Two modes:

  Gate (Step 0 of the x-engagement-pass cron, costs nothing):
    x-tier-record.py --state <file> --gate
    Prints GO (with current tier + effective interval) or SKIP <reason>.
    SKIP means: end the pass now, no API calls, no Pig, no browser.

  Record (end of a real pass):
    x-tier-record.py --state <file> --record \
      --pass-id x-<ts> --tier <N> \
      --candidates C --eligible E --attempted A --succeeded S \
      [--halted] [--pig-ok 0|1] [--actions-file F|--actions-json J] [--note TEXT]

    Derives the final pass state from the counts (see classify()), updates
    per-tier yield metrics, applies escalation / de-escalation / adaptive
    cadence, and writes the state file atomically.

Pass states (Nolan's directive, automation-resilience program item 5):
  USEFUL_PASS                 >=1 action completed ok
  NO_CANDIDATES               discovery found zero candidates across active seeds
  NO_ELIGIBLE_CANDIDATES      candidates existed, zero survived guard/ledger filters
  CANDIDATES_BUT_ALL_BLOCKED  eligible existed but no action could be attempted
                              (Pig unreachable, follow-lock timeout, etc.)
  CANDIDATES_BUT_ACTION_FAILED >=1 action attempted, all failed, no restriction halt
  RESTRICTION_HALT            driver signaled a restriction/checkpoint; not an
                              empty state, holds all counters, surfaced to Nolan
  PASS_SKIPPED_BACKOFF        adaptive gate skipped this tick (not a real pass)

Empty states for the adaptive counters: the four NO_/CANDIDATES_* states.
RESTRICTION_HALT holds counters; PASS_SKIPPED_BACKOFF is not recorded as a
real pass.

Adaptive cadence (effective interval; the cron tick stays 4h, the gate skips
cheaply when under backoff):
  consecutive_empty 0-1 -> 4h   (normal)
  consecutive_empty 2-4 -> 12h   (tier pool dry; 48h discovery window means
                                 rechecking faster than this just re-reads
                                 the same dry seeds and burns xapi calls)
  consecutive_empty >=5 -> 24h   (structurally dry; daily retry suffices)
A USEFUL_PASS resets to 4h immediately.

Tier escalation: active seeds are cumulative (tier N pass discovers across
tiers 1..N). After 3 consecutive empty passes at the current tier, escalate
one tier (max 3), but only into a tier with >=1 usable (non-null ID) seed;
otherwise escalation is blocked and noted, counters hold. On a USEFUL_PASS,
de-escalate to tier 1 when every completed action came from a tier-1 seed;
otherwise stay at the productive tier.
"""
import argparse
import copy
import json
import os
import sys
from datetime import datetime, timezone

EMPTY_STATES = {
    "NO_CANDIDATES",
    "NO_ELIGIBLE_CANDIDATES",
    "CANDIDATES_BUT_ALL_BLOCKED",
    "CANDIDATES_BUT_ACTION_FAILED",
}
ESCALATION_THRESHOLD = 3      # consecutive empty passes at tier before escalating
BACKOFF_12H_AFTER = 2         # consecutive empty passes before 12h effective cadence
BACKOFF_24H_AFTER = 5         # consecutive empty passes before 24h effective cadence
MAX_TIER = 3


def utcnow():
    return datetime.now(timezone.utc)


def load_seed_map(path):
    with open(path) as f:
        return json.load(f)


def usable_seeds(seed_map, tier):
    """Handles with non-null IDs in tiers 1..tier (cumulative)."""
    out = {}
    for t in range(1, tier + 1):
        tier_key = f"tier{t}"
        block = seed_map.get(tier_key)
        seeds = block.get("seeds", block) if isinstance(block, dict) else {}
        for handle, uid in seeds.items():
            if handle.startswith("_"):
                continue
            if uid:
                out[handle.lower()] = uid
    return out


def tier_of_handle(seed_map, handle):
    h = handle.lstrip("@").lower()
    for t in (1, 2, 3):
        block = seed_map.get(f"tier{t}") or {}
        seeds = block.get("seeds", block) if isinstance(block, dict) else {}
        for k, v in seeds.items():
            if k.startswith("_"):
                continue
            if k.lower() == h:
                return t if v else None
    return None


def default_state():
    tiers = {}
    for t in (1, 2, 3):
        tiers[str(t)] = {
            "passes": 0,
            "total_candidates": 0,
            "total_eligible": 0,
            "total_attempted": 0,
            "total_succeeded": 0,
            "candidate_yield": 0.0,
            "eligibility_rate": None,
            "engagement_yield": None,
            "action_yield": None,
            "last_successful_candidate": None,
            "last_useful_pass": None,
            "consecutive_empty_at_tier": 0,
        }
    return {
        "version": 1,
        "current_tier": 1,
        "consecutive_empty_passes": 0,
        "effective_interval_hours": 4,
        "last_real_pass_at": None,
        "tiers": tiers,
        "history": [],
        "notes": [],
    }


def load_state(path):
    if os.path.exists(path):
        with open(path) as f:
            st = json.load(f)
        base = default_state()
        base.update(st)
        for t in ("1", "2", "3"):
            merged = copy.deepcopy(default_state()["tiers"][t])
            merged.update(base["tiers"].get(t, {}))
            base["tiers"][t] = merged
        return base
    return default_state()


def save_state(path, st):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(st, f, indent=1)
        f.write("\n")
    os.replace(tmp, path)


def classify(args):
    """Derive the final pass state from phase counts. Halt wins over
    everything; then blocked (eligible but nothing attempted); then
    action-failed (attempted but none ok); then useful; then the
    discovery-side empty states."""
    if args.halted:
        return "RESTRICTION_HALT"
    if args.succeeded > 0:
        return "USEFUL_PASS"
    if args.attempted > 0:
        return "CANDIDATES_BUT_ACTION_FAILED"
    if args.eligible > 0:
        # Eligible actions existed but nothing was attempted (Pig down,
        # follow-lock timeout, agent aborted before runner). pig-ok=0 makes
        # the dependency cause explicit; either way nothing executed.
        return "CANDIDATES_BUT_ALL_BLOCKED"
    if args.candidates > 0:
        return "NO_ELIGIBLE_CANDIDATES"
    return "NO_CANDIDATES"


def recompute_metrics(tier_state):
    p = tier_state["passes"]
    c = tier_state["total_candidates"]
    e = tier_state["total_eligible"]
    a = tier_state["total_attempted"]
    s = tier_state["total_succeeded"]
    tier_state["candidate_yield"] = round(c / p, 2) if p else 0.0
    tier_state["eligibility_rate"] = round(e / c, 4) if c else None
    tier_state["engagement_yield"] = round(s / c, 4) if c else None
    tier_state["action_yield"] = round(s / a, 4) if a else None


def cmd_gate(args):
    st = load_state(args.state)
    now = utcnow()
    interval = st.get("effective_interval_hours", 4)
    last = st.get("last_real_pass_at")
    if last:
        last_dt = datetime.fromisoformat(last)
        skip_until = last_dt.timestamp() + interval * 3600
        if now.timestamp() < skip_until:
            wait_h = (skip_until - now.timestamp()) / 3600
            print(f"SKIP adaptive_backoff tier={st['current_tier']} "
                  f"interval={interval}h next_eligible_in={wait_h:.1f}h "
                  f"consecutive_empty={st['consecutive_empty_passes']}")
            print("GATE_DECISION=SKIP")
            return 0
    print(f"GO tier={st['current_tier']} interval={interval}h "
          f"consecutive_empty={st['consecutive_empty_passes']}")
    print("GATE_DECISION=GO")
    return 0


def cmd_record(args, seed_map_path):
    st = load_state(args.state)
    now = utcnow()
    now_iso = now.isoformat()

    final_state = classify(args)
    empty = final_state in EMPTY_STATES

    actions = []
    if args.actions_file:
        with open(args.actions_file) as f:
            actions = json.load(f)
    elif args.actions_json:
        actions = json.loads(args.actions_json)

    seed_map = load_seed_map(seed_map_path) if os.path.exists(seed_map_path) else {}
    tier_key = str(args.tier)
    ts = st["tiers"][tier_key]
    ts["passes"] += 1
    ts["total_candidates"] += args.candidates
    ts["total_eligible"] += args.eligible
    ts["total_attempted"] += args.attempted
    ts["total_succeeded"] += args.succeeded

    succeeded_actions = [a for a in actions if a.get("ok")]
    for a in succeeded_actions:
        acct = a.get("account", "")
        ts["last_successful_candidate"] = {
            "account": acct,
            "url": a.get("url"),
            "pass_id": args.pass_id,
            "at": now_iso,
        }
    if final_state == "USEFUL_PASS":
        ts["last_useful_pass"] = now_iso

    recompute_metrics(ts)

    # Escalation / de-escalation / adaptive counters.
    decision_notes = []
    if final_state == "USEFUL_PASS":
        st["consecutive_empty_passes"] = 0
        st["effective_interval_hours"] = 4
        for t in ("1", "2", "3"):
            st["tiers"][t]["consecutive_empty_at_tier"] = 0
        if args.tier > 1 and succeeded_actions:
            # De-escalate only if every completed action came from a tier-1 seed.
            tiers_hit = {tier_of_handle(seed_map, a.get("account", "")) for a in succeeded_actions}
            tiers_hit.discard(None)
            if tiers_hit and max(tiers_hit) == 1:
                st["current_tier"] = 1
                decision_notes.append("de-escalated to tier 1: all completed actions from tier-1 seeds")
            else:
                decision_notes.append(f"staying at tier {args.tier}: productive tier, actions from tiers {sorted(tiers_hit)}")
    elif final_state == "RESTRICTION_HALT":
        decision_notes.append("restriction halt: counters held, no cadence or tier change (caps halved per stop rules)")
    elif empty:
        st["consecutive_empty_passes"] += 1
        ts["consecutive_empty_at_tier"] += 1
        n = st["consecutive_empty_passes"]
        if n >= BACKOFF_24H_AFTER:
            st["effective_interval_hours"] = 24
        elif n >= BACKOFF_12H_AFTER:
            st["effective_interval_hours"] = 12
        else:
            st["effective_interval_hours"] = 4
        if ts["consecutive_empty_at_tier"] >= ESCALATION_THRESHOLD and st["current_tier"] < MAX_TIER:
            next_tier = st["current_tier"] + 1
            if usable_seeds(seed_map, next_tier) != usable_seeds(seed_map, st["current_tier"]):
                # Escalation only if the next tier actually adds usable seeds.
                st["current_tier"] = next_tier
                st["tiers"][str(next_tier)]["consecutive_empty_at_tier"] = 0
                decision_notes.append(f"escalated to tier {next_tier} after {ESCALATION_THRESHOLD} consecutive empty passes at tier {args.tier}")
            else:
                decision_notes.append(f"escalation blocked: tier {next_tier} adds no usable seeds (IDs unresolved); holding at tier {st['current_tier']}")
                ts["consecutive_empty_at_tier"] = 0  # avoid re-noting every pass
        decision_notes.append(f"effective interval now {st['effective_interval_hours']}h")

    st["last_real_pass_at"] = now_iso
    entry = {
        "pass_id": args.pass_id,
        "at": now_iso,
        "tier": args.tier,
        "state": final_state,
        "candidates": args.candidates,
        "eligible": args.eligible,
        "attempted": args.attempted,
        "succeeded": args.succeeded,
        "note": args.note or "",
        "decisions": decision_notes,
    }
    st["history"].append(entry)
    st["history"] = st["history"][-60:]  # keep the tail; x-engagement.md is the durable log

    save_state(args.state, st)

    tier1_useful = st["tiers"]["1"]["last_useful_pass"]
    print(f"RECORDED pass={args.pass_id} state={final_state} tier={args.tier}")
    print(f"ADAPTIVE tier={st['current_tier']} interval={st['effective_interval_hours']}h consecutive_empty={st['consecutive_empty_passes']}")
    for d in decision_notes:
        print(f"DECISION {d}")
    if tier1_useful:
        print(f"TIER1_LAST_USEFUL {tier1_useful}")
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--state", required=True)
    ap.add_argument("--gate", action="store_true")
    ap.add_argument("--record", action="store_true")
    ap.add_argument("--pass-id")
    ap.add_argument("--tier", type=int, default=1)
    ap.add_argument("--candidates", type=int, default=0)
    ap.add_argument("--eligible", type=int, default=0)
    ap.add_argument("--attempted", type=int, default=0)
    ap.add_argument("--succeeded", type=int, default=0)
    ap.add_argument("--halted", action="store_true")
    ap.add_argument("--pig-ok", type=int, default=1)
    ap.add_argument("--actions-file")
    ap.add_argument("--actions-json")
    ap.add_argument("--note")
    ap.add_argument("--seed-map", default=os.path.expanduser("~/workspace/pig-fb/x-seed-ids.json"))
    args = ap.parse_args()

    if args.gate and args.record:
        print("choose one of --gate or --record", file=sys.stderr)
        return 2
    if args.gate:
        return cmd_gate(args)
    if args.record:
        if not args.pass_id:
            print("--record requires --pass-id", file=sys.stderr)
            return 2
        return cmd_record(args, args.seed_map)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
