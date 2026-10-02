import re

src = open("/tmp/fyd-bisect/index.html").read()
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]

# Find the p element and what follows it
p_start = hero.find("<p")
p_end = hero.find("</p>")
print("P content:")
print(hero[p_start : p_end + 4][:600])
print()
print("After </p>:")
print(hero[p_end + 4 : p_end + 200])
