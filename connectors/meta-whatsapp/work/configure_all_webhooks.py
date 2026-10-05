exec(open('work/configure_messaging.py').read().split('result={}')[0])
url=(r/'META_WEBHOOK_URL.txt').read_text().strip();verify=(r/'META_VERIFY_TOKEN.txt').read_text().strip(); app='1641669927306725|'+secret
result={}
for obj,fields in [('page','messages,messaging_postbacks,message_deliveries,message_reads,messaging_handovers'),('instagram','messages,messaging_postbacks,messaging_seen,message_reactions,comments'),('whatsapp_business_account','messages')]:
 result['subscribe_'+obj]=call('1641669927306725/subscriptions',app,{'object':obj,'callback_url':url,'verify_token':verify,'fields':fields,'include_values':'true'})
for pid in ['1262592440277855','2066967230285181']:
 ptoken=(r/('PAGE_TOKEN_'+pid+'.txt')).read_text().strip()
 result['subscribe_page_'+pid]=call(pid+'/subscribed_apps',ptoken,{'subscribed_fields':'messages,messaging_postbacks,message_deliveries,message_reads,messaging_handovers'})
 result['conversations_'+pid]=call(pid+'/conversations?limit=1',ptoken)
 result['debug_'+pid]=call('debug_token?'+urllib.parse.urlencode({'input_token':ptoken}),app)
result['subscribe_whatsapp']=call('1118784990598434/subscribed_apps',st,{'override_callback_uri':url,'verify_token':verify})
result['app_subscriptions']=call('1641669927306725/subscriptions',app)
# Remove paging URLs and keep tokens private.
def scrub(x):
 if isinstance(x,dict):return {k:scrub(v) for k,v in x.items() if k not in ['paging','access_token']}
 if isinstance(x,list):return [scrub(v) for v in x]
 return x
result=scrub(result)
pathlib.Path('outputs/META_WEBHOOK_VERIFICATION.json').write_text(json.dumps(result,indent=2))
for k,v in result.items():print(k,json.dumps(v)[:1800])
