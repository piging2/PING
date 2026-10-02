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

# f1: n2 + min-width:0 on the div (the flex item)
open("/tmp/fyd-bisect/f1.html", "w").write(
    page('<div style="min-width:0">' + nav_html + hero + "</div>")
)
# f2: n2 + overflow-x:clip on body via style tag
open("/tmp/fyd-bisect/f2.html", "w").write(
    head.replace("</head>", "<style>body{overflow-x:clip}</style></head>")
    + body_open
    + "<div>"
    + nav_html
    + hero
    + "</div>"
    + end
)
print("wrote f1 (div min-width:0), f2 (body overflow-x:clip)")
print("body classes:", body_open)
