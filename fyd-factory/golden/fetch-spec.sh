#!/bin/bash
cat /home/nolan/fyd-golden-scratch/hpp-spec.json
echo "=== base64 out ==="
base64 -w0 /home/nolan/fyd-golden-scratch/hpp-spec.json; echo
