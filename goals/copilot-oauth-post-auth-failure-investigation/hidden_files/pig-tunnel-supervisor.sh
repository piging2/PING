#!/bin/bash
# pig-tunnel-supervisor.sh - Minimal persistent SSH tunnel supervisor for Pig access.
#
# ONE purpose: keep an SSH tunnel to the Pig alive, reconnect on failure.
# Uses the existing canonical SSH config (~/.ssh/pig-config, Host pigwsl).
# Does NOT interfere with interactive `ssh pigwsl` usage (separate connections).
#
# Usage:
#   pig-tunnel-supervisor.sh start    - Start the supervisor (background)
#   pig-tunnel-supervisor.sh stop     - Stop the supervisor and tunnel
#   pig-tunnel-supervisor.sh status   - Show connection state
#   pig-tunnel-supervisor.sh restart  - Stop then start
#
# State is DERIVED from actual process and connectivity, not from a state file.
# This prevents state drift: the status command always reflects reality.
#
# Design constraints (from wrapper after-action record 2026-09-17):
# - Use existing SSH config, do not create another wrapper
# - Do one thing: supervise the tunnel
# - Explicit lifecycle: start/stop/status
# - Clean shutdown: kill SSH child, remove PID file
# - No credentials in logs or output
# - Fail-closed: report failure, never pretend to be connected
#
# See wrapper-investigation-2026-09-17.md (after-action record) and
# supervisor-implementation-report-2026-09-17.md (Engineering Guardrails,
# regression checklist, final report) for the constraints that prevent this
# script from growing into the wrapper complexity it replaced.

set -u

# Configuration
TUNNEL_DIR="$HOME/.pig-tunnel"
PIDFILE="$TUNNEL_DIR/supervisor.pid"
LOGFILE="$TUNNEL_DIR/supervisor.log"
SSH_CONFIG="$HOME/.ssh/pig-config"
SSH_HOST="pigwsl"

# SSH options: keepalive every 30s, drop after 3 missed (90s dead detection)
# -N: no remote command, just keep the connection open
# BatchMode: no password prompts, fail fast on auth issues
SSH_OPTS="-F $SSH_CONFIG -o BatchMode=yes -o ConnectTimeout=20"
SSH_OPTS="$SSH_OPTS -o ServerAliveInterval=30 -o ServerAliveCountMax=3"
SSH_OPTS="$SSH_OPTS -o ExitOnForwardFailure=yes -N"

# Backoff: start at 5s, double each failure, cap at 300s (5 min)
BACKOFF_INITIAL=5
BACKOFF_MAX=300

mkdir -p "$TUNNEL_DIR"

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $1" >> "$LOGFILE"
}

# Check if a PID is running
is_running() {
    local pid="$1"
    [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# Get supervisor PID from file, or empty if not running
supervisor_pid() {
    if [ -f "$PIDFILE" ]; then
        local pid=$(cat "$PIDFILE" 2>/dev/null)
        if is_running "$pid"; then
            echo "$pid"
            return 0
        else
            # Stale PID file
            return 1
        fi
    fi
    return 1
}

# Get SSH child PID (child of supervisor)
ssh_child_pid() {
    local sup_pid="$1"
    # Find ssh child of the supervisor
    pgrep -P "$sup_pid" -f "ssh.*$SSH_HOST" 2>/dev/null | head -1
}

# Test actual connectivity with a fresh SSH connection
# Returns 0 if Pig is reachable, 1 otherwise
# Also classifies the failure type via stderr
# Note: does NOT use -N (we need to run a command)
test_connectivity() {
    local output
    output=$(ssh -F "$SSH_CONFIG" -o BatchMode=yes -o ConnectTimeout=10 \
        -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
        "$SSH_HOST" "echo OK" 2>&1 | tr -d '\r')
    local exit_code=${PIPESTATUS[0]}
    # Always update .last-error so classify_error never reads stale data
    echo "$output" > "$TUNNEL_DIR/.last-error"
    if [ $exit_code -eq 0 ] && [ "$output" = "OK" ]; then
        return 0
    fi
    return 1
}

classify_error() {
    local err_file="$TUNNEL_DIR/.last-error"
    [ -f "$err_file" ] || { echo "UNKNOWN"; return; }
    local err=$(cat "$err_file")
    case "$err" in
        *"Permission denied"*|*"Authentication failed"*)
            echo "AUTH_FAILURE"
            ;;
        *"Connection refused"*)
            echo "PIG_OFFLINE"
            ;;
        *"proxy"*|*"ProxyCommand"*|*"nc:"*)
            echo "ROUTE_DOWN"
            ;;
        *"Connection timed out"*|*"timed out"*)
            echo "ROUTE_DOWN"
            ;;
        *"Could not resolve hostname"*)
            echo "ROUTE_DOWN"
            ;;
        *)
            echo "ROUTE_DOWN"
            ;;
    esac
}

