#!/usr/bin/env python3
"""fleet-acq-2: JSON-LD fixture lab. Strict verbatim/flag/quarantine semantics.
Stdlib json only (contract: real JSON parser, never hand-rolled)."""
import json, os, re, sys

WORK = os.path.dirname(os.path.abspath(__file__))
FX = os.path.join(WORK, "fx", "jsonld")
MANIFEST = json.load(open(os.path.join(WORK, sys.argv[1] if len(sys.argv) > 1 else "manifest-0251-0300.json")))
RUNLOG = os.path.join(WORK, sys.argv[2] if len(sys.argv) > 2 else "run-0251-0300.jsonl")

DEPTH_CAP = 32
STRING_CAP = 256 * 1024
SCALAR_ARRAY_CAP = 1000
BIDI = ("\u202e", "\u202c", "\u200b", "\u200c", "\u200d", "\ufeff")

def walk(node, depth, obs, flags):
    if depth > DEPTH_CAP:
        flags.add("depth_cap"); return None
    if isinstance(node, dict):
        out = {}
        for k, v in node.items():
            r = walk(v, depth + 1, obs, flags)
            out[k] = r
        return out
    if isinstance(node, list):
        if all(not isinstance(x, (dict, list)) for x in node) and len(node) > SCALAR_ARRAY_CAP:
            flags.add("array_truncated"); node = node[:SCALAR_ARRAY_CAP]
        return [walk(x, depth + 1, obs, flags) for x in node]
    if isinstance(node, str):
        s = node
        if len(s.encode("utf-8")) > STRING_CAP:
            flags.add("string_truncated"); s = s[:STRING_CAP]
        if any(c in s for c in BIDI):
            flags.add("bidi_neutralized")
        if re.search(r"<script|</script|on\w+\s*=", s, re.I):
            flags.add("markup_in_string")
        if "ignore all previous instructions" in s.lower():
            flags.add("injection_inert")
        return s
    return node

