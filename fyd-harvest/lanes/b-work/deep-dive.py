import re, json, os, html as ihtml
RAW = "/home/nolan/fyd-b-work/raw"

def vis(h):
    h = re.sub(r"<script[\s>].*?</script>", "", h, flags=re.S | re.I)
    h = re.sub(r"<style[\s>].*?</style>", "", h, flags=re.S | re.I)
    h = re.sub(r"<[^>]+>", " ", h)
    return re.sub(r"\s+", " ", ihtml.unescape(h)).strip()

# 1. notion visible text sample
h = open(os.path.join(RAW, "notion_so__home.body"), encoding="utf-8", errors="ignore").read()
print("NOTION visible text sample:")
print(vis(h)[:900])
print()

# 2. allbirds products.json structure
p = json.load(open(os.path.join(RAW, "allbirds_com__products-json.body"), encoding="utf-8", errors="ignore"))
print("ALLBIRDS products.json: type=%s len=%d" % (type(p).__name__, len(p)))
prods = p.get("products", p) if isinstance(p, dict) else p
print("first product keys:", sorted(prods[0].keys())[:16])
print("first product title:", prods[0].get("title"))
print("variants[0] keys:", sorted(prods[0].get("variants", [{}])[0].keys())[:10])
print()

# 3. aireserv /locations page
h = open(os.path.join(RAW, "aireserv_com__locations.body"), encoding="utf-8", errors="ignore").read()
q = chr(39)
ld = re.findall(r"<script[^>]*type=[" + q + r'"]application/ld\+json[' + q + r'"][^>]*>(.*?)</script>', h, flags=re.S | re.I)
print("AIRESERV /locations: bytes=%d jsonld_blocks=%d" % (len(h), len(ld)))
links = re.findall(r'<a\b[^>]*href=(["' + q + r'])(.*?)\1', h, flags=re.I)
loclinks = sorted(set(u for _, u in links if "/locations/" in u and len(u) > 12))[:12]
print("location-ish links:", len(loclinks), loclinks[:6])
print("visible chars:", len(vis(h)))
print("h1/h2:", len(re.findall(r"<h1[\s>]", h, flags=re.I)), len(re.findall(r"<h2[\s>]", h, flags=re.I)))
phones = set(re.findall(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", vis(h)))
print("phones on /locations:", len(phones), sorted(phones)[:4])
