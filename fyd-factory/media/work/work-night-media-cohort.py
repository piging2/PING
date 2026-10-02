#!/usr/bin/env python3
"""NIGHT-MEDIA cohort stage: URL-ONLY harvest of candidate media references.

Reads the 10 golden-set candidate homepages (one GET each, sequential,
robots.txt checked first), extracts og:image / twitter:image /
<link rel="image_src"> / JSON-LD image fields. NO image bytes are downloaded.
Output is a provenance-records-only note for NIGHT-COHORT to embed:
media/cohort/cohort-media-provenance.md
"""
import html
import json
import re
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser

SITES = [
    ("gs-gj-hvac-stocker", "Stocker Heating and Cooling", "https://www.stockerheating.com/"),
    ("gs-gj-tree-treeclimbers", "Tree Climbers Services", "http://www.treeclimbersservices.com/"),
    ("gs-fruita-restaurant-hottomato", "Hot Tomato Cafe and Pizzeria", "https://hottomatopizza.com/"),
    ("gs-gj-brewery-kannahcreek", "Kannah Creek Brewing Company", "http://www.kannahcreekbrewingco.com/"),
    ("gs-palisade-hospitality-winecountryinn", "Wine Country Inn", "https://coloradowinecountryinn.com/"),
    ("gs-gj-realestate-bray", "Bray and Company", "https://www.brayandco.com/"),
    ("gs-gj-accounting-dwc", "DWC CPAs and Advisors", "http://www.dalbycpa.com/"),
    ("gs-gj-retail-enstrom", "Enstrom Candies", "https://www.enstrom.com/"),
    ("gs-gj-dental-elevation", "Elevation Family Dental", "https://www.elevationfamilydental.com/"),
    ("gs-gj-franchise-savatree", "SavATree Grand Junction", "https://www.savatree.com/locations/grand-junction-colorado/"),
]

UA = {"User-Agent": "PING-FYD-factory-cohort/1.0 (acquisition testing; read-only)"}
TIMEOUT = 25

class ImgHunter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.og = []
        self.twitter = []
        self.image_src = []
        self.jsonld = []
        self._in_ld = False
        self._ld_buf = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            prop = (a.get("property") or a.get("name") or "").lower()
            content = a.get("content", "").strip()
            if content:
                if prop == "og:image":
                    self.og.append(content)
                elif prop in ("twitter:image", "twitter:image:src"):
                    self.twitter.append(content)
        elif tag == "link":
            rel = (a.get("rel") or "").lower()
            if rel == "image_src" and a.get("href"):
                self.image_src.append(a["href"])
        elif tag == "script" and (a.get("type") or "").lower() == "application/ld+json":
            self._in_ld = True
            self._ld_buf = ""

    def handle_endtag(self, tag):
        if tag == "script" and self._in_ld:
            self._in_ld = False
            try:
                self.jsonld.append(json.loads(self._ld_buf))
            except Exception:
                pass

    def handle_data(self, data):
        if self._in_ld:
            self._ld_buf += data

