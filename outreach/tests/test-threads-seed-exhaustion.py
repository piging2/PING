#!/usr/bin/env python3
"""test-threads-seed-exhaustion.py: deterministic cases for the Threads seed
exhaustion rule (Nolan-approved 2026-09-30, convergence GO unit 2).

Proves:
  1. EXHAUSTION MARKING: EXHAUSTION_STREAK_THRESHOLD consecutive 100%
     already-engaged passes mark a seed EXHAUSTED_FOR_CURRENT_WINDOW, with
     exactly one replacement-seed request emitted (an 11th pass emits nothing).
  2. ENUMERATION SKIP: recommend() excludes exhausted seeds (stop enumerating
     them every pass) while active seeds still enumerate.
  3. GENERICITY: the rule works for arbitrary handles; no seed handle is
     special-cased in the module (static source check).
  4. RE-OPEN on each condition: window expiry, source change, new posts,
     engagement-state change (history sig change, and eligible>0).
  5. STREAK DISCIPLINE: one eligible candidate resets the streak;
     no-enumeration and mixed-block passes hold it (neither increment nor reset).

Runs against a temp state dir via THREADS_SEED_EXHAUSTION_STATE; never
touches production state. Loads the module from this file's own tree so the
test replays from any clean checkout.
"""
import importlib.util
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUTREACH = os.path.dirname(HERE)


