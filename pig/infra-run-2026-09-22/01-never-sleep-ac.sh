echo "=== STEP 1: set standby-timeout-ac to 0 (never) ==="
powercfg.exe /change standby-timeout-ac 0 < /dev/null
echo "change exit=$?"
echo "=== VERIFY: sleep subgroup AC/DC timeouts ==="
powercfg.exe /query SCHEME_CURRENT 238c9fa8-0aad-41ed-83f4-97be242c8f20 < /dev/null
