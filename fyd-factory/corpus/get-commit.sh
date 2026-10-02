#!/bin/bash
cd /home/nolan/projects/ping
git rev-parse HEAD
git status --porcelain=v1 --untracked-files=no | head -5
