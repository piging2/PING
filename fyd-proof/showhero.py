import re

src = open("/tmp/fyd-bisect/index.html").read()
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

# print hero with tags on separate lines, truncated
pretty = re.sub(r">\s*<", ">\n<", hero)
for line in pretty.split("\n"):
    line = line.strip()
    if line.startswith("<") or len(line) < 120:
        print(line[:200])
    else:
        print("TEXT:", line[:100])
