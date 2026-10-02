import re, sys
html = open(sys.argv[1]).read()
m = re.search(r"<body[^>]*>", html)
body = html[m.end():html.find("</body>")]
depth = 0
for mm in re.finditer(r"</?(?:section|header|footer|nav|main)\b[^>]*>", body):
    tag = mm.group(0)
    if tag.startswith("</"):
        depth -= 1
    else:
        cls = re.search(r'class="([^"]{0,60})', tag)
        name = re.match(r"<(\w+)", tag).group(1)
        print(" " * depth + name + " :: " + (cls.group(1) if cls else "-"))
        if not tag.endswith("/>"):
            depth += 1
