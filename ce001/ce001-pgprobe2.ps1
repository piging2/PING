# ce001-pgprobe2.ps1 - PG probe with absolute pg require
$ErrorActionPreference = 'Continue'
$SCRATCH = 'C:\Users\nolan\ce001-scratch'
$NODE = 'C:\Users\nolan\.local\share\pigi\node-v22.23.2-win-x64\node.exe'
$PGMOD = 'C:/Users/nolan/PING/gateway/node_modules/pg'

$probe = @"
const { Pool } = require('$PGMOD');
(async () => {
  for (const port of [5432, 15444]) {
    const p = new Pool({ host: '127.0.0.1', port, database: 'postgres', user: 'postgres', password: 'postgres', connectionTimeoutMillis: 4000 });
    try { await p.query('select 1'); console.log('port ' + port + ': CONNECTED'); }
    catch (e) { console.log('port ' + port + ': ' + e.message.split('\n')[0]); }
    await p.end();
  }
  process.exit(0);
})();
"@
$probe | Out-File -Encoding utf8 (Join-Path $SCRATCH 'pgprobe2.js')
& $NODE (Join-Path $SCRATCH 'pgprobe2.js')
