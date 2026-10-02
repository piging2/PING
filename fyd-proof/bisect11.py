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

# m1: div + EMPTY nav + hero
open("/tmp/fyd-bisect/m1.html", "w").write(page("<div><nav></nav>" + hero + "</div>"))
# m2: div + nav with TEXT ONLY (no buttons) + hero
open("/tmp/fyd-bisect/m2.html", "w").write(page("<div><nav>Home About Explore</nav>" + hero + "</div>"))
# m3: div + SINGLE button in nav + hero
open("/tmp/fyd-bisect/m3.html", "w").write(page("<div><nav><button>Home</button></nav>" + hero + "</div>"))
# m4: div + nav with three LINKS (not buttons) + hero
open("/tmp/fyd-bisect/m4.html", "w").write(
    page("<div><nav><a>Home</a><a>About</a><a>Explore</a></nav>" + hero + "</div>")
)
print("wrote m1 (empty nav), m2 (text nav), m3 (one button), m4 (links)")
