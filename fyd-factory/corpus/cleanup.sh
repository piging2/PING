#!/bin/bash
rm -rf /home/nolan/fyd-acq-fixtures /mnt/c/Users/nolan/transfer/fyd-acq-xfer.tar.gz
ls /mnt/c/Users/nolan/transfer/ 2>/dev/null | head -3 || echo "transfer dir clean"