def load_mod():
    spec = importlib.util.spec_from_file_location(
        "threads_seed_exhaustion",
        os.path.join(OUTREACH, "threads-seed-exhaustion.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


failures = []


def check(name, cond, detail=""):
    ok = bool(cond)
    print(("PASS " if ok else "FAIL ") + name + ((" -- " + detail) if detail and not ok else ""))
    if not ok:
        failures.append(name)


class Ctx:
    def __init__(self, mod):
        self.mod = mod
        self.tmp = tempfile.mkdtemp(prefix="threads-exhaust-test-")
        self.state = os.path.join(self.tmp, "state.json")
        self.requests = os.path.join(self.tmp, "requests")
        self._old = dict(os.environ)
        os.environ["THREADS_SEED_EXHAUSTION_STATE"] = self.state
        os.environ["THREADS_SEED_REQUESTS_DIR"] = self.requests

    def observe(self, seed, n=4, eligible=0, pass_no=1, posts=None, **kw):
        if posts is None:
            posts = ["P%d_%d" % (pass_no, i) for i in range(n)]
        return self.mod.observe(seed, posts, n - eligible, eligible,
                                "th-test-%d" % pass_no, **kw)

    def status_of(self, seed):
        return self.mod.load_state()["seeds"].get(seed, {}).get("status")

    def streak_of(self, seed):
        return self.mod.load_state()["seeds"].get(seed, {}).get(
            "consecutive_all_engaged", 0)

    def request_files(self):
        if not os.path.isdir(self.requests):
            return []
        return sorted(f for f in os.listdir(self.requests) if f.endswith(".json"))

    def restore(self):
        os.environ.clear()
        os.environ.update(self._old)
        shutil.rmtree(self.tmp, ignore_errors=True)


def all_engaged_run(ctx, seed, start, count, src="SRC1", hist="HIST1"):
    for i in range(start, start + count):
        out = ctx.observe(seed, n=4, eligible=0, pass_no=i,
                          source_sig=src, history_sig=hist)
    return out


def main():
    mod = load_mod()
    TH = mod.EXHAUSTION_STREAK_THRESHOLD

    # --- 0. genericity: no seed handle special-cased in the module -----------
    src_text = open(os.path.join(OUTREACH, "threads-seed-exhaustion.py"),
                    encoding="utf-8").read().lower()
    for handle in ("garyvee", "karpathy", "mcuban", "ycombinator"):
        check("no hardcoded seed handle @%s" % handle, handle not in src_text)

    # --- 1. exhaustion marking: threshold consecutive all-engaged ------------
    ctx = Ctx(mod)
    try:
        for i in range(1, TH):
            out = ctx.observe("@alpha", n=4, eligible=0, pass_no=i,
                              source_sig="SRC1", history_sig="HIST1")
            check("pass %d outcome ALL_ENGAGED" % i, out == "ALL_ENGAGED", out)
        check("not exhausted at %d (one short)" % (TH - 1),
              ctx.status_of("@alpha") == "ACTIVE")
        out = ctx.observe("@alpha", n=4, eligible=0, pass_no=TH,
                          source_sig="SRC1", history_sig="HIST1")
        check("threshold pass marks exhausted", out == "ALL_ENGAGED", out)
        check("status EXHAUSTED_FOR_CURRENT_WINDOW",
              ctx.status_of("@alpha") == "EXHAUSTED_FOR_CURRENT_WINDOW")
        check("exactly one replacement request emitted",
              len(ctx.request_files()) == 1, str(ctx.request_files()))
        req = json.load(open(os.path.join(ctx.requests, ctx.request_files()[0])))
        check("request names the seed", req.get("seed") == "@alpha")
        check("request window is 7 days",
              "window" in req and req["window"]["start"] and req["window"]["end"])
        same_posts = ["P%d_%d" % (TH, i) for i in range(4)]
        out = ctx.observe("@alpha", n=4, eligible=0, pass_no=TH + 1,
                          posts=same_posts,
                          source_sig="SRC1", history_sig="HIST1")
        check("post-exhaustion pass returns EXHAUSTED_SKIP", out == "EXHAUSTED_SKIP", out)
        check("no second request on later passes", len(ctx.request_files()) == 1)
    finally:
        ctx.restore()

    # --- 2. enumeration skip via recommend -----------------------------------
    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@beta", 1, TH)
        ctx.observe("@gamma", n=4, eligible=1, pass_no=1,
                    source_sig="SRC1", history_sig="HIST1")
        res = mod.recommend(["@beta", "@gamma", "@delta"], fmt="json")
        check("recommend enumerates active + unseen seeds",
              res["enumerate"] == ["@gamma", "@delta"], str(res["enumerate"]))
        check("recommend skips exhausted seed",
              res["skip_exhausted"] == ["@beta"], str(res["skip_exhausted"]))
    finally:
        ctx.restore()

    # --- 3. re-open: window expiry -------------------------------------------
    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@w", 1, TH, hist="HIST1")
        check("exhausted before window test",
              ctx.status_of("@w") == "EXHAUSTED_FOR_CURRENT_WINDOW")
        # force the window into the past, then observe again
        st = mod.load_state()
        st["seeds"]["@w"]["window_end"] = "2026-01-01T00:00:00Z"
        mod.save_state(st)
        out = ctx.observe("@w", n=4, eligible=0, pass_no=TH + 1,
                          pass_ts="2026-09-30T12:00:00Z",
                          source_sig="SRC1", history_sig="HIST1")
        check("window expiry re-opens (observation evaluated, not skipped)",
              out == "ALL_ENGAGED", out)
        check("status back to ACTIVE", ctx.status_of("@w") == "ACTIVE")
        check("streak restarted at 1", ctx.streak_of("@w") == 1)
        check("reopened_reason recorded",
              mod.load_state()["seeds"]["@w"]["reopened_reason"] == "window_expired")
    finally:
        ctx.restore()

    # --- 4. re-open: source change -------------------------------------------
    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@s", 1, TH, src="SRC1", hist="HIST1")
        out = ctx.observe("@s", n=4, eligible=0, pass_no=TH + 1,
                          source_sig="SRC2-CHANGED", history_sig="HIST1")
        check("source change re-opens", out == "ALL_ENGAGED", out)
        check("status ACTIVE after source change",
              ctx.status_of("@s") == "ACTIVE")
        check("reopened_reason=source_changed",
              mod.load_state()["seeds"]["@s"]["reopened_reason"] == "source_changed")
    finally:
        ctx.restore()

    # --- 5. re-open: new posts appear ----------------------------------------
    ctx = Ctx(mod)
    try:
        for i in range(1, TH + 1):
            # same four post codes every pass: barren but stable
            posts = ["SAME1", "SAME2", "SAME3", "SAME4"]
            ctx.mod.observe("@n", posts, 4, 0, "th-test-%d" % i,
                            source_sig="SRC1", history_sig="HIST1")
        check("exhausted on stable posts",
              ctx.status_of("@n") == "EXHAUSTED_FOR_CURRENT_WINDOW")
        out = ctx.mod.observe("@n", ["SAME1", "SAME2", "SAME3", "NEWPOST"], 4, 0,
                              "th-test-new", source_sig="SRC1", history_sig="HIST1")
        check("new post re-opens", out == "ALL_ENGAGED", out)
        check("status ACTIVE after new posts",
              ctx.status_of("@n") == "ACTIVE")
        check("reopened_reason=new_posts",
              mod.load_state()["seeds"]["@n"]["reopened_reason"] == "new_posts")
    finally:
        ctx.restore()

    # --- 6. re-open: engagement-state change ---------------------------------
    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@e1", 1, TH, hist="HIST1")
        out = ctx.observe("@e1", n=4, eligible=0, pass_no=TH + 1,
                          source_sig="SRC1", history_sig="HIST2-CHANGED")
        check("history-sig change re-opens", out == "ALL_ENGAGED", out)
        check("reopened_reason=engagement_state_changed",
              mod.load_state()["seeds"]["@e1"]["reopened_reason"]
              == "engagement_state_changed")
    finally:
        ctx.restore()

    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@e2", 1, TH, hist="HIST1")
        out = ctx.observe("@e2", n=4, eligible=1, pass_no=TH + 1,
                          source_sig="SRC1", history_sig="HIST1")
        check("eligible candidate re-opens exhausted seed",
              out == "HAS_ELIGIBLE", out)
        check("status ACTIVE after eligible appears",
              ctx.status_of("@e2") == "ACTIVE")
        check("streak reset by eligible", ctx.streak_of("@e2") == 0)
    finally:
        ctx.restore()

    # --- 7. streak discipline -------------------------------------------------
    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@d", 1, TH - 1)
        check("streak at threshold-1", ctx.streak_of("@d") == TH - 1)
        out = ctx.observe("@d", n=4, eligible=1, pass_no=TH,
                          source_sig="SRC1", history_sig="HIST1")
        check("one eligible resets streak", out == "HAS_ELIGIBLE"
              and ctx.streak_of("@d") == 0 and ctx.status_of("@d") == "ACTIVE",
              "%s streak=%d" % (out, ctx.streak_of("@d")))
    finally:
        ctx.restore()

    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@h", 1, 5)
        out = ctx.mod.observe("@h", [], 0, 0, "th-test-empty",
                              source_sig="SRC1", history_sig="HIST1")
        check("no-enumeration holds streak (no increment)",
              out == "NO_ENUMERATION" and ctx.streak_of("@h") == 5, out)
        out = ctx.mod.observe("@h", ["M1", "M2"], 1, 0, "th-test-mixed",
                              source_sig="SRC1", history_sig="HIST1")
        check("mixed-block holds streak (no increment, no reset)",
              out == "MIXED_BLOCKED" and ctx.streak_of("@h") == 5, out)
        check("still ACTIVE after holds", ctx.status_of("@h") == "ACTIVE")
    finally:
        ctx.restore()

    # --- 8. exhausted seed needs the full streak again after re-open ---------
    ctx = Ctx(mod)
    try:
        all_engaged_run(ctx, "@r", 1, TH)
        st = mod.load_state()
        st["seeds"]["@r"]["window_end"] = "2026-01-01T00:00:00Z"
        mod.save_state(st)
        ctx.observe("@r", n=4, eligible=0, pass_no=TH + 1,
                    pass_ts="2026-09-30T12:00:00Z",
                    source_sig="SRC1", history_sig="HIST1")
        check("re-opened seed needs a fresh full streak",
              ctx.streak_of("@r") == 1 and ctx.status_of("@r") == "ACTIVE")
    finally:
        ctx.restore()

    print()
    if failures:
        print("FAILURES: %d (%s)" % (len(failures), ", ".join(failures)))
        return 1
    print("ALL TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
