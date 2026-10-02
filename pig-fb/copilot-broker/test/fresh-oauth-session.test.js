'use strict';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TASK_NAME,
  SESSION_DIR_PREFIX,
  PROTECTED_PROFILE_NAMES,
  sessionDirName,
  createSessionSpec,
  buildChromeArgs,
  buildTaskAction,
  buildTaskXml,
  xmlEscape,
  validateAuthorizeUrl,
  isDeletableDir,
  matchSessionProcesses,
} from '../src/fresh-oauth-session.js';

const BASE = 'C:\\Users\\nolan\\.local\\share\\pigi\\oauth-sessions';
// A structurally complete authorize URL, as `copilot login --web-flow` prints it.
const URL =
  'https://github.com/login/oauth/authorize' +
  '?client_id=Ov23ctDVkRmgkPke0Mmm' +
  '&redirect_uri=http%3A%2F%2F127.0.0.1%3A36471%2Fcallback' +
  '&scope=read%3Auser' +
  '&state=abc123' +
  '&code_challenge=xyz789' +
  '&code_challenge_method=S256';

test('session dir names are unique per run and carry the prefix', () => {
  const a = sessionDirName({ nowMs: 1000, rand: 'aa11bb' });
  const b = sessionDirName({ nowMs: 1000, rand: 'cc22dd' });
  const c = sessionDirName({ nowMs: 2000, rand: 'aa11bb' });
  assert.equal(a, 'oauth-fresh-1000-aa11bb');
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.ok(a.startsWith(SESSION_DIR_PREFIX));
});

test('createSessionSpec rejects bad inputs', () => {
  assert.throws(() => createSessionSpec({ url: URL }), /baseDir/);
  assert.throws(() => createSessionSpec({ baseDir: BASE }), /url/);
  assert.throws(
    () => createSessionSpec({ baseDir: BASE, url: 'http://insecure/x' }),
    /https/,
  );
  const spec = createSessionSpec({ baseDir: BASE, url: URL, nowMs: 5, rand: 'r1' });
  assert.equal(spec.profileDir, `${BASE}\\oauth-fresh-5-r1`);
  assert.equal(spec.taskName, TASK_NAME);
});

test('chrome args isolate the profile and never reference everyday profiles', () => {
  const spec = createSessionSpec({ baseDir: BASE, url: URL, nowMs: 5, rand: 'r1' });
  const args = buildChromeArgs(spec);
  assert.ok(args.includes(`--user-data-dir=${spec.profileDir}`));
  assert.ok(args.includes('--new-window'));
  assert.ok(args.includes('--no-first-run'));
  assert.ok(args.includes(URL));
  const joined = args.join(' ');
  for (const name of PROTECTED_PROFILE_NAMES) {
    assert.ok(!joined.includes(name), `must not reference ${name}`);
  }
});

test('task action quotes the long OAuth url', () => {
  const spec = createSessionSpec({ baseDir: BASE, url: URL, nowMs: 5, rand: 'r1' });
  const action = buildTaskAction(spec);
  assert.equal(action.command, spec.chromePath);
  assert.ok(action.arguments.includes(`"${URL}"`));
  assert.ok(action.arguments.includes(`"${spec.profileDir}"`));
});

test('xmlEscape handles & < >', () => {
  assert.equal(xmlEscape('a&b<c>d'), 'a&amp;b&lt;c&gt;d');
});

test('task xml is an interactive on-demand task with escaped url', () => {
  const spec = createSessionSpec({ baseDir: BASE, url: URL, nowMs: 5, rand: 'r1' });
  const xml = buildTaskXml(spec);
  assert.ok(xml.includes('<LogonType>InteractiveToken</LogonType>'));
  assert.ok(
    xml.includes('client_id=Ov23ctDVkRmgkPke0Mmm&amp;redirect_uri='),
    'url & must be xml-escaped',
  );
  assert.ok(!xml.includes('<Triggers>'), 'no triggers: on-demand only');
  assert.ok(xml.includes(xmlEscape(spec.profileDir)));
});

test('validateAuthorizeUrl accepts the real copilot web-flow url shape', () => {
  const result = validateAuthorizeUrl(URL);
  assert.deepEqual(result, { ok: true });
});

