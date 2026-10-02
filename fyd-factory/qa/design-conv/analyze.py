#!/usr/bin/env python3
"""QA-DESIGN-CONV analyzer: static HTML design + conversion measurement.
Runs on the Pig (stdlib only). Writes findings-input JSON to stdout."""
import json, re, subprocess, sys
from html.parser import HTMLParser

VOID = {"area","base","br","col","embed","hr","img","input","link","meta",
        "param","source","track","wbr","circle","path","rect"}

class Node:
    __slots__ = ("tag","attrs","children","text","parent")
    def __init__(self, tag, attrs, parent):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []
        self.text = ""
        self.parent = parent

class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("document", [], None)
        self.cur = self.root
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n
    def handle_startendtag(self, tag, attrs):
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
    def handle_endtag(self, tag):
        p = self.cur
        while p is not None and p.tag != tag and p.tag != "document":
            p = p.parent
        if p is not None and p.tag == tag:
            self.cur = p.parent
    def handle_data(self, data):
        if data.strip():
            self.cur.text += data

def walk(n):
    yield n
    for c in n.children:
        yield from walk(c)

def inner_text(n):
    parts = [n.text]
    for c in n.children:
        parts.append(inner_text(c))
    return re.sub(r"\s+", " ", "".join(parts)).strip()

def find_all(root, tag=None, attr=None, attr_val=None):
    out = []
    for n in walk(root):
        if tag and n.tag != tag:
            continue
        if attr:
            if attr not in n.attrs:
                continue
            if attr_val is not None and n.attrs[attr] != attr_val:
                continue
        out.append(n)
    return out

def has_class(n, *subs):
    cls = n.attrs.get("class", "")
    return any(s in cls for s in subs)

def doc_order_index(root):
    return {id(n): i for i, n in enumerate(walk(root))}

def region_of(n, order, bounds):
    i = order[id(n)]
    for name, (a, b) in bounds.items():
        if a <= i < b:
            return name
    return "unknown"

TRADES_INTENT = ["Hero","Services","Products","SocialProof","Locations",
                 "People","BusinessSummary","Contact","Links","CTA","AskFYD"]

