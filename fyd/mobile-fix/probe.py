import re
html = open("/tmp/hp3.html").read()
idx = html.find("dumperVersion")
start = html.rfind("self.__next_f.push", 0, idx)
end = html.find("])</script>", start)
chunk = html[start:end]
print("chunk len:", len(chunk))
# The JSON string is doubly-escaped. Decode one level to see structure.
# Find the start of the JSON string value
s = chunk.find('["') + 2 if '["' in chunk[:50] else 0
# Just show the tail to identify the top-level structure
print("TAIL300:", chunk[-300:])
