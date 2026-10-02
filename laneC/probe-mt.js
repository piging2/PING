const r = require('/tmp/release-cert-test/migration-trigger.json');
console.log('defects:', JSON.stringify(r.defects, null, 1).slice(0, 800));
console.log('fixture status:', r.fixture.status);
console.log('suspects:', r.statements.filter(s => s.verdict === 'TRIGGER_SUSPECT').length);
console.log('total statements:', r.statements.length);
const uer = r.statements.filter(s => s.file.indexOf('unified_event_runtime') !== -1);
console.log('uer statements:', uer.length);
console.log('uer keywords:', JSON.stringify(uer.map(s => s.keyword)));
