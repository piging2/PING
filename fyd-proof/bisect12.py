import re

src = open("/tmp/fyd-bisect/index.html").read()
head = src[: src.find("<body")]

anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor) + len("</nav>")
rest = src[nav_close:]
hs = rest.find("<section")
he = rest.find("</section>", hs) + len("</section>")
hero = rest[hs:he]
end = src[src.find("</body>"):]

plain_nav = "<nav><button>Home</button><button>About</button><button>Explore</button></nav>"

def page(body_tag, inner):
    return head + body_tag + inner + "</body></html>"

# p1: body as BLOCK (not flex), div + plain nav + hero
open("/tmp/fyd-bisect/p1.html", "w").write(
    page('<body class="min-h-full bg-background">', "<div>" + plain_nav + hero + "</div>" + end)
)
# p2: body flex-col BUT div replaced by main (block) wrapper
open("/tmp/fyd-bisect/p2.html", "w").write(
    page(
        '<body class="min-h-full flex flex-col bg-background">',
        "<main>" + plain_nav + hero + "</main>" + end,
    )
)

print("wrote p1 (body block), p2 (main wrapper instead of div)")
