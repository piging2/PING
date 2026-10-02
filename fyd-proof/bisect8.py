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

# n1: single inner main + nav + hero
open("/tmp/fyd-bisect/n1.html", "w").write(
    page('<main class="min-h-screen bg-background"><div>' + nav_html + hero + "</div></main>")
)
# n2: div + nav + hero (no mains at all)
open("/tmp/fyd-bisect/n2.html", "w").write(page("<div>" + nav_html + hero + "</div>"))
# n3: full mains wrapper + nav WITHOUT overflow-x-auto + hero
nav_no_overflow = nav_html.replace("overflow-x-auto", "")
open("/tmp/fyd-bisect/n3.html", "w").write(
    page('<main id="main-content" class="flex-1"><main class="min-h-screen bg-background"><div>' + nav_no_overflow + hero + "</div></main></main>")
)
# n4: full mains wrapper + nav with flex removed (block + overflow-x-auto) + hero
nav_no_flex = nav_html.replace("mx-auto flex max-w-5xl", "mx-auto max-w-5xl")
open("/tmp/fyd-bisect/n4.html", "w").write(
    page('<main id="main-content" class="flex-1"><main class="min-h-screen bg-background"><div>' + nav_no_flex + hero + "</div></main></main>")
)
print("wrote n1 (single main), n2 (div only), n3 (no overflow-x-auto), n4 (no flex)")
