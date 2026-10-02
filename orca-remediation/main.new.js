// ------------------------------------------------------------------- MAIN ---
// Crash-safe startup (remediation 2026-09-18):
//   1. derive + register the durable objective identity (logical intent only);
//   2. honor durable cancellation (blocks new work, survives restart);
//   3. refuse to regenerate work for a terminal objective;
//   4. claim the single-coordinator lock (second coordinator exits);
//   5. reconcile durable work orders BEFORE any new dispatch;
//   6. run the normal OBSERVE -> ... -> CLOSE flow on the reconciled state.
let lockReleased = false;
function releaseCoordinatorLock() {
  if (lockReleased || !OBJECTIVE_ID) return;
  lockReleased = true;
  try { objRuntime.releaseCoordinatorLock(DATA_ROOT, OBJECTIVE_ID); } catch (_) {}
}
process.on('exit', releaseCoordinatorLock);
process.on('SIGINT', () => { releaseCoordinatorLock(); process.exit(130); });
process.on('SIGTERM', () => { releaseCoordinatorLock(); process.exit(143); });

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  statusLedger.setDir(EVIDENCE_DIR);
  const objective = (process.argv.find(a => a.startsWith('--objective=')) || '')
    .slice('--objective='.length)
    || 'Audit the live PING mission queue: summarize backlog by status, then verify the evidence chain of the most recent completed mission.';
  const fault = (process.argv.find(a => a.startsWith('--fault=')) || '').slice('--fault='.length) || null;
  const probeProhibited = (process.argv.find(a => a.startsWith('--probe-prohibited=')) || '').slice('--probe-prohibited='.length) || null;

  // 1. Durable objective identity: logical intent only. The same objective
  // text on a restart yields the SAME objective_id; nothing here depends on
  // RUN_ID, wall clock, or PID.
  OBJECTIVE_ID = objRuntime.deriveObjectiveId({ namespace: NAMESPACE, objectiveText: objective, constraints: CONSTRAINTS });
  const objRec = objRuntime.registerObjective(DATA_ROOT, NAMESPACE, objective, { constraints: CONSTRAINTS, maxWorkOrders: MAX_WORK_ORDERS });
  save('00-objective.json', {
    objective, objective_id: OBJECTIVE_ID, runId: RUN_ID, suppliedBy: 'human-once', at: isoNow(),
    goal_id: GOAL_ID, program_id: PROGRAM_ID, data_root: DATA_ROOT,
    causal: { goal_id: GOAL_ID, program_id: PROGRAM_ID, run_id: RUN_ID, objective_id: OBJECTIVE_ID },
    faultInjection: fault,
  });
  log('START', `run ${RUN_ID}; objective ${OBJECTIVE_ID.slice(0, 12)} registered (state=${objRec.state})`);

  // 2. Durable cancellation: the operator signal is a cancel.requested file
  // in the objective dir. Cancellation blocks all new work and survives
  // restarts; it is never equated with killing a worker.
  if (fs.existsSync(objRuntime.cancelRequestPath(DATA_ROOT, OBJECTIVE_ID)) && !objRec.cancellation) {
    const cancelled = objRuntime.recordCancellation(DATA_ROOT, OBJECTIVE_ID, 'cancel.requested marker present at startup');
    save('00-cancelled.json', { at: isoNow(), runId: RUN_ID, cancellation: cancelled.cancellation });
    log('CANCEL', `objective cancelled (${cancelled.cancellation.reason}); no new work will be issued`);
  }
  const freshRec = objRuntime.loadObjective(DATA_ROOT, OBJECTIVE_ID);
  if (freshRec.cancellation) {
    log('CANCEL', `objective already cancelled at ${freshRec.cancellation.requested_at}; exiting without new work`);
    process.exit(4);
  }

  // 3. Terminal objective: never generate fresh work on restart. A genuinely
  // new budget epoch requires explicit operator intent: a new objective.
  if (freshRec.state === 'COMPLETED') {
    log('START', `objective ${OBJECTIVE_ID.slice(0, 12)} already COMPLETED; no fresh work`);
    process.exit(0);
  }

  // 4. Single-coordinator claim: exactly one live coordinator owns execution
  // for this objective. A second concurrent coordinator exits.
  const claim = objRuntime.claimCoordinatorLock(DATA_ROOT, OBJECTIVE_ID);
  if (!claim.acquired) {
    log('LOCK', `coordinator lock held by live pid ${claim.holderPid} (${claim.reason}); this process exits`);
    process.exit(5);
  }
  log('LOCK', `coordinator lock acquired (pid ${process.pid})`);

  // Test hook for prohibition enforcement: --probe-prohibited=<action> must
  // be rejected with durable evidence, or the probe fails.
  if (probeProhibited) {
    try {
      enforceProhibitions({ action: probeProhibited, briefText: '', taskKey: 'probe', tag: 'probe' });
      log('PROBE', `FAILURE: prohibited action '${probeProhibited}' was NOT rejected`);
      process.exit(1);
    } catch (err) {
      if (err instanceof Escalation) {
        log('PROBE', `prohibited action '${probeProhibited}' rejected with durable evidence (prohibition-probe.json)`);
        process.exit(0);
      }
      throw err;
    }
  }

  const pool = new PgPool({
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'ping_runtime',
    connectionTimeoutMillis: 10000,
  });
  // PING's canonical event runtime, injected into recordVerifiedResult.
  // Identity stays with UnifiedEventRuntime.computeEventId; this process mints nothing.
  const eventRuntime = new UnifiedEventRuntime({ pool });

  try {
    // 5. Startup reconciliation BEFORE any new dispatch.
    await reconcileStartup({ eventRuntime });

    const observation = await observe(pool);          // OBSERVE
    const plan = buildPlan(objective, observation, fault);   // PLAN
    const t1Brief = [
      'Summarize the live PING mission queue state for an operator, using ONLY the input data.',
      '(1) counts by status; (2) every non-terminal mission (created/retry_pending/assigned/running/failed)',
      '    with mission_id, mission_type, status, retries; (3) last-24h lifecycle event counts and whether',
      '    the pipeline looks healthy; (4) one-paragraph plain-language summary.',
      'Output: {"queue_summary": "...", "counts_by_status": {...}, "non_terminal": [...],',
      '         "pipeline_24h": "...", "health_note": "..."}',
    ].join('\n');
    const t1 = await delegate({                         // AUTHORIZE -> DELEGATE -> MONITOR -> VERIFY
      pool, eventRuntime, taskKey: plan.tasks[0].taskKey,
      capability: plan.tasks[0].capability, taskBrief: t1Brief,
      input: plan.tasks[0].input, causationId: null, tag: 't1',
    });
    const { assessment, t2 } = await assessAndFollowUp({ pool, eventRuntime, observation, t1 }); // ASSESS -> FOLLOW-UP
    const close = {
      closedAt: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, outcome: 'closed',
      workOrders: [
        { tag: 't1', work_order_id: t1.workOrder.work_order_id, event_id: t1.record.event_id, attempts: t1.attempts },
        ...(t2 ? [{ tag: 't2', work_order_id: t2.workOrder.work_order_id, event_id: t2.record.event_id, attempts: t2.attempts }] : []),
      ],
      assessment,
    };
    save('99-close.json', close);
    transition('t1', 'CLOSED', '99-close.json', { work_order_id: t1.workOrder.work_order_id });
    if (t2) transition('t2', 'CLOSED', '99-close.json', { work_order_id: t2.workOrder.work_order_id });
    // 6. Mark the objective terminal: a restart with the same objective text
    // rediscovers COMPLETED and issues no fresh work.
    objRuntime.setObjectiveState(DATA_ROOT, OBJECTIVE_ID, 'COMPLETED', { closed_at: isoNow(), close_run_id: RUN_ID });
    log('CLOSE', `run closed; ${close.workOrders.length} work order(s), events: ${close.workOrders.map(w => w.event_id).join(', ')}; objective marked COMPLETED`);
    releaseCoordinatorLock();
    await pool.end();
    process.exit(0);
  } catch (err) {
    if (err instanceof Escalation) {
      const esc = { escalatedAt: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, reason: err.message, detail: err.detail || null };
      try { save('99-escalate.json', esc); } catch (_) {}
      try {
        const tag = (err.detail && err.detail.tag) || 'run';
        const cur = statusLedger.current(tag);
        if (cur && !['FAILED', 'VERIFICATION_FAILED', 'CLOSED', 'BLOCKED'].includes(cur)) {
          transition(tag, 'BLOCKED', '99-escalate.json', { reason: err.message });
        }
      } catch (_) {}
      log('ESCALATE', err.message);
      releaseCoordinatorLock();
      await pool.end();
      process.exit(3);
    }
    try { save('99-fatal.json', { at: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, error: String(err && err.stack || err) }); } catch (_) {}
    log('FATAL', String(err && err.stack || err));
    releaseCoordinatorLock();
    await pool.end();
    process.exit(2);
  }
}
