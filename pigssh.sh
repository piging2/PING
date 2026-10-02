#!/bin/bash
exec ssh -F /home/hatch/.ssh/pig-config pigwsl "$@"
