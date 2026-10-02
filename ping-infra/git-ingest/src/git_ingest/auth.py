"""Authentication for the GitHub read-only transport.

Rules (binding):
- Public repositories are ingestible without any credential.
- When authenticated access is needed, the credential comes ONLY from
  the existing credential flow: the github skill's dynamic-credentials
  surrogate mechanism (hsurr:* values resolved by Sentinel on approved
  outbound requests). See ~/workspace/skills/github/SKILL.md.
- Raw credentials never appear in code, env files, logs, or arguments.
- If the surrogate mechanism is unavailable, ingestion degrades to
  unauthenticated mode (60 req/hr) and says so in the result state; it
  never fabricates auth or asks the user for a key.
"""
from __future__ import annotations

import sys
from typing import List

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")


class AuthHook:
    """Attaches authorization to an outgoing urllib request."""

    def attach(self, req) -> None:  # req: urllib.request.Request
        raise NotImplementedError


class Unauthenticated(AuthHook):
    """No credential. GitHub allows 60 unauthenticated requests/hour."""

    def attach(self, req) -> None:
        return None


class SurrogateAuth(AuthHook):
    """Attaches the connected custom.github credential via the skill's
    dynamic-credential surrogate mechanism, restricted to api.github.com.

    The surrogate (hsurr:*) is resolved to the real credential by Sentinel
    at request time; the real value never enters this process's memory,
    logs, or files.
    """

    CONNECTOR = "custom.github"
    ALLOWED_HOSTS = ("api.github.com",)

    def attach(self, req) -> None:
        try:
            from dynamic_credentials import add_surrogate_to_request
        except ImportError as e:
            raise RuntimeError(
                "surrogate credential flow unavailable in this environment; "
                "falling back to unauthenticated mode is required"
            ) from e
        add_surrogate_to_request(req, self.CONNECTOR,
                                 allowed_hosts=list(self.ALLOWED_HOSTS))


class CredentialUnavailable(Exception):
    """Surrogate mechanism present but declined/unavailable for this run."""


def select_auth(prefer_authenticated: bool = True) -> AuthHook:
    """Choose the auth hook for this run. Never raises for missing auth;
    degrades to Unauthenticated and the caller reports it in the result."""
    if prefer_authenticated:
        probe = SurrogateAuth()
        # Cheap availability check: the helper module must import.
        try:
            import importlib.util
            if importlib.util.find_spec("dynamic_credentials") is None:
                return Unauthenticated()
        except Exception:
            return Unauthenticated()
        return probe
    return Unauthenticated()
