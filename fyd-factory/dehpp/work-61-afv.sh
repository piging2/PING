#!/bin/bash
cd /home/nolan/fyd-dehpp-wt
grep -rn "export function applyFieldVisibility" src/fyd --include=*.ts | head -2
