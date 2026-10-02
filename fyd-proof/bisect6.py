import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

mains = src.find('<main id="main-content"')
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
demo_block = src[mains:nav_close]

# split demo_block: mains-open, header, nav
hdr_s = demo_block.find("<header")
hdr_e = demo_block.find("</header>") + len("</header>")
mains_open = demo_block[:hdr_s]  # <main><main><div>
header_html = demo_block[hdr_s:hdr_e]
nav_s = demo_block.find("<nav")
nav_html = demo_block[nav_s:]

rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

end = src[src.find("</body>"):]

def page(inner):
    return head + body_open + inner + "</body></html>"

# z1: mains wrapper + hero (no header, no nav)
open("/tmp/fyd-bisect/z-mains.html", "w").write(page(mains_open + hero + "</div></main></main>"))
# z2: header + hero (no mains, no nav)
open("/tmp/fyd-bisect/z-header.html", "w").write(page(header_html + hero))
# z3: nav + hero (no mains, no header)
open("/tmp/fyd-bisect/z-nav.html", "w").write(page(nav_html + hero))
print("mains_open:", repr(mains_open[:80]))
print("wrote z-mains, z-header, z-nav")
