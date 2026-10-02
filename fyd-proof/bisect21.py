import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

def page(inner):
    return head + body_open + inner + "</body></html>"

# f1: minimal structure, NO classes on hero elements
minimal = (
    "<div>Hello</div>"
    "<section><div>"
    "<h1>Coppersmith Plumbing - HVAC - Mechanical</h1>"
    "<p>Some paragraph text here for testing purposes.</p>"
    "</div></section>"
)
open("/tmp/fyd-bisect/f1.html", "w").write(page(minimal))

# f2: minimal + w-full and max-w-5xl classes only
minimal2 = (
    "<div>Hello</div>"
    '<section class="w-full"><div class="mx-auto max-w-5xl">'
    "<h1>Coppersmith Plumbing - HVAC - Mechanical</h1>"
    "<p>Some paragraph text here for testing purposes.</p>"
    "</div></section>"
)
open("/tmp/fyd-bisect/f2.html", "w").write(page(minimal2))

print("wrote f1 (no classes), f2 (w-full + max-w-5xl)")
