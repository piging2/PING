exec(open('work/verify_meta.py').read().split("for path in [")[0])
paths=['1014469657064951/system_users?fields=id,name,role','me/assigned_pages?business=1014469657064951','me/assigned_ad_accounts?business=1014469657064951','act_2150184975883343?fields=id,name,account_status','17841400771094478?fields=id,username','1014469657064951/owned_whatsapp_business_accounts','1118784990598434/phone_numbers','1118784990598434/assigned_users?business=1014469657064951','1014469657064951/owned_pages','1014469657064951/client_pages']
for path in paths:
 results[path]=get(path)
 print(path,json.dumps(results[path])[:1300])
pathlib.Path('outputs/META_EXTRA_VERIFICATION.json').write_text(json.dumps(results,indent=2))
