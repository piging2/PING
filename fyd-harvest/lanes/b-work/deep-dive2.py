import re, json, os, html as ihtml
RAW = "/home/nolan/fyd-b-work/raw"

def vis(h):
    h = re.sub(r"<script[\s>].*?</script>", "", h, flags=re.S | re.I)
    h = re.sub(r"<style[\s>].*?</style>", "", h, flags=re.S | re.I)
    h = re.sub(r"<[^>]+>", " ", h)
    return re.sub(r"\s+", " ", ihtml.unescape(h)).strip()

print("--- sitemap url counts ---")
for slug in ["yoast_com", "memberstack_com", "vercel_com", "aireserv_com", "lingscars_com", "allbirds_com"]:
    p = os.path.join(RAW, slug + "__sitemap.body")
    if not os.path.exists(p):
        print(slug, "nofile"); continue
    x = open(p, encoding="utf-8", errors="ignore").read()
    nloc = len(re.findall(r"<loc>", x))
    isindex = "<sitemapindex" in x
    print("%s bytes=%d locs=%d is_index=%s" % (slug, len(x), nloc, isindex))

print("--- wix plumber: contact evidence in static HTML ---")
h = open(os.path.join(RAW, "themesrush_wixsite_com__home.body"), encoding="utf-8", errors="ignore").read()
vt = vis(h)
phones = sorted(set(re.findall(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", vt)))
emails = sorted(set(m for m in re.findall(r"[\w.+-]+@[\w-]+\.[\w.]+", h) if not m.endswith((".png", ".jpg", ".svg", ".gif", ".webp", ".js", ".css"))))[:8]
h2s = [re.sub(r"\s+", " ", ihtml.unescape(re.sub(r"<[^>]+>", "", m))).strip()[:60] for m in re.findall(r"<h2[^>]*>(.*?)</h2>", h, flags=re.S | re.I)][:10]
print("phones:", phones)
print("emails sample:", emails)
print("h2 sample:", h2s)

print("--- aireserv home: services + phone ---")
h = open(os.path.join(RAW, "aireserv_com__home.body"), encoding="utf-8", errors="ignore").read()
vt = vis(h)
print("phone:", sorted(set(re.findall(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", vt))))
h3s = [re.sub(r"\s+", " ", ihtml.unescape(re.sub(r"<[^>]+>", "", m))).strip()[:55] for m in re.findall(r"<h3[^>]*>(.*?)</h3>", h, flags=re.S | re.I)][:12]
print("h3 sample:", h3s)

print("--- karpathy link sample ---")
h = open(os.path.join(RAW, "karpathy_ai__home.body"), encoding="utf-8", errors="ignore").read()
links = re.findall(r'<a\b[^>]*href=(["\'])(.*?)\1[^>]*>(.*?)</a>', h, flags=re.S | re.I)
ext = [(u, re.sub(r"\s+", " ", ihtml.unescape(re.sub(r"<[^>]+>", "", t))).strip()[:45]) for _, u, t in links if u.startswith("http")][:14]
print("external links:", len(ext))
for u, t in ext: print("  ", t, "->", u[:70])

print("--- allbirds home phone sample (25 found: real?) ---")
h = open(os.path.join(RAW, "allbirds_com__home.body"), encoding="utf-8", errors="ignore").read()
vt = vis(h)
phones = sorted(set(re.findall(r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", vt)))[:8]
print(phones)
