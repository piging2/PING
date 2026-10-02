import re

src = open("/tmp/fyd-bisect/index.html").read()
body_open = re.search(r"<body[^>]*>", src).group(0)
head = src[: src.find(body_open)]

anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor)
pre_body = src[src.find(body_open) : nav_close + len("</nav>")]

rest = src[nav_close + len("</nav>"):]
parts = [m.start() for m in re.finditer(r"<(?:section|footer)\b", rest)]
parts.append(len(rest))
segments = [rest[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]
hero = segments[0]
site_footer = segments[8]
end = src[src.find("</body>"):]

def page(body_inner):
    return head + body_open + body_inner + end

# A: hero + site footer, well-formed (no pre)
open("/tmp/fyd-bisect/x-a.html", "w").write(page(hero + site_footer))
# B: pre (site header + demo header + nav) + hero, no footer, well-formed
# close the open div/main/main properly
open("/tmp/fyd-bisect/x-b.html", "w").write(
    head + pre_body + hero + "</div></main></main>" + end
)
# C: pre only, properly closed, no hero no footer
open("/tmp/fyd-bisect/x-c.html", "w").write(
    head + pre_body + "</div></main></main>" + end
)
print("wrote x-a (hero+footer), x-b (pre+hero), x-c (pre only)")
print("hero has Generated-site-demo:", "Generated site demo" in hero)
