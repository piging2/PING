#!/usr/bin/env python3
"""Vercel connector: typed, honest client for api.vercel.com.

Built on the user-connected ``custom.vercel`` credential via the authd
surrogate exchange. Only ``hsurr:*`` surrogate values leave this process
(via the dynamic-credential helpers); raw credentials are never printed,
logged, or persisted.

This module covers the high-value read paths Nolan actually uses (he
deploys to Vercel constantly): identity, project listing, and deployment
status. ``bin/vercel-api.py`` remains the generic GET/POST/DELETE escape
hatch -- this module is NOT a duplicate of it; it adds typed errors and
deployment-state semantics.

Usage:
    from vercel_deploy import VercelClient

    c = VercelClient()
    print(c.whoami())                         # identity on the current grant
    print(c.list_projects())                  # [] today: token sees no projects
    print(c.latest_deployment("my-site"))     # newest deployment for a project
    print(c.deployment_status("dpl_abc123"))  # state of one deployment

All reads fail honestly: 404 on unknown project/deployment raises
VercelNotFoundError, 401 raises VercelAuthError, 403 raises
VercelForbiddenError, 429 raises VercelRateLimitError. Nothing is
fabricated: an empty project list is returned as an empty list.
"""

import json
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

HOST = "api.vercel.com"
BASE = f"https://{HOST}"
CRED = "custom.vercel"


class VercelApiError(RuntimeError):
    """Base for all Vercel connector errors."""

    def __init__(self, message, *, http_status=None, vercel_code=None):
        super().__init__(message)
        self.http_status = http_status
        self.vercel_code = vercel_code


class VercelAuthError(VercelApiError):
    """401 / 'unauthorized': token missing, invalid, or expired."""


class VercelForbiddenError(VercelApiError):
    """403 / 'forbidden': the grant lacks permission for this call
    (e.g. listing teams this token cannot see)."""


class VercelNotFoundError(VercelApiError):
    """404 / 'not_found': project, deployment, or resource does not exist
    or is not visible to this token."""


class VercelRateLimitError(VercelApiError):
    """429: rate limited. Back off; do not retry blindly."""


def _vercel_error(status, body):
    """Map an HTTP/Vercel error body to the typed exception. Never returns."""
    err = body.get("error", {}) if isinstance(body, dict) else {}
    code = err.get("code")
    message = err.get("message", f"Vercel API error (http {status})")
    if status == 401 or code == "unauthorized":
        raise VercelAuthError(message, http_status=status, vercel_code=code)
    if status == 429 or code == "rate_limited":
        raise VercelRateLimitError(message, http_status=status, vercel_code=code)
    if status == 404 or code == "not_found":
        raise VercelNotFoundError(message, http_status=status, vercel_code=code)
    if status == 403 or code == "forbidden":
        raise VercelForbiddenError(message, http_status=status, vercel_code=code)
    raise VercelApiError(
        f"{code + ': ' if code else ''}{message}",
        http_status=status, vercel_code=code,
    )


class VercelClient:
    """Typed client for the current custom.vercel grant."""

    def __init__(self, cred=CRED, default_team_id=None):
        self.cred = cred
        self.default_team_id = default_team_id
        self._projects_cache = None

    # ---- low-level ---------------------------------------------------

    def _get(self, path, params=None):
        query = ""
        if params:
            query = "?" + urllib.parse.urlencode(
                {k: v for k, v in params.items() if v is not None})
        req = urllib.request.Request(BASE + path + query, method="GET")
        req.add_header("Accept", "application/json")
        add_surrogate_to_request(req, self.cred, allowed_hosts=[HOST])
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return read_json_response(resp)
        except urllib.error.HTTPError as e:
            try:
                body = json.loads(e.read().decode("utf-8", "replace"))
            except Exception:
                body = {}
            _vercel_error(e.code, body)

    def _team(self, team_id):
        return team_id if team_id is not None else self.default_team_id

    # ---- identity ----------------------------------------------------

    def whoami(self):
        """Identity on the current grant: id, username, email, team."""
        body = self._get("/v2/user")
        u = body.get("user", {})
        return {
            "id": u.get("id"),
            "username": u.get("username"),
            "email": u.get("email"),
            "default_team_id": u.get("defaultTeamId"),
        }

    # ---- projects ----------------------------------------------------

    def list_projects(self, team_id=None, limit=50):
        """Projects visible to this token. Returns [] when none -- that is
        the honest state of a limited-scope token, not an error."""
        team_id = self._team(team_id)
        body = self._get("/v9/projects",
                         {"limit": limit, **({"teamId": team_id} if team_id else {})})
        return [
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "framework": p.get("framework"),
                "updated_at": p.get("updatedAt"),
            }
            for p in body.get("projects", [])
        ]

    def _resolve_project_id(self, project, team_id=None):
        """Accept a project id or name; return the id. Raises
        VercelNotFoundError when no project matches."""
        projects = self.list_projects(team_id=team_id)
        for p in projects:
            if p["id"] == project or p["name"] == project:
                return p["id"]
        raise VercelNotFoundError(
            f"Project not found (or not visible to this token): {project!r}; "
            f"token sees {len(projects)} project(s)")

    # ---- deployments -------------------------------------------------

    def list_deployments(self, project=None, team_id=None, limit=10):
        """Deployments for one project (name or id). If project is None,
        deployments across all visible projects."""
        team_id = self._team(team_id)
        params = {"limit": limit}
        if team_id:
            params["teamId"] = team_id
        if project:
            params["projectId"] = self._resolve_project_id(project, team_id)
        body = self._get("/v6/deployments", params)
        return [self._summarize_deployment(d) for d in body.get("deployments", [])]

    def latest_deployment(self, project, team_id=None):
        """Newest deployment for a project. Raises VercelNotFoundError when
        the project has no deployments or is not visible."""
        deps = self.list_deployments(project=project, team_id=team_id, limit=1)
        if not deps:
            raise VercelNotFoundError(
                f"No deployments found for project {project!r} (or project "
                "not visible to this token)")
        return deps[0]

    def deployment_status(self, deployment_id_or_url):
        """State of one deployment: READY, BUILDING, ERROR, QUEUED,
        CANCELED, etc. Raises VercelNotFoundError on unknown id."""
        dep_id = deployment_id_or_url.rsplit("/", 1)[-1] if "/" in deployment_id_or_url \
            else deployment_id_or_url
        body = self._get(f"/v13/deployments/{urllib.parse.quote(dep_id, safe='')}")
        return self._summarize_deployment(body, full=True)

    @staticmethod
    def _summarize_deployment(d, full=False):
        out = {
            "id": d.get("id") or d.get("uid"),
            "name": d.get("name"),
            "url": d.get("url"),
            "state": d.get("state"),
            "ready_state": d.get("readyState"),
            "created_at": d.get("createdAt"),
        }
        if full:
            out.update({
                "target": d.get("target"),
                "project_id": (d.get("project") or {}).get("id")
                    if isinstance(d.get("project"), dict) else d.get("projectId"),
                "meta": d.get("meta") or {},
                "inspector_url": d.get("inspectorUrl"),
            })
        return out


if __name__ == "__main__":
    # Smoke: identity + honest project list on the current grant.
    c = VercelClient()
    print(json.dumps({
        "me": c.whoami(),
        "project_count": len(c.list_projects()),
        "projects": c.list_projects(),
    }, indent=2))
