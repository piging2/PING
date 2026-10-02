// GENERATED from schemas.canonical.json. Do not hand-edit.
function validate(def, record, resourceId) {
  const findings = [];
  const known = new Set(def.schema.fields.map(f => f.name));
  for (const f of def.schema.fields) {
    const raw = f.name === 'title' ? record.title
      : f.name === 'description' ? record.description
      : record.fields[f.name];
    if (raw === undefined || raw === null || raw === '') {
      if (f.required) findings.push({ severity: 'error', authority: 'lane-e.spike.validator', resourceId, path: 'object.' + f.name, message: `Required field '${f.name}' is missing.` });
      continue;
    }
    const ok = f.type === 'string' ? typeof raw === 'string'
      : f.type === 'string[]' ? (Array.isArray(raw) && raw.every(e => typeof e === 'string'))
      : typeof raw === 'string';
    if (!ok) findings.push({ severity: 'error', authority: 'lane-e.spike.validator', resourceId, path: 'object.' + f.name, message: `Field '${f.name}' must be ${f.type} (evolution law: types never change).` });
    if (f.type === 'url' && typeof raw === 'string' && !/^https?:\/\//.test(raw) && !raw.startsWith('/'))
      findings.push({ severity: 'warning', authority: 'lane-e.spike.validator', resourceId, path: 'object.' + f.name, message: `Field '${f.name}' does not look like a URL.` });
  }
  for (const key of Object.keys(record.fields)) {
    if (!known.has(key)) findings.push({ severity: 'info', authority: 'lane-e.spike.validator', resourceId, path: 'object.fields.' + key, message: `Unknown field '${key}' tolerated and passed through.` });
  }
  return findings;
}
module.exports = { validate };