def get_text(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        ctype = r.headers.get("Content-Type", "")
        if "text/html" not in ctype:
            return None, f"non-html content-type {ctype}"
        raw = r.read(2_000_000)
    return raw.decode("utf-8", "replace"), None

def robots_ok(page_url):
    p = urllib.parse.urlparse(page_url)
    robots_url = f"{p.scheme}://{p.netloc}/robots.txt"
    try:
        body, err = get_text(robots_url)
        if err or not body:
            return True, "no robots.txt (proceed)"
        disallows = []
        in_wildcard = False
        for line in body.splitlines():
            line = line.split("#")[0].strip()
            if line.lower().startswith("user-agent:"):
                in_wildcard = line.split(":", 1)[1].strip() in ("*", "PING-FYD-factory-cohort")
            elif in_wildcard and line.lower().startswith("disallow:"):
                disallows.append(line.split(":", 1)[1].strip())
        if "/" in disallows:
            return False, "robots.txt disallows / for *"
        return True, f"robots.txt checked ({len(disallows)} disallow rules)"
    except Exception as e:
        return True, f"robots.txt fetch failed ({e}); proceeding on homepage only"

def ld_images(obj, acc):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.lower() == "image":
                vals = v if isinstance(v, list) else [v]
                for x in vals:
                    if isinstance(x, str):
                        acc.append(x)
                    elif isinstance(x, dict) and x.get("url"):
                        acc.append(x["url"])
            else:
                ld_images(v, acc)
    elif isinstance(obj, list):
        for x in obj:
            ld_images(x, acc)

def license_signal(page_url, img_url):
    host = urllib.parse.urlparse(img_url).netloc.lower()
    if "logo" in img_url.lower():
        return "filename suggests logo; trademark of the business"
    if host.endswith("fbcdn.net") or "scontent" in host:
        return "CDN-hosted social image; third-party platform, no republication right implied"
    if "wp-content" in img_url or "uploads" in img_url:
        return "self-hosted site media; business-published but NOT authorized for republication"
    return "no explicit license signal observed; default: public-viewable-NOT-authorized"

def harvest(bid, name, page_url):
    rec = {"business_id": bid, "name": name, "pageUrl": page_url,
           "rightsState": "public-viewable-NOT-authorized", "references": []}
    ok, robots_note = robots_ok(page_url)
    rec["robots"] = robots_note
    if not ok:
        rec["error"] = "robots.txt disallows; not fetched"
        return rec
    try:
        body, err = get_text(page_url)
    except Exception as e:
        rec["error"] = f"fetch failed: {e}"
        return rec
    if err or not body:
        rec["error"] = err or "empty body"
        return rec
    hunter = ImgHunter()
    try:
        hunter.feed(body)
    except Exception:
        pass
    seen = set()
    def add(kind, url):
        absu = urllib.parse.urljoin(page_url, html.unescape(url.strip()))
        if absu.startswith(("http://", "https://")) and absu not in seen:
            seen.add(absu)
            rec["references"].append({
                "kind": kind, "url": absu,
                "licenseSignal": license_signal(page_url, absu),
            })
    for u in hunter.og:
        add("og:image", u)
    for u in hunter.twitter:
        add("twitter:image", u)
    for u in hunter.image_src:
        add("image_src", u)
    ld_acc = []
    for doc in hunter.jsonld:
        ld_images(doc, ld_acc)
    for u in ld_acc[:5]:
        add("json-ld:image", u)
    return rec

def main():
    records = []
    for bid, name, url in SITES:
        print(f"harvesting {bid} ...", flush=True)
        records.append(harvest(bid, name, url))
        time.sleep(2)
    lines = []
    A = lines.append
    A("# Cohort media provenance notes (NIGHT-MEDIA, 2026-09-23)")
    A("")
    A("Provenance-records-only. No image bytes were downloaded, no media was")
    A("copied, nothing was republished. These records exist so NIGHT-COHORT can")
    A("embed them in its acquisition JSONs and so the factory's rights gate")
    A("has something honest to grade.")
    A("")
    A("Rights state for EVERY cohort reference: public-viewable-NOT-authorized.")
    A("Public viewability does NOT imply republication rights. The factory's")
    A("isAcquirable() predicate must keep these out of any manifest; they are")
    A("reference-only by construction.")
    A("")
    A("Harvest method: one homepage GET per site (sequential, ~2s spacing),")
    A("robots.txt checked first, max 2MB page body, og:image / twitter:image /")
    A("image_src / JSON-LD image only. Bounded temporary derivatives for private")
    A("evaluation are permitted by policy (a handful per site, small files, never")
    A("published), but NIGHT-MEDIA created none; NIGHT-COHORT may do so only")
    A("inside its own bounded evaluation and must delete them after.")
    A("")
    for r in records:
        A(f"## {r['business_id']} ({r['name']})")
        A(f"- Page URL: {r['pageUrl']}")
        A(f"- Rights state: {r['rightsState']}")
        A(f"- Robots: {r['robots']}")
        if r.get("error"):
            A(f"- Harvest error: {r['error']}")
        if not r["references"]:
            A("- Media references found: none on homepage")
        for ref in r["references"]:
            A(f"- [{ref['kind']}] {ref['url']}")
            A(f"  - license signal: {ref['licenseSignal']}")
        A("")
    out = "/home/hatch/workspace/fyd-factory/media/cohort/cohort-media-provenance.md"
    import os
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        f.write("\n".join(lines))
    n_refs = sum(len(r["references"]) for r in records)
    n_err = sum(1 for r in records if r.get("error"))
    print(f"wrote {out}: {len(records)} sites, {n_refs} references, {n_err} errors")

if __name__ == "__main__":
    main()