do_start() {
    local existing_pid
    if existing_pid=$(supervisor_pid); then
        echo "Supervisor already running (PID $existing_pid)"
        exit 0
    fi
    # Clean up stale PID file
    rm -f "$PIDFILE"

    log "Starting supervisor"
    # Start the supervisor loop in background, detached from terminal.
    # The _loop writes its own PID to PIDFILE (avoids PID confusion from setsid).
    # nohup protects against hangup; </dev/null detaches stdin.
    nohup bash "$0" _loop >> "$LOGFILE" 2>&1 < /dev/null &
    # Wait briefly for the loop to write its PID file
    for i in $(seq 1 10); do
        if [ -f "$PIDFILE" ]; then
            local new_pid=$(cat "$PIDFILE")
            log "Supervisor started (PID $new_pid)"
            echo "Supervisor started (PID $new_pid)"
            return 0
        fi
        sleep 0.5
    done
    echo "Failed to start supervisor (PID file not created)"
    exit 1
}

do_stop() {
    local pid
    if ! pid=$(supervisor_pid); then
        echo "Supervisor not running"
        rm -f "$PIDFILE"
        exit 0
    fi
    log "Stopping supervisor (PID $pid)"
    # SIGTERM the supervisor; it will kill its SSH child and exit
    kill -TERM "$pid" 2>/dev/null
    # Wait for it to exit (up to 10s)
    for i in $(seq 1 10); do
        if ! is_running "$pid"; then
            break
        fi
        sleep 1
    done
    if is_running "$pid"; then
        log "Supervisor did not exit, sending SIGKILL"
        kill -KILL "$pid" 2>/dev/null
    fi
    rm -f "$PIDFILE"
    log "Supervisor stopped"
    echo "Supervisor stopped"
}

do_status() {
    local pid
    if ! pid=$(supervisor_pid); then
        if [ -f "$PIDFILE" ]; then
            echo "State: SUPERVISOR_FAILURE (stale PID file, process not running)"
        else
            echo "State: STOPPED (supervisor not running)"
        fi
        exit 0
    fi

    local ssh_pid=$(ssh_child_pid "$pid")
    if [ -n "$ssh_pid" ] && is_running "$ssh_pid"; then
        # SSH tunnel process exists, test if it actually works
        if test_connectivity; then
            echo "State: PIG_REACHABLE (supervisor PID $pid, tunnel PID $ssh_pid)"
        else
            local err_type=$(classify_error)
            echo "State: ROUTE_DEGRADED (tunnel process alive but connectivity test failed: $err_type)"
        fi
    else
        # Supervisor running but no SSH child = in backoff/reconnect
        if test_connectivity; then
            echo "State: PIG_REACHABLE (supervisor PID $pid, tunnel re-establishing, direct test OK)"
        else
            local err_type=$(classify_error)
            case "$err_type" in
                AUTH_FAILURE)
                    echo "State: AUTH_FAILURE (supervisor PID $pid, SSH authentication failed)"
                    ;;
                PIG_OFFLINE)
                    echo "State: PIG_OFFLINE (supervisor PID $pid, Pig SSH refused connection)"
                    ;;
                *)
                    echo "State: RECONNECTING (supervisor PID $pid, retrying: $err_type)"
                    ;;
            esac
        fi
    fi
}

# Internal: the supervisor loop (do not call directly)
do_loop() {
    # Prevent multiple loops
    echo $$ > "$PIDFILE"
    log "Supervisor loop started (PID $$)"

    # Trap SIGTERM/SIGINT for clean shutdown
    SSH_PID=""
    cleanup() {
        log "Received shutdown signal"
        if [ -n "$SSH_PID" ] && is_running "$SSH_PID"; then
            log "Killing SSH child (PID $SSH_PID)"
            kill -TERM "$SSH_PID" 2>/dev/null
            sleep 2
            if is_running "$SSH_PID"; then
                kill -KILL "$SSH_PID" 2>/dev/null
            fi
        fi
        rm -f "$PIDFILE"
        log "Supervisor loop exited cleanly"
        exit 0
    }
    trap cleanup TERM INT

    local backoff=$BACKOFF_INITIAL

    while true; do
        log "Starting SSH tunnel (attempt, backoff=${backoff}s)"
        # Start SSH in background so we can monitor it
        ssh $SSH_OPTS "$SSH_HOST" &
        SSH_PID=$!
        log "SSH tunnel started (PID $SSH_PID)"

        # Wait for SSH to exit
        wait $SSH_PID
        local ssh_exit=$?
        SSH_PID=""

        log "SSH tunnel exited (code $ssh_exit)"

        # Check if this was an auth failure (do not retry blindly)
        if [ -f "$TUNNEL_DIR/.last-error" ]; then
            local err_type=$(classify_error)
            if [ "$err_type" = "AUTH_FAILURE" ]; then
                log "FATAL: SSH authentication failed. Not retrying. Check SSH key."
                # Keep supervisor running but do not retry (fail-closed)
                # The status command will report AUTH_FAILURE
                sleep 60
                continue
            fi
        fi

        # Exponential backoff with cap
        log "Reconnecting in ${backoff}s"
        sleep $backoff
        backoff=$((backoff * 2))
        if [ $backoff -gt $BACKOFF_MAX ]; then
            backoff=$BACKOFF_MAX
        fi
    done
}

case "${1:-}" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    status)
        do_status
        ;;
    restart)
        do_stop
        sleep 2
        do_start
        ;;
    _loop)
        do_loop
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
