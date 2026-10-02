// TEST SCAFFOLDING STUB — not repo code.
// The real ping-runtime/authorities/constitutional_time_authority.js delegates
// to runtime/kernel/authorities/constitutional_time_authority (deep kernel
// dependency). The falsifier proof only needs the clock surface the scheduler
// actually calls: constitutionalTimeAuthority.nowAsISOString().
class ConstitutionalTimeAuthority {
  nowAsISOString() { return new Date().toISOString(); }
}
const constitutionalTimeAuthority = new ConstitutionalTimeAuthority();
module.exports = { ConstitutionalTimeAuthority, constitutionalTimeAuthority };
