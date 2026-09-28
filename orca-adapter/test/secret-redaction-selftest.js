'use strict';
/**
 * P0-SECRET-01 selftest: secret-redaction layer of orca-adapter/adapter.js.
 *
 * Covers the three fixed leak classes (A: sub-8-char Bearer/Basic creds,
 * B: arrays under secret keys, C: non-string leaves under secret keys),
 * round-2 leak classes (L1: non-DB-scheme URL userinfo, L2: log-escaped /
 * partial-quote value-tokenizer gaps), the new aws_secret_access_key key,
 * round-3 defects (D1: messy token/session_id values gated on the inner
 * candidate, D2: SECRET_DELIM newline guard, D3: colon credentials in 2b),
 * the prompt seam (secrets in input/taskBrief never enter buildWorkerPrompt
 * output within the supported boundary; all 8 envelope echo fields survive
 * verbatim), idempotence, and the survive-by-design negatives. Synthetic
 * secrets only. node, no deps; exits non-zero on any failure.
 */
const adapter = require('../adapter.js');
const { redactWorkerText, redactEnvelope, buildWorkerPrompt } = adapter;

let failures = 0;
let passed = 0;
function check(desc, cond, detail) {
  if (cond) { passed++; }
  else { failures++; console.error('FAIL:', desc, detail === undefined ? '' : ('| ' + detail)); }
}
function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
function leaked(out, frag) { return JSON.stringify(out).indexOf(frag) !== -1; }

// ================= CLASS A: sub-8-char Bearer/Basic creds =================
// Synthetic short credentials must not fall through rule 2b into rule 3.
{
  const s1 = 'Authorization: Bearer zx7Qq9';
  const r1 = redactWorkerText(s1);
  check('A1 short Bearer: exact drop-scheme output',
    r1 === 'Authorization: [REDACTED:AUTHORIZATION]', JSON.stringify(r1));
  check('A1 short Bearer: fragment gone', !leaked(r1, 'zx7Qq9'), JSON.stringify(r1));

  const s2 = 'Proxy-Authorization: Basic c3lu';
  const r2 = redactWorkerText(s2);
  check('A2 short Basic: exact drop-scheme output',
    r2 === 'Proxy-Authorization: [REDACTED:AUTHORIZATION]', JSON.stringify(r2));
  check('A2 short Basic: fragment gone', !leaked(r2, 'c3lu'), JSON.stringify(r2));

  const s3 = 'Authorization: Bearer "synthq1w2e3r4t5y6"';
  const r3 = redactWorkerText(s3);
  check('A3 quoted Bearer: whole credential gone',
    r3 === 'Authorization: [REDACTED:AUTHORIZATION]' && !leaked(r3, 'synthq1w2e3r4t5y6'),
    JSON.stringify(r3));

  const s3b = "Authorization: Bearer 'synthq1w2e3r4t5y6'";
  const r3b = redactWorkerText(s3b);
  check('A3b single-quoted Bearer: whole credential gone',
    r3b === 'Authorization: [REDACTED:AUTHORIZATION]' && !leaked(r3b, 'synthq1w2e3r4t5y6'),
    JSON.stringify(r3b));

  const s4 = 'Bearer q9Xz7w2v';
  const r4 = redactWorkerText(s4);
  check('A4 bare Bearer: fragment gone', !leaked(r4, 'q9Xz7w2v') && r4 === '[REDACTED:AUTHORIZATION]',
    JSON.stringify(r4));

  // Longer creds keep working (existing contract).
  const s5 = 'Proxy-Authorization: Basic c3ludGhldGljOnNlY3JldA==';
  const r5 = redactWorkerText(s5);
  check('A5 long Basic still redacts', !leaked(r5, 'c3ludGhldGljOnNlY3JldA==') && r5.indexOf('[REDACTED:AUTHORIZATION]') !== -1,
    JSON.stringify(r5));

  const s6 = '{"authorization": "Bearer short7"}';
  const r6 = redactWorkerText(s6);
  check('A6 JSON authorization short Bearer: fragment gone',
    !leaked(r6, 'short7') && r6.indexOf('[REDACTED:AUTHORIZATION]') !== -1, JSON.stringify(r6));

  // Text-level bracketed values under unambiguous keys (rule 3 CLASS B).
  const s7 = 'password: ["hunter9x2hunter9x2"]';
  const r7 = redactWorkerText(s7);
  check('A7 password bracketed array: fragment gone',
    !leaked(r7, 'hunter9x2hunter9x2') && r7 === 'password: [REDACTED:PASSWORD]', JSON.stringify(r7));
  const s8 = "api_key: ['ZYX987abcdef654321']";
  const r8 = redactWorkerText(s8);
  check('A8 api_key bracketed array: fragment gone',
    !leaked(r8, 'ZYX987abcdef654321') && r8 === 'api_key: [REDACTED:API KEY]', JSON.stringify(r8));
}

