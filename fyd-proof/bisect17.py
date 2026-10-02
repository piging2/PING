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

# remove h1, outline every direct child of the inner div
hero_no_h1 = re.sub(r"<h1.*?</h1>", "", hero, flags=re.S)
debug_css = (
    "<style>"
    "section>div>*{outline:2px solid cyan !important;}"
    "section{outline:3px solid red !important;}"
    "</style>"
)
head_dbg = head.replace("</head>", debug_css + "</head>")

def page(inner):
    return head_dbg + body_open + inner + "</body></html>"

open("/tmp/fyd-bisect/u1.html", "w").write(page("<div>Hello" + hero_no_h1 + "</div>"))
print("wrote u1")
