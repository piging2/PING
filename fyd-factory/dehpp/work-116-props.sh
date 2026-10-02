#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -n "meta\b\|eventSequences\|interface.*Props\|function SiteClient" src/app/sites/_shared/site-client.tsx | head -15