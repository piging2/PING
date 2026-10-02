compose.proposed.yaml ordering review:
services: postgres (healthcheck pg_isready, 10s), qdrant (healthcheck HTTP /healthz, 10s),
gateway (depends_on postgres,qdrant healthy; serves only after), workers (depends_on all healthy).
startup: postgres -> qdrant -> gateway -> workers. shutdown: reverse. restart: unless-stopped
with depends_on gates re-evaluated each cycle.