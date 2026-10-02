const m1 = require('/home/nolan/worktrees/constitutional-convergence/ping-runtime/agents/agent_memory_authority.js');
const m2 = require('/home/nolan/worktrees/constitutional-convergence/ping-runtime/agents/distributed_desktop_agents.js');
const m3 = require('/home/nolan/worktrees/constitutional-convergence/gateway/constitution_version_authority.js');
const tryNew = (label, fn) => {
  try {
    const o = fn();
    const aid = (o && typeof o.getAuthorityId === 'function') ? o.getAuthorityId() : 'no-getter';
    console.log('INSTANTIATED OK:', label, '| authorityId:', aid);
  } catch (e) {
    console.log('INSTANTIATE FAIL:', label, '-', String(e.message).split('\n')[0]);
  }
};
console.log('exports m1:', Object.keys(m1).join(','));
console.log('exports m2:', Object.keys(m2).join(','));
console.log('exports m3:', Object.keys(m3).join(','));
for (const [label, mod, name] of [['AgentMemoryAuthority', m1, 'AgentMemoryAuthority'], ['DistributedDesktopAgents', m2, 'DistributedDesktopAgents'], ['ConstitutionVersionAuthority', m3, 'ConstitutionVersionAuthority']]) {
  if (mod[name]) tryNew(label, () => new mod[name]());
}
