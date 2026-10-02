import re
html = open('/tmp/fyd-render/home.html', encoding='utf-8').read()
print('Why this? count:', html.count('Why this?'))
print('has Source step:', 'Source:' in html or '>Source<' in html)
i = html.find('Why this?')
print(html[max(0,i-200):i+1800])
