#!/usr/bin/env bash
set -euo pipefail

# ==============================================================
# PING Oracle Bootstrap
# Provision a fresh Oracle VM for PING runtime.
# Usage: curl -fsSL https://raw.github.com/.../bootstrap.sh | bash
# ==============================================================

PING_ROOT="${PING_ROOT:-/opt/ping}"
PING_REPO="${PING_REPO:-https://github.com/theoperatore/ping.git}"
PING_BRANCH="${PING_BRANCH:-constitutional-trunk}"
PING_USER="${PING_USER:-ping}"

echo "=== PING Oracle Bootstrap ==="
echo "  Root: $PING_ROOT"
echo "  Repo: $PING_REPO"
echo "  Branch: $PING_BRANCH"

# ---------------------------------------------------------------
# Step 1: System dependencies
# ---------------------------------------------------------------
echo "=== Step 1: System dependencies ==="
apt-get update -qq
apt-get install -y -qq \
    docker.io \
    docker-compose-v2 \
    git \
    curl \
    wget \
    jq \
    ca-certificates \
    gnupg \
    sudo

# ---------------------------------------------------------------
# Step 2: Create ping user
# ---------------------------------------------------------------
echo "=== Step 2: Create ping user ==="
if ! id -u "$PING_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$PING_USER"
    usermod -aG docker "$PING_USER"
fi

# ---------------------------------------------------------------
# Step 3: Clone repository
# ---------------------------------------------------------------
echo "=== Step 3: Clone repository ==="
if [ ! -d "$PING_ROOT" ]; then
    git clone --branch "$PING_BRANCH" "$PING_REPO" "$PING_ROOT"
else
    cd "$PING_ROOT"
    git fetch origin
    git checkout "$PING_BRANCH"
    git pull origin "$PING_BRANCH"
fi
chown -R "$PING_USER:$PING_USER" "$PING_ROOT"

# ---------------------------------------------------------------
# Step 4: Create persistent volumes
# ---------------------------------------------------------------
echo "=== Step 4: Create persistent volumes ==="
docker volume create ping_pgdata --label ping=postgres || true
docker volume create ping_qdrant_storage --label ping=qdrant || true
docker volume create ping_mirror --label ping=mirror || true
docker volume create ping_scheduler_state --label ping=scheduler || true

# ---------------------------------------------------------------
# Step 5: Environment configuration
# ---------------------------------------------------------------
echo "=== Step 5: Environment configuration ==="
if [ ! -f "$PING_ROOT/.env" ]; then
    cp "$PING_ROOT/config/env.defaults" "$PING_ROOT/.env"
    echo ""
    echo "=== ACTION REQUIRED ==="
    echo "Edit $PING_ROOT/.env to set:"
    echo "  - POSTGRES_PASSWORD"
    echo "  - QDRANT_API_KEY (if using Qdrant Cloud)"
    echo "  - GITHUB_TOKEN"
    echo "Then run: systemctl start ping-postgres ping-gateway ping-worker ping-scheduler"
    echo "========================"
fi

# ---------------------------------------------------------------
# Step 6: Copy systemd units
# ---------------------------------------------------------------
echo "=== Step 6: Install systemd units ==="
cp "$PING_ROOT/infrastructure/oracle/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload

# ---------------------------------------------------------------
# Step 7: Health check helper
# ---------------------------------------------------------------
echo "=== Step 7: Create health check script ==="
cat > /usr/local/bin/ping-health <<'SCRIPT'
#!/usr/bin/env bash
echo "=== PING Health Check ==="
echo ""
echo "--- Docker ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running"
echo ""
echo "--- Volumes ---"
docker volume ls --filter label=ping --format "table {{.Name}}" 2>/dev/null
echo ""
echo "--- Gateway ---"
curl -sf http://localhost:8080/health 2>/dev/null && echo " Gateway: healthy" || echo " Gateway: unreachable"
echo ""
echo "--- Postgres ---"
docker exec ping-postgres pg_isready -U ping 2>/dev/null && echo " Postgres: healthy" || echo " Postgres: unreachable"
echo ""
echo "--- Qdrant ---"
curl -sf http://localhost:6333/healthz 2>/dev/null && echo " Qdrant: healthy" || echo " Qdrant: unreachable"
SCRIPT
chmod +x /usr/local/bin/ping-health

echo ""
echo "=== Bootstrap complete ==="
echo "Next steps:"
echo "  1. Edit $PING_ROOT/.env with secrets"
echo "  2. systemctl enable ping-postgres ping-gateway ping-worker ping-scheduler"
echo "  3. systemctl start ping-postgres"
echo "  4. Run: ping-health"
echo "  5. From Hermes Desktop: ssh ping@<oracle-ip>"