// ================= CLASS B: arrays under secret keys =================
{
  const e1 = redactEnvelope({ password: ['hunter9x2hunter9x2'] });
  check('B1 password array fully redacted',
    JSON.stringify(e1) === '{"password":["[REDACTED:PASSWORD]"]}', JSON.stringify(e1));

  const e2 = redactEnvelope({ token: ['aB3xY9qW2eR5tZ8uV1x2'] });
  check('B2 token array (secret-shaped) fully redacted',
    JSON.stringify(e2) === '{"token":["[REDACTED:TOKEN]"]}', JSON.stringify(e2));

  const e3 = redactEnvelope({ api_key: { nested: ['synthK1', 'synthK2'] } });
  check('B3 api_key nested arrays fully redacted',
    JSON.stringify(e3) === '{"api_key":{"nested":["[REDACTED:API KEY]","[REDACTED:API KEY]"]}}',
    JSON.stringify(e3));

  const e4 = redactEnvelope({ outer: { credentials: [{ user: 'svcacct', pass: 'synthpw9x8' }] } });
  check('B4 deep-nested credentials array: no raw fragment',
    !leaked(e4, 'svcacct') && !leaked(e4, 'synthpw9x8') &&
    JSON.stringify(e4).indexOf('[REDACTED:CREDENTIAL]') !== -1, JSON.stringify(e4));
}

// ================= CLASS C: non-string leaves under secret keys =================
{
  const e1 = redactEnvelope({ password: 12345 });
  check('C1 password number redacts',
    JSON.stringify(e1) === '{"password":"[REDACTED:PASSWORD]"}', JSON.stringify(e1));

  const e2 = redactEnvelope({ credentials: { user: 'svc', pass: 'synth-x7' } });
  check('C2 credentials object fully redacted, keys preserved',
    JSON.stringify(e2) === '{"credentials":{"user":"[REDACTED:CREDENTIAL]","pass":"[REDACTED:CREDENTIAL]"}}',
    JSON.stringify(e2));

  const e3 = redactEnvelope({ password: true });
  check('C3 password boolean redacts',
    JSON.stringify(e3) === '{"password":"[REDACTED:PASSWORD]"}', JSON.stringify(e3));

  const e4 = redactEnvelope({ password: null });
  check('C4 password null stays null (absence is not a secret)',
    JSON.stringify(e4) === '{"password":null}', JSON.stringify(e4));

  const e5 = redactEnvelope({ token: 1500 });
  check('C5 token number survives (gated)',
    JSON.stringify(e5) === '{"token":1500}', JSON.stringify(e5));

  const e6 = redactEnvelope({ token: ['gpt-4', 'sess_abc123'] });
  check('C6 token array of non-secret strings survives',
    JSON.stringify(e6) === '{"token":["gpt-4","sess_abc123"]}', JSON.stringify(e6));

  const e7 = redactEnvelope({ token: ['aB3xY9qW2eR5tZ8uV1x2', 'gpt-4'] });
  check('C7 token mixed array: secret-shaped redacts, model name survives',
    JSON.stringify(e7) === '{"token":["[REDACTED:TOKEN]","gpt-4"]}', JSON.stringify(e7));

  const e8 = redactEnvelope({ password: { token: 1500 } });
  check('C8 full context wins over gated for nested keys',
    JSON.stringify(e8) === '{"password":{"token":"[REDACTED:PASSWORD]"}}', JSON.stringify(e8));

  const e9 = redactEnvelope({ n: 42, b: true, z: null, s: 'plain text here' });
  check('C9 non-secret leaves untouched',
    JSON.stringify(e9) === '{"n":42,"b":true,"z":null,"s":"plain text here"}', JSON.stringify(e9));

  const e10 = redactEnvelope({ password: '[REDACTED:PASSWORD]', token: ['[REDACTED:TOKEN]'] });
  check('C10 pre-redacted markers pass through untouched',
    JSON.stringify(e10) === '{"password":"[REDACTED:PASSWORD]","token":["[REDACTED:TOKEN]"]}',
    JSON.stringify(e10));
}

// ================= PROMPT SEAM =================
{
  const wo = {
    work_order_id: 'wo-synth-001', context_pack_id: 'cp-synth-001',
    agent_id: 'hermes', capability: 'text.summarize',
    mission_id: 'm-synth', task_id: 't-synth', attempt: 1,
    input: {
      password: 'synthpw-hunter99x',
      nested: { api_key: 'synthKEYa1b2c3d4' },
      token: ['aB3xY9qW2eR5tZ8uV1x2'],
      count: 1500, note: 'plain instruction text',
    },
  };
  const woBefore = deepClone(wo);
  const brief = 'Summarize this. Auth: Bearer synthbr-zx7Qq9. Handle with care.';
  const p = buildWorkerPrompt(wo, brief);

  // No synthetic secret from input or brief may appear in the prompt.
  for (const frag of ['synthpw-hunter99x', 'synthKEYa1b2c3d4', 'aB3xY9qW2eR5tZ8uV1x2', 'synthbr-zx7Qq9']) {
    check('PROMPT secret never enters prompt: ' + frag, !p.includes(frag), p.slice(0, 300));
  }
  // Redacted markers must be present in the prompt (prevention happened).
  check('PROMPT carries redacted markers',
    p.includes('[REDACTED:PASSWORD]') && p.includes('[REDACTED:API KEY]') &&
    p.includes('[REDACTED:TOKEN]') && p.includes('[REDACTED:AUTHORIZATION]'),
    p.slice(p.indexOf('Input data')));

  // All 8 echo fields survive verbatim: the 4 value echoes exact, the 4
  // template fields present.
  check('PROMPT echoes work_order_id', p.includes('"work_order_id": "wo-synth-001"'));
  check('PROMPT echoes context_pack_id', p.includes('"context_pack_id": "cp-synth-001"'));
  check('PROMPT echoes agent_id', p.includes('"agent_id": "hermes"'));
  check('PROMPT echoes capability', p.includes('"capability": "text.summarize"'));
  check('PROMPT has status/output/evidence/error fields',
    p.includes('"status"') && p.includes('"output"') && p.includes('"evidence"') && p.includes('"error"'));
  // Benign input values survive; benign brief words survive.
  check('PROMPT keeps benign input values',
    p.includes('1500') && p.includes('plain instruction text'), p.slice(p.indexOf('Input data')));
  check('PROMPT keeps benign brief words', p.includes('Summarize this.') && p.includes('Handle with care.'));
  // Redaction must not mutate the caller's work order.
  check('PROMPT does not mutate workOrder.input',
    JSON.stringify(wo) === JSON.stringify(woBefore), JSON.stringify(wo.input));
}

