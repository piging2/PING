import re, sys

src = open("/tmp/fyd-bisect/index.html").read()

# Split body into: pre (everything up to end of generated-pages nav),
# hero section, middle sections, tail (ask + customize + footers)
nav_close = src.find("</nav>")
assert nav_close > 0
pre = src[:nav_close + len("</nav>")]

rest = src[nav_close + len("</nav>"):]
# Find all top-level sections/footers in rest
parts = []
for m in re.finditer(r"<(?:section|footer)\b", rest):
    parts.append(m.start())
parts.append(len(rest))

segments = []
for i in range(len(parts) - 1):
    seg = rest[parts[i]:parts[i + 1]]
    # label by first heading or id
    h = re.search(r"<h[12][^>]*>(.*?)</h[12]>", seg, re.S)
    ident = re.sub(r"<[^>]+>", "", h.group(1)).strip()[:40] if h else seg[:30]
    segments.append((ident, seg))

print("SEGMENTS:")
for idx, (ident, seg) in enumerate(segments):
    print(idx, repr(ident), "len=", len(seg))

# Variant: hero only (segment 0) + tail stripped to just closing tags
# Find where the demo main closes: after last segment, keep only closing tags + site footer
tail_start = parts[-2]
tail = rest[tail_start:]
# keep the site-chrome footer: it is the last <footer> in tail
site_footer = tail.rfind("<footer")
keep_tail = tail[site_footer:] if site_footer >= 0 else ""
closers = "</main></main>"
# everything between last segment end and site footer is dropped (demo footer + customize)

def build(idxs):
    body = pre + "".join(segments[i][1] for i in idxs)
    # reassemble: pre + chosen segments + closers + site footer + end
    end = src[src.find("</body>"):]
    return body + closers + keep_tail + end

# hero-only variant
open("/tmp/fyd-bisect/v-hero.html", "w").write(build([0]))
# hero + first content section
open("/tmp/fyd-bisect/v-hero1.html", "w").write(build([0, 1]))
# all but customize (drop last two segments: customize section + demo footer?)
# print which are which first
print("wrote variants")
