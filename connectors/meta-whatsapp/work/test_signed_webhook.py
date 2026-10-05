import json,pathlib,hashlib,hmac,urllib.request,urllib.error
r=pathlib.Path('C:/tmp');url=(r/'META_WEBHOOK_URL.txt').read_text().strip();secret=(r/'META_APP_SECRET.txt').read_text().strip().encode();body=json.dumps({'object':'page','entry':[],'test':'Muse setup verification'}).encode()
results={}
for name,sig in [('valid','sha256='+hmac.new(secret,body,hashlib.sha256).hexdigest()),('invalid','sha256=invalid')]:
 req=urllib.request.Request(url,headers={'Content-Type':'application/json','X-Hub-Signature-256':sig},data=body)
 try:
  with urllib.request.urlopen(req,timeout=30) as resp:results[name]={'status':resp.status,'body':resp.read().decode()}
 except urllib.error.HTTPError as err:results[name]={'status':err.code,'body':err.read().decode()}
print(json.dumps(results));pathlib.Path('outputs/WEBHOOK_SECURITY_TEST.json').write_text(json.dumps(results,indent=2))
