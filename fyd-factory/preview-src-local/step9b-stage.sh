#!/bin/bash
set -uo pipefail
mkdir -p /mnt/c/Users/nolan/transfer
cp /home/nolan/fyd-preview-stage/fyd-preview-wt.tar.gz /mnt/c/Users/nolan/transfer/fyd-preview-wt.tar.gz
sha256sum /mnt/c/Users/nolan/transfer/fyd-preview-wt.tar.gz
