import urllib.request
html = urllib.request.urlopen('http://127.0.0.1:3100/sites/happy-place', timeout=30).read().decode('utf-8')
print('page bytes:', len(html))
print('Why this? count:', html.count('Why this?'))
print('Repairs fact present:', 'Repairs</a>' in html)
print('private Pergola leaked:', 'Pergola' in html)
