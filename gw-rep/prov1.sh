echo "=== image inspect candidate ==="
docker image inspect ping-gateway:candidate-fffe99f7a --format '{{json .Config.Labels}}'
echo
echo "=== config env ==="
docker image inspect ping-gateway:candidate-fffe99f7a --format '{{json .Config.Env}}'
echo
echo "=== repo digests ==="
docker image inspect ping-gateway:candidate-fffe99f7a --format '{{json .RepoDigests}}'
echo
echo "=== created ==="
docker image inspect ping-gateway:candidate-fffe99f7a --format '{{.Created}}|{{.Architecture}}|{{.Os}}'
echo
echo "=== history (last 15) ==="
docker history --no-trunc --format '{{.CreatedBy}}' ping-gateway:candidate-fffe99f7a | head -15
