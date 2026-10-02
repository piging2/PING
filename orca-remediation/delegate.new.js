// --------------------------------------------------------------- DELEGATE ---
// One authorized delegation: authorize -> issue -> dispatch -> monitor.
// Crash-safe (remediation 2026-09-18): the work order identity is stable
// across restarts (objective_id, task_key); the budget is durable; every
// attempt is recorded before dispatch; results rendezvous durably.
// Returns { workOrder, result, verified, record } or throws Escalation.
async function delegate({ pool, eventRuntime, taskKey, capability, taskBrief, input, causationId, tag }) {
  if (!OBJECTIVE_ID) throw new Error('delegate called before objective identity was established');
  const woId = objRuntime.deriveWorkOrderId(OBJECTIVE_ID, taskKey);
  transition(tag, 'PLANNED', '02-plan.json', { taskKey, capability, agentId: AGENT_ID, work_order_id: woId });
  log('AUTHORIZE', `${taskKey}: requesting ${capability} for ${AGENT_ID} in ${NAMESPACE} (work_order_id=${woId.slice(0, 12)}...)`);

  // Durable budget replaces the process-local counter (finding 5): a restart
  // cannot reset consumption.
  const usage = objRuntime.budgetUsage(DATA_ROOT, OBJECTIVE_ID);
  workOrdersUsed = usage.used;
  log('BUDGET', `${taskKey}: durable work-order usage ${usage.used}/${usage.limit}`);

  // Cancellation survives restarts and blocks new work. It never claims an
  // in-flight worker stopped.
  const objRec = objRuntime.loadObjective(DATA_ROOT, OBJECTIVE_ID);
  if (objRec && objRec.cancellation) {
    transition(tag, 'BLOCKED', '00-objective.json', { reason: 'objective cancelled' });
    throw new Escalation(`objective cancelled at ${objRec.cancellation.requested_at}; no new work`, { tag });
  }

  // Re-entrant: a terminal durable work order is rediscovered, never
  // regenerated. The cached accepted result is returned, not re-dispatched.
  let dwo = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId);
  if (dwo && isTerminalWorkOrder(dwo) && dwo.terminal) {
    log('RECONCILE', `${taskKey}: terminal work order rediscovered (${dwo.state}); returning accepted result, no fresh dispatch`);
    return {
      workOrder: { work_order_id: woId, attempt: dwo.terminal.attempts },
      result: dwo.terminal.envelope,
      record: { valid: true, event_id: dwo.terminal.event_id, event_type: dwo.terminal.event_type, result_id: dwo.terminal.result_id },
      attempts: dwo.terminal.attempts,
      cached: true,
    };
  }
  if (dwo && dwo.state === 'RUNNING') {
    // Startup reconciliation left this RUNNING because the dispatcher may
    // still be alive. A parallel dispatch would risk duplicate execution.
    throw new Escalation(
      `prior dispatch attempt for ${taskKey} may still be in flight (attempt ${dwo.last_attempt_id}); refusing to redispatch`,
      { tag }
    );
  }

  // Finding 10: the dead prohibitedAction() is now enforced at the real
  // dispatch boundary, before authorization becomes externally effective.
  enforceProhibitions({ action: capability, briefText: taskBrief, taskKey, tag });

  // Section 7: the loop consults the policy BEFORE the gate. The decision
  // record is persisted as evidence; the adapter remains the final fail-closed
  // gate, and a gate denial maps back to REQUIRES_HUMAN_APPROVAL (escalate),
  // never to a bypass.
  const decision = orcaPolicy.classifyDelegation({
    adapter, agentId: AGENT_ID, capability, namespace: NAMESPACE, constraints: CONSTRAINTS,
    workOrdersUsed, runBounds: { maxWorkOrders: MAX_WORK_ORDERS, maxAttempts: MAX_ATTEMPTS },
  });
  save(`policy-${tag}.json`, Object.assign({ taskKey, capability, agentId: AGENT_ID }, decision));
  log('POLICY', `${taskKey}: ${decision.decisionClass} (${decision.sourceRule})`);
  if (decision.decisionClass !== orcaPolicy.DECISION_CLASSES.AUTO_EXECUTE) {
    transition(tag, 'BLOCKED', `policy-${tag}.json`, { reason: decision.reason });
    throw new Escalation(`policy ${decision.decisionClass} for ${taskKey}: ${decision.reason}`, { tag, decision });
  }
  transition(tag, 'AUTHORIZED', `policy-${tag}.json`, { sourceRule: decision.sourceRule });
  const auth = adapter.authorizeWorkOrder({ agentId: AGENT_ID, capability, namespace: NAMESPACE, constraints: CONSTRAINTS });
  if (!auth.granted) {
    const denyDecision = orcaPolicy.escalateUndecidable(`authorization denied for ${taskKey}: ${auth.reason}`, { tag });
    save(`policy-${tag}-deny.json`, denyDecision);
    transition(tag, 'BLOCKED', `policy-${tag}-deny.json`, { reason: auth.reason });
    throw new Escalation(`authorization denied for ${taskKey}`, auth);
  }

  // Durable work-order authorization (findings 2/4): re-entrant; the same
  // (objective_id, task_key) on a restart returns the existing record.
  dwo = objRuntime.authorizeWorkOrder(DATA_ROOT, OBJECTIVE_ID, taskKey, {
    capability, agent_id: AGENT_ID, namespace: NAMESPACE,
    task_brief_sha256: crypto.createHash('sha256').update(taskBrief, 'utf8').digest('hex'),
  });
  // Durable budget reservation: idempotent per work order; a restart cannot
  // double-consume or reset the two-work-order budget (finding 5).
  const budget = objRuntime.reserveWorkOrderBudget(DATA_ROOT, OBJECTIVE_ID, woId);
  if (!budget.ok) {
    transition(tag, 'BLOCKED', `policy-${tag}.json`, { reason: budget.reason });
    throw new Escalation(`durable work-order budget exhausted (${budget.used}/${budget.limit})`, { tag, budget });
  }
  workOrdersUsed = budget.used;

  const deadline = new Date(Date.now() + WORK_ORDER_TTL_MS).toISOString();
  const workOrder = adapter.issueWorkOrder({
    agentId: AGENT_ID, capability, namespace: NAMESPACE, taskId: taskKey,
    missionId: `orca-loop:${OBJECTIVE_ID.slice(0, 12)}:${taskKey}`,
    correlationId: OBJECTIVE_ID, contextPackId: `orca-context-${OBJECTIVE_ID.slice(0, 16)}`,
    input, constraints: CONSTRAINTS,
    resultPath: objRuntime.rendezvousResultPath(DATA_ROOT, OBJECTIVE_ID, woId),
    deadline, causationId: causationId || null, attempt: 1, workOrderId: woId,
  });
  // Persist the issued fields so restart reconciliation can verify a
  // rendezvous result against the exact issued work order.
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    issued: {
      mission_id: workOrder.mission_id,
      task_id: workOrder.task_id,
      correlation_id: workOrder.correlation_id,
      context_pack_id: workOrder.context_pack_id,
      causation_id: workOrder.causation_id,
      agent_id: workOrder.agent_id,
      capability: workOrder.capability,
      namespace: workOrder.namespace,
      deadline: workOrder.deadline,
      result_path: workOrder.result_path,
    },
  });
  save(`workorder-${tag}.json`, workOrder);
  transition(tag, 'QUEUED', `workorder-${tag}.json`, { work_order_id: workOrder.work_order_id, attempt: 1 });
  log('DELEGATE', `${taskKey}: work_order_id=${workOrder.work_order_id} deadline=${deadline}`);

  for (;;) {
    const cur = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId);
    const attempt = (cur.attempt_count || 0) + 1;
    if (attempt > MAX_ATTEMPTS) {
      transition(tag, 'FAILED', `dispatch-${tag}-a${MAX_ATTEMPTS}.json`, { reason: 'retry budget exhausted' });
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
        state: 'FAILED',
        terminal: { status: 'retry-budget-exhausted', attempts: cur.attempt_count || 0, at: isoNow() },
      });
      throw new Escalation(`worker reported failure on ${taskKey} after ${MAX_ATTEMPTS} attempts`, { tag });
    }
    const attemptId = objRuntime.deriveAttemptId(woId, attempt);
    // Attempt recorded BEFORE dispatch: the crash window between "dispatched"
    // and "recorded" is closed by construction (finding 8).
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
      state: 'RUNNING',
      attempt_count: attempt,
      last_attempt_id: attemptId,
      dispatch_pid: null,
    });
    recordAttemptOutcome(woId, attemptId, { attempt_number: attempt, started_at: isoNow(), outcome: 'DISPATCHING' });

    const wo = { ...workOrder, attempt };
    const prompt = buildWorkerPrompt(wo, taskBrief);
    log('MONITOR', `${taskKey}: dispatching to ${AGENT_ID} (attempt ${attempt}, id ...${attemptId.slice(-10)}, timeout ${DISPATCH_TIMEOUT_MS}ms)`);
    const disp = await dispatchHermes(prompt, { workOrderId: woId, attemptId, tag });
    recordAttemptOutcome(woId, attemptId, {
      ended_at: disp.endedAt, exit_code: disp.exitCode, signal: disp.signal,
      timed_out: disp.timedOut, transport_error: disp.transportError,
      rendezvous_collected: disp.rendezvousCollected,
    });

    if (disp.transportError && !disp.rendezvous) {
      // The dispatcher never ran: no worker output exists, so retrying as a
      // new attempt is safe and bounded by MAX_ATTEMPTS.
      log('DISPATCH', `${taskKey}: transport failure on attempt ${attempt}: ${disp.transportError}; re-queueing within attempt budget`);
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'AUTHORIZED', dispatch_pid: null, last_attempt_id: null });
      transition(tag, 'AUTHORIZED', `dispatch-${tag}-a${attempt}.json`, { reason: `transport failure: ${disp.transportError}` });
      continue;
    }

    let result;
    let extractionNote = null;
    if (disp.timedOut) {
      result = timeoutEnvelope(wo, disp.startedAt, disp.endedAt);
      extractionNote = 'dispatcher timeout; honest failed envelope constructed by dispatcher (no success fabricated)';
    } else {
      const ext = extractEnvelope(disp.stdout);
      if (!ext.ok) {
        // No parseable envelope: worker protocol failure. Contract: validation
        // failure is non-retryable and can never reach canonical event authority.
        save(`dispatch-${tag}-a${attempt}.json`, { timedOut: false, exitCode: disp.exitCode, stderr: disp.stderr, stdoutTail: disp.stdout.slice(-2000), extraction: ext });
        recordAttemptOutcome(woId, attemptId, { outcome: 'PROTOCOL_FAILURE', reason: ext.reason });
        objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
          state: 'VERIFICATION_FAILED',
          terminal: { status: 'protocol-failure', attempts: attempt, reason: ext.reason, at: isoNow() },
        });
        throw new Escalation(`worker protocol failure on ${taskKey} (attempt ${attempt}): ${ext.reason}`, { tag, attempt });
      }
      result = ext.envelope;
      extractionNote = 'envelope extracted from rendezvous-backed worker stdout';
    }
    save(`dispatch-${tag}-a${attempt}.json`, {
      attempt, attemptId, timedOut: disp.timedOut, exitCode: disp.exitCode,
      stderr: disp.stderr, extractionNote, envelope: result,
      rendezvousCollected: disp.rendezvousCollected,
    });
    // Section 8: RUNNING (dispatched) -> EVIDENCE_PENDING (result captured,
    // awaiting verification). The capture artifact backs both transitions.
    transition(tag, 'RUNNING', `dispatch-${tag}-a${attempt}.json`, { attempt });
    transition(tag, 'EVIDENCE_PENDING', `dispatch-${tag}-a${attempt}.json`, { attempt, extractionNote });

    // Finding 11: the dead classifyResultAcceptance() now gates the exact
    // point where worker output attempts to become accepted PING state.
    gateResultAcceptance({ tag });
    const verifiedAt = isoNow();
    const record = await adapter.recordVerifiedResult({
      eventRuntime, result, workOrder: wo, invokedAgentId: AGENT_ID, verifiedAt,
    });
    save(`verify-${tag}-a${attempt}.json`, { verifiedAt, record });
    save(`result-${tag}.json`, result); // run-scoped evidence copy of the captured envelope

    if (!record.valid) {
      transition(tag, 'VERIFICATION_FAILED', `verify-${tag}-a${attempt}.json`, { reason: record.reason });
      recordAttemptOutcome(woId, attemptId, { outcome: 'VERIFICATION_FAILED', reason: record.reason });
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
        state: 'VERIFICATION_FAILED',
        terminal: { status: 'verification-failed', attempts: attempt, reason: record.reason, at: isoNow() },
      });
      throw new Escalation(`result verification failed on ${taskKey} (non-retryable): ${record.reason}`, { tag, attempt, record });
    }

    if (result.status === 'failed') {
      // Sections 7/8/9: a verified failed envelope is a FAILED unit outcome,
      // not a VERIFIED one. A granted retry is re-plan from recorded failure:
      // EVIDENCE_PENDING -> FAILED -> PLANNED -> AUTHORIZED -> QUEUED, then the
      // next attempt dispatches. VERIFIED may only CLOSE, so the failed
      // envelope must never take the VERIFIED state on the retry path.
      const retryDecision = orcaPolicy.classifyRetry({
        attempt, maxAttempts: MAX_ATTEMPTS, failureKind: disp.timedOut ? 'timeout' : 'worker-failed',
      });
      save(`policy-${tag}-retry-a${attempt}.json`, retryDecision);
      transition(tag, 'FAILED', `verify-${tag}-a${attempt}.json`, {
        reason: `worker-reported failed (attempt ${attempt}/${MAX_ATTEMPTS})`,
        event_id: record.event_id, retryDecision: retryDecision.decisionClass,
      });
      recordAttemptOutcome(woId, attemptId, { outcome: 'WORKER_FAILED', event_id: record.event_id });
      if (retryDecision.decisionClass !== orcaPolicy.DECISION_CLASSES.AUTO_EXECUTE) {
        objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
          state: 'FAILED',
          terminal: { status: 'failed', attempts: attempt, event_id: record.event_id, event_type: record.event_type, result_id: record.result_id, envelope: result, verified_at: verifiedAt },
        });
        throw new Escalation(`worker reported failure on ${taskKey} (attempt ${attempt}): ${retryDecision.reason}`, { tag, attempt, retryDecision });
      }
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'AUTHORIZED', dispatch_pid: null, last_attempt_id: null });
      transition(tag, 'PLANNED', `policy-${tag}-retry-a${attempt}.json`, { reason: 're-plan from recorded failure' });
      transition(tag, 'AUTHORIZED', `policy-${tag}-retry-a${attempt}.json`, { via: 'retry policy AUTO_EXECUTE (same authorized task)' });
      transition(tag, 'QUEUED', `workorder-${tag}.json`, { note: 'same authorized work order; new attempt' });
      log('RETRY', `${taskKey}: worker reported failure; re-planned same task (attempt ${attempt + 1}) through the authorized path (${retryDecision.sourceRule})`);
      continue;
    }
    transition(tag, 'VERIFIED', `verify-${tag}-a${attempt}.json`, { event_id: record.event_id, result_id: record.result_id });
    recordAttemptOutcome(woId, attemptId, { outcome: 'ACCEPTED', event_id: record.event_id });
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
      state: 'COMPLETED',
      dispatch_pid: null,
      terminal: {
        status: 'completed', attempts: attempt,
        event_id: record.event_id, event_type: record.event_type, result_id: record.result_id,
        envelope: result, verified_at: verifiedAt,
      },
    });
    log('VERIFY', `${taskKey}: ${record.event_type} event_id=${record.event_id} result_id=${record.result_id}`);
    return { workOrder: wo, result, record, attempts: attempt };
  }
}
