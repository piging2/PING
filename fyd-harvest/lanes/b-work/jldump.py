import re, json, os
RAW = "/home/nolan/fyd-b-work/raw"
sites = json.load(open("/home/nolan/fyd-b-work/reports/sites.json"))
q = chr(39)
pat = re.compile(r'<script[^>]*type=[' + q + r'"]application/ld\+json[' + q + r'"][^>]*>(.*?)</script>', re.S | re.I)
for s in sites:
    h = open(os.path.join(RAW, s["slug"] + "__home.body"), encoding="utf-8", errors="ignore").read()
    blocks = pat.findall(h)
    print("=" * 16, s["slug"], "blocks:", len(blocks))
    for b in blocks[:4]:
        try:
            d = json.loads(b)
        except Exception:
            print("  [unparseable block, chars:", len(b), "]")
            continue
        nodes = d.get("@graph", [d]) if isinstance(d, dict) else d
        if isinstance(nodes, dict):
            nodes = [nodes]
        for n in nodes[:14]:
            if not isinstance(n, dict):
                continue
            t = n.get("@type", "?")
            keys = [k for k in n.keys() if not k.startswith("@")][:9]
            print("  type=%s props=%s" % (t, keys))
