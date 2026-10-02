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

# r1: div + bare text node + hero
open("/tmp/fyd-bisect/r1.html", "w").write(page("<div>Hello" + hero + "</div>"))
# r2: div + empty span + hero
open("/tmp/fyd-bisect/r2.html", "w").write(page("<div><span></span>" + hero + "</div>"))
# r3: div + span with text + hero
open("/tmp/fyd-bisect/r3.html", "w").write(page("<div><span>Hello</span>" + hero + "</div>"))
# r4: NO div, bare text + hero directly in body
open("/tmp/fyd-bisect/r4.html", "w").write(page("Hello" + hero))

print("wrote r1 (text node), r2 (empty span), r3 (span text), r4 (no div)")
