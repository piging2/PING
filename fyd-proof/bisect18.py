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

# v1: section WITHOUT w-full
hero_no_wfull = hero.replace("w-full ", "", 1)
open("/tmp/fyd-bisect/v1.html", "w").write(page("<div>Hello" + hero_no_wfull + "</div>"))

# v2: section with w-full REPLACED by max-w-full
hero_maxw = hero.replace("w-full ", "max-w-full ", 1)
open("/tmp/fyd-bisect/v2.html", "w").write(page("<div>Hello" + hero_maxw + "</div>"))

print("section classes:", re.search(r"<section[^>]*>", hero).group(0)[:80])
print("v1 classes:", re.search(r"<section[^>]*>", hero_no_wfull).group(0)[:80])
