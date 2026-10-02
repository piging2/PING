#!/usr/bin/env node
/**
 * migration-trigger-gate.js: Lane C migration/trigger compatibility gate.
 *
 * Closes the FL-20260919-ORACLE-008 defect class: a startup migration that
 * passed the closure certifier (membership only) and the executable smoke
 * test (no Postgres, degraded path skips the spine) then failed on Oracle
 * because the target database enforces an append-only trigger that rejects
 * the migration's UPDATE.
 *
 * What this gate does (static portion, runnable now):
 *   1. Extracts SQL statements from the declared startup-migration sources
 *      (JS template literals passed to pool.query / .sql files).
 *   2. Classifies each statement TRIGGER_SAFE or TRIGGER_SUSPECT against the
 *      target's trigger policy document (the Oracle enforcement boundary,
 *      which exists in no repository; the policy doc is the checked-in,
 *      operator-maintained mirror of it).
 *   3. FAILS promotion on any TRIGGER_SUSPECT statement: an UPDATE or DELETE
 *      against a table the target declares append-only.
 *
 * What this gate does NOT do (fixture portion, BLOCKED until Lane A lands):
 *   executing the migrations against a trigger-enforcing fixture database.
 *   That is Lane A's fixture gate. This gate consumes its result via
 *   --fixture-result and verifies the contract in
 *   MIGRATION-TRIGGER-FIXTURE-INTERFACE.md. With no fixture result, the
 *   execution portion reports BLOCKED (exit 3), never PASS.
 *
 * Usage:
 *   node migration-trigger-gate.js --root <repoRoot>
 *       --migrations <csv repo-relative files>
 *       --trigger-policy <json>
 *       [--fixture-result <json>] [--json-out <path>]
 *
 * Exit: 0 PASS (static clean AND fixture PASS)
 *       1 FAIL (TRIGGER_SUSPECT found, or fixture verdict FAIL)
 *       2 usage/tool error
 *       3 BLOCKED (static clean but no fixture evidence; execution unevaluated)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function fail2(msg) {
  process.stderr.write('migration-trigger-gate: ' + msg + '\n');
  process.exit(2);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

// Extract candidate SQL text from a migration source file.
// .sql files: whole file. .js files: template literals passed to *.query(`...`).
function extractSqlTexts(absPath) {
  const ext = path.extname(absPath);
  const text = fs.readFileSync(absPath, 'utf8');
  if (ext === '.sql') return [{ sql: text, origin: 'file' }];
  const out = [];
  const re = /\.\s*query\s*\(\s*`([\s\S]*?)`\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push({ sql: m[1], origin: 'pool.query literal' });
  return out;
}

// Naive statement splitter: split on semicolons outside single-quoted strings
// and dollar-quoted bodies. Documented limitation: good enough for migration
// DDL/DML scanning; the fixture execution (Lane A) is the semantic check.
function splitStatements(sql) {
  const stmts = [];
  let cur = '';
  let i = 0;
  let inStr = false;
  let dollarTag = null;
  while (i < sql.length) {
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) { cur += dollarTag; i += dollarTag.length; dollarTag = null; }
      else { cur += sql[i]; i++; }
      continue;
    }
    const ch = sql[i];
    if (inStr) {
      cur += ch;
      if (ch === "'" && sql[i + 1] !== "'") inStr = false;
      else if (ch === "'" && sql[i + 1] === "'") { cur += "'"; i++; }
      i++;
      continue;
    }
    if (ch === "'") { inStr = true; cur += ch; i++; continue; }
    if (ch === '-' && sql[i + 1] === '-') { // line comment
      const nl = sql.indexOf('\n', i);
      i = nl === -1 ? sql.length : nl;
      continue;
    }
    const dm = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
    if (dm) { dollarTag = dm[0]; cur += dollarTag; i += dollarTag.length; continue; }
    if (ch === ';') { stmts.push(cur); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.trim()) stmts.push(cur);
  return stmts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function firstKeyword(stmt) {
  const m = /^\s*(?:\(\s*)*([A-Za-z]+)/.exec(stmt);
  return m ? m[1].toUpperCase() : '';
}

function targetTable(stmt, keyword) {
  let m = null;
  if (keyword === 'UPDATE') m = /^\s*UPDATE\s+([A-Za-z_][\w.]*)/i.exec(stmt);
  else if (keyword === 'DELETE') m = /^\s*DELETE\s+FROM\s+([A-Za-z_][\w.]*)/i.exec(stmt);
  else if (keyword === 'INSERT') m = /^\s*INSERT\s+INTO\s+([A-Za-z_][\w.]*)/i.exec(stmt);
  if (!m) return null;
  return m[1].split('.').pop().toLowerCase();
}

function main() {
  const args = parseArgs(process.argv);
  const root = args.root;
  const migrations = (args.migrations || '').split(',').map((s) => s.trim()).filter(Boolean);
  const policyPath = args['trigger-policy'];
  if (!root || !migrations.length || !policyPath) {
    fail2('usage: --root <dir> --migrations <csv rel files> --trigger-policy <json> [--fixture-result <json>] [--json-out <path>]');
  }
  const absRoot = path.resolve(root);
  let policy;
  try {
    policy = JSON.parse(fs.readFileSync(path.resolve(policyPath), 'utf8'));
  } catch (e) {
    fail2('cannot read trigger policy: ' + e.message);
  }
  const policyDigest = sha256(fs.readFileSync(path.resolve(policyPath), 'utf8'));
  const tables = (policy && policy.tables) || {};

  const defects = [];
  const statements = []; // { file, origin, keyword, table, statementDigest, verdict }
  for (const rel of migrations) {
    const abs = path.join(absRoot, rel);
    if (!fs.existsSync(abs)) {
      defects.push({ type: 'MIGRATION_SOURCE_MISSING', file: rel, detail: 'declared migration source not present in root' });
      continue;
    }
    let texts;
    try {
      texts = extractSqlTexts(abs);
    } catch (e) {
      defects.push({ type: 'MIGRATION_READ_ERROR', file: rel, detail: e.message });
      continue;
    }
    if (texts.length === 0) {
      statements.push({ file: rel, origin: 'none', keyword: null, table: null, statementDigest: null, verdict: 'NO_SQL_EXTRACTED' });
    }
    for (const t of texts) {
      for (const stmt of splitStatements(t.sql)) {
        const keyword = firstKeyword(stmt);
        const table = targetTable(stmt, keyword);
        const rec = {
          file: rel,
          origin: t.origin,
          keyword,
          table,
          statementDigest: sha256(stmt),
          verdict: 'TRIGGER_SAFE',
        };
        if ((keyword === 'UPDATE' || keyword === 'DELETE') && table && tables[table]) {
          const rejects = tables[table].reject || [];
          if (rejects.includes(keyword)) {
            rec.verdict = 'TRIGGER_SUSPECT';
            defects.push({
              type: 'TRIGGER_SUSPECT',
              file: rel,
              keyword,
              table,
              statementDigest: rec.statementDigest,
              detail: keyword + ' on ' + table + ' which the trigger policy declares append-only (rejects ' + rejects.join('/') + ')',
              statementPreview: stmt.replace(/\s+/g, ' ').slice(0, 220),
            });
          }
        }
        statements.push(rec);
      }
    }
  }

  // Fixture execution portion (Lane A). Absent result => BLOCKED, never PASS.
  let fixture = { status: 'BLOCKED', detail: 'no --fixture-result supplied; Lane A fixture gate has not landed' };
  if (args['fixture-result']) {
    let fr;
    try {
      fr = JSON.parse(fs.readFileSync(path.resolve(args['fixture-result']), 'utf8'));
    } catch (e) {
      fail2('cannot read fixture result: ' + e.message);
    }
    const contractOk = fr && fr.tool === 'migration-trigger-fixture' && fr.version === '1'
      && Array.isArray(fr.migrations) && typeof fr.verdict === 'string';
    if (!contractOk) {
      defects.push({ type: 'FIXTURE_CONTRACT_VIOLATION', detail: 'fixture result does not match MIGRATION-TRIGGER-FIXTURE-INTERFACE.md v1' });
      fixture = { status: 'FAIL', detail: 'contract violation' };
    } else {
      const policyMatch = fr.triggerPolicyDigest === policyDigest;
      const failed = fr.migrations.filter((m) => m.result === 'FAIL');
      if (fr.verdict === 'PASS' && failed.length === 0) {
        fixture = {
          status: policyMatch ? 'PASS' : 'PASS_POLICY_MISMATCH',
          detail: policyMatch
            ? 'fixture PASS against the same trigger policy'
            : 'fixture PASS but triggerPolicyDigest differs from the policy used here; re-run fixture',
          migrations: fr.migrations.length,
        };
        if (!policyMatch) {
          defects.push({ type: 'FIXTURE_POLICY_MISMATCH', detail: 'fixture ran against a different trigger policy digest' });
        }
      } else {
        fixture = { status: 'FAIL', detail: 'fixture verdict=' + fr.verdict + '; failed migrations: ' + failed.map((m) => m.id).join(', ') };
        defects.push({ type: 'FIXTURE_MIGRATION_FAILED', detail: fixture.detail });
      }
    }
  }

  const staticClean = defects.filter((d) => d.type === 'TRIGGER_SUSPECT' || d.type === 'MIGRATION_SOURCE_MISSING').length === 0;
  const failed = defects.length > 0;
  const blocked = !failed && fixture.status === 'BLOCKED';

  const report = {
    tool: 'migration-trigger-gate',
    root: absRoot,
    migrations,
    triggerPolicy: path.resolve(policyPath),
    triggerPolicyDigest: policyDigest,
    statementCount: statements.length,
    statements,
    fixture,
    defects,
    certified: !failed && !blocked,
    blocked,
  };
  if (args['json-out']) fs.writeFileSync(path.resolve(args['json-out']), JSON.stringify(report, null, 2) + '\n');

  const lines = [];
  lines.push('migration-trigger-gate: ' + migrations.length + ' migration source(s), ' + statements.length + ' statement(s) scanned');
  const suspects = statements.filter((s) => s.verdict === 'TRIGGER_SUSPECT');
  lines.push('  TRIGGER_SUSPECT=' + suspects.length + ' TRIGGER_SAFE=' + (statements.length - suspects.length));
  for (const d of defects) lines.push('  DEFECT [' + d.type + '] ' + (d.file ? d.file + ' ' : '') + d.detail);
  lines.push('  fixture: ' + fixture.status + ' - ' + fixture.detail);
  lines.push(failed ? 'FAILED: migration/trigger incompatibility' : (blocked ? 'BLOCKED: fixture execution unevaluated' : 'PASS: migrations trigger-compatible and fixture-verified'));
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(failed ? 1 : (blocked ? 3 : 0));
}

main();
