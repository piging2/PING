import re

src = open("/tmp/fyd-bisect/index.html").read()
i = src.rfind("<footer")
print("seg8 len", len(src) - i)
seg = src[i : i + 1500]
print(seg[:1000])
print("=" * 30)
tail = src[i:]
print("iframe count", tail.count("<iframe"))
print("script count", tail.count("<script"))
print("object count", tail.count("<object"))
print("embed count", tail.count("<embed"))
