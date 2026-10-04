"""Typed Graph API errors with retryability.

PATTERN ADAPTED FROM: facebook/facebook-python-business-sdk @ 26.0.2,
`facebook_business/exceptions.py` class `FacebookRequestError`.

The Graph API's error envelope carries its own retry policy:
  error.code, error.error_subcode, error.type, error.is_transient,
  error.error_data.blame_field_specs

We parse it once, then decide RETRY / BACKOFF / FAIL against PING
semantics. No SDK import; stdlib only.

Decision table (PING terms):
  - is_transient true            -> RETRY (the API itself says retry)
  - rate-limit codes (4, 17, 32) -> BACKOFF (never hammer)
  - auth/permission (190, 10, 200-299, 104) -> FAIL_PERMANENT, and this
    is a CAPABILITY signal: the token lacks the permission, which the
    Meta archaeology lane records as BLOCKED, not as a bug.
  - invalid param (100), not found (803) -> FAIL_PERMANENT (our bug)
  - anything else               -> FAIL_UNKNOWN (human decides)
"""


class GraphApiError(Exception):
    def __init__(self, http_status, body, request_summary=None):
        self.http_status = http_status
        self.request_summary = request_summary or {}
        err = {}
        try:
            err = (body or {}).get("error", {}) or {}
        except AttributeError:
            err = {}
        self.api_code = err.get("code")
        self.api_subcode = err.get("error_subcode")
        self.api_type = err.get("type")
        self.api_message = err.get("message")
        self.is_transient = bool(err.get("is_transient"))
        error_data = err.get("error_data") or {}
        self.blame_field_specs = error_data.get("blame_field_specs")
        super(GraphApiError, self).__init__(
            "Graph API error %s/%s: %s"
            % (self.api_code, self.api_subcode, self.api_message)
        )

    def decision(self):
        """Return one of: RETRY, BACKOFF, FAIL_PERMANENT, FAIL_UNKNOWN."""
        if self.is_transient:
            return "RETRY"
        if self.api_code in (4, 17, 32):
            return "BACKOFF"
        if self.api_code in (10, 104, 190) or (
            isinstance(self.api_code, int) and 200 <= self.api_code <= 299
        ):
            return "FAIL_PERMANENT"
        if self.api_code in (100, 803):
            return "FAIL_PERMANENT"
        return "FAIL_UNKNOWN"

    def is_capability_gap(self):
        """True when the failure means 'token lacks permission', i.e. the
        Meta archaeology lane should record BLOCKED, not retry."""
        return self.decision() == "FAIL_PERMANENT" and (
            self.api_code in (10, 104)
            or (isinstance(self.api_code, int) and 200 <= self.api_code <= 299)
        )


def parse_error(http_status, body, request_summary=None):
    return GraphApiError(http_status, body, request_summary)
