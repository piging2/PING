#!/usr/bin/env python3
"""DECISION shard-2 generator: D-503..D-752 (250 new definitions)."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dec_common
import theme1_sec, theme2_vq, theme3_wire, theme4_dehpp, theme5_ambiguity  # noqa: F401

SHARD_DIR = os.path.dirname(os.path.abspath(__file__))

if __name__ == "__main__":
    dec_common.emit(shard_n=2, id_lo=503, id_hi=752,
                    source="decision-shard-2", shard_dir=SHARD_DIR)
