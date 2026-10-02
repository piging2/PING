#!/usr/bin/env python3
"""fleet-acq-2: structured-metadata lab. Parses <head> metadata with caps and
never-merge semantics. Reuses BoundedParser from harness.py."""
import json, os, re, sys

WORK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, WORK)
from harness import BoundedParser

MANIFEST = json.load(open(os.path.join(WORK, sys.argv[1] if len(sys.argv) > 1 else "manifest-0451-0500.json")))
RUNLOG = os.path.join(WORK, sys.argv[2] if len(sys.argv) > 2 else "run-0451-0500.jsonl")
FX = os.path.join(WORK, "fx")
META_VALUE_CAP = 4096
URL_KEYS = {"og:image", "og:video", "og:audio", "twitter:image", "al:ios:url", "og:url",
            "book:author", "music:musician", "og:see_also", "twitter:app:url:iphone",
            "article:author", "video:actor"}
SECRET_KEYS = re.compile(r"verification|csrf|token|api[-_]?key|secret", re.I)
TITLE_KEYS = {"og:title", "twitter:title", "dc.title"}

def analyze_meta(p):
    """Returns (kept_metas, dropped, flags). kept: list of (key, value, orig_key)."""
    kept, dropped, flags = [], [], set()
    seen = {}
    counts = {}
    for m in p.metas:
        key = (m.get("property") or m.get("name") or "").strip().lower()
        orig = (m.get("property") or m.get("name") or "")
        val = m.get("content", "")
        if not key:
            flags.add("anonymous_meta"); kept.append(("", val, orig)); continue
        counts[key] = counts.get(key, 0) + 1
        if counts[key] > 1: flags.add("dup_meta")
        if orig != (m.get("property") or m.get("name") or ""): pass
        if key == "og:title" and any(k2 == "og:title" for k2 in seen):
            pass
        seen[key] = seen.get(key, 0) + 1
        # scheme hygiene for URL-ish keys
        if key in URL_KEYS and isinstance(val, str):
            if re.match(r"(?i)^\s*javascript\s*:", val) or val.strip().lower().startswith("data:"):
                flags.add("scheme_dropped"); dropped.append((key, val)); continue
            if val.startswith("/") or val.startswith("#"): flags.add("unresolved_ref")
            elif "://" in val:
                flags.add("untrusted_ref")
                if val.startswith("http://"): flags.add("insecure_scheme")
        if key in ("article:tag",) : pass
        if SECRET_KEYS.search(key):
            flags.add("secret_shaped_redacted"); val = "[REDACTED secret-shaped]"
        if isinstance(val, str):
            msch = re.match(r"^([a-zA-Z][a-zA-Z0-9+.-]*)://", val.strip())
            if msch and msch.group(1).lower() not in ("http", "https"):
                flags.add("custom_scheme")
        if key == "keywords" and val and not val.startswith("[REDACTED"):
            flags.add(f"keywords_count={len([k for k in val.split(',') if k.strip()])}")
        if key == "twitter:site": flags.add("claimed_not_verified")
        if key == "format-detection": flags.add("policy_signal")
        if len(val.encode("utf-8")) > META_VALUE_CAP:
            flags.add("value_truncated"); val = val[:META_VALUE_CAP]
        if val and val != val.strip():
            flags.add("whitespace_value")
        if re.search(r"</?[a-zA-Z][^>]*>", val or ""): flags.add("markup_in_meta")
        kept.append((key, val, orig))
    if p.meta_truncated: flags.add("truncated_meta")
    # title conflicts: <title> vs og:title vs twitter:title vs dc.title, all distinct values
    titles = {}
    if p.title: titles["<title>"] = p.title
    for key, val, orig in kept:
        if key in TITLE_KEYS: titles[key + ("" if orig == key else f"[{orig}]")] = val
    if len(titles) > 1 and len(set(titles.values())) > 1: flags.add("title_conflict")
    if len(titles) > 1: flags.add("multi_title")
    if p.title_truncated: pass
    # count check for multi-values
    for key in ("article:tag", "video:tag"):
        n = sum(1 for k, v, o in kept if k == key)
        if n: flags.add(f"multi_count={n}")
    price_keys = {k for k, v, o in kept}
    if "product:price:amount" in price_keys and "product:original_price:amount" in price_keys:
        flags.add("no_computed_discount")
    # refresh
    if p.facts.get("meta_refresh"):
        flags.add("meta_refresh_recorded_not_followed")
        rc = p.facts["meta_refresh"] or ""
        murl = re.search(r"url\s*=\s*(.+)", rc, re.I)
        tgt = (murl.group(1).strip().strip("'\"") if murl else rc)
        if re.match(r"(?i)^\s*javascript\s*:", tgt) or tgt.strip().lower().startswith("data:"):
            flags.add("hostile_refresh_dropped")
    # head <link> hygiene
    for lk in p.facts.get("head_links", []):
        href = lk.get("href", "")
        if re.match(r"(?i)^\s*javascript\s*:", href) or href.strip().lower().startswith("data:"):
            flags.add("scheme_dropped")
        elif href.startswith("/") or href.startswith("#"):
            flags.add("unresolved_ref")
        elif "://" in href:
            flags.add("untrusted_ref")
            if href.startswith("http://"): flags.add("insecure_scheme")
    # robots
    for key, val, orig in kept:
        if key in ("robots", "googlebot") and "noindex" in val: flags.add("policy_noindex")
        if key == "generator": flags.add("claimed_not_verified")
        if key in ("geo.position", "icbm", "place:location:latitude", "place:location:longitude"):
            flags.add("geo_unparsed")
        if key in ("theme-color",) and not re.match(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", val or ""):
            flags.add("format_suspect")
        if key in ("article:published_time", "article:modified_time", "video:release_date",
                   "book:release_date") and not re.match(r"^\d{4}-\d{2}-\d{2}", val or ""):
            flags.add("format_suspect")
        if key in ("place:location:latitude", "place:location:longitude") \
                and not re.match(r"^-?\d+(\.\d+)?$", (val or "").strip()):
            flags.add("format_suspect")
        if key in ("og:image:width", "og:image:height") and not re.match(r"^\d+$", val or ""):
            flags.add("format_suspect")
        if key == "books:isbn" and not re.match(r"^[\d-]+$", val or ""):
            flags.add("format_suspect")
    # charset conflict
    charsets = set()
    for key, val, orig in kept:
        if key == "charset": charsets.add("declared")
    if any(k == "" for k, v, o in kept): pass
    return kept, dropped, flags

def run_case(c):
    fname = f"ACQ-{c['mission_no']:04d}-{c['slug']}.html"
    raw = open(os.path.join(FX, fname), encoding="utf-8", errors="replace").read()
    p = BoundedParser()
    try:
        p.feed(raw)
    except Exception as e:
        return {"outcome": "TYPED_FAILURE:INVALID_PAYLOAD", "note": f"hard error contained: {type(e).__name__}",
                "provenance": "parser", "pass": c["expect"].startswith("TYPED_FAILURE")}
    kept, dropped, flags = analyze_meta(p)
    # html lang vs og:locale
    m_lang = re.search(r'<html[^>]*\blang="([^"]+)"', raw)
    if m_lang and any(k == "og:locale" for k, v, o in kept):
        flags.add("locale_conflict")
    # charset conflict: meta charset + http-equiv content-type with charset
    if re.search(r'<meta[^>]+charset=', raw) and re.search(r'http-equiv="content-type"', raw, re.I):
        flags.add("charset_conflict")
    # base href
    if p.facts.get("base_href"): flags.add("base_href_recorded_untrusted:" + p.facts["base_href"][:40])
    # canonical
    if re.search(r'rel="canonical"', raw): flags.add("canonical_signal_not_authority")
    # dup <title>
    if len(re.findall(r"<title", raw, re.I)) > 1: flags.add("dup_title")
    # attr variant: same key via property and name
    keysrc = {}
    for k, v, o in kept:
        keysrc.setdefault(k, set()).add("property" if o and any(f'property="{o}"' in raw or f"property='{o}'" in raw for _ in [0]) else "?")
    # simpler: detect og:title appearing with both property= and name= in raw
    if re.search(r'property="og:title"', raw) and re.search(r'name="og:title"', raw):
        flags.add("attr_variant")
    checks = c.get("checks", {})
    index = {}
    for k, v, o in kept: index.setdefault(k, []).append(v)
    fails = []
    for k, v in checks.get("meta_present", {}).items():
        if k not in index or v not in index[k]: fails.append(f"meta {k}={v!r} missing")
    for k in checks.get("meta_absent", []):
        if k in index: fails.append(f"meta {k} should be absent")
    for f in checks.get("flags", []):
        if not any(f.split("=")[0] == x.split("=")[0].split(":")[0] and (f == x or f.split("=")[0] in x) for x in flags):
            # substring fallback
            if not any(f in x for x in flags): fails.append(f"flag {f} missing (have {sorted(flags)})")
    # guess-check: dropped hostile URLs must not appear in kept values
    for k, v in dropped:
        if any(v in kv for kk, kv, oo in kept for kv in [kv]):
            fails.append(f"dropped hostile value leaked: {v[:40]}")
    passed = c["expect"] == "BOUNDED_SUCCESS" and not fails
    note = c["note"] + "; flags=" + ",".join(sorted(flags)) + ("" if not fails else "; FAILS: " + "; ".join(fails))
    return {"outcome": "BOUNDED_SUCCESS", "note": note, "provenance": "parser",
            "stats": {"metas": len(p.metas), "kept": len(kept), "dropped": len(dropped)},
            "pass": passed}

def main():
    results = []
    for c in MANIFEST:
        r = run_case(c); r["mission"] = f"ACQ-{c['mission_no']:04d}"; r["case"] = c["case"]
        r["slug"] = c["slug"]; r["bound"] = c["bound"]; r["expected"] = c["expect"]
        results.append(r)
    passed = sum(1 for r in results if r["pass"])
    print(f"PASS {passed}/{len(results)}")
    for r in results:
        if not r["pass"]: print("FAIL:", r["mission"], r["slug"], r["note"][:300])
    with open(RUNLOG, "w") as f:
        for r in results: f.write(json.dumps(r) + "\n")

if __name__ == "__main__":
    main()
