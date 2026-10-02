#!/bin/bash
python3 -c "import lxml; print('lxml OK')" 2>&1
python3 -c "import html5lib; print('html5lib OK')" 2>&1
python3 --version
pip3 --version 2>&1 | head -1
