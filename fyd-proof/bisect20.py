import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]
end = src[src.find("</body>"):]

def page(inner):
    return head + body_open + inner + "</body></html>"

# e1: div with width:100%
open("/tmp/fyd-bisect/e1.html", "w").write(page('<div style="width:100%">Hello' + hero + "</div>"))
# e2: div with max-width:100%
open("/tmp/fyd-bisect/e2.html", "w").write(page('<div style="max-width:100%">Hello' + hero + "</div>"))
# e3: div with min-width:0 AND width:100%
open("/tmp/fyd-bisect/e3.html", "w").write(
    page('<div style="min-width:0;width:100%">Hello' + hero + "</div>")
)

print("wrote e1 (width:100%), e2 (max-width:100%), e3 (min-width:0+width:100%)")
