#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
ls -la | grep -e babel -e jest
python3 -c "import json; d=json.load(open('package.json')); print(json.dumps(d.get('jest'), indent=1)); print('babel:', json.dumps(d.get('babel'), indent=1))"
ls src/fyd/builder/__tests__/ | head -3
