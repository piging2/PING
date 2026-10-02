// Minimal jest shim to execute the substrate structural test.
const failures = [];
let testCount = 0;
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}
global.describe = (name, fn) => { console.log('describe:', name); fn(); };
global.test = (name, fn) => {
  testCount++;
  try { fn(); console.log('  PASS', name); }
  catch (e) { failures.push(name + ': ' + e.message); console.log('  FAIL', name, '-', e.message); }
};
global.expect = (actual) => {
  const api = {
    toBe: (exp) => { if (actual !== exp) throw new Error(`expected ${JSON.stringify(exp)}, got ${JSON.stringify(actual)}`); },
    toEqual: (exp) => { if (!deepEqual(actual, exp)) throw new Error(`not deep-equal: ${JSON.stringify(actual)} vs ${JSON.stringify(exp)}`); },
    toContain: (item) => {
      const ok = Array.isArray(actual) ? actual.includes(item) : (actual instanceof Set ? actual.has(item) : String(actual).includes(item));
      if (!ok) throw new Error(`expected container to hold ${JSON.stringify(item)}`);
    },
    toMatch: (re) => { if (!re.test(String(actual))) throw new Error(`expected ${JSON.stringify(String(actual))} to match ${re}`); },
    toBeDefined: () => { if (actual === undefined) throw new Error('expected defined, got undefined'); },
    toBeGreaterThan: (n) => { if (!(actual > n)) throw new Error(`expected > ${n}, got ${actual}`); },
  };
  api.not = {
    toBe: (exp) => { if (actual === exp) throw new Error(`expected not ${JSON.stringify(exp)}`); },
  };
  return api;
};
require('./out/__tests__/gateway-bootstrap-substrate.test.js');
console.log(`\n${testCount - failures.length}/${testCount} tests passed`);
if (failures.length) { console.log('FAILURES:', failures); process.exit(1); }
