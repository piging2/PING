// Assertion engine: compare a harness run report against fixture.expect.
// Returns {pass, failures[]}. Only keys declared in expect are checked,
// EXCEPT the lab invariants (checkInvariants), which apply to EVERY run
// regardless of what expect declares. An expect block that omits an
// invariant does not waive it: that is how a fixture "passing while hiding
// a duplicate write" is defeated (see lab/redteam/ case 2).

export function assertReport(expect, report) {
  const failures = [];
  const check = (name, actual, expected) => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) failures.push(`${name}: expected ${e}, got ${a}`);
  };
  for (const [key, expected] of Object.entries(expect || {})) {
    switch (key) {
      case 'recordsEmitted':
      case 'uniqueRecords':
      case 'duplicatesAbsorbed':
      case 'quarantined':
      case 'schemaViolationsQuarantined':
      case 'signatureFailures':
      case 'maxAttemptsPerStep':
      case 'noDuplicateKnowledge':
        break; // handled below
      default:
        check(key, report[key], expected);
    }
  }
  if (expect.recordsEmitted !== undefined) check('recordsEmitted', report.recordsEmitted, expect.recordsEmitted);
  if (expect.uniqueRecords !== undefined) check('uniqueRecords', report.uniqueRecords, expect.uniqueRecords);
  if (expect.duplicatesAbsorbed !== undefined) check('duplicatesAbsorbed', report.duplicatesAbsorbed, expect.duplicatesAbsorbed);
  if (expect.schemaViolationsQuarantined !== undefined) check('schemaViolationsQuarantined', report.schemaViolationsQuarantined, expect.schemaViolationsQuarantined);
  if (expect.signatureFailures !== undefined) check('signatureFailures', report.signatureFailures, expect.signatureFailures);
  if (expect.maxAttemptsPerStep !== undefined) {
    const maxAttempts = Math.max(0, ...report.attempts.map(a => a.attempt || 0));
    check('maxAttemptsPerStep', maxAttempts, expect.maxAttemptsPerStep);
  }
  if (expect.noDuplicateKnowledge) {
    const keys = report.idempotencyKeys || [];
    check('noDuplicateKnowledge', new Set(keys).size, keys.length);
  }
  return { pass: failures.length === 0, failures };
}

// Lab invariants: hold for every run, declared or not.
export function checkInvariants(report) {
  const violations = [];
  const keys = report.idempotencyKeys || [];
  if (new Set(keys).size !== keys.length) {
    violations.push(`invariant: duplicate idempotency keys emitted (${keys.length - new Set(keys).size} duplicates)`);
  }
  if (report.terminalState === 'STARTED' || report.terminalState === 'NOT_STARTED') {
    violations.push(`invariant: harness never reached a terminal state (${report.terminalState})`);
  }
  if (report.terminalState === 'FAILED' && (!report.failureCodes || report.failureCodes.length === 0)) {
    violations.push('invariant: FAILED terminal state with no failure code (silent failure)');
  }
  if (report.recordsEmitted < 0 || report.uniqueRecords < 0) {
    violations.push('invariant: negative record counters');
  }
  if (report.uniqueRecords > report.recordsEmitted) {
    violations.push('invariant: uniqueRecords exceeds recordsEmitted');
  }
  return violations;
}
