"""Testkit adapter factory: wraps the GBP spike behind the BCQ
Connector ABC so `python3 -m testkit.run --adapter` can drive it.

Usage (from ~/workspace/ping-build-program/lane-bcq/testkit):
    python3 -m testkit.run --adapter business.kit_adapter:make_connector

Caveat (2026-09-23): the harness test suite is currently fake-connector
specific (it calls read("w1") / read("widget_timeout") and connects with
FakeWidgetCRM.VALID_REF). Until BCQ-TESTKIT generalizes the suite, only the
interface-conformance subset applies to real adapters. This factory proves
the wiring (declaration/connect/discover/read/checkpoint/health/normalize
all satisfy the ABC); a full harness pass against GBP awaits that
generalization. Fixture mode only: no live provider is touched.
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from fixture_transport import FixtureTransport  # noqa: E402
from gbp_connector import FIXTURE_CREDENTIAL_REF, GbpConnector  # noqa: E402
from contract import Connector, CredentialRef  # noqa: E402

DEFAULT_FIXTURE = os.path.join(HERE, "fixtures", "rec-a-locations.jsonl")


def make_connector(fixture: str = DEFAULT_FIXTURE) -> Connector:
    """Factory for the testkit --adapter entry point.

    Returns an AUTHORIZED (fixture-mode) GbpConnector, so harness tests
    exercise the real read/normalize path against recorded exchanges.
    """
    transport = FixtureTransport(fixture)
    connector = GbpConnector(transport=transport)
    result = connector.connect(
        CredentialRef(ref=FIXTURE_CREDENTIAL_REF, credential_type="none"))
    if not result.ok:
        raise RuntimeError(f"fixture connect failed: {result.detail}")
    return connector
