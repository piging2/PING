import json
import pathlib
import urllib.request
import urllib.error
import urllib.parse

ROOT = pathlib.Path('C:/tmp')
token = (ROOT / 'muse_admin_token.txt').read_text().strip()
base = 'https://graph.facebook.com/v26.0/'
results = {}

def get(path, bearer=token):
    request = urllib.request.Request(base + path, headers={'Authorization': 'Bearer ' + bearer})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return {'http_status': response.status, 'body': json.load(response)}
    except urllib.error.HTTPError as error:
        return {'http_status': error.code, 'body': json.load(error)}
    except Exception as error:
        return {'error_type': type(error).__name__}

for path in ['me/permissions', 'me/businesses', '1014469657064951/assigned_users',
             '61595067782723/assigned_pages?business=1014469657064951',
             '61595067782723/assigned_ad_accounts?business=1014469657064951',
             '61595067782723/assigned_product_catalogs?business=1014469657064951',
             '342501052618187?fields=id,name,access_token,instagram_business_account',
             '5477376785683835/products?fields=id,name,retailer_id&limit=1']:
    results[path] = get(path)

page_result = results['342501052618187?fields=id,name,access_token,instagram_business_account']
page_token = page_result.get('body', {}).pop('access_token', None)
if page_token:
    (ROOT / 'PAGE_TOKEN.txt').write_text(page_token)
    page_result['page_token_saved'] = True
    results['342501052618187/conversations'] = get('342501052618187/conversations', page_token)
else:
    results['342501052618187/conversations'] = {'status': 'Page token unavailable'}

secret_file = ROOT / 'META_APP_SECRET.txt'
app_bearer = ('1641669927306725|' + secret_file.read_text().strip()) if secret_file.exists() else token
debug = get('debug_token?' + urllib.parse.urlencode({'input_token': token}), app_bearer)
results['debug_token'] = debug

def redact(obj):
    if isinstance(obj, dict):
        return {key: ('[REDACTED]' if key in {'access_token', 'token', 'app_secret'} else redact(value))
                for key, value in obj.items()}
    if isinstance(obj, list):
        return [redact(value) for value in obj]
    if isinstance(obj, str):
        return obj.replace(token, '[REDACTED]').replace(page_token or 'NEVER_MATCH', '[REDACTED]')
    return obj

results = redact(results)
(ROOT / 'META_VERIFICATION.json').write_text(json.dumps(results, indent=2))
out = pathlib.Path('C:/Users/nolan/Documents/Codex/2026-10-04/i/outputs/META_VERIFICATION.json')
out.write_text(json.dumps(results, indent=2))
for path, result in results.items():
    print(path, json.dumps(result)[:900])