// ================= IDEMPOTENCE =================
{
  const texts = [
    'Authorization: Bearer zx7Qq9',
    'Proxy-Authorization: Basic c3lu',
    'Authorization: Bearer "synthq1w2e3r4t5y6"',
    'password: synthpw99x',
    'Bearer [REDACTED:AUTHORIZATION] done',
    'password [REDACTED:PASSWORD] ok',
    JSON.stringify({ password: ['x1y2'], credentials: { u: 'a', n: 5 }, token: ['aB3xY9qW2eR5tZ8uV1x2'] }),
  ];
  for (const t of texts) {
    const once = redactWorkerText(t), twice = redactWorkerText(once);
    check('IDEMPOTENT text: ' + t.slice(0, 40), once === twice, JSON.stringify(once) + ' vs ' + JSON.stringify(twice));
    const e1 = redactEnvelope({ k: t }), e2 = redactEnvelope(deepClone(e1));
    check('IDEMPOTENT envelope: ' + t.slice(0, 40),
      JSON.stringify(e1) === JSON.stringify(e2), JSON.stringify(e1));
  }
}

// ================= SURVIVE-BY-DESIGN NEGATIVES =================
{
  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  check('N1 token UUID survives', redactEnvelope({ token: uuid }).token === uuid);
  check('N2 token UUID survives (text)', redactWorkerText('{"token": "' + uuid + '"}').includes(uuid));
  const d32 = '5d41402abc4b2a76b9719d911017c592';
  check('N3 token 32-hex digest survives', redactEnvelope({ token: d32 }).token === d32);
  check('N4 token number survives', redactEnvelope({ token: 1500 }).token === 1500);
  check('N5 token model name survives', redactEnvelope({ token: 'gpt-4' }).token === 'gpt-4');
  check('N6 session_id short ref survives', redactEnvelope({ session_id: 'sess_abc123' }).session_id === 'sess_abc123');
  check('N7 token count prose survives', redactWorkerText('token count: 1500') === 'token count: 1500');
  check('N8 model token prose survives', redactWorkerText('model token: gpt-4') === 'model token: gpt-4');
  // UUID under an UNAMBIGUOUS key redacts by key alone (existing contract).
  check('N9 password UUID redacts by key',
    redactWorkerText('password: ' + uuid).includes('[REDACTED:PASSWORD]') &&
    !redactWorkerText('password: ' + uuid).includes(uuid));
  check('N10 bare session key survives', redactWorkerText('session: abc') === 'session: abc');
  // Documented false positives (pinned, not leaks): the class-key rule
  // redacts the token after the key word in plain prose.
  const fp = redactWorkerText('reset your password soon');
  check('N11 documented FP pinned: prose password+word redacts the word',
    fp.includes('[REDACTED:PASSWORD]') && !fp.includes('soon'), JSON.stringify(fp));
  const fp2 = redactWorkerText('the bearer of tidings');
  check('N12 documented FP pinned: prose bearer of <word> collapses',
    fp2.includes('[REDACTED:AUTHORIZATION]'), JSON.stringify(fp2));
}

// ================= EXISTING CONTRACTS (from the 92-probe corpus) =================
{
  check('X1 PEM block', redactWorkerText('-----BEGIN PRIVATE KEY-----\nMIIBv\n-----END PRIVATE KEY-----').includes('[REDACTED:PRIVATE KEY]'));
  check('X2 credentialed URL', redactWorkerText('db=postgres://appuser:s3cretPW@db.internal:5432/appdb').includes('postgres://[REDACTED:DATABASE URL]@'));
  check('X3 JWT redacts', redactWorkerText('t=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c').includes('[REDACTED:TOKEN]'));
  check('X4 sk-proj redacts', redactWorkerText('key=sk-proj-synthABCDEFGHIJKL').includes('[REDACTED:TOKEN]'));
  check('X5 ghp_ redacts', redactWorkerText('pat=ghp_synthabcdefghijklmnop').includes('[REDACTED:TOKEN]'));
  check('X6 AKIA redacts', redactWorkerText('aws=AKIAIOSFODNN7EXAMPLE').includes('[REDACTED:CREDENTIAL]'));
  check('X7 session_id secret-shaped redacts', redactWorkerText('session_id: k7Jm2NpQ9xR4vT6wY8').includes('[REDACTED:SESSION]'));
  check('X8 cookie redacts', redactWorkerText('cookie: sess=abc123def456ghi789jkl').includes('[REDACTED:COOKIE]'));
  check('X9 nested password redacts (envelope)',
    !leaked(redactEnvelope({ a: { password: 'hunter2hunter2' } }), 'hunter2hunter2'));
  check('X10 envelope token secret-shaped redacts',
    redactEnvelope({ token: 'aB3xY9qW2eR5tZ8uV1x2' }).token === '[REDACTED:TOKEN]');
  check('X11 envelope session_id secret-shaped redacts',
    redactEnvelope({ session_id: 'k7Jm2NpQ9xR4vT6wY8' }).session_id === '[REDACTED:SESSION]');
}