def analyze(path, slug):
    html = open(path, encoding="utf-8").read()
    b = TreeBuilder()
    b.feed(html)
    root = b.root
    order = doc_order_index(root)

    # Regions: demo header (contains 'Generated site demo'), footer, editor
    headers = find_all(root, "header")
    demo_header = None
    for h in headers:
        if "Generated site demo" in inner_text(h):
            demo_header = h
            break
    footers = find_all(root, "footer")
    footer = footers[0] if footers else None
    # editor section: contains 'Customize this site' h2
    editor = None
    for s in find_all(root, "section"):
        h2s = find_all(s, "h2")
        if any("Customize this site" in inner_text(h) for h in h2s):
            editor = editor or s
            break
    bounds = {}
    if demo_header and footer:
        bounds["demo_header"] = (order[id(demo_header)], order[id(demo_header)] + 10**9)
        # site region = between header end and footer start: use order positions
        # find last node of header subtree
        hmax = max(order[id(n)] for n in walk(demo_header))
        fmin = order[id(footer)]
        bounds["demo_header"] = (order[id(demo_header)], hmax + 1)
        bounds["site_region"] = (hmax + 1, fmin)
        bounds["footer"] = (fmin, 10**18)
    site_nodes = [n for n in walk(root) if region_of(n, order, bounds) == "site_region"] if bounds else []

    res = {"slug": slug, "http_bytes": len(html)}

    # ---- DESIGN: headings ----
    h1s = [(region_of(n, order, bounds), inner_text(n)[:80], n.attrs.get("class","")[:60])
           for n in find_all(root, "h1")]
    res["design_h1_all"] = h1s
    seq = []
    for n in walk(root):
        if n.tag in ("h1","h2","h3","h4","h5","h6") and region_of(n, order, bounds) == "site_region":
            seq.append((n.tag, inner_text(n)[:70]))
    res["design_site_heading_sequence"] = seq
    skips = []
    prev = 0
    for tag, text in seq:
        lvl = int(tag[1])
        if prev and lvl - prev > 1:
            skips.append({"from": f"h{prev}", "to": tag, "at": text})
        prev = lvl
    res["design_heading_skips"] = skips

    # ---- DESIGN: sections in order ----
    sections = []
    for s in find_all(root, "section"):
        if region_of(s, order, bounds) != "site_region":
            continue
        dfs = s.attrs.get("data-fyd-section")
        comp = dfs.split(":")[1] if dfs and dfs.count(":") >= 2 else None
        h2 = find_all(s, "h2")
        heading = inner_text(h2[0])[:60] if h2 else None
        char = s.attrs.get("data-layout-character")
        sections.append({"data_fyd_section": dfs, "component": comp,
                         "heading": heading, "layout_character": char,
                         "class": s.attrs.get("class","")[:60]})
    res["design_sections_in_order"] = sections
    observed = []
    for s in sections:
        if s["component"]:
            observed.append(s["component"])
        elif s["heading"]:
            observed.append("~" + s["heading"])
    res["design_observed_order"] = observed
    res["design_trades_intent"] = TRADES_INTENT
    # longest common subsequence length vs intent (components only)
    obs_c = [o for o in observed if not o.startswith("~")]
    def lcs(a, bb):
        dp = [[0]*(len(bb)+1) for _ in range(len(a)+1)]
        for i in range(len(a)):
            for j in range(len(bb)):
                dp[i+1][j+1] = dp[i][j]+1 if a[i]==bb[j] else max(dp[i+1][j], dp[i][j+1])
        return dp[len(a)][len(bb)]
    res["design_order_lcs_vs_trades"] = lcs(obs_c, TRADES_INTENT)

    # ---- DESIGN: hero CTA ----
    hero = None
    for s in find_all(root, "section"):
        if s.attrs.get("data-motion") == "hero-settle":
            hero = s
            break
    hero_cta = {}
    if hero:
        h1 = find_all(hero, "h1")
        hero_cta["h1_text"] = inner_text(h1[0])[:80] if h1 else None
        hero_cta["h1_class"] = h1[0].attrs.get("class","")[:80] if h1 else None
        links = [(inner_text(a)[:40], a.attrs.get("href","")[:80]) for a in find_all(hero, "a")]
        hero_cta["anchors"] = links
        contacts = find_all(hero, "details")
        fc = [d for d in contacts if "data-fyd-contact" in d.attrs]
        hero_cta["contact_affordances"] = [
            {"kind": d.attrs.get("data-fyd-contact"),
             "summary": inner_text(find_all(d, "summary")[0])[:60] if find_all(d, "summary") else None,
             "variant": "button" if find_all(d, "summary") and "px-6 py-3" in find_all(d,"summary")[0].attrs.get("class","") else "row"}
            for d in fc]
        imgs = find_all(hero, "img")
        hero_cta["hero_media_imgs"] = len(imgs)
        hero_cta["hero_media_id"] = hero.find if False else None
        dm = [c for c in walk(hero) if c.attrs.get("data-hero-media")]
        hero_cta["data_hero_media"] = dm[0].attrs.get("data-hero-media") if dm else None
    res["design_hero"] = hero_cta

    # ---- DESIGN: rhythm ----
    paddings = set()
    for s in find_all(root, "section"):
        if region_of(s, order, bounds) != "site_region":
            continue
        st = s.attrs.get("style","")
        m = re.search(r"padding-top:(\d+)px", st)
        if m:
            paddings.add(m.group(1))
    res["design_section_padding_tops_px"] = sorted(paddings)

    # ---- editor panel: spec section inventory (component + object counts) ----
    spec_sections = []
    if editor:
        txt = inner_text(editor)
        for m in re.finditer(r"([A-Za-z /]+?)\s*\(([^)]*)\)\s*(\d+)\s+objects?\s+resolved\s*(-\s*hidden)?", txt):
            spec_sections.append({"label": m.group(1).strip(), "id": m.group(2).strip(),
                                  "objects": int(m.group(3)), "hidden": bool(m.group(4))})
    res["design_spec_sections_from_editor"] = spec_sections

    # ---- CONVERSION: services ----
    svc = None
    for s in find_all(root, "section"):
        if s.attrs.get("data-fyd-section","").split(":")[1:2] == ["Services"]:
            svc = s
            break
    svc_info = {"cards": 0, "card_links": [], "object_hrefs": []}
    if svc:
        # cards: list items or article/div with links
        links = find_all(svc, "a")
        for a in links:
            href = a.attrs.get("href","")
            t = inner_text(a)[:60]
            svc_info["card_links"].append({"text": t, "href": href})
            if href.startswith("/o/"):
                svc_info["object_hrefs"].append(href)
        # count list items as cards
        lis = find_all(svc, "li")
        svc_info["cards"] = len(lis) if lis else len(links)
        svc_info["heading"] = inner_text(find_all(svc,"h2")[0])[:40] if find_all(svc,"h2") else None
    res["conversion_services"] = svc_info

    # ---- CONVERSION: contact ----
    contacts_all = [d for d in find_all(root, "details") if "data-fyd-contact" in d.attrs]
    cinfo = []
    for d in contacts_all:
        reg = region_of(d, order, bounds)
        kind = d.attrs.get("data-fyd-contact")
        summ = find_all(d, "summary")
        flows = [c for c in walk(d) if c.attrs.get("data-fyd-contact-flow")]
        action = None
        for f in flows:
            for a in find_all(f, "a"):
                action = {"text": inner_text(a)[:30], "href": a.attrs.get("href","")}
                break
        cinfo.append({"region": reg, "kind": kind,
                      "summary_text": inner_text(summ[0])[:60] if summ else None,
                      "has_flow": bool(flows), "action": action})
    res["conversion_contact_affordances"] = cinfo
    # sticky/fixed elements in site region
    fixed = []
    for n in walk(root):
        if region_of(n, order, bounds) == "site_region" and has_class(n, "fixed", "sticky"):
            fixed.append({"tag": n.tag, "class": n.attrs.get("class","")[:80],
                          "text": inner_text(n)[:60]})
    res["conversion_fixed_or_sticky_in_site"] = fixed

    # ---- CONVERSION: dead-end scan ----
    dead = []
    cta_like = re.compile(r"call|contact|quote|book|estimate|schedule|directions|visit|email", re.I)
    for a in find_all(root, "a"):
        if region_of(a, order, bounds) != "site_region":
            continue
        href = a.attrs.get("href", "")
        t = inner_text(a)[:50]
        if href in ("", "#") or href.startswith("javascript:"):
            dead.append({"kind": "anchor_no_target", "text": t, "href": href,
                         "cta_like": bool(cta_like.search(t))})
        elif href.startswith("tel:") and len(href) <= 4:
            dead.append({"kind": "tel_empty", "text": t, "href": href, "cta_like": True})
        elif href.startswith("mailto:") and len(href) <= 7:
            dead.append({"kind": "mailto_empty", "text": t, "href": href, "cta_like": True})
    for d in contacts_all:
        flows = [c for c in walk(d) if c.attrs.get("data-fyd-contact-flow")]
        ok = False
        for f in flows:
            for a in find_all(f, "a"):
                if a.attrs.get("href","").startswith(("tel:","mailto:")) and len(a.attrs.get("href","")) > 8:
                    ok = True
        if not ok:
            dead.append({"kind": "contact_affordance_no_action",
                         "summary": (inner_text(find_all(d,"summary")[0])[:50] if find_all(d,"summary") else None),
                         "region": region_of(d, order, bounds), "cta_like": True})
    # buttons in site region
    btns = []
    for bttn in find_all(root, "button"):
        if region_of(bttn, order, bounds) != "site_region":
            continue
        btns.append({"text": inner_text(bttn)[:50], "disabled": "disabled" in bttn.attrs,
                     "type": bttn.attrs.get("type",""), "cta_like": bool(cta_like.search(inner_text(bttn)[:50]))})
    res["conversion_dead_ends"] = dead
    res["conversion_site_region_buttons"] = btns

    # ---- links inventory for reachability ----
    hrefs = set()
    frags = set()
    for a in find_all(root, "a"):
        href = a.attrs.get("href","")
        if href.startswith("/") and not href.startswith("//"):
            hrefs.add(href.split("#")[0])
            if "#" in href:
                frags.add(href.split("#",1)[1])
        elif href.startswith("#") and len(href) > 1:
            frags.add(href[1:])
    ids = set(n.attrs.get("id") for n in walk(root) if n.attrs.get("id"))
    res["link_check"] = {
        "same_origin_paths": sorted(hrefs),
        "fragments": sorted(frags),
        "fragments_missing_target": sorted(f for f in frags if f not in ids),
    }
    return res, html

def check_paths(paths):
    out = {}
    for p in paths[:60]:
        try:
            r = subprocess.run(["curl","-s","-o","/dev/null","-w","%{http_code}","--max-time","15",
                                "http://localhost:3100"+p],
                               capture_output=True, text=True, timeout=20)
            out[p] = r.stdout.strip()
        except Exception as e:
            out[p] = "ERR:"+str(e)[:40]
    return out

if __name__ == "__main__":
    base = "/home/nolan/workspace/fyd-factory/qa/design-conv"
    allres = {}
    allpaths = set()
    for slug in ["coppersmith-plumbing", "happy-place"]:
        res, html = analyze(f"{base}/{slug}.html", slug)
        allres[slug] = res
        allpaths.update(res["link_check"]["same_origin_paths"])
    codes = check_paths(sorted(allpaths))
    allres["_reachability"] = codes
    json.dump(allres, open(f"{base}/analysis.json","w"), indent=1)
    print(json.dumps(allres, indent=1)[:12000])
    print("...TRUNCATED... wrote analysis.json")