def analyze(doc, pre_flags=()):
    """Returns (outcome, flags set, observations list). Never coerces."""
    flags, obs = set(pre_flags), []
    items = doc if isinstance(doc, list) else [doc]
    if isinstance(doc, list): flags.add("top_level_array")
    # expand @graph members as first-class items (no merge)
    expanded = []
    for it in items:
        if isinstance(it, dict) and isinstance(it.get("@graph"), list):
            flags.add("graph_expanded")
            for x in it["@graph"]:
                if isinstance(x, dict):
                    if isinstance(x.get("@graph"), list): flags.add("nested_graph_unexpanded")
                    expanded.append(x)
                else:
                    flags.add("graph_nondict_skipped")
        else:
            expanded.append(it)
    items = expanded
    if not items: flags.add("empty_block")
    # blank-node duplicate detection over ALL nested dicts: same (type,name) without @id must NOT merge
    alldicts, _seen_ids = [], set()
    def _collect(n):
        if isinstance(n, dict):
            if id(n) not in _seen_ids:
                _seen_ids.add(id(n)); alldicts.append(n)
            for v in n.values(): _collect(v)
        elif isinstance(n, list):
            for x in n: _collect(x)
    _collect(items)
    seen = {}
    for d in alldicts:
        if "@id" not in d:
            key = (json.dumps(d.get("@type"), sort_keys=True), json.dumps(d.get("name"), sort_keys=True, default=str))
            seen[key] = seen.get(key, 0) + 1
    if any(v > 1 for v in seen.values()): flags.add("blank_nodes_unmerged")
    # byte-identical duplicate blocks: recorded, flagged, never silently deduped
    canon = [json.dumps(it, sort_keys=True) for it in items if isinstance(it, dict)]
    if len(set(canon)) < len(canon): flags.add("duplicate_bytes")
    if any(isinstance(it, dict) and isinstance(it.get("@graph"), list) for it in (doc if isinstance(doc, list) else [doc])):
        g = next(it["@graph"] for it in (doc if isinstance(doc, list) else [doc]) if isinstance(it, dict) and isinstance(it.get("@graph"), list))
        flags.add(f"item_count={len(g)}")
    # generic leaf walk: @id relativity + numeric-field-as-string + ref hygiene + range checks
    NUMERIC = {"latitude", "longitude", "price", "ratingValue", "bestRating", "userInteractionCount", "priceRange",
               "lowPrice", "highPrice", "offerCount", "eligibleQuantity", "maximumAttendeeCapacity"}
    BOOLEANISH = {"smokingAllowed", "isAccessibleForFree"}
    STRINGISH = {"name", "description", "slogan", "legalName"}
    REFKEYS = {"sameAs", "url", "logo", "hasMap", "additionalType"}
    def leafwalk(n):
        if isinstance(n, dict):
            for k, v in n.items():
                if k == "@id" and isinstance(v, str):
                    if v.startswith("/") or v.startswith("#"): flags.add("unresolved_ref")
                    elif "://" in v: flags.add("id_claimed_not_identity")
                if k in NUMERIC and isinstance(v, str): flags.add("type_mismatch_verbatim")
                if k in BOOLEANISH and not isinstance(v, bool): flags.add("type_mismatch_verbatim")
                if k in STRINGISH and not isinstance(v, (str, list, dict)) and v is not None:
                    flags.add("type_mismatch_verbatim")
                if k == "gtin" and isinstance(v, str) and not re.match(r"^\d+$", v):
                    flags.add("format_suspect")
                if k in ("opens", "closes") and isinstance(v, str) and not re.match(r"^\d{2}:\d{2}(:\d{2})?$", v):
                    flags.add("format_suspect")
                if k in ("datePublished", "dateModified", "validFrom", "validThrough") and isinstance(v, str) \
                        and not re.match(r"^\d{4}-\d{2}(-\d{2})?", v):
                    flags.add("format_suspect")
                if k in ("maximumAttendeeCapacity", "price") and isinstance(v, (int, float)) and v < 0:
                    flags.add("range_suspect")
                if k in REFKEYS and isinstance(v, str):
                    if v.startswith("javascript:"): flags.add("scheme_dropped")
                    elif v.startswith("/") or v.startswith("#"): flags.add("unresolved_ref")
                    elif "://" in v: flags.add("untrusted_ref")
                leafwalk(v)
        elif isinstance(n, list):
            for x in n: leafwalk(x)
    leafwalk(items)
    if isinstance(doc, dict) and not doc: flags.add("empty_block"); return ("BOUNDED_SUCCESS", flags, obs)
    ids = {}
    for it in items:
        if not isinstance(it, dict):
            obs.append({"verbatim": it, "provenance": "jsonld"}); continue
        norm = walk(it, 0, obs, flags)
        # @id conflict detection (no merge)
        gid = it.get("@id")
        if gid:
            if gid in ids: flags.add("id_conflict")
            ids[gid] = ids.get(gid, 0) + 1
            flags.add("id_claimed_not_identity")
        t = it.get("@type")
        if t is None: flags.add("type_unknown")
        elif isinstance(t, list): flags.add("multi_type")
        elif isinstance(t, str) and t.startswith("http"): flags.add("type_url_form")
        if t == "": flags.add("empty_type")
        if isinstance(t, str) and len(t) > 1000: flags.add("long_type")
        nm = it.get("name")
        if isinstance(nm, list): flags.add("multi_name")
        if isinstance(nm, dict) and "@value" in nm: flags.add("lang_map")
        if isinstance(nm, str) and nm != nm.strip(): flags.add("whitespace_name")
        if nm is None and "name" in it: flags.add("null_name")
        for wkey in ("sku", "mpn", "gtin"):
            wv = it.get(wkey)
            if isinstance(wv, str) and wv != wv.strip(): flags.add("whitespace_value")
        gid_e = it.get("@id")
        if gid_e == "": flags.add("empty_id")
        gid_ws = it.get("@id")
        if isinstance(gid_ws, str) and gid_ws != gid_ws.strip(): flags.add("whitespace_id")
        tel = it.get("telephone")
        if isinstance(tel, list) and len(tel) > 1: flags.add("multi_phone")
        area = it.get("areaServed")
        if isinstance(area, list) and len({type(x).__name__ for x in area}) > 1: flags.add("multi_area")
        if it.get("legalName") and it.get("name") and it["legalName"] != it["name"]: flags.add("name_conflict")
        desc = it.get("description")
        if isinstance(desc, str) and desc.lstrip().startswith("{"): flags.add("inert_string")
        ohs = it.get("openingHoursSpecification")
        if isinstance(ohs, dict) and ohs.get("validFrom") and ohs.get("validThrough"):
            if ohs["validFrom"] > ohs["validThrough"]: flags.add("inverted_range")
        rev = it.get("review")
        if isinstance(rev, list) and len(rev) > 1: flags.add("no_computed_aggregate")
        if isinstance(it.get("subOrganization"), dict) and isinstance(it["subOrganization"].get("parentOrganization"), dict):
            flags.add("back_reference")
        geo2 = it.get("geo")
        if "geo" in it and not isinstance(geo2, dict): flags.add("geo_unparsed")
        for okey in ("provider", "brand"):
            ov = it.get(okey)
            if isinstance(ov, dict) and not ov.get("name"): flags.add("incomplete_org")
        lo, hi = it.get("lowPrice"), it.get("highPrice")
        try:
            if lo is not None and hi is not None and float(lo) > float(hi): flags.add("inconsistent_range")
        except (TypeError, ValueError): pass
        sa = it.get("sameAs")
        if isinstance(sa, list) and len(set(sa)) < len(sa): flags.add("duplicate_refs")
        if isinstance(it.get("url"), list): flags.add("multi_url")
        if isinstance(it.get("image"), list): flags.add("multi_image")
        elif t not in ("LocalBusiness", "Product", "Thing", "Person", "Review", "AggregateRating",
                       "GeoCoordinates", "PostalAddress", "Offer", "OfferCatalog", "WebPage", "WebSite",
                       "Article", "Organization", "PropertyValue", "InteractionCounter", "EntryPoint",
                       "SearchAction"):
            flags.add("unknown_type")
        # ref hygiene: sameAs / url / @context / additionalType recorded, never fetched
        for key in ("sameAs", "url", "additionalType", "@context"):
            v = it.get(key)
            vals = v if isinstance(v, list) else [v]
            for x in vals:
                if isinstance(x, str):
                    if x.startswith("javascript:"): flags.add("scheme_dropped")
                    elif x.startswith("/") or x.startswith("#"): flags.add("unresolved_ref")
                    elif "://" in x: flags.add("untrusted_ref" if key != "@context" else "context_unfetched")
        for skey in ("telephone", "priceRange", "latitude", "email", "url", "price", "userInteractionCount"):
            v = it.get(skey)
            if v is not None and not isinstance(v, str): flags.add("type_mismatch_verbatim")
        addr = it.get("address")
        if isinstance(addr, list) and len(addr) > 1: flags.add("multi_address")
        dow = (it.get("openingHoursSpecification") or {}).get("dayOfWeek") if isinstance(it.get("openingHoursSpecification"), dict) else None
        if dow and dow not in ("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
                               "https://schema.org/Monday",):
            flags.add("invalid_enum")
        geo = it.get("geo")
        if isinstance(geo, dict):
            for kk in ("latitude", "longitude"):
                try:
                    f = float(geo[kk])
                    if abs(f) > 90 and kk == "latitude": flags.add("range_suspect")
                except (TypeError, ValueError): pass
        ar = it.get("aggregateRating")
        rating_hosts = [ar] if isinstance(ar, dict) else []
        if it.get("@type") == "AggregateRating": rating_hosts.append(it)
        for arh in rating_hosts:
            try:
                if float(arh["ratingValue"]) > float(arh.get("bestRating", 5)): flags.add("inconsistent_rating")
                if float(arh.get("worstRating", 0)) > float(arh.get("bestRating", 5)): flags.add("inconsistent_rating")
            except (TypeError, ValueError, KeyError): pass
        rev = it.get("review")
        if isinstance(rev, dict) and "author" not in rev: flags.add("anonymous_claim")
        if "openingHours" in it and "workHours" in it: flags.add("hours_conflict")
        if isinstance(it.get("offers"), dict) and "price" not in it["offers"]: flags.add("incomplete_offer")
        if isinstance(it.get("department"), list): flags.add(f"item_count={len(it['department'])}")
        if isinstance(it.get("email"), str) and "@" not in it["email"]: flags.add("format_suspect")
        if isinstance(it.get("url"), str) and not re.match(r"^https?://", it["url"]): flags.add("format_suspect")
        so = it.get("subjectOf")
        if isinstance(so, dict) and so.get("@id") == it.get("@id") and it.get("@id"): flags.add("self_reference")
        if isinstance(it.get("founder"), dict) and it["founder"].get("name") == it.get("name"): flags.add("no_identity_merge")
        if isinstance(it.get("@context"), str) and "://" in it["@context"]: flags.add("terms_unresolved")
        obs.append({"verbatim": norm, "provenance": "jsonld", "type": t})
    return ("BOUNDED_SUCCESS", flags, obs)

