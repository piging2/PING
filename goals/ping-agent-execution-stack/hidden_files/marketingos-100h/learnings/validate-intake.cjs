'use strict';
/* MarketingOS 100h, block 80-100: outcome-intake validator.
 * Zero dependencies. Returns 0 when every record in the file is valid,
 * 1 otherwise, with the failures printed. Used for the dry run only:
 * fixtures are synthetic and never journaled as real outcomes.
 */
const fs = require('fs');

const SCHEMA = JSON.parse(fs.readFileSync(
  require('path').join(__dirname, 'outcome-intake-schema.json'), 'utf8'));

const CLASSES = SCHEMA.properties.outcome_class.enum;
const CAUSALITY = SCHEMA.properties.causality.enum;

function fail(path, msg) { return `${path}: ${msg}`; }

function validate(rec) {
  const errs = [];
  for (const f of SCHEMA.required) {
    if (rec[f] === undefined || rec[f] === null || rec[f] === '') errs.push(fail(f, 'missing required field'));
  }
  if (rec.outcome_class && !CLASSES.includes(rec.outcome_class))
    errs.push(fail('outcome_class', `must be one of ${CLASSES.join(' | ')}`));
  if (rec.causality && !CAUSALITY.includes(rec.causality))
    errs.push(fail('causality', `must be one of ${CAUSALITY.join(' | ')}`));
  if (rec.causality === 'correlated' && (!rec.confounders || rec.confounders.length === 0))
    errs.push(fail('confounders', 'required when causality=correlated'));
  if (rec.window && (!rec.window.window_start || !rec.window.window_end))
    errs.push(fail('window', 'window_start and window_end required'));
  if (rec.window && rec.window.window_start && rec.window.window_end &&
      rec.window.window_end <= rec.window.window_start)
    errs.push(fail('window', 'window_end must be after window_start'));
  for (const dt of ['observed_at']) {
    if (rec[dt] && isNaN(Date.parse(rec[dt]))) errs.push(fail(dt, 'not a valid date-time'));
  }
  return errs;
}

function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: validate-intake.cjs <file.json>'); process.exit(2); }
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(records) ? records : [records];
  let bad = 0;
  list.forEach((rec, i) => {
    const errs = validate(rec);
    if (errs.length) {
      bad++;
      console.log(`record ${i} (${rec.observation_id || 'no-id'}) INVALID:`);
      errs.forEach((e) => console.log('  - ' + e));
    }
  });
  if (bad) { console.log(`${bad}/${list.length} INVALID`); process.exit(1); }
  console.log(`${list.length}/${list.length} VALID`);
}

main();
