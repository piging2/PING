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

plain_nav = "<nav><button>Home</button><button>About</button><button>Explore</button></nav>"

# q1: div + hero + nav (nav AFTER hero)
open("/tmp/fyd-bisect/q1.html", "w").write(page("<div>" + hero + plain_nav + "</div>"))
# q2: div + paragraph + hero (no nav, just a p)
open("/tmp/fyd-bisect/q2.html", "w").write(page("<div><p>Hello world</p>" + hero + "</div>"))
# q3: div + nav + hero, but hero WITHOUT the h1 (is h1 involved?)
hero_no_h1 = hero.replace("<h1", "<h2").replace("</h1>", "</h2>")
open("/tmp/fyd-bisect/q3.html", "w").write(page("<div>" + plain_nav + hero_no_h1 + "</div>"))

print("wrote q1 (nav after), q2 (p instead of nav), q3 (h2 instead of h1)")
