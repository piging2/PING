import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

mains = src.find('<main id="main-content"')
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
demo_block = src[mains:nav_close]

hdr_s = demo_block.find("<header")
hdr_e = demo_block.find("</header>") + len("</header>")
mains_open = demo_block[:hdr_s]
header_html = demo_block[hdr_s:hdr_e]
nav_s = demo_block.find("<nav")
nav_html = demo_block[nav_s:]
div_close = "</div></main></main>"

rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

end = src[src.find("</body>"):]

def page(inner):
    return head + body_open + inner + "</body></html>"

# w1: mains + header + hero (no nav)
open("/tmp/fyd-bisect/w1.html", "w").write(page(mains_open + header_html + hero + div_close))
# w2: mains + nav + hero (no header)
open("/tmp/fyd-bisect/w2.html", "w").write(page(mains_open + nav_html + hero + div_close))
# w3: header + nav + hero (no mains)
open("/tmp/fyd-bisect/w3.html", "w").write(page(header_html + nav_html + hero))
print("wrote w1 (mains+header), w2 (mains+nav), w3 (header+nav)")
