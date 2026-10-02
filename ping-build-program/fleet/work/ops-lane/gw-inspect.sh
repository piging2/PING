#!/bin/bash
echo "=== labels ==="
docker inspect ping-gateway --format '{{json .Config.Labels}}' | python3 -m json.tool | head -30
echo "=== networks ==="
docker inspect ping-gateway --format '{{json .NetworkSettings.Networks}}' | python3 -c "import json,sys; print(list(json.load(sys.stdin).keys()))"
echo "=== ports ==="
docker inspect ping-gateway --format '{{json .HostConfig.PortBindings}}'
echo "=== mounts ==="
docker inspect ping-gateway --format '{{json .Mounts}}' | python3 -m json.tool | head -40
echo "=== restart policy ==="
docker inspect ping-gateway --format '{{json .HostConfig.RestartPolicy}}'
echo "=== env NAMES only ==="
docker inspect ping-gateway --format '{{json .Config.Env}}' | python3 -c "import json,sys; [print(e.split('=',1)[0]) for e in json.load(sys.stdin)]"
echo "=== entrypoint/cmd/workdir/user ==="
docker inspect ping-gateway --format 'entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}} workdir={{.Config.WorkingDir}} user={{.Config.User}}'
echo "=== env files present in compose dir ==="
ls /opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/*.env 2>/dev/null