// ================= ROUND 2, LEAK 1: non-DB-scheme URL userinfo =================
// The falsifier showed https://user:<pw>@host/ and ftp://user:<pw>@host/
// surviving the DB-scheme allowlist. The general rule (2a) now covers every
// scheme; the DB rule (2) is untouched.
{
  const u1 = 'endpoint=https://deploy:synthPW99@hooks.example.com/trigger';
  const r1 = redactWorkerText(u1);
  check('L1 https userinfo: exact output',
    r1 === 'endpoint=https://[REDACTED:URL]@hooks.example.com/trigger', JSON.stringify(r1));
  check('L1 https userinfo: fragment gone', !leaked(r1, 'synthPW99'), JSON.stringify(r1));

  const u2 = 'ftp://backup:synthFtp77@files.example.com/data';
  const r2 = redactWorkerText(u2);
  check('L1b ftp userinfo redacts',
    r2 === 'ftp://[REDACTED:URL]@files.example.com/data' && !leaked(r2, 'synthFtp77'),
    JSON.stringify(r2));

  // Fail closed: no colon — bare user still redacts.
  const u3 = 'see https://svcaccount@internal.example.com/status';
  const r3 = redactWorkerText(u3);
  check('L1c bare user (no colon) redacts',
    r3 === 'see https://[REDACTED:URL]@internal.example.com/status' && !leaked(r3, 'svcaccount'),
    JSON.stringify(r3));

  // Userinfo never crosses '/': a query-string @ is safe.
  const u4 = 'https://example.com/path?a=b@c';
  check('L1d query @ after slash untouched', redactWorkerText(u4) === u4, JSON.stringify(redactWorkerText(u4)));

  // The DB rule is untouched: postgres still gets [REDACTED:DATABASE URL].
  const u5 = 'db=postgres://appuser:s3cretPW@db.internal:5432/appdb';
  const r5 = redactWorkerText(u5);
  check('L1e DB rule unchanged',
    r5 === 'db=postgres://[REDACTED:DATABASE URL]@db.internal:5432/appdb', JSON.stringify(r5));

  // Idempotence on each.
  for (const t of [u1, u2, u3, u5]) {
    const once = redactWorkerText(t), twice = redactWorkerText(once);
    check('L1 idempotent: ' + t.slice(0, 30), once === twice, JSON.stringify(once) + ' vs ' + JSON.stringify(twice));
  }
}

// ================= ROUND 2, LEAK 2: value-tokenizer gaps =================
// (a) log-escaped JSON: literal backslashes around the value.
// (b) partial-quote hostile: password: "abc"def".
// The shared SECRET_VALUE_ALT (rules 3, 4, 4b) consumes both whole.
{
  // In JS source these literals are {\"password\": \"synthEsc99x\"} etc.
  const e1 = '{\\"password\\": \\"synthEsc99x\\"}';
  const r1 = redactWorkerText(e1);
  check('L2a log-escaped JSON: fragment gone', !leaked(r1, 'synthEsc99x'), JSON.stringify(r1));
  check('L2a log-escaped JSON: marker present', r1.includes('[REDACTED:PASSWORD]'), JSON.stringify(r1));

  const e2 = 'password: "abc"def"';
  const r2 = redactWorkerText(e2);
  check('L2b partial-quote: exact output',
    r2 === 'password: "[REDACTED:PASSWORD]"', JSON.stringify(r2));
  check('L2b partial-quote: no fragment survives', !leaked(r2, 'def'), JSON.stringify(r2));

  // The shape-gated keys share the tokenizer: log-escaped secret-shaped
  // session_id redacts (quote normalized on re-emission, documented).
  const e3 = '{\\"session_id\\": \\"k7Jm2NpQ9xR4vT6wY8\\"}';
  const r3 = redactWorkerText(e3);
  check('L2c log-escaped session_id (secret-shaped) redacts',
    !leaked(r3, 'k7Jm2NpQ9xR4vT6wY8') && r3.includes('[REDACTED:SESSION]'), JSON.stringify(r3));

  // Partial-quote NON-secret value under a gated key: charset gate fails,
  // value survives whole (no half-redaction).
  const e4 = 'token: "gpt-4"junk"';
  const r4 = redactWorkerText(e4);
  check('L2d token partial-quote non-secret value survives whole', r4 === e4, JSON.stringify(r4));

  // Idempotence on each hostile (text + envelope).
  for (const t of [e1, e2, e3, e4]) {
    const once = redactWorkerText(t), twice = redactWorkerText(once);
    check('L2 text idempotent: ' + t.slice(0, 30), once === twice, JSON.stringify(once) + ' vs ' + JSON.stringify(twice));
    const en1 = redactEnvelope({ k: t }), en2 = redactEnvelope(deepClone(en1));
    check('L2 envelope idempotent: ' + t.slice(0, 30),
      JSON.stringify(en1) === JSON.stringify(en2), JSON.stringify(en1));
  }
}

