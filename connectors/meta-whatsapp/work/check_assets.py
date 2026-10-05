exec(open('work/configure_messaging.py').read().split('result={}')[0])
result={}
for path in ['act_2150184975883343/campaigns?fields=id,name,status,effective_status&limit=100','act_2150184975883343/ads?fields=id,name,effective_status,issues_info&limit=100','1014469657064951/owned_ad_accounts?fields=id,name','1014469657064951/client_ad_accounts?fields=id,name','1014469657064951/owned_pixels?fields=id,name','me/assigned_product_catalogs?business=1014469657064951','342501052618187/assigned_users?business=1014469657064951']:
 result[path]=call(path,st)
 print(path,json.dumps(result[path])[:3500])
def scrub(x):
 if isinstance(x,dict):return {k:scrub(v) for k,v in x.items() if k!='paging'}
 if isinstance(x,list):return [scrub(v) for v in x]
 return x
pathlib.Path('outputs/META_ASSET_VERIFICATION.json').write_text(json.dumps(scrub(result),indent=2))
