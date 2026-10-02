#!/usr/bin/env python3
"""Pass-165 curation sweep: dump builder-fresh + ok_like pool compactly for eyeballing."""
import json, re, os, glob, sys, importlib.util
OUT = os.path.expanduser("~/workspace/outreach")
sys.argv = ["build-fb-job.py", "165"]
spec = importlib.util.spec_from_file_location("bfb", os.path.join(OUT, "build-fb-job.py"))
# build-fb-job.py executes on import and writes files; replicate pre-filter manually instead
_spec = importlib.util.spec_from_file_location("eg", os.path.join(OUT, "engagement-guard.py"))
_eg = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_eg)
_engaged = _eg.parse_facebook(open(os.path.join(OUT, "facebook-engagement.md")).read())
_engaged_posts = set(_engaged["post_ids"]); _engaged_names = set(_engaged["names"])
_blocked_names = set(_engaged["blocked_names"])
_ledger_engaged = _eg._fb_ledger_engaged_post_ids()
WCO_CHIMNEY_IDS = {"28581069001533009", "1525848409560056", "61565264274777"}
def page_name(c):
    src = c['source']
    base = (c.get('author') or c.get('group') or 'post').strip()
    snippet = re.sub(r'\s+', ' ', (c.get('text') or ''))[:60].strip()
    name = f"{base}: {snippet}" if snippet else base
    return name[:110]
def blocked(c):
    u = c['url']; pids = set(_eg._platform_post_ids("facebook", u))
    if pids & WCO_CHIMNEY_IDS: return "wco"
    if "western colorado chimney" in _eg.norm_fb_name(page_name(c)): return "wco-name"
    if pids & _engaged_posts: return "engaged-post-id"
    if pids & _ledger_engaged: return "ledger"
    if _eg.norm_fb_name(page_name(c)) in _engaged_names: return "name"
    if _eg.norm_fb_name(page_name(c)) in _blocked_names: return "blocked"
    return None
cands = json.load(open(os.path.join(OUT, "fb165-candidates.json")))
fresh = [c for c in cands if not blocked(c)]
print(f"{len(cands)} -> {len(fresh)} fresh")
for i, c in enumerate(fresh):
    th = "TRADE" if c.get("trade_hit") else "     "
    print(f"[{i:3d}] {th} {c.get('group','?')[:16]:16s} | {(c.get('author') or '?')[:26]:26s} | {re.sub(chr(10),' ',c.get('text') or '')[:80]}")
print("\n--- urls for kept indexes come after selection ---")
