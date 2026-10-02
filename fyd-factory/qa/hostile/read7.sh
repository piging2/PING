#!/bin/bash
cd /home/nolan/projects/ping
sed -n '80,180p' src/fyd/object/object-projection.ts
echo "======== anchor/href usage in renderer ========"
grep -n "href=\|src=\|<a \|<img\|<iframe\|<script\|<style" src/fyd/components/renderer.tsx | head -40
