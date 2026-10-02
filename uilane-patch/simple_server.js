/**
 * Simple Pipeline Server: DEV_ONLY DEV STUB (PRESERVED_INACTIVE)
 *
 * Classification: this file is referenced by NO compose file, Dockerfile,
 * script, or document in this repository. It is NEVER served on any live
 * path. Kept only as a dormant local development fixture.
 *
 * Honesty contract (UI truth fix 2026-09-19): every status value below is a
 * STATIC FIXTURE, not a measurement. All responses carry stub:true plus an
 * explanatory note, so no consumer can mistake them for live health signals.
 * Previously this file claimed unconditional /health ok, fabricated-negative
 * service health, and a hardcoded ollama status, all presented as if real.
 *
 * Minimal Express server to serve pipeline files without PostgreSQL/dependencies
 * This is a temporary solution to serve drive_index.json, placements.json, manifest.json, etc.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const PING_ROOT = path.resolve(__dirname, '../');

function stubNote(name) {
  return `DEV_ONLY stub fixture for ${name}: static value, not measured. Do not use as a health signal.`;
}

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Pipeline file routes
app.get('/cache/drive_index.json', (req, res) => {
  const filePath = path.join(PING_ROOT, 'cache', 'drive_index.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Drive index not found' });
});

app.get('/config/placements.json', (req, res) => {
  const filePath = path.join(PING_ROOT, 'config', 'placements.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Placements config not found' });
});

app.get('/content/manifest.json', (req, res) => {
  const filePath = path.join(PING_ROOT, 'content', 'manifest.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Manifest not found' });
});

app.get('/logs/sync.log', (req, res) => {
  const filePath = path.join(PING_ROOT, 'logs', 'sync.log');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Sync log not found' });
});

app.get('/logs/audit.json', (req, res) => {
  const filePath = path.join(PING_ROOT, 'logs', 'audit.json');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Audit log not found' });
});

// Health check (stub: labeled, never a live claim)
app.get('/health', (req, res) => {
  res.json({ status: 'stub', stub: true, service: 'simple-pipeline-server', note: stubNote('health') });
});

// System state (stub: fixtures labeled, not measured)
app.get('/system/state', (req, res) => {
  res.json({
    stub: true,
    note: stubNote('system state'),
    timestamp: new Date().toISOString(),
    services: {
      postgresql: { healthy: null, error: 'stub fixture: unknown' },
      qdrant: { healthy: null, error: 'stub fixture: unknown' },
    },
    compiler: { status: 'stub', passes: null },
    replay: { status: 'stub', entries: null },
    witness: { status: 'stub', blocks: null },
    objectGraph: { nodes: null, edges: null },
    ollama: { status: 'stub', model: null },
    gateway: { status: 'stub' },
  });
});

// Ollama status (stub: fixtures labeled, not measured)
app.get('/api/v1/ollama/status', (req, res) => {
  res.json({
    stub: true,
    note: stubNote('ollama status'),
    status: 'stub',
    running_jobs: null,
    idle_since: new Date().toISOString(),
    total_jobs: null,
    completed_jobs: null,
    model: null,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple Pipeline Server (DEV_ONLY stub) running on http://0.0.0.0:${PORT}`);
  console.log(`Serving pipeline files from: ${PING_ROOT}`);
});