// ================= ROUND 2 ADDITIONAL: aws_secret_access_key =================
// aws_access_key_id stays OUT of the key list (covered by the AKIA shape
// rule; no double coverage). Pinned here.
{
  const k1 = 'aws_secret_access_key=synthAWSsecret99x';
  const r1 = redactWorkerText(k1);
  check('K1 aws_secret_access_key redacts',
    r1 === 'aws_secret_access_key=[REDACTED:SECRET]' && !leaked(r1, 'synthAWSsecret99x'),
    JSON.stringify(r1));
  const k2 = redactEnvelope({ aws_secret_access_key: 'synthAWSsecret99x' });
  check('K2 aws_secret_access_key envelope redacts',
    JSON.stringify(k2) === '{"aws_secret_access_key":"[REDACTED:SECRET]"}', JSON.stringify(k2));
  check('K3 aws_access_key_id still shape-ruled (AKIA), not a key: plain value survives',
    redactWorkerText('aws_access_key_id=synthId99') === 'aws_access_key_id=synthId99',
    JSON.stringify(redactWorkerText('aws_access_key_id=synthId99')));
  check('K4 AKIA shape still redacts under the id key',
    redactWorkerText('aws_access_key_id=AKIAIOSFODNN7EXAMPLE').includes('[REDACTED:CREDENTIAL]'));
}

// ================= PROMPT SEAM: EXACT PROVEN BOUNDARY (round 2, LEAK 3) =================
// The proven guarantee is exact: no secret WITHIN THE SUPPORTED BOUNDARY
// (secret-key context at any depth, or strong shape anywhere) placed in
// workOrder.input or taskBrief appears in the prompt output. The
// innocent-key shapeless case is OUT-OF-SCOPE by construction — pinned here
// as a DOCUMENTED KNOWN LIMITATION (a passing check that the string
// survives), not a failure.
{
  const wo = {
    work_order_id: 'wo-synth-002', context_pack_id: 'cp-synth-002',
    agent_id: 'hermes', capability: 'text.summarize',
    mission_id: 'm-synth', task_id: 't-synth', attempt: 1,
    input: {
      password: 'synthpw-boundary99',                 // keyed -> redacts
      nested: { api_key: 'synthKEYboundary1a2b' },    // keyed at depth -> redacts
      token: 'aB3xY9qW2eR5tZ8uV1x2',                  // strong shape -> redacts
      notes: ['alpha bravo charlie delta echo foxtrot'], // innocent key, shapeless -> OUT OF SCOPE
      count: 1500,
    },
  };
  const p = buildWorkerPrompt(wo, 'Summarize this brief text.');
  for (const frag of ['synthpw-boundary99', 'synthKEYboundary1a2b', 'aB3xY9qW2eR5tZ8uV1x2']) {
    check('BOUNDARY keyed/shaped secret absent from prompt: ' + frag, !p.includes(frag));
  }
  check('BOUNDARY markers present in prompt',
    p.includes('[REDACTED:PASSWORD]') && p.includes('[REDACTED:API KEY]') && p.includes('[REDACTED:TOKEN]'));
  // DOCUMENTED KNOWN LIMITATION (not a failure): shapeless string under an
  // innocent key is undetectable by construction (OUT-OF-SCOPE in the module
  // comment). Pinned so the boundary stays honest.
  check('BOUNDARY known limitation pinned: shapeless string under innocent key survives',
    p.includes('alpha bravo charlie delta echo foxtrot'), p.slice(p.indexOf('Input data')));
}

