const { spawn } = require('child_process');
const path = require('path');

const tests = [
  'constitutional_replay.test.js',
  'cross_machine_replay.test.js',
  'multi_vendor_validation.test.js',
  'constitutional_failure.test.js'
];

async function runTests() {
  console.log('=== Running Constitutional Pipeline Tests ===\n');

  for (const test of tests) {
    console.log(`Running ${test}...`);
    const testPath = path.join(__dirname, test);
    
    await new Promise((resolve, reject) => {
      const proc = spawn('node', [testPath], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log(`✓ ${test} PASSED\n`);
          resolve();
        } else {
          console.error(`✗ ${test} FAILED\n`);
          reject(new Error(`${test} failed with exit code ${code}`));
        }
      });
    });
  }

  console.log('=== All Constitutional Pipeline Tests PASSED ===');
  process.exit(0);
}

runTests().catch(error => {
  console.error('Constitutional Pipeline Tests FAILED:', error.message);
  process.exit(1);
});
