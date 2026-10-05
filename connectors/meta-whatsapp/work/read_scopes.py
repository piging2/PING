import json,datetime,pathlib
v=json.loads(pathlib.Path('outputs/META_VERIFICATION.json').read_text());d=v['debug_token']['body']['data'];print(json.dumps(d['scopes'],indent=2));print('Data access renewal for extra Page tokens:',datetime.datetime.fromtimestamp(1798941594,datetime.timezone.utc).isoformat())
