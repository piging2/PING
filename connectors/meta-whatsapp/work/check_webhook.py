import pathlib,urllib.request,urllib.parse
root=pathlib.Path('C:/tmp')
token=(root/'META_VERIFY_TOKEN.txt').read_text().strip()
url='https://moderate-sport-clark-above.trycloudflare.com/webhook'
(root/'META_WEBHOOK_URL.txt').write_text(url)
req=url+'?'+urllib.parse.urlencode({'hub.mode':'subscribe','hub.verify_token':token,'hub.challenge':'muse-ready'})
with urllib.request.urlopen(req,timeout=30) as r: print('HTTPS challenge',r.status,r.read().decode())
