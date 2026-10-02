// P7: Event Governance API
// Machine-readable event ownership policy, namespace validation, violation tracking.

const express = require('express');

function createGovernanceRoutes(governance) {
  const router = express.Router();

  router.get('/policy', (req, res) => {
    res.json({
      ownership_policy: governance.getOwnershipPolicy(),
      namespace_policy: governance.getNamespacePolicy(),
      hash: governance.getHash(),
      total_events: governance.getOwnershipPolicy().length,
      total_namespaces: governance.getNamespacePolicy().length,
    });
  });

  router.get('/policy/:eventType', (req, res) => {
    const policy = governance.getPolicyForEvent(req.params.eventType);
    if (!policy) {
      return res.status(404).json({ error: `No policy for event type: ${req.params.eventType}` });
    }
    res.json(policy);
  });

  router.get('/namespaces', (req, res) => {
    res.json({
      namespaces: governance.getNamespacePolicy(),
      namespace_owners: require('../../ping-runtime/events/event_governance').NAMESPACE_OWNERS,
    });
  });

  router.get('/namespaces/:namespace', (req, res) => {
    const events = governance.getEventsForNamespace(req.params.namespace);
    res.json({
      namespace: req.params.namespace,
      events,
      count: events.length,
    });
  });

  router.get('/violations', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
      violations: governance.getViolations(limit),
      stats: governance.getStats(),
    });
  });

  router.get('/stats', (req, res) => {
    res.json(governance.getStats());
  });

  router.get('/validate/:eventType', (req, res) => {
    const result = governance.validateEvent({
      event_type: req.params.eventType,
      authority_owner: req.query.owner || undefined,
    });
    res.json(result);
  });

  return router;
}

module.exports = createGovernanceRoutes;

