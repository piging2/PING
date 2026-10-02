// registry-scan.js: check which of the six event types are in the governance policy registry
const fs = require('fs');
const path = require('path');
const root = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const reg = JSON.parse(fs.readFileSync(path.join(root, 'gateway/generated/event_registry.json'), 'utf8'));
console.log('top-level keys:', Object.keys(reg).join(','));
const events = reg.events || reg.event_types || [];
console.log('event count:', events.length);
if (events.length > 0) console.log('first event keys:', Object.keys(events[0]).join(','));
const types = events.map(e => e.event_type);
const targets = ['review.flagged','project.artifact_added','CUSTOMER_IMPORTED','CUSTOMER_EMAIL_SYNCED','CUSTOMER_CALENDAR_SYNCED','AI_WORKSPACE_RESULT_CREATED'];
for (const t of targets) {
  const idx = types.indexOf(t);
  if (idx >= 0) {
    const e = events[idx];
    console.log('REGISTERED:', t, '| owner:', e.authority_owner, '| class:', e.event_class, '| source:', e.source);
  } else {
    console.log('NOT REGISTERED:', t);
  }
}
// also show what customer/review/project/ai types ARE registered
console.log('--- registered types with customer/review/project/ai-ish names ---');
for (const e of events) {
  const n = e.event_type.toLowerCase();
  if (n.includes('customer') || n.includes('review') || n.includes('project') || n.includes('artifact') || n.includes('ai_') || n.startsWith('ai.')) {
    console.log(' ', e.event_type, '| owner:', e.authority_owner, '| class:', e.event_class, '| source:', e.source);
  }
}
