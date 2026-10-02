import re

src = open("/tmp/fyd-bisect/index.html").read()
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

print("div opens:", len(re.findall(r"<div[\s>]", hero)), "closes:", hero.count("</div>"))
print("section opens:", hero.count("<section"), "closes:", hero.count("</section>"))
print("p opens:", len(re.findall(r"<p[\s>]", hero)), "closes:", hero.count("</p>"))
print("h1 opens:", hero.count("<h1"), "closes:", hero.count("</h1>"))
print("hero length:", len(hero))