// ================= ROUND 3, DEFECT 1: messy values under token/session_id =================
// The shared tokenizer consumes the whole messy value (`"abc"junk`, `[abc]`,
// `"abc-with-,}-inside"`); rules 4/4b gate the INNER candidate
// (secretCandidate) and fail CLOSED via secretShapedAnywhere: the whole
// consumed value redacts when the inner payload is secret-shaped or
// contains a 16+ char secret-shaped run.
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6'; // 20 chars, secret-shaped
  const MESSY = 'aa11bb22cc33dd44-,}-ee55ff66'; // inner comma/brace; contains a 16+ secret-shaped run

  const d1cases = [
    ['token: "' + SEC + '"junk', 'token: "[REDACTED:TOKEN]"'],
    ["token: '" + SEC + "'junk", "token: '[REDACTED:TOKEN]'"],
    ['token: [' + SEC + ']', 'token: [REDACTED:TOKEN]'],
    ['token: "' + MESSY + '"', 'token: "[REDACTED:TOKEN]"'],
    ['session_id: "' + SEC + '"junk', 'session_id: "[REDACTED:SESSION]"'],
    ["session_id: '" + SEC + "'junk", "session_id: '[REDACTED:SESSION]'"],
    ['session_id: [' + SEC + ']', 'session_id: [REDACTED:SESSION]'],
    ['session_id: "' + MESSY + '"', 'session_id: "[REDACTED:SESSION]"'],
  ];
  for (const [input, want] of d1cases) {
    const r = redactWorkerText(input);
    check('D1 messy value redacts whole: ' + input.slice(0, 34), r === want, JSON.stringify(r));
    check('D1 no fragment survives: ' + input.slice(0, 34),
      !leaked(r, SEC) && !leaked(r, 'aa11bb22cc33dd44'), JSON.stringify(r));
    const twice = redactWorkerText(r);
    check('D1 idempotent: ' + input.slice(0, 34), twice === r, JSON.stringify(twice));
  }

  // Survive controls: messy but NOT secret-shaped.
  const d1survive = [
    'token: "gpt-4"junk',
    'session_id: sess_abc123',
    'token: [1500]',
    'token: "550e8400-e29b-41d4-a716-446655440000"junk', // UUID run is carved out
  ];
  for (const t of d1survive) {
    const r = redactWorkerText(t);
    check('D1 survive control byte-identical: ' + t, r === t, JSON.stringify(r));
  }

  // Prompt seam: a messy token value in taskBrief never enters the prompt.
  const wo3 = {
    work_order_id: 'wo-synth-003', context_pack_id: 'cp-synth-003',
    agent_id: 'hermes', capability: 'text.summarize',
    mission_id: 'm-synth', task_id: 't-synth', attempt: 1, input: {},
  };
  const p3 = buildWorkerPrompt(wo3, 'Do the thing. token: "' + SEC + '"junk now.');
  check('D1 prompt seam: messy token secret absent', !p3.includes(SEC), p3.slice(0, 200));
  check('D1 prompt seam: marker present', p3.includes('[REDACTED:TOKEN]'), p3.slice(0, 200));
}

// ================= ROUND 3, DEFECT 2: delimiter must not eat the next line's key =================
// SECRET_DELIM: a newline is consumable only when the next line does NOT
// begin a new `key:` pair.
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6';
  const g10 = 'password:\napi_key: ' + SEC;
  const r1 = redactWorkerText(g10);
  check('D2 G10: password left alone, api_key redacts independently',
    r1 === 'password:\napi_key: [REDACTED:API KEY]', JSON.stringify(r1));
  check('D2 G10: no fragment survives', !leaked(r1, SEC), JSON.stringify(r1));

  const g10r = 'api_key: ' + SEC + '\npassword:';
  const r2 = redactWorkerText(g10r);
  check('D2 G10 reversed order',
    r2 === 'api_key: [REDACTED:API KEY]\npassword:', JSON.stringify(r2));

  // Continuation: next line is NOT a kv pair, so the newline IS crossed.
  const cont = 'password:\n' + SEC;
  const r3 = redactWorkerText(cont);
  check('D2 continuation still redacts',
    r3 === 'password:\n[REDACTED:PASSWORD]' && !leaked(r3, SEC), JSON.stringify(r3));

  // All delimiter variants unchanged.
  check('D2 colon variant',
    redactWorkerText('password: ' + SEC) === 'password: [REDACTED:PASSWORD]');
  check('D2 tab variant',
    redactWorkerText('password:\t' + SEC) === 'password:\t[REDACTED:PASSWORD]');
  check('D2 space variant',
    redactWorkerText('password ' + SEC) === 'password [REDACTED:PASSWORD]');
  check('D2 equals variant',
    redactWorkerText('password=' + SEC) === 'password=[REDACTED:PASSWORD]');

  // CRLF: \r is untouched, the newline never crosses into `other:`.
  const crlf = 'api_key: ' + SEC + '\r\nother: x';
  const rcrlf = redactWorkerText(crlf);
  check('D2 crlf', rcrlf === 'api_key: [REDACTED:API KEY]\r\nother: x',
    JSON.stringify(rcrlf));

  // Idempotence across the new shapes.
  for (const t of [g10, g10r, cont, crlf]) {
    const once = redactWorkerText(t), twice = redactWorkerText(once);
    check('D2 idempotent: ' + JSON.stringify(t).slice(0, 34), once === twice,
      JSON.stringify(once) + ' vs ' + JSON.stringify(twice));
  }
}

// ================= ROUND 3, DEFECT 3: rule 2b value class includes ':' =================
// `Basic user:pass` must drop the whole credential, not leak the `:pass`
// fragment.
{
  const c1 = 'Basic user:pass';
  const r1 = redactWorkerText(c1);
  check('D3 colon credential: exact drop', r1 === '[REDACTED:AUTHORIZATION]', JSON.stringify(r1));
  check('D3 colon credential: no fragment',
    !leaked(r1, 'user') && !leaked(r1, 'pass'), JSON.stringify(r1));

  check('D3 Bearer still drops whole',
    redactWorkerText('Bearer abc123') === '[REDACTED:AUTHORIZATION]');
  check('D3 short Basic still drops',
    redactWorkerText('Basic dXNl') === '[REDACTED:AUTHORIZATION]');
  check('D3 quoted Basic still drops',
    redactWorkerText('Basic "dXNlcjpwYXNz"') === '[REDACTED:AUTHORIZATION]');
  check('D3 long Basic still drops',
    redactWorkerText('Basic c3ludGhldGljOnNlY3JldA==') === '[REDACTED:AUTHORIZATION]');

  const once = redactWorkerText(c1), twice = redactWorkerText(once);
  check('D3 idempotent', once === twice && once === '[REDACTED:AUTHORIZATION]',
    JSON.stringify(once) + ' vs ' + JSON.stringify(twice));
}

