#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
git show HEAD:src/app/sites/happy-place/page.tsx | sed -n '55,70p'