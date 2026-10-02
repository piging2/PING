// H70 drive: verify /system/state uses the injected (H34-wired) SystemAuthority.
// Stubs express (not installed), requires the REAL route file + REAL SystemAuthority
// class, injects a mock knowledgeGraph returning a known count, and asserts the
// /state handler returns that count (not null).
const Module = require('module');
const fs = require('fs');
const path = require('path');

const REPO = '/home/nolan/worktrees/ping-harvest-12h';

// --- stub express + dockerode (neither installed in this env) ---
const recorded = {};
const fakeRouter = { get: (p, h) => { recorded[p] = h; } };
const fakeExpress = { Router: () => fakeRouter };
class FakeDocker { constructor() {} async listContainers() { return []; } }
function fakeSimpleGit() {
  return {
    getRemotes: async () => [],
    status: async () => ({ current: 'sprint/harvest-12h', modified: [], not_added: [], created: [], deleted: [], renamed: [] }),
    log: async () => ({ all: [] }),
    version: async () => '2.0.0',
    branch: async () => ({ current: 'sprint/harvest-12h' }),
  };
}
const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'express') return fakeExpress;
  if (request === 'dockerode') return FakeDocker;
  if (request === 'simple-git') return fakeSimpleGit;
  return origLoad.apply(this, arguments);
};

const createSystemRoutes = require(path.join(REPO, 'gateway/routes/system.js'));
const { SystemAuthority } = require(path.join(REPO, 'ping-runtime/runtime/system_authority.js'));

// --- build a "wired" SystemAuthority: real class, stub eventReadAuthority,
// --- mock knowledgeGraph returning a known count (mirrors gateway_runtime.js:410 + :498)
const stubEventRead = {
  getEventsByType: async () => [],
  getAllEvents: async () => [],
};
const wired = new SystemAuthority(stubEventRead, { repoRoot: REPO });
wired.knowledgeGraph = { getStats: async () => ({ nodes: 42, edges: 7 }) };

createSystemRoutes(wired);
const stateHandler = recorded['/state'];
if (!stateHandler) {
  console.error('FAIL: /state handler was not registered on the router');
  process.exit(1);
}

const req = { method: 'GET', query: {}, body: undefined };
let payload = null;
const res = { headersSent: false, json: (p) => { payload = p; } };

stateHandler(req, res, (e) => { if (e) throw e; })
  .then(() => {
    const ko = payload && payload.knowledge && payload.knowledge.knowledge_objects;
    console.log('knowledge_objects returned by /system/state handler =', ko);
    if (ko !== 42) {
      console.error('FAIL: expected knowledge_objects=42, got ' + JSON.stringify(ko));
      process.exit(1);
    }
    const src = fs.readFileSync(path.join(REPO, 'gateway/routes/system.js'), 'utf8');
    if (/new SystemAuthority/.test(src)) {
      console.error('FAIL: route file still constructs SystemAuthority internally');
      process.exit(1);
    }
    if (!/createSystemRoutes\(systemAuthority\)/.test(src)) {
      console.error('FAIL: route factory does not accept the injected systemAuthority');
      process.exit(1);
    }
    console.log('PASS: /system/state returns the wired knowledge_objects=42 (not null); no internal construction');
  })
  .catch((e) => {
    console.error('FAIL: handler threw', e);
    process.exit(1);
  });
