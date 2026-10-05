import json,pathlib,urllib.request,urllib.error,urllib.parse
r=pathlib.Path('C:/tmp'); base='https://graph.facebook.com/v26.0/'; st=(r/'muse_admin_token.txt').read_text().strip(); pt=(r/'PAGE_TOKEN.txt').read_text().strip(); secret=(r/'META_APP_SECRET.txt').read_text().strip()
def call(path,bearer,data=None):
 req=urllib.request.Request(base+path,headers={'Authorization':'Bearer '+bearer},data=urllib.parse.urlencode(data).encode() if data else None)
 try:
  with urllib.request.urlopen(req,timeout=30) as resp:return {'http_status':resp.status,'body':json.load(resp)}
 except urllib.error.HTTPError as err:return {'http_status':err.code,'body':json.load(err)}
result={}
result['app_subscriptions']=call('1641669927306725/subscriptions','1641669927306725|'+secret)
result['page_subscribe']=call('342501052618187/subscribed_apps',pt,{'subscribed_fields':'messages,messaging_postbacks,message_deliveries,message_reads,messaging_handovers'})
result['page_subscriptions']=call('342501052618187/subscribed_apps',pt)
result['instagram_conversations']=call('342501052618187/conversations?platform=instagram&limit=1',pt)
pathlib.Path('outputs/META_MESSAGING_VERIFICATION.json').write_text(json.dumps(result,indent=2))
for k,v in result.items():print(k,json.dumps(v)[:1600])
