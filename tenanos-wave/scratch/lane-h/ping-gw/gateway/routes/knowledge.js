/**
 * Knowledge Graph Routes — PING Core v1
 */

function createKnowledgeRoutes(knowledgeGraph, options = {}) {
  const express = require('express');
  const router = express.Router();
  const hybridSearch = options.hybridSearch || null;

  // Get knowledge stats
  router.get('/stats', async (req, res) => {
    try {
      const stats = await knowledgeGraph.getStats();
      res.json({ status: 'ok', stats });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Hybrid semantic + knowledge search (Phase E.2). Namespace is the privacy
  // boundary and is required — every result carries evidence + verification.
  router.post('/search', async (req, res) => {
    if (!hybridSearch) {
      return res.status(503).json({ status: 'error', error: 'hybrid search not available' });
    }
    try {
      const { query, namespace, limit } = req.body || {};
      if (!query) {
        return res.status(400).json({ status: 'error', error: 'query required' });
      }
      if (!namespace) {
        return res.status(400).json({ status: 'error', error: 'namespace required (privacy boundary)' });
      }
      const result = await hybridSearch.search({
        query,
        namespace,
        limit: parseInt(limit) || 10,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Query nodes
  router.get('/nodes', async (req, res) => {
    try {
      const nodes = await knowledgeGraph.queryNodes({
        nodeType: req.query.type,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        namespace: req.query.namespace,
        status: req.query.status,
        search: req.query.q,
        limit: parseInt(req.query.limit) || 50,
      });
      res.json({ status: 'ok', nodes, count: nodes.length });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Add a node
  router.post('/nodes', async (req, res) => {
    try {
      const { nodeType, label, data, entityType, entityId, namespace, status, confidence } = req.body;
      const nodeId = await knowledgeGraph.addNode(nodeType, label, data, { entityType, entityId, namespace, status, confidence });
      res.json({ status: 'ok', nodeId });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Get neighborhood
  router.get('/nodes/:nodeId/neighborhood', async (req, res) => {
    try {
      const depth = parseInt(req.query.depth) || 1;
      const neighborhood = await knowledgeGraph.getNeighborhood(req.params.nodeId, depth);
      res.json({ status: 'ok', ...neighborhood });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Add an edge
  router.post('/edges', async (req, res) => {
    try {
      const { sourceId, targetId, edgeType, weight, data } = req.body;
      const edgeId = await knowledgeGraph.addEdge(sourceId, targetId, edgeType, data, weight);
      res.json({ status: 'ok', edgeId });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  return router;
}

module.exports = createKnowledgeRoutes;