// ================= ROUND 4, DEFECT 1: secret in the consumed tail =================
// secretValueHit: the UNION of the peeled inner candidate and the whole raw
// value. A 16+ secret-shaped run ANYWHERE in the tail fails closed now.
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6'; // 20 chars, secret-shaped
  const f1cases = [
    ['token: "short"' + SEC, 'token: "[REDACTED:TOKEN]"'],
    ["token: 'short'" + SEC, "token: '[REDACTED:TOKEN]'"],
    ['token: [short]' + SEC, 'token: [REDACTED:TOKEN]'],
    ['token: "a" "' + SEC + '"', 'token: "[REDACTED:TOKEN]"'],
    ['session_id: "short"' + SEC, 'session_id: "[REDACTED:SESSION]"'],
    ["session_id: 'short'" + SEC, "session_id: '[REDACTED:SESSION]'"],
    ['session_id: [short]' + SEC, 'session_id: [REDACTED:SESSION]'],
    ['session_id: "a" "' + SEC + '"', 'session_id: "[REDACTED:SESSION]"'],
  ];
  for (const [input, want] of f1cases) {
    const r = redactWorkerText(input);
    check('F1 tail secret redacts whole: ' + input.slice(0, 30), r === want, JSON.stringify(r));
    check('F1 no fragment survives: ' + input.slice(0, 30), !leaked(r, SEC), JSON.stringify(r));
    const twice = redactWorkerText(r);
    check('F1 idempotent: ' + input.slice(0, 30), twice === r, JSON.stringify(twice));
  }

  // Survive controls: innocuous head, innocent tail — no 16+ secret run.
  const f1survive = [
    'token: "gpt-4"junk',
    'token: [1500]',
    'session_id: sess_abc123',
    'token: "abcdefghijklmnopqrst"junk',      // 20-char all-alpha inner: not secret-shaped
    'token: "1234567890123456"junk',          // 16 pure digits: looksSecretValue rejects
    'session_id: "gpt-4" extra junk',
  ];
  for (const t of f1survive) {
    const r = redactWorkerText(t);
    check('F1 survive control byte-identical: ' + t, r === t, JSON.stringify(r));
  }

  // Envelope agrees with text on the same messy values (drives F3 too).
  const e1 = redactEnvelope({ token: '"short"' + SEC });
  check('F1 envelope tail secret redacts',
    JSON.stringify(e1) === '{"token":"[REDACTED:TOKEN]"}', JSON.stringify(e1));
  const e2 = redactEnvelope({ session_id: 'sess_abc123' });
  check('F1 envelope survive control', JSON.stringify(e2) === '{"session_id":"sess_abc123"}',
    JSON.stringify(e2));
}

// ================= ROUND 4, DEFECT 2: delimiter runs (:= / : = / = =) =================
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6';
  const f2cases = [
    ['password:=' + SEC, 'password:=[REDACTED:PASSWORD]'],
    ['password:= ' + SEC, 'password:= [REDACTED:PASSWORD]'],
    ['password: = ' + SEC, 'password: = [REDACTED:PASSWORD]'],
    ['password = = ' + SEC, 'password = = [REDACTED:PASSWORD]'],
    ['password =' + SEC, 'password =[REDACTED:PASSWORD]'],   // sanity
    ['api_key:= ' + SEC, 'api_key:= [REDACTED:API KEY]'],
    ['session_id:= ' + SEC, 'session_id:= [REDACTED:SESSION]'],
  ];
  for (const [input, want] of f2cases) {
    const r = redactWorkerText(input);
    check('F2 delimiter run redacts value whole: ' + input.slice(0, 26), r === want, JSON.stringify(r));
    check('F2 no fragment survives: ' + input.slice(0, 26), !leaked(r, SEC), JSON.stringify(r));
    const twice = redactWorkerText(r);
    check('F2 idempotent: ' + input.slice(0, 26), twice === r, JSON.stringify(twice));
  }
}

