#!/usr/bin/env python3
"""Facebook Graph connector module.

A typed, honest client for graph.facebook.com using the user-connected
``custom.facebook-graph`` credential. Read paths that work on the current
grant (public_profile: identity, permission self-check) work now. Page paths
are fully structured but pre-check scopes and fail with typed
``FbPermissionError`` when the grant is missing -- they never fabricate
access and never hit the API blindly.

Only ``hsurr:*`` surrogate values leave this process (via the dynamic
credential helpers). Raw credentials are never printed, logged, or persisted.

Usage:
    from fb_graph import FbGraphClient, FbPermissionError

    client = FbGraphClient()
    print(client.me())                 # works on public_profile today
    try:
        pages = client.pages()        # needs pages_show_list
    except FbPermissionError as e:
        print(e.required_scope)       # -> "pages_show_list"
"""

import json
import sys
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_json_response

HOST = "graph.facebook.com"
API_VERSION = "v21.0"
BASE = f"https://{HOST}/{API_VERSION}"
CRED = "custom.facebook-graph"

# Scopes required per read path. Kept in one table so scope gating stays honest.
REQUIRED_SCOPES = {
    "me": {"public_profile"},
    "permissions": {"public_profile"},
    "pages": {"pages_show_list"},
    "page_read": {"pages_show_list"},
    "page_posts": {"pages_read_user_content"},
    "page_insights": {"pages_read_engagement"},
}


class FbApiError(RuntimeError):
    """Base for all Facebook Graph connector errors."""

    def __init__(self, message, *, http_status=None, fb_code=None, fb_subcode=None):
        super().__init__(message)
        self.http_status = http_status
        self.fb_code = fb_code
        self.fb_subcode = fb_subcode


class FbAuthError(FbApiError):
    """401 / OAuthException: the token is missing, invalid, or expired."""


class FbPermissionError(FbApiError):
    """The current grant does not cover this call.

    ``required_scope`` names the scope Nolan would need to grant in
    Facebook Login on his Meta app. ``missing_scopes`` lists exactly which
    of the required scopes are absent from the current grant.
    """

    def __init__(self, message, *, required_scope=None, missing_scopes=None, **kw):
        super().__init__(message, **kw)
        self.required_scope = required_scope
        self.missing_scopes = sorted(missing_scopes or [])


class FbRateLimitError(FbApiError):
    """429 or Graph rate-limit codes: back off, do not retry blindly."""


class FbNotFoundError(FbApiError):
    """404: the object does not exist or is not visible to this token."""


_RATE_LIMIT_CODES = {4, 17, 32, 613, 80004}


def _raise_for_graph_error(status, body):
    """Map an HTTP/graph error body to the typed exception. Never returns."""
    err = body.get("error", {}) if isinstance(body, dict) else {}
    code = err.get("code")
    subcode = err.get("error_subcode")
    message = err.get("message", f"Graph API error (http {status})")
    etype = err.get("type", "")
    if status == 401 or code == 190:
        raise FbAuthError(message, http_status=status, fb_code=code, fb_subcode=subcode)
    if status == 429 or code in _RATE_LIMIT_CODES:
        raise FbRateLimitError(message, http_status=status, fb_code=code, fb_subcode=subcode)
    if status == 404:
        raise FbNotFoundError(message, http_status=status, fb_code=code, fb_subcode=subcode)
    if status == 403 or code in (200, 10, 33):
        # 200 = permission error, 10 = permission denied, 33 = unsupported request
        raise FbPermissionError(message, http_status=status, fb_code=code, fb_subcode=subcode)
    if "permission" in message.lower() or "scope" in message.lower():
        raise FbPermissionError(message, http_status=status, fb_code=code, fb_subcode=subcode)
    raise FbApiError(
        f"{etype + ': ' if etype else ''}{message}",
        http_status=status, fb_code=code, fb_subcode=subcode,
    )


class FbGraphClient:
    """Typed client. One instance per process; granted scopes cached."""

    def __init__(self, cred=CRED, api_version=API_VERSION):
        self.cred = cred
        self.base = f"https://{HOST}/{api_version}"
        self._granted = None

    # ---- low-level -----------------------------------------------------

    def _get(self, path):
        req = urllib.request.Request(self.base + path, method="GET")
        add_surrogate_to_request(req, self.cred, allowed_hosts=[HOST])
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return read_json_response(resp)
        except urllib.error.HTTPError as e:
            try:
                body = json.loads(e.read().decode("utf-8", "replace"))
            except Exception:
                body = {}
            _raise_for_graph_error(e.code, body)

    # ---- scope gating --------------------------------------------------

    def granted_scopes(self):
        """Current grant's permission list (works on public_profile today)."""
        if self._granted is None:
            body = self._get("/me/permissions")
            granted, declined = [], []
            for p in body.get("data", []):
                (granted if p.get("status") == "granted" else declined).append(
                    p.get("permission"))
            self._granted = {"granted": sorted(granted), "declined": sorted(declined)}
        return self._granted

    def _require_scopes(self, key):
        required = REQUIRED_SCOPES[key]
        granted = set(self.granted_scopes()["granted"])
        missing = sorted(required - granted)
        if missing:
            raise FbPermissionError(
                f"Call '{key}' needs scope(s) {missing}; current grant has "
                f"{sorted(granted)}. Nolan grants these in Facebook Login on "
                f"his Meta app -- nothing to do until then.",
                http_status=None,
                required_scope=missing[0],
                missing_scopes=missing,
            )

    # ---- reads that work on public_profile today ------------------------

    def me(self):
        """Identity: id + name. Works on the current public_profile grant."""
        body = self._get("/me?fields=id,name")
        return {"id": body.get("id"), "name": body.get("name")}

    # ---- page paths: structured now, light up when scopes land ----------

    def pages(self):
        """Pages Nolan manages. Needs pages_show_list."""
        self._require_scopes("pages")
        body = self._get("/me/accounts?fields=id,name,perms&limit=50")
        return [
            {"id": a.get("id"), "name": a.get("name"), "perms": a.get("perms")}
            for a in body.get("data", [])
        ]

    def page(self, page_id, fields="id,name,fan_count"):
        """Read one page's public fields. Needs pages_show_list."""
        self._require_scopes("page_read")
        body = self._get(f"/{page_id}?fields={fields}")
        return {k: body.get(k) for k in fields.split(",") if k in body}

    def page_posts(self, page_id, limit=10):
        """Recent page posts. Needs pages_read_user_content."""
        self._require_scopes("page_posts")
        body = self._get(
            f"/{page_id}/posts?fields=id,message,created_time,permalink_url&limit={limit}")
        return body.get("data", [])

    def page_insights(self, page_id, metrics):
        """Page insights. Needs pages_read_engagement."""
        self._require_scopes("page_insights")
        metric = ",".join(metrics)
        body = self._get(f"/{page_id}/insights?metric={metric}&period=day")
        return body.get("data", [])


if __name__ == "__main__":
    # Smoke: identity + permission self-check, the paths live today.
    c = FbGraphClient()
    print(json.dumps({"me": c.me(), "scopes": c.granted_scopes()}, indent=2))