test('validateAuthorizeUrl rejects truncated, wrapped, or polluted captures', () => {
  // Truncated at the first & (missing required params).
  let r = validateAuthorizeUrl(
    'https://github.com/login/oauth/authorize?client_id=Ov23ctDVkRmgkPke0Mmm',
  );
  assert.equal(r.ok, false);
  assert.match(r.reason, /missing required oauth param/);

  // Wrapped across two lines.
  r = validateAuthorizeUrl(URL.slice(0, 80) + '\n' + URL.slice(80));
  assert.equal(r.ok, false);

  // ANSI color codes from terminal output.
  r = validateAuthorizeUrl('\u001b[32m' + URL);
  assert.equal(r.ok, false);

  // Wrong host, wrong path, non-https.
  r = validateAuthorizeUrl(URL.replace('github.com', 'evil.com'));
  assert.equal(r.ok, false);
  r = validateAuthorizeUrl(URL.replace('/login/oauth/authorize', '/login'));
  assert.equal(r.ok, false);
  r = validateAuthorizeUrl(URL.replace('https://', 'http://'));
  assert.equal(r.ok, false);

  // Empty / non-string.
  assert.equal(validateAuthorizeUrl('').ok, false);
  assert.equal(validateAuthorizeUrl(null).ok, false);
});

test('createSessionSpec refuses a malformed authorize url', () => {
  assert.throws(
    () =>
      createSessionSpec({
        baseDir: BASE,
        url: 'https://github.com/login/oauth/authorize?client_id=X',
      }),
    /invalid authorize url/,
  );
  assert.throws(
    () => createSessionSpec({ baseDir: BASE, url: 'http://insecure/x' }),
    /invalid authorize url/,
  );
});

test('isDeletableDir: only true for a session dir directly in the base', () => {
  const good = `${BASE}\\oauth-fresh-123-abc456`;
  assert.ok(isDeletableDir(good, BASE));
  // base itself, outside base, deeper nesting: all refused
  assert.ok(!isDeletableDir(BASE, BASE));
  assert.ok(!isDeletableDir('C:\\Users\\nolan\\.local\\share\\pigi\\fb-profile', BASE));
  assert.ok(!isDeletableDir(`${BASE}\\oauth-fresh-123-abc456\\Default`, BASE));
  assert.ok(!isDeletableDir(`${BASE}\\something-else`, BASE));
  assert.ok(!isDeletableDir(`${BASE}\\oauth-fresh-`, BASE + 'x'));
  // protected everyday profiles can never match, even under the base
  for (const name of PROTECTED_PROFILE_NAMES) {
    assert.ok(!isDeletableDir(`${BASE}\\${name}`, BASE), name);
    assert.ok(!isDeletableDir(`${BASE}\\${name.toUpperCase()}`, BASE), `${name} case`);
  }
  // non-strings refused
  assert.ok(!isDeletableDir(null, BASE));
  assert.ok(!isDeletableDir(good, null));
});

test('matchSessionProcesses selects only the session chrome', () => {
  const procs = [
    { pid: 1, commandLine: 'chrome.exe --user-data-dir=C:\\x\\oauth-fresh-123-abc456 --new-window' },
    { pid: 2, commandLine: 'chrome.exe --user-data-dir=C:\\Users\\nolan\\.local\\share\\pigi\\fb-profile' },
    { pid: 3, commandLine: 'chrome.exe --user-data-dir=C:\\x\\oauth-fresh-999-zzzzzz --new-window' },
    { pid: 4, commandLine: null },
    null,
  ];
  const hit = matchSessionProcesses(procs, 'oauth-fresh-123-abc456');
  assert.deepEqual(hit.map((p) => p.pid), [1]);
  assert.deepEqual(matchSessionProcesses(procs, 'oauth-fresh-'), [procs[0], procs[2]]);
  assert.deepEqual(matchSessionProcesses([], 'oauth-fresh-1'), []);
  assert.deepEqual(matchSessionProcesses(procs, ''), []);
});

test('authorize.sh cleanup_current_session terminates the CLI (no orphaned listener)', async () => {
  // Regression: Ctrl-C (EXIT trap) must kill `copilot login --web-flow`,
  // otherwise the orphaned process keeps its loopback port bound and the
  // next run's pgrep guard fails. Static check that the cleanup function
  // contains a CLI-terminating command.
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const script = readFileSync(join(here, '..', 'scripts', 'authorize.sh'), 'utf8');
  // Extract the cleanup_current_session function body.
  const m = script.match(/cleanup_current_session\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(m, 'cleanup_current_session function not found in authorize.sh');
  const body = m[1];
  // Must terminate the web-flow CLI process (pkill by the full command pattern).
  assert.ok(
    body.includes('pkill') && body.includes('copilot login'),
    'cleanup_current_session must pkill the copilot login process',
  );
});
