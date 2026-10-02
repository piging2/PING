import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)

# head with NO stylesheets, but keep body classes
head_nocss = "<head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'></head>"

anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

def page_nocss(inner):
    return head_nocss + body_open + inner + "</body></html>"

# w1: no CSS at all, div + Hello + hero
open("/tmp/fyd-bisect/w1n.html", "w").write(page_nocss("<div>Hello" + hero + "</div>"))

print("wrote w1n (no CSS)")
