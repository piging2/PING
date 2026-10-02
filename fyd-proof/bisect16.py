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

# t1: div + Hello + hero WITHOUT h1
hero_no_h1 = re.sub(r"<h1.*?</h1>", "", hero, flags=re.S)
open("/tmp/fyd-bisect/t1.html", "w").write(page("<div>Hello" + hero_no_h1 + "</div>"))

# t2: div + Hello + ONLY the h1 (nothing else)
h1_match = re.search(r"<h1.*?</h1>", hero, flags=re.S)
h1_only = "<section>" + h1_match.group(0) + "</section>" if h1_match else "NO H1 FOUND"
open("/tmp/fyd-bisect/t2.html", "w").write(page("<div>Hello" + h1_only + "</div>"))

print("t1 has h1:", "<h1" in hero_no_h1)
print("t2 h1 found:", h1_match is not None)