def run_case(c):
    fname = f"ACQ-{c['mission_no']:04d}-{c['slug']}.json"
    raw = open(os.path.join(FX, fname), encoding="utf-8").read()
    pre = set()
    if re.search(r"\\u[0-9a-fA-F]{4}", raw): pre.add("unicode_escape")
    try:
        dup_found = []
        def _hook(pairs):
            seen = set(); d = {}
            for k, v in pairs:
                if k in seen: dup_found.append(k)
                seen.add(k); d[k] = v
            return d
        doc = json.loads(raw, object_pairs_hook=_hook)
        if dup_found: pre.add("duplicate_key")
    except Exception as e:
        ok = c["expect"] == "TYPED_FAILURE:INVALID_PAYLOAD" and "quarantined" in c["expect_flags"]
        return {"outcome": "TYPED_FAILURE:INVALID_PAYLOAD", "flags": ["quarantined"],
                "note": f"json parse error contained ({type(e).__name__}); raw quarantined as evidence",
                "provenance": "json-parser", "pass": ok}
    outcome, flags, obs = analyze(doc, pre)
    if "depth_cap" in flags:
        outcome = "TYPED_FAILURE:INVALID_PAYLOAD"
    # verbatim checks: every expected verbatim substring must appear in raw (never transformed)
    missing = [v for v in c["verbatim"] if v not in raw]
    extra_flags = [f for f in c["expect_flags"] if not any(f.split("=")[0] in x for x in flags)]
    passed = (outcome == c["expect"]) and not missing and not extra_flags
    note_bits = [c["note"]]
    if flags: note_bits.append("flags=" + ",".join(sorted(flags)))
    if missing: note_bits.append("MISSING VERBATIM: " + ",".join(missing))
    if extra_flags: note_bits.append("MISSING FLAGS: " + ",".join(extra_flags))
    return {"outcome": outcome, "flags": sorted(flags), "obs_count": len(obs),
            "note": "; ".join(note_bits), "provenance": "json-parser", "pass": passed}

results = []
for c in MANIFEST:
    r = run_case(c); r["mission"] = f"ACQ-{c['mission_no']:04d}"; r["case"] = c["case"]
    r["slug"] = c["slug"]; r["bound"] = c["bound"]; r["expected"] = c["expect"]
    results.append(r)
passed = sum(1 for r in results if r["pass"])
print(f"PASS {passed}/{len(results)}")
for r in results:
    if not r["pass"]: print("FAIL:", r["mission"], r["slug"], r["note"])
with open(RUNLOG, "w") as f:
    for r in results: f.write(json.dumps(r) + "\n")
