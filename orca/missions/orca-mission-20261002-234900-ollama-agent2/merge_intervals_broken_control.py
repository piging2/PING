"""Deliberately broken control: sorts pairs but never merges."""

def merge_intervals(intervals):
    return sorted([list(iv) for iv in intervals], key=lambda p: p[0])
