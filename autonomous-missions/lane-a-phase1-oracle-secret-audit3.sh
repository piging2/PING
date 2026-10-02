#!/bin/bash
# READ-ONLY pass 3. Prints only INTERPOLATED/LITERAL flags and line numbers, never values.
set -u
f=/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot/infrastructure/oracle/docker-compose.oracle.yml
echo "=== secret-ish keys in compose file: line no + name + INTERPOLATED-or-LITERAL (no values) ==="
grep -nE '^\s*-?\s*[A-Za-z_][A-Za-z0-9_]*\s*[:=]' "$f" | grep -iE 'pass|secret|token|key|cred|auth|bearer' | while IFS=: read -r ln rest; do
  name=$(echo "$rest" | sed -E 's/^\s*-?\s*([A-Za-z_][A-Za-z0-9_]*).*/\1/')
  if echo "$rest" | grep -qE '\$\{|\$[A-Za-z_]'; then tag=INTERPOLATED; else tag=LITERAL-VALUE-IN-FILE; fi
  echo "line $ln :: $name :: $tag"
done
echo
echo "=== where does the compose file pull env from (env_file values redacted, paths only) ==="
grep -n -A3 'env_file' "$f" | grep -oE '\./[^ ]*\.env[^ ]*|/[^ ]*\.env[^ ]*' | sort -u
echo
echo "=== does the file contain any other hardcoded credential-looking assignments (names only) ==="
grep -nE '^\s*[A-Za-z_][A-Za-z0-9_]*\s*:\s*['"'"'"]?[^${'"'"'"][^ ]' "$f" | grep -viE 'image:|build:|container_name|restart|network|volume|port|command|entrypoint|depends_on|healthcheck|logging|deploy|labels|working_dir|user:|hostname|domainname|stdin|tty|expose|dns|extra_hosts|sysctls|ulimits|tmpfs|stop_|start_|init:|privileged|read_only|cap_|device|security_opt|pid:|ipc:|uts:|runtime:|platform:|profiles:|scale:|extends:|links:|external_links|aliases|ipv4|ipv6|mac_address|network_mode|ports:|environment:|env_file' | cut -c1-80 | head -30
echo "(above: candidate lines with possible literal values, truncated to 80 chars)"
