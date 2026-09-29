import sys, json
sys.path.insert(0, '/home/nolan/ping')
from runtime.authorities.identity_authority import IdentityAuthority
a = IdentityAuthority.generate_id()
b = IdentityAuthority.generate_id()
d1 = IdentityAuthority.generate_deterministic_id('url', 'alpha')
d2 = IdentityAuthority.generate_deterministic_id('url', 'alpha')
s1 = IdentityAuthority.generate_short_id()
s2 = IdentityAuthority.generate_short_id()
print(json.dumps({
    'uuidv7_a': a, 'uuidv7_b': b, 'uuidv7_unique': a != b,
    'uuidv5_a': d1, 'uuidv5_b': d2, 'uuidv5_stable': d1 == d2,
    'short_a': s1, 'short_b': s2, 'short_unique': s1 != s2,
}, indent=1))
