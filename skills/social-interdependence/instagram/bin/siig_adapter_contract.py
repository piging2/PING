#!/usr/bin/env python3
"""siig_adapter_contract.py: the dumb-adapter contract for Instagram.

The adapter receives an AUTHORIZED intent and returns OBSERVATIONS. It
never chooses targets, sets policy or budgets, ranks candidates, or declares
canonical success. Canonical success is declared only by the verifier after
a read-after-write observation confirms the external effect.

Adapter observations are one of:
  execute(): {"outcome": "ok"|"timeout"|"failed"|"noop",
              "platform_signals": [...], "detail": str}
  read_state(): {"liked": bool, "commented": bool,
                "platform_signals": [...]}
  get_identity(): {"account": str}
  discover(): [candidate dicts]

Exceptions the adapter may raise: AdapterAuthExpired, AdapterTimeout,
AdapterPlatformSignal(kind), AdapterOutage, AdapterError. Every exception
maps to a deterministic intent state; none is silently swallowed.
"""


class AdapterAuthExpired(Exception):
    pass


class AdapterTimeout(Exception):
    pass


class AdapterPlatformSignal(Exception):
    def __init__(self, kind, detail=""):
        super().__init__("platform signal: %s %s" % (kind, detail))
        self.kind = kind
        self.detail = detail


class AdapterOutage(Exception):
    pass


class AdapterError(Exception):
    pass


class IgAdapter:
    """Interface. The fixture and the future live Pig adapter implement this."""

    def get_identity(self):
        raise NotImplementedError

    def discover(self, params):
        """Read-only discovery batch. Returns candidate dicts with handle,
        post_url, post_text, header_name, country, city, media_type."""
        raise NotImplementedError

    def read_profile(self, handle):
        """Read-only profile vetting (country field is the precision gate)."""
        raise NotImplementedError

    def execute(self, action, handle, post_url, content=None):
        """Perform the authorized mutation. Returns an observation dict.
        'ok' is the adapter's CLAIM, not canonical success."""
        raise NotImplementedError

    def read_state(self, handle, post_url):
        """Independent read-after-write observation of external state."""
        raise NotImplementedError

    def close(self):
        pass
