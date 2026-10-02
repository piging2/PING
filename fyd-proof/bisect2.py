import re

src = open("/tmp/fyd-bisect/index.html").read()

anchor = src.find('aria-label="Generated pages"')
assert anchor > 0
nav_close = src.find("</nav>", anchor)
assert nav_close > 0
pre = src[:nav_close + len("</nav>")]

rest = src[nav_close + len("</nav>"):]
parts = [m.start() for m in re.finditer(r"<(?:section|footer)\b", rest)]
parts.append(len(rest))

segments = []
for i in range(len(parts) - 1):
    seg = rest[parts[i]:parts[i + 1]]
    h = re.search(r"<h[12][^>]*>(.*?)</h[12]>", seg, re.S)
    ident = re.sub(r"<[^>]+>", "", h.group(1)).strip()[:40] if h else seg[:40].replace("\n", " ")
    segments.append((ident, seg))

print("SEGMENTS:")
for idx, (ident, seg) in enumerate(segments):
    print(idx, repr(ident), "len=", len(seg))

# closers + site-chrome footer (last footer in doc)
site_footer = src.rfind("<footer")
keep_tail = src[site_footer:src.find("</body>")]
end = src[src.find("</body>"):]

def build(idxs):
    return pre + "".join(segments[i][1] for i in idxs) + "</main></main>" + keep_tail + end

open("/tmp/fyd-bisect/v-hero.html", "w").write(build([0]))
open("/tmp/fyd-bisect/v-all-nocustom.html", "w").write(build([0, 1, 2, 3, 4, 5, 6]))
print("wrote v-hero.html (hero only), v-all-nocustom.html (all but customize)")
