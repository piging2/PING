const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const GATES = {
  no_direct_date: {
    name: 'No Direct Date.now()',
    severity: 'blocking',
    check: (fileContent) => !/(?<!constitutionalTimeAuthority\.)Date\.now\(\)|new Date\(\)\.toISOString/.test(fileContent),
    hint: 'Use constitutionalTimeAuthority.nowAsMillis() or .nowAsISOString()'
  },

  no_direct_crypto_hash: {
    name: 'No Direct crypto.createHash',
    severity: 'blocking',
    check: (fileContent, filePath) => {
      if (filePath.includes('canonical_authority')) return true;
      return !/crypto\.createHash/.test(fileContent);
    },
    hint: 'Use CanonicalAuthority.hash()'
  },

  no_math_random: {
    name: 'No Math.random() for ID generation',
    severity: 'blocking',
    check: (fileContent) => !/Math\.random\(\)/.test(fileContent),
    hint: 'Use RuntimeIdentityAuthority'
  },

  no_json_parse_stringify_deepclone: {
    name: 'No JSON.parse(JSON.stringify(...)) deep clones',
    severity: 'warning',
    check: (fileContent) => !/JSON\.parse\(JSON\.stringify/.test(fileContent),
    hint: 'Use CanonicalBytes.serialize()/deserialize() or Object.assign()'
  },

  no_subprocess_bypass: {
    name: 'No direct child_process bypass',
    severity: 'blocking',
    check: (fileContent, filePath) => {
      if (filePath.includes('verify') || filePath.includes('orchestration')) return true;
      return !/require\(['"]child_process['"]\)/.test(fileContent);
    },
    hint: 'Route through ExecutionAuthority'
  },

  imports_exist: {
    name: 'All require() targets exist',
    severity: 'blocking',
    check: (fileContent, filePath, allFiles) => {
      const requires = [...fileContent.matchAll(/require\(['"](\.[^'"]+)['"]\)/g)].map(m => m[1]);
      const dir = path.dirname(filePath);
      for (const req of requires) {
        const resolved = path.resolve(dir, req);
        if (!fs.existsSync(resolved) && !fs.existsSync(resolved + '.js')) {
          return false;
        }
      }
      return true;
    },
    hint: 'Missing dependency — file does not exist'
  },

  no_console_log: {
    name: 'No console.log in production code',
    severity: 'warning',
    check: (fileContent, filePath) => {
      if (filePath.includes('verify') || filePath.includes('orchestration') || filePath.includes('server')) return true;
      return !/console\.(log|warn|error)\(/.test(fileContent);
    },
    hint: 'Use structured logging authority'
  }
};

class MergeGate {
  constructor() {
    this._results = [];
  }

  validateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ROOT, filePath);

    for (const [id, gate] of Object.entries(GATES)) {
      try {
        const passed = gate.check(content, relativePath, []);
        if (!passed) {
          this._results.push({
            gate: id,
            name: gate.name,
            severity: gate.severity,
            file: relativePath,
            passed: false,
            hint: gate.hint
          });
        }
      } catch (err) {
        this._results.push({
          gate: id,
          name: gate.name,
          severity: gate.severity,
          file: relativePath,
          passed: false,
          error: err.message
        });
      }
    }
  }

  validateGitDiff() {
    try {
      const diff = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
      if (!diff) return [];

      const files = diff.split('\n').filter(f => f.endsWith('.js') && !f.includes('node_modules'));
      for (const file of files) {
        const fullPath = path.join(ROOT, file);
        if (fs.existsSync(fullPath)) {
          this.validateFile(fullPath);
        }
      }
      return files;
    } catch (err) {
      this._results.push({
        gate: 'git_diff',
        name: 'Git diff scan',
        severity: 'warning',
        file: 'N/A',
        passed: false,
        error: err.message
      });
      return [];
    }
  }

  summary() {
    const total = this._results.length;
    const blocked = this._results.filter(r => r.severity === 'blocking' && !r.passed);
    const warnings = this._results.filter(r => r.severity === 'warning' && !r.passed);
    const passed = this._results.filter(r => r.passed);

    return {
      total,
      blocking: blocked.length,
      warnings: warnings.length,
      passed: passed.length,
      failed: this._results.filter(r => !r.passed).map(r => ({
        gate: r.gate,
        file: r.file,
        severity: r.severity,
        hint: r.hint || r.error
      })),
      can_commit: blocked.length === 0
    };
  }

  clear() {
    this._results = [];
  }
}

function main() {
  const gate = new MergeGate();
  const files = gate.validateGitDiff();

  if (files.length === 0) {
    console.log('No changed files to validate.');
    return;
  }

  console.log(`Validating ${files.length} changed files against ${Object.keys(GATES).length} constitutional gates...\n`);

  const report = gate.summary();

  for (const fail of report.failed) {
    const icon = fail.severity === 'blocking' ? '❌' : '⚠️';
    console.log(`${icon} [${fail.severity}] ${fail.gate}: ${fail.file}`);
    console.log(`   ${fail.hint}`);
  }

  console.log(`\nResults: ${report.passed} passed, ${report.blocking} blocking, ${report.warnings} warnings`);

  if (!report.can_commit) {
    console.log('\n❌ MERGE GATE BLOCKED — resolve blocking violations before commit');
    process.exit(1);
  } else {
    console.log('\n✅ MERGE GATE PASSED');
  }
}

if (require.main === module) {
  main();
}

module.exports = { MergeGate, GATES };

