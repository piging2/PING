"""PING connector CONTRACT TEST KIT.

A runnable harness that any future connector adapter plugs into. Verifies the
contract surface (connect, discover, checkpoint, read, normalize, refresh,
disconnect, health) plus the mandatory exposure surface:

  SOURCE IDENTITY, AUTH SCOPE, CAPABILITIES, CHECKPOINT,
  OBSERVATIONS, PROVENANCE, ERROR CLASS, RATE-LIMIT STATE.

Secrets stay behind the connector boundary: the harness asserts no
secret-shaped values ever appear in observations, checkpoints, or logs.

Standard library only. Run:  python3 -m testkit.run
"""
__version__ = "0.1.0"
