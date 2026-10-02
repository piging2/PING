'use strict';
/**
 * Lane F harness — evidence-bundle writer.
 *
 * Output contract per case (per the design):
 *   <out>/<case>/<mission_id>/evidence.jsonl   (the recorded events)
 *   <out>/<case>/<mission_id>/projection.json  (projector output)
 *   <out>/<case>/<mission_id>/verdict.json     (PASS/FAIL + hop checks)
 * plus any extra per-case artifacts (receipts, outcomes, parity files).
 */
const fs = require('fs');
const path = require('path');

function writeJson(dir, name, obj) {
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
  return p;
}

class Bundle {
  constructor(outRoot, caseName, missionId) {
    this.dir = path.join(outRoot, caseName, missionId);
    fs.mkdirSync(this.dir, { recursive: true });
    this.checks = [];
  }
  check(name, pass, detail) {
    this.checks.push({ name, pass: !!pass, detail: detail === undefined ? null : detail });
    return !!pass;
  }
  write(name, obj) { return writeJson(this.dir, name, obj); }
  writeText(name, text) {
    fs.mkdirSync(this.dir, { recursive: true });
    const p = path.join(this.dir, name);
    fs.writeFileSync(p, text, 'utf8');
    return p;
  }
  verdict(extra = {}) {
    const failed = this.checks.filter((c) => !c.pass);
    const verdict = {
      case: path.basename(path.dirname(this.dir)),
      mission_id: path.basename(this.dir),
      verdict: failed.length === 0 ? 'PASS' : 'FAIL',
      checks_run: this.checks.length,
      checks_failed: failed.length,
      failed_checks: failed.map((c) => c.name),
      checks: this.checks,
      ...extra,
    };
    writeJson(this.dir, 'verdict.json', verdict);
    return verdict;
  }
}

module.exports = { Bundle, writeJson };