// ================= ROUND 4, DEFECT 3: envelope gate parity =================
// The envelope gated branch uses secretValueHit(String(leaf)) now — text
// and envelope must agree on every input.
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6';
  const g1 = redactEnvelope({ token: SEC + '"junk' });
  check('F3 envelope messy token ("<secret>"junk) redacts',
    JSON.stringify(g1) === '{"token":"[REDACTED:TOKEN]"}', JSON.stringify(g1));
  check('F3 envelope messy token: no fragment', !leaked(g1, SEC), JSON.stringify(g1));

  const g2 = redactEnvelope({ token: SEC + ' extra junk' });
  check('F3 envelope messy token ("<secret> extra junk") redacts',
    JSON.stringify(g2) === '{"token":"[REDACTED:TOKEN]"}', JSON.stringify(g2));
  check('F3 envelope messy token 2: no fragment', !leaked(g2, SEC), JSON.stringify(g2));

  const g3 = redactEnvelope({ session_id: SEC + '"junk' });
  check('F3 envelope messy session_id redacts',
    JSON.stringify(g3) === '{"session_id":"[REDACTED:SESSION]"}', JSON.stringify(g3));

  // Parity probe: text and envelope agree.
  const textOut = redactWorkerText('token: "' + SEC + '"junk');
  check('F3 text/envelope parity (token)', textOut === 'token: "[REDACTED:TOKEN]"' &&
    g1.token === '[REDACTED:TOKEN]', JSON.stringify(textOut) + ' vs ' + JSON.stringify(g1));

  // Gated non-secret still survives in the envelope.
  const g4 = redactEnvelope({ token: 'gpt-4"junk', session_id: 'sess_abc123' });
  check('F3 envelope non-secret messy survives',
    JSON.stringify(g4) === '{"token":"gpt-4\\"junk","session_id":"sess_abc123"}',
    JSON.stringify(g4));

  const e1 = redactEnvelope({ k: SEC + '"junk' }), e2 = redactEnvelope(deepClone(g1));
  check('F3 envelope idempotent',
    JSON.stringify(e1) === JSON.stringify(redactEnvelope(deepClone(e1))) &&
    JSON.stringify(g1) === JSON.stringify(e2), JSON.stringify(g1));
}

// ================= ROUND 4, DEFECT 4: prompt seam via messy input values =================
// The prevention seam goes through redactEnvelope; F3 fixes it. Re-verify
// explicitly: messy token/session_id in input AND in taskBrief absent from
// the prompt; echo fields survive verbatim.
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6';
  const wo = {
    work_order_id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', context_pack_id: 'cp-synth-f4',
    agent_id: 'hermes', capability: 'text.summarize',
    mission_id: 'm-synth', task_id: 't-synth', attempt: 1,
    input: {
      token: SEC + '"junk',
      session_id: SEC + ' extra junk',
      work_order_id: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      context_pack_id: 'cp-synth-f4',
      agent_id: 'hermes',
      capability: 'text.summarize',
      'tenant:acctenant1': 'echo-check',
      count: 1500,
    },
  };
  const p = buildWorkerPrompt(wo, 'Do it. token: "short"' + SEC + ' and session_id: [short]' + SEC + ' now.');
  check('F4 prompt: messy input token absent', !p.includes(SEC), p.slice(p.indexOf('Input data')));
  check('F4 prompt: messy brief token absent', p.split(SEC).length === 1, 'secret appears in prompt');
  check('F4 prompt: markers present',
    p.includes('[REDACTED:TOKEN]') && p.includes('[REDACTED:SESSION]'),
    p.slice(p.indexOf('Input data')));
  check('F4 prompt: echoes survive verbatim',
    p.includes('"work_order_id": "a1b2c3d4e5f60718293a4b5c6d7e8f90"') &&
    p.includes('"context_pack_id": "cp-synth-f4"') &&
    p.includes('"agent_id": "hermes"') &&
    p.includes('"capability": "text.summarize"') &&
    p.includes('tenant:acctenant1') && p.includes('echo-check'));
  check('F4 prompt: benign input values survive', p.includes('1500'));
}

// ================= ROUND 4, CRLF boundary gap =================
{
  const SEC = 'xh9K2mQ7vT4pL8nR3sW6';
  const c1 = 'password:\r\n' + SEC;
  const r1 = redactWorkerText(c1);
  check('CRLF continuation redacts', r1 === 'password:\r\n[REDACTED:PASSWORD]', JSON.stringify(r1));
  check('CRLF continuation: no fragment', !leaked(r1, SEC), JSON.stringify(r1));

  // G10 ordering with CRLF: password left alone, api_key redacts alone.
  const c2 = 'password:\r\napi_key: ' + SEC;
  const r2 = redactWorkerText(c2);
  check('CRLF G10: password untouched, api_key redacts independently',
    r2 === 'password:\r\napi_key: [REDACTED:API KEY]', JSON.stringify(r2));
  check('CRLF G10: no fragment', !leaked(r2, SEC), JSON.stringify(r2));

  // Existing inline CRLF case still passes (re-pinned).
  const c3 = 'api_key: ' + SEC + '\r\nother: x';
  check('CRLF inline existing', redactWorkerText(c3) === 'api_key: [REDACTED:API KEY]\r\nother: x',
    JSON.stringify(redactWorkerText(c3)));

  // Delimiter run across CRLF value line still works.
  const c4 = 'password:=\r\n' + SEC;
  check('CRLF delimiter-run + continuation',
    redactWorkerText(c4) === 'password:=\r\n[REDACTED:PASSWORD]', JSON.stringify(redactWorkerText(c4)));

  for (const t of [c1, c2, c3, c4]) {
    const once = redactWorkerText(t), twice = redactWorkerText(once);
    check('CRLF idempotent: ' + JSON.stringify(t).slice(0, 34), once === twice,
      JSON.stringify(once) + ' vs ' + JSON.stringify(twice));
  }
}

console.log(failures === 0 ? `\nALL PASS (${passed} checks)` : `\n${failures} FAILURES (${passed} passed)`);
process.exit(failures === 0 ? 0 : 1);
