'use strict';
// LANE-D TEST-ONLY executor: performs the single physical effect (append one
// line to the marker file), then hangs MID-FLIGHT (never completes, never
// writes a rendezvous). The controller SIGKILLs this process mid-flight,
// after the effect boundary has been crossed.
const fs = require('fs');
const marker = process.argv[2];
fs.appendFileSync(marker, 'effect ' + new Date().toISOString() + ' pid=' + process.pid + '\n');
setInterval(() => {}, 1000); // hang mid-flight
