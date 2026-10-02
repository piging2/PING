import re
html = open("/tmp/hp3.html").read()
idx = html.find("dumperVersion")
start = html.rfind("self.__next_f.push", 0, idx)
# show 800 chars before the push to identify the component
print(html[max(0,start-800):start+100])
