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

debug_css = (
    "<style>"
    "section{outline:3px solid red !important;}"
    "section>div{outline:3px solid lime !important;}"
    "h1{outline:3px solid blue !important;}"
    "</style>"
)
head_dbg = head.replace("</head>", debug_css + "</head>")

def page(inner):
    return head_dbg + body_open + inner + "</body></html>"

# s1: "Hello" + hero with outlines
open("/tmp/fyd-bisect/s1.html", "w").write(page("<div>Hello" + hero + "</div>"))

print("wrote s1 (outlines)")
