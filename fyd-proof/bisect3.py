import re

src = open("/tmp/fyd-bisect/index.html").read()

# head = everything up to <body>
head = src[: src.find("<body") + 5]
# rebuild body pieces
anchor = src.find('aria-label="Generated pages"')
nav_close = src.find("</nav>", anchor)
pre = src[: nav_close + len("</nav>")]

rest = src[nav_close + len("</nav>"):]
parts = [m.start() for m in re.finditer(r"<(?:section|footer)\b", rest)]
parts.append(len(rest))
segments = [rest[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]
# segments: 0 hero, 1 about, 2 where, 3 contact, 4 findus, 5 ask, 6 demo-footer, 7 customize, 8 site-footer
hero = segments[0]
site_footer = segments[8]

body_open = re.search(r"<body[^>]*>", src).group(0)
end = src[src.find("</body>"):]

# 1. hero section completely bare (no chrome at all)
bare = (
    src[: src.find("</head>")]
    + "</head>"
    + body_open
    + hero
    + "</body></html>"
)
open("/tmp/fyd-bisect/w-herobare.html", "w").write(bare)

# 2. hero + pre, NO site footer
open("/tmp/fyd-bisect/w-nofooter.html", "w").write(
    pre + hero + "</main></main>" + end
)

# 3. pre + site footer, NO hero (chrome + footer only)
open("/tmp/fyd-bisect/w-chromeonly.html", "w").write(
    pre + "</main></main>" + site_footer + end
)

# 4. hero + site footer, NO pre (no headers/nav)
open("/tmp/fyd-bisect/w-nopre.html", "w").write(
    head + body_open + hero + site_footer + end
)
print("wrote w-herobare, w-nofooter, w-chromeonly, w-nopre")
