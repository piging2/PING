#!/usr/bin/env python3
"""Live test for the Vercel connector (bin/vercel_deploy.py).

Passes today on the current custom.vercel grant. Honest by design:
the grant is limited-scope, so the token sees zero projects -- the test
asserts the real behavior of that state (identity works, lists are
empty, unknown resources raise typed errors) rather than fabricating
projects or deployments.

Run: python3 bin/test_vercel_deploy.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vercel_deploy import (
    VercelClient, VercelAuthError, VercelForbiddenError,
    VercelNotFoundError, VercelRateLimitError, VercelApiError,
    _vercel_error,
)

BOGUS_PROJECT = "no-such-project-vercel-lane-test"
BOGUS_DEPLOYMENT = "dpl_noSuchDeployment123"


class TestVercelLive(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.c = VercelClient()

    def test_whoami_identity(self):
        me = self.c.whoami()
        self.assertTrue(me["id"], "identity id missing")
        self.assertTrue(me["username"] or me["email"], "no username/email")
        print(f"  identity: {me['username']} <{me['email']}> id={me['id']}")

    def test_list_projects_honest_empty(self):
        projects = self.c.list_projects()
        self.assertIsInstance(projects, list)
        # Current grant is limited-scope: empty list is the true state.
        print(f"  projects visible to token: {len(projects)}")

    def test_latest_deployment_bogus_project_is_typed(self):
        with self.assertRaises(VercelNotFoundError):
            self.c.latest_deployment(BOGUS_PROJECT)

    def test_deployment_status_bogus_id_is_typed(self):
        with self.assertRaises(VercelNotFoundError):
            self.c.deployment_status(BOGUS_DEPLOYMENT)

    def test_teams_list_forbidden_is_typed(self):
        # This token cannot list teams (403 verified 2026-10-04).
        with self.assertRaises(VercelForbiddenError):
            self.c._get("/v2/teams")


class TestErrorMapping(unittest.TestCase):
    """Unit-level: the classifier maps status/codes to typed errors."""

    def test_mapping(self):
        cases = [
            (401, {"error": {"code": "unauthorized", "message": "no"}}, VercelAuthError),
            (403, {"error": {"code": "forbidden", "message": "no"}}, VercelForbiddenError),
            (404, {"error": {"code": "not_found", "message": "no"}}, VercelNotFoundError),
            (429, {"error": {"code": "rate_limited", "message": "slow"}}, VercelRateLimitError),
            (500, {"error": {"code": "oops", "message": "boom"}}, VercelApiError),
        ]
        for status, body, exc in cases:
            with self.assertRaises(exc, msg=f"status {status}"):
                _vercel_error(status, body)

    def test_error_attrs(self):
        try:
            _vercel_error(404, {"error": {"code": "not_found", "message": "x"}})
        except VercelNotFoundError as e:
            self.assertEqual(e.http_status, 404)
            self.assertEqual(e.vercel_code, "not_found")
        else:
            self.fail("no raise")


if __name__ == "__main__":
    unittest.main(verbosity=2)
