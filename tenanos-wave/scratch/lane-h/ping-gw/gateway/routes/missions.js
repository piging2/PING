/**
 * Mission Runtime Routes — PING Core v1
 * 
 * Mission Control navigates via events/queues, not CRUD.
 */

function createMissionRoutes(missionRuntime) {
  const express = require('express');
  const router = express.Router();

  // Get mission stats
  router.get('/stats', async (req, res) => {
    try {
      const stats = await missionRuntime.getStats();
      res.json({ status: 'ok', stats });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Create a mission
  router.post('/', async (req, res) => {
    try {
      const { missionType, payload, priority, createdBy } = req.body;
      const missionId = await missionRuntime.create(missionType, payload, { priority, createdBy });
      res.json({ status: 'ok', missionId });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Get pending missions (for Orca scheduler)
  router.get('/pending', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const missions = await missionRuntime.getPending(limit);
      res.json({ status: 'ok', missions, count: missions.length });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  // Get active missions
  router.get('/active', async (req, res) => {
    try {
      const missions = await missionRuntime.getActive();
      res.json({ status: 'ok', missions, count: missions.length });
    } catch (err) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  return router;
}

module.exports = createMissionRoutes;
