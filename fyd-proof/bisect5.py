import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

# site-chrome header = first <header>...</header>
h1s = src.find("<header")
h1e = src.find("</header>", h1s) + len("</header>")
site_header = src[h1s:h1e]

# demo header + generated nav: from <main id="main-content"> to </nav> of generated pages
mains = src.find('<main id="main-content"')
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
demo_block = src[mains:nav_close]

# hero = first <section> after nav_close
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

end = src[src.find("</body>"):]

def page(inner):
    return head + body_open + inner + "</body></html>"

# y1: site header + hero
open("/tmp/fyd-bisect/y-siteheader.html", "w").write(page(site_header + hero))
# y2: demo header/nav + hero (no site chrome header)
open("/tmp/fyd-bisect/y-demoheader.html", "w").write(page(demo_block + hero))
print("site_header len", len(site_header), "demo_block len", len(demo_block))
print("demo_block has 'Generated site demo':", "Generated site demo" in demo_block)
