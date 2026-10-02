'use strict';
//
// Fresh isolated OAuth browser sessions.
//
// Pure, deterministic logic for launching each `authorize.sh` run in its own
// temporary Chrome profile. No side effects here: scripts/authorize.sh
// performs the Windows operations (scheduled task, process kill, dir delete)
// from the values produced by this module.
//
// Safety invariants (unit-tested):
//   - every run gets a unique profile dir under a dedicated base dir
//   - cleanup matching selects ONLY processes/dirs carrying the session marker
//   - isDeletableDir refuses to delete anything outside the session base,
//     anything not carrying the session prefix, and every protected
//     everyday profile (fb-profile, ig-profile, ...)

export const TASK_NAME = 'PigiOAuthFresh';
export const SESSION_DIR_PREFIX = 'oauth-fresh-';
export const DEFAULT_CHROME_PATH =
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Everyday profiles that session cleanup must never touch.
export const PROTECTED_PROFILE_NAMES = [
  'fb-profile',
  'ig-profile',
  'li-profile',
  'tt-profile',
  'x-profile',
];

function defaultRand() {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
}

export function sessionDirName({ nowMs = Date.now(), rand = defaultRand() } = {}) {
  return `${SESSION_DIR_PREFIX}${nowMs}-${rand}`;
}

export function createSessionSpec({
  baseDir,
  url,
  chromePath = DEFAULT_CHROME_PATH,
  nowMs,
  rand,
} = {}) {
  if (!baseDir || typeof baseDir !== 'string') {
    throw new Error('createSessionSpec: baseDir is required');
  }
  const urlCheck = validateAuthorizeUrl(url);
  if (!urlCheck.ok) {
    throw new Error(`createSessionSpec: invalid authorize url (${urlCheck.reason})`);
  }
  const dirName = sessionDirName({ nowMs, rand });
  const profileDir = `${baseDir.replace(/\\+$/, '')}\\${dirName}`;
  return { taskName: TASK_NAME, baseDir, dirName, profileDir, url, chromePath };
}

export function buildChromeArgs({ chromePath, profileDir, url }) {
  return [
    chromePath,
    `--user-data-dir=${profileDir}`,
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    url,
  ];
}

export function buildTaskAction({ chromePath, profileDir, url }) {
  return {
    command: chromePath,
    // Quoted so the long OAuth URL (with & and %) survives CMD parsing.
    arguments:
      `--user-data-dir="${profileDir}" --new-window "${url}"` +
      ` --no-first-run --no-default-browser-check`,
  };
}

export function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Fail-closed validation for the authorize URL captured from
// `copilot login --web-flow` output. The URL must be a single-line
// https://github.com/login/oauth/authorize URL carrying every parameter
// GitHub's OAuth flow requires. A truncated, wrapped, or ANSI-polluted
// capture must never reach the scheduled task: launching Chrome with a
// malformed authorize URL produces GitHub's generic error page instead
// of the login form, which is indistinguishable from a real failure.
const REQUIRED_OAUTH_PARAMS = [
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
];

export function validateAuthorizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return { ok: false, reason: 'empty or non-string url' };
  }
  // Single line, no control characters, no ANSI escape sequences.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(url) || url.includes('\u001b')) {
    return { ok: false, reason: 'url contains control characters or ANSI escapes' };
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: 'url does not parse' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'url is not https' };
  }
  if (parsed.hostname !== 'github.com') {
    return { ok: false, reason: 'url host is not github.com' };
  }
  if (parsed.pathname !== '/login/oauth/authorize') {
    return { ok: false, reason: 'url path is not /login/oauth/authorize' };
  }
  for (const param of REQUIRED_OAUTH_PARAMS) {
    const value = parsed.searchParams.get(param);
    if (!value) {
      return { ok: false, reason: `missing required oauth param: ${param}` };
    }
  }
  return { ok: true };
}

// One-shot on-demand task. No triggers: it only ever runs via
// Start-ScheduledTask from authorize.sh, then gets unregistered.
export function buildTaskXml({ taskName, chromePath, profileDir, url }) {
  const { command, arguments: args } = buildTaskAction({
    chromePath,
    profileDir,
    url,
  });
  return (
    `<?xml version="1.0" encoding="UTF-16"?>\n` +
    `<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">\n` +
    `  <RegistrationInfo>\n` +
    `    <Description>Pigi one-shot fresh Chrome for Copilot OAuth. Created and deleted by copilot-broker authorize.sh; never touches everyday profiles.</Description>\n` +
    `  </RegistrationInfo>\n` +
    `  <Principals>\n` +
    `    <Principal id="Author">\n` +
    `      <LogonType>InteractiveToken</LogonType>\n` +
    `    </Principal>\n` +
    `  </Principals>\n` +
    `  <Settings>\n` +
    `    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>\n` +
    `    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>\n` +
    `    <ExecutionTimeLimit>PT10M</ExecutionTimeLimit>\n` +
    `    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>\n` +
    `  </Settings>\n` +
    `  <Actions Context="Author">\n` +
    `    <Exec>\n` +
    `      <Command>${xmlEscape(command)}</Command>\n` +
    `      <Arguments>${xmlEscape(args)}</Arguments>\n` +
    `    </Exec>\n` +
    `  </Actions>\n` +
    `</Task>`
  );
}

// Deletion guard: true ONLY for a session dir directly inside the session
// base carrying the session prefix. Everything else (base itself, deeper
// nesting, foreign prefixes, protected everyday profiles) is refused.
export function isDeletableDir(profileDir, baseDir) {
  if (typeof profileDir !== 'string' || typeof baseDir !== 'string') return false;
  const norm = (p) => p.replace(/\//g, '\\').replace(/\\+$/, '');
  const dir = norm(profileDir);
  const base = norm(baseDir);
  if (base.length === 0 || !dir.startsWith(base + '\\')) return false;
  const leaf = dir.slice(base.length + 1);
  if (leaf.length === 0 || leaf.includes('\\')) return false;
  if (!leaf.startsWith(SESSION_DIR_PREFIX)) return false;
  const lower = leaf.toLowerCase();
  for (const name of PROTECTED_PROFILE_NAMES) {
    if (lower === name.toLowerCase()) return false;
  }
  return true;
}

// Process-list matcher: keeps only processes whose command line carries the
// session marker (dirName, e.g. "oauth-fresh-169...-ab12cd"). The marker can
// never collide with an everyday profile because none contains the prefix.
export function matchSessionProcesses(processes, dirName) {
  if (!Array.isArray(processes) || typeof dirName !== 'string' || dirName === '') {
    return [];
  }
  return processes.filter(
    (p) =>
      p &&
      typeof p.commandLine === 'string' &&
      p.commandLine.includes(dirName),
  );
}
