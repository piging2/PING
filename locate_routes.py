import io
repo = "/home/nolan/ping-wave-gw2-088"
tip = io.open(repo + "/gateway/routes/mission_control.js", encoding="utf-8").read().split("\n")
probes = [
    ("h6-inbox", "  router.get('/inbox', requirePG, async (req, res) => {"),
    ("h6-queues", "  router.get('/queues', requirePG, async (req, res) => {"),
    ("h7-qtype", "  router.get('/queues/:eventType', requirePG, async (req, res) => {"),
    ("h7-active", "  router.get('/missions/active', requirePG, async (req, res) => {"),
    ("h7-pending", "  router.get('/missions/pending', requirePG, async (req, res) => {"),
    ("h7-stats", "  router.get('/missions/stats', requirePG, async (req, res) => {"),
    ("h7-trace", "  router.get('/missions/:id/trace', requirePG, async (req, res) => {"),
    ("h7-knowledge", "  router.get('/knowledge', requirePG, async (req, res) => {"),
    ("h8-activity", "  router.get('/activity', requirePG, async (req, res) => {"),
    ("h9-replay-stats", "  router.get('/replay/stats', requirePG, async (req, res) => {"),
    ("h10-witness", "  router.get('/witness/stats', requirePG, async (req, res) => {"),
    ("h11-retrace", "  router.get('/replay/trace/:correlationId', requirePG, async (req, res) => {"),
]
for name, probe in probes:
    hits = [i+1 for i, l in enumerate(tip) if l == probe]
    print(name, "tip lines:", hits)
