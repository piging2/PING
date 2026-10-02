import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
nav_s = src.find("<nav", anchor - 200)
nav_html = src[nav_s:nav_close]

rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

end = src[src.find("</body>"):]

def page(inner):
    return head + body_open + inner + "</body></html>"

# n5: div + PLAIN nav (no classes) + hero
plain_nav = "<nav><button>Home</button><button>About</button><button>Explore</button></nav>"
open("/tmp/fyd-bisect/n5.html", "w").write(page("<div>" + plain_nav + hero + "</div>"))

# n6: div + hero, NO nav at all
open("/tmp/fyd-bisect/n6.html", "w").write(page("<div>" + hero + "</div>"))

# n7: NO div, NO nav, just hero directly in body (should match herobare)
open("/tmp/fyd-bisect/n7.html", "w").write(page(hero))

print("wrote n5 (plain nav), n6 (no nav), n7 (hero only)")
